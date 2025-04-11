import type {
  PlayerComplete,
  PlayerId,
  PlayerMetadata,
  PlayerState,
  WebSocketMessage,
} from '../../server/src/templates/network'
import { EventEmitter } from './EventEmitter'
import type { DebugEventType, Room, RoomEvents, RoomOptions } from './types'

export * from './EventEmitter'
export * from './types'

const nextTick = (cb: () => void) => {
  setTimeout(cb, 0)
}

export function createRoom<T = {}, M = {}>(roomName: string, options: RoomOptions<T, M> = {}): Room<T, M> {
  const emitter = new EventEmitter<RoomEvents<T, M>>()
  // Helper to emit debug events
  const debug = (type: DebugEventType, data?: any) => {
    emitter.emit('debug', { type, data })
  }

  const defaultEndpoint = `https://vibescale.benallfree.com/`
  nextTick(() => debug('info', { defaultEndpoint }))
  const wsEndpoint = `${options.endpoint === undefined ? defaultEndpoint : options.endpoint}/${roomName}/websocket`
  nextTick(() => debug('info', { wsEndpoint }))
  const ws = new WebSocket(wsEndpoint)

  let playerId: PlayerId | null = null
  let playerMetadata: PlayerMetadata<M> | null = null
  let playerState: PlayerState<T> | null = null
  const players = new Map<PlayerId, PlayerComplete<T, M>>()

  ws.onopen = () => {
    debug('ws:open', { roomName })
    console.log('Connected to Vibescale room:', roomName)
    emitter.emit('connected', undefined)
  }

  ws.onclose = () => {
    debug('ws:close', {
      url: ws.url,
      readyState: ws.readyState,
      timestamp: new Date().getTime(),
    })
    console.log('Disconnected from Vibescale room:', roomName)
    playerId = null
    playerMetadata = null
    playerState = null
    players.clear()
    emitter.emit('disconnected', undefined)
  }

  ws.onerror = (error) => {
    const errorData = {
      type: error.type,
      isTrusted: error.isTrusted,
      timeStamp: error.timeStamp,
      eventPhase: error.eventPhase,
      target: error.target
        ? {
            url: (error.target as WebSocket).url,
            readyState: (error.target as WebSocket).readyState,
          }
        : null,
    }
    debug('ws:error', errorData)
    console.error('WebSocket error:', error)
    emitter.emit('error', 'WebSocket connection error')
  }

  ws.onmessage = (event) => {
    try {
      debug('ws:message:raw', { data: event.data })
      const message = JSON.parse(event.data) as WebSocketMessage<T, M>
      debug('ws:message:parsed', { message })
      handleMessage(message)
    } catch (error) {
      debug('ws:message:error', { error, data: event.data })
      console.error('Error parsing message:', error)
      emitter.emit('error', 'Error parsing server message')
    }
  }

  function handleMessage(message: WebSocketMessage<T, M>) {
    debug('message:handle:start', { message })

    switch (message.type) {
      case 'player:id':
        if (!message.id || !message.state || !message.metadata) {
          debug('message:handle:error', { type: 'player:id', error: 'Missing required fields' })
          return
        }
        playerId = message.id
        playerMetadata = message.metadata
        playerState = message.state
        const playerComplete: PlayerComplete<T, M> = {
          ...message.state,
          metadata: message.metadata,
        }
        players.set(message.id, playerComplete)
        debug('player:id:received', { player: playerComplete })
        emitter.emit('playerJoin', playerComplete)
        break

      case 'player:state':
        if (!message.player || !message.player.id) {
          debug('message:handle:error', { type: 'player:state', error: 'Missing required fields' })
          return
        }
        const existingPlayer = players.get(message.player.id)
        if (!existingPlayer) {
          debug('message:handle:error', { type: 'player:state', error: 'Player not found', id: message.player.id })
          return
        }

        const updatedPlayer: PlayerComplete<T, M> = {
          ...message.player,
          metadata: existingPlayer.metadata,
        }
        players.set(message.player.id, updatedPlayer)
        debug('player:state:updated', { player: updatedPlayer })
        emitter.emit('playerUpdate', updatedPlayer)
        break

      case 'player:metadata':
        if (!message.metadata || !message.id) {
          debug('message:handle:error', { type: 'player:metadata', error: 'Missing required fields' })
          return
        }
        const existingPlayerForMetadata = players.get(message.id)
        if (!existingPlayerForMetadata) {
          debug('message:handle:error', { type: 'player:metadata', error: 'Player not found', id: message.id })
          return
        }

        const playerWithUpdatedMetadata = {
          ...existingPlayerForMetadata,
          metadata: message.metadata,
        }
        players.set(message.id, playerWithUpdatedMetadata)
        debug('player:metadata:updated', { player: playerWithUpdatedMetadata })
        emitter.emit('playerUpdate', playerWithUpdatedMetadata)
        break

      case 'player:leave':
        if (!message.id) {
          debug('message:handle:error', { type: 'player:leave', error: 'Missing required fields' })
          return
        }
        const leavingPlayer = players.get(message.id)
        if (leavingPlayer) {
          players.delete(message.id)
          debug('player:leave:processed', { player: leavingPlayer })
          emitter.emit('playerLeave', leavingPlayer)
        } else {
          debug('message:handle:error', { type: 'player:leave', error: 'Player not found', id: message.id })
        }
        break

      default:
        debug('message:handle:error', { error: 'Unknown message type', message })
    }

    debug('message:handle:complete', { type: message.type })
  }

  const room: Room<T, M> = {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    getPlayer: (id: PlayerId) => {
      return players.get(id) || null
    },
    setMetadata: (metadata: Partial<PlayerMetadata<M>>) => {
      if (!playerId || !playerMetadata) return

      debug('metadata:update:start', { metadata })

      // Update local metadata
      playerMetadata = { ...playerMetadata, ...metadata }

      // Update in players map
      const currentPlayer = players.get(playerId)
      if (currentPlayer) {
        const updatedPlayer = {
          ...currentPlayer,
          metadata: playerMetadata,
        }
        players.set(playerId, updatedPlayer)
        debug('metadata:update:local', { player: updatedPlayer })
      }

      // Send to server
      if (ws.readyState === WebSocket.OPEN) {
        const message = {
          type: 'player:metadata',
          metadata: playerMetadata,
        }
        ws.send(JSON.stringify(message))
        debug('metadata:update:send', { message })
      }
    },
    disconnect: () => {
      debug('disconnect')
      ws.close()
    },
  }

  return room
}
