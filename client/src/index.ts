import { createCoordinateConverter } from './coordinateConversion'
import { EventEmitter } from './EventEmitter'
import { normalizePlayerBase } from './normalizer'
import { createStateChangeDetector } from './stateChangeDetector'
import {
  MessageType,
  RoomEventType,
  type PlayerBase,
  type PlayerId,
  type Room,
  type RoomEvents,
  type RoomOptions,
  type WebSocketMessage,
} from './types'

export * from './coordinateConversion'
export * from './EventEmitter'
export * from './normalizer'
export * from './stateChangeDetector'
export * from './types'

// Helper for scheduling microtasks
const nextTick = (fn: () => void) => Promise.resolve().then(fn)

// Default produce function that requires manual spreading/copying in the mutator
const defaultProduce = <TPlayer extends PlayerBase>(state: TPlayer, mutator: (draft: TPlayer) => void): TPlayer => {
  // Create a deep copy for the mutator to work with
  // Users must handle their own copying/spreading for nested objects
  const draft = structuredClone(state)
  mutator(draft)
  return draft
}

/**
 * Creates a new room instance with configurable state management.
 *
 * @example
 * // With default produce (structuredClone-based)
 * const room = createRoom('my-room')
 *
 * // With immer
 * import { produce } from 'immer'
 * const room = createRoom('my-room', { produce })
 *
 * // With mutative
 * import { produce } from 'mutative'
 * const room = createRoom('my-room', { produce })
 */
export function vibescale<TPlayer extends PlayerBase>(
  roomName: string,
  options: RoomOptions<TPlayer> = {}
): Room<TPlayer> {
  console.log('createRoom', roomName, options)
  if (!roomName) {
    throw new Error(`createRoom(roomName) requires a roomName. ${roomName} is not a valid roomName.`)
  }
  const emitter = new EventEmitter<RoomEvents<TPlayer>>()
  let playerId: PlayerId | null = null
  const players = new Map<PlayerId, TPlayer>()
  const stateChangeDetector = options.stateChangeDetectorFn || createStateChangeDetector()
  const normalizePlayerState = options.normalizePlayerState || normalizePlayerBase

  // Use custom produce function if provided, otherwise use default
  const produce = options.produce || defaultProduce<TPlayer>

  // Create coordinate converter based on worldScale option
  const coordinateConverter = options.coordinateConverter || createCoordinateConverter(1)

  // WebSocket connection management
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000 // Start with 1 second
  const maxReconnectDelay = 30000 // Cap at 30 seconds
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let isManualDisconnect = false
  let lastBroadcastPlayerState: TPlayer | null = null

  const room: Room<TPlayer> = {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    emit: emitter.emit.bind(emitter),
    getPlayer: (id: PlayerId) => {
      return players.get(id) || null
    },

    getLocalPlayer: () => {
      if (!playerId) return null
      return players.get(playerId) || null
    },

    getAllPlayers: () => {
      return Array.from(players.values())
    },

    mutateLocalPlayer: (mutator) => {
      if (!playerId) return null

      // Update in players map
      const currentPlayer = players.get(playerId)
      if (!currentPlayer) return null

      // console.log('mutatePlayer in', JSON.stringify({ baseState }))
      const newState = produce(currentPlayer, mutator)
      players.set(playerId, newState)
      // console.log('mutatePlayer out', JSON.stringify({ newState }))

      if (!lastBroadcastPlayerState || stateChangeDetector(lastBroadcastPlayerState, newState)) {
        lastBroadcastPlayerState = newState
        // Convert world coordinates to server normalized coordinates before sending
        const serverState = produce(newState, (draft) => {
          draft.position = coordinateConverter.worldToServer(draft.position)
        })

        // Send to server
        const message: WebSocketMessage = {
          type: MessageType.PlayerState,
          ...serverState,
        }
        _send(message)
      }
      emitter.emit(RoomEventType.LocalPlayerMutated, newState)
      emitter.emit(RoomEventType.AfterLocalPlayerMutated, newState)
      return newState
    },

    disconnect: () => {
      isManualDisconnect = true
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      if (ws) {
        ws.close()
        ws = null
      }
    },

    getRoomId: () => {
      return roomName
    },

    isConnected: () => {
      return ws?.readyState === WebSocket.OPEN
    },

    connect() {
      const wsEndpoint = new URL(`${roomName}/websocket`, options.endpoint || 'https://vibescale.benallfree.com')
      nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { wsEndpoint }))

      ws = new WebSocket(wsEndpoint)

      // WebSocket event handlers
      ws.onopen = () => {
        reconnectAttempt = 0 // Reset reconnect counter on successful connection
        // Clear all data structures on connect to ensure fresh start
        playerId = null
        players.clear()
        emitter.emit(RoomEventType.Connected, undefined)
      }

      ws.onclose = () => {
        if (!isManualDisconnect && reconnectAttempt < maxReconnectAttempts) {
          // Calculate delay with exponential backoff
          const delay = Math.min(Math.pow(2, reconnectAttempt) * baseReconnectDelay, maxReconnectDelay)

          emitter.emit(RoomEventType.Error, {
            message: 'WebSocket disconnected',
            error: new Error(`Attempting to reconnect in ${delay / 1000} seconds...`),
          })

          // Schedule reconnection
          reconnectTimeout = setTimeout(() => {
            reconnectAttempt++
            room.connect()
          }, delay)
        } else {
          if (playerId) {
            playerId = null
            players.clear()
            emitter.emit(RoomEventType.Disconnected, undefined)
          }
        }
      }

      ws.onerror = (error) => {
        emitter.emit(RoomEventType.Error, { message: 'WebSocket error', error })
      }

      ws.onmessage = (event) => {
        try {
          const jsonMessage = event.data as string
          emitter.emit(RoomEventType.Rx, jsonMessage)
          const message = JSON.parse(jsonMessage) as WebSocketMessage<TPlayer>
          handleRxMessage(message)
        } catch (error) {
          console.error(error)
          emitter.emit(RoomEventType.Error, {
            message: 'Error parsing server message',
            error,
            details: { data: event.data },
          })
        }
      }
    },
  }

  /**
   * Helper function to send messages to the server
   */
  function _send(message: WebSocketMessage | PatchStateMessage) {
    const jsonMessage = JSON.stringify(message)
    emitter.emit(RoomEventType.Tx, jsonMessage)
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(jsonMessage)
    }
  }

  function handleRxMessage(message: WebSocketMessage<TPlayer>) {
    switch (message.type) {
      case MessageType.PlayerState:
        const player = produce(message, (draft) => {
          // Apply normalization if provided
          const normalizedPlayer = normalizePlayerState(message as any) as TPlayer
          // Replace all properties of draft with normalizedPlayer properties
          Object.assign(draft, normalizedPlayer, { type: MessageType.PlayerState })
          // console.log(`draft`, JSON.stringify(draft, null, 2))
          draft.position = coordinateConverter.serverToWorld(draft.position)
        })

        if (player.isLocal) {
          playerId = player.id
        }
        if (player.isConnected) {
          const isNewPlayer = !players.has(player.id)
          players.set(player.id, player)
          if (isNewPlayer) {
            emitter.emit(player.isLocal ? RoomEventType.LocalPlayerJoined : RoomEventType.RemotePlayerJoined, player)
            emitter.emit(RoomEventType.PlayerJoined, player)
          }
        } else {
          players.delete(player.id)
          emitter.emit(RoomEventType.RemotePlayerLeft, player)
          emitter.emit(RoomEventType.PlayerLeft, player)
        }
        emitter.emit(player.isLocal ? RoomEventType.LocalPlayerUpdated : RoomEventType.RemotePlayerUpdated, player)
        emitter.emit(RoomEventType.PlayerUpdated, player)
        break

      case MessageType.Version:
        emitter.emit(RoomEventType.Version, message)
        break

      default:
        emitter.emit(RoomEventType.Error, {
          message: 'Unknown message type',
          error: new Error('Unknown message type'),
          details: { message },
        })
    }
  }

  return room
}

const createRoom = vibescale

export { createRoom }
