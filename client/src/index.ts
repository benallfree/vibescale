import { EventEmitter } from './EventEmitter'
import {
  MessageType,
  RoomEventType,
  type Player,
  type PlayerDelta,
  type PlayerId,
  type PlayerMetadata,
  type Room,
  type RoomEvents,
  type RoomOptions,
  type WebSocketMessage,
} from './types'

export * from './EventEmitter'
export * from './types'

const nextTick = (cb: () => void) => {
  setTimeout(cb, 0)
}

export function createRoom<T = {}, M = {}>(roomName: string, options: RoomOptions = {}): Room<T, M> {
  const emitter = new EventEmitter<RoomEvents<T, M>>()
  let playerId: PlayerId | null = null
  const players = new Map<PlayerId, Player<T, M>>()

  // Initialize WebSocket connection
  const defaultEndpoint = `https://vibescale.benallfree.com/`
  nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { defaultEndpoint }))
  const customEndpoint = options.endpoint
  nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { customEndpoint }))
  const wsEndpoint = `${options.endpoint === undefined ? defaultEndpoint : customEndpoint}/websocket`
  nextTick(() => emitter.emit(RoomEventType.WebSocketInfo, { wsEndpoint }))
  const ws = new WebSocket(wsEndpoint)

  // WebSocket event handlers
  ws.onopen = () => {
    emitter.emit(RoomEventType.Connected, undefined)
  }

  ws.onclose = () => {
    if (!playerId) return
    playerId = null
    players.clear()
    emitter.emit(RoomEventType.Disconnected, undefined)
  }

  ws.onerror = (error) => {
    emitter.emit(RoomEventType.Error, { message: 'WebSocket error', error })
  }

  ws.onmessage = (event) => {
    try {
      emitter.emit(RoomEventType.Rx, { event: event.data })
      const message = JSON.parse(event.data) as WebSocketMessage<T, M>
      handleRxMessage(message)
    } catch (error) {
      emitter.emit(RoomEventType.Error, {
        message: 'Error parsing server message',
        error,
        details: { data: event.data },
      })
    }
  }

  function handleRxMessage(message: WebSocketMessage<T, M>) {
    switch (message.type) {
      case MessageType.Player:
        const player = message.player
        if (player.isLocal) {
          playerId = player.id
        }

        players.set(player.id, player)
        emitter.emit(RoomEventType.PlayerJoined, player)
        break

      case MessageType.PlayerDelta:
        const existingPlayer = players.get(message.id)
        if (!existingPlayer) {
          emitter.emit(RoomEventType.Error, {
            message: 'Player not found',
            error: new Error('Player not found'),
            details: { id: message.id },
          })
          return
        }

        const updatedPlayer: Player<T, M> = {
          ...existingPlayer,
          delta: message.delta,
        }
        players.set(message.id, updatedPlayer)
        emitter.emit(RoomEventType.PlayerUpdated, updatedPlayer)
        break

      case MessageType.PlayerMetadata:
        const existingPlayerForMetadata = players.get(message.id)
        if (!existingPlayerForMetadata) {
          emitter.emit(RoomEventType.Error, {
            message: 'Player not found',
            error: new Error('Player not found'),
            details: { message },
          })
          return
        }

        const playerWithUpdatedMetadata = {
          ...existingPlayerForMetadata,
          metadata: message.metadata,
        }
        players.set(message.id, playerWithUpdatedMetadata)
        emitter.emit(RoomEventType.PlayerUpdated, playerWithUpdatedMetadata)
        break

      case MessageType.PlayerLeave:
        const leavingPlayer = players.get(message.id)
        if (leavingPlayer) {
          players.delete(message.id)
          emitter.emit(RoomEventType.PlayerLeft, leavingPlayer)
        } else {
          emitter.emit(RoomEventType.PlayerError, {
            type: 'player:leave',
            error: 'Player not found',
            details: { message },
          })
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

  const room: Room<T, M> = {
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

    setLocalPlayerMetadata: (metadata: PlayerMetadata<M>) => {
      if (!playerId) return

      // Update in players map
      const currentPlayer = players.get(playerId)
      if (currentPlayer) {
        const updatedPlayer: Player<T, M> = {
          ...currentPlayer,
          metadata: metadata,
        }
        players.set(playerId, updatedPlayer)
      }

      // Send to server
      const message: WebSocketMessage<T, M> = {
        type: MessageType.PlayerMetadata,
        id: playerId,
        metadata: metadata,
      }
      emitter.emit(RoomEventType.Tx, { message })
      ws.send(JSON.stringify(message))
    },

    setLocalPlayerDelta: (delta: PlayerDelta<T>) => {
      if (!playerId || !delta) return

      // Update in players map
      const currentPlayer = players.get(playerId)
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          ...delta,
        }
        players.set(playerId, updatedPlayer)
      }

      // Send to server
      const message: WebSocketMessage<T, M> = {
        type: MessageType.PlayerDelta,
        id: playerId,
        delta,
      }
      emitter.emit(RoomEventType.Tx, { message })
      ws.send(JSON.stringify(message))
    },

    disconnect: () => {
      ws.close()
    },
  }

  return room
}
