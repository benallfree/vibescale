import { produce } from 'immer'
import urlJoin from 'url-join'
import { hasSignificantStateChange } from '../../site/src/server/stateChangeDetector'
import { EventEmitter } from './EventEmitter'
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

export * from '../../site/src/server/stateChangeDetector'
export * from './EventEmitter'
export * from './types'

// Helper for scheduling microtasks
const nextTick = (fn: () => void) => Promise.resolve().then(fn)

export function createRoom<TPlayer extends PlayerBase>(
  roomName: string,
  options: RoomOptions<TPlayer> = {}
): Room<TPlayer> {
  const emitter = new EventEmitter<RoomEvents<TPlayer>>()
  let playerId: PlayerId | null = null
  const players = new Map<PlayerId, TPlayer>()
  const playerDeltaBases = new Map<PlayerId, TPlayer>()
  const stateChangeDetector = options.stateChangeDetectorFn || hasSignificantStateChange

  // WebSocket connection management
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  const maxReconnectAttempts = 10
  const baseReconnectDelay = 1000 // Start with 1 second
  const maxReconnectDelay = 30000 // Cap at 30 seconds
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let isManualDisconnect = false

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

    mutatePlayer: (mutator) => {
      if (!playerId) return

      // Update in players map
      const currentPlayer = players.get(playerId)
      if (!currentPlayer) return
      if (!playerDeltaBases.has(playerId)) {
        playerDeltaBases.set(playerId, currentPlayer)
      }
      const baseState = playerDeltaBases.get(playerId)!

      const newState = produce(currentPlayer, mutator)
      players.set(playerId, newState)
      // console.log('mutatePlayer', JSON.stringify({ baseState, newState }, null, 2))

      if (!stateChangeDetector(baseState, newState)) {
        return
      }
      playerDeltaBases.set(playerId, newState)

      // Send to server
      const message: WebSocketMessage = {
        type: MessageType.PlayerState,
        ...newState,
      }
      const jsonMessage = JSON.stringify(message)
      emitter.emit(RoomEventType.Tx, jsonMessage)
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(jsonMessage)
      }
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

    getEndpointUrl: () => {
      // Initialize WebSocket connection
      const defaultEndpoint = `https://vibescale.benallfree.com`
      nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { defaultEndpoint }))
      const customEndpoint = options.endpoint
      nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { customEndpoint }))
      const finalEndpoint = urlJoin(customEndpoint === undefined ? defaultEndpoint : customEndpoint, roomName)
      nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { finalEndpoint }))

      return finalEndpoint
    },

    connect() {
      const wsEndpoint = `${room.getEndpointUrl()}/websocket`
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

  function handleRxMessage(message: WebSocketMessage<TPlayer>) {
    switch (message.type) {
      case MessageType.PlayerState:
        const player = message
        if (player.isLocal) {
          playerId = player.id
        }
        if (player.isConnected) {
          if (!players.has(player.id)) {
            emitter.emit(RoomEventType.PlayerJoined, player)
          } else {
            emitter.emit(RoomEventType.PlayerUpdated, player)
          }
          players.set(player.id, player)
        } else {
          players.delete(player.id)
          emitter.emit(RoomEventType.PlayerLeft, player)
        }
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
