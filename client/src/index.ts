import type {
  PlayerComplete,
  PlayerId,
  PlayerMetadata,
  PlayerState,
  WebSocketMessage,
} from '../../server/src/templates/network'

type EventCallback = (...args: any[]) => void

class EventEmitter {
  private events: Map<string, Set<EventCallback>> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(callback)

    // Return unsubscribe function
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback)
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach((callback) => callback(...args))
  }
}

export type PlayerEventCallback<T = {}, M = {}> = (player: PlayerComplete<T, M>) => void

export type RoomOptions<T = {}, M = {}> = {
  url?: string
  onPlayerStateChange?: (state: PlayerState<T>) => void
  onPlayerJoin?: (player: PlayerComplete<T, M>) => void
  onPlayerLeave?: (playerId: PlayerId) => void
  onError?: (error: string) => void
}

export interface Room<T = {}, M = {}> {
  on(event: 'playerUpdate' | 'playerJoin' | 'playerLeave', callback: PlayerEventCallback<T, M>): () => void
  off(event: 'playerUpdate' | 'playerJoin' | 'playerLeave', callback: PlayerEventCallback<T, M>): void
  getPlayer: (id: PlayerId) => PlayerComplete<T, M> | null
  setMetadata: (metadata: Partial<PlayerMetadata<M>>) => void
  disconnect: () => void
}

export async function createRoom<T = {}, M = {}>(
  roomName: string,
  options: RoomOptions<T, M> = {}
): Promise<Room<T, M>> {
  const ws = new WebSocket(`${options.url || 'wss://vibescale.benallfree.com'}/${roomName}/websocket`)
  let playerId: PlayerId | null = null
  let playerMetadata: PlayerMetadata<M> | null = null
  let playerState: PlayerState<T> | null = null
  const emitter = new EventEmitter()
  const players = new Map<PlayerId, PlayerComplete<T, M>>()

  // Set up initial event handlers from options
  if (options.onPlayerStateChange) {
    emitter.on('playerUpdate', options.onPlayerStateChange)
  }
  if (options.onPlayerJoin) {
    emitter.on('playerJoin', options.onPlayerJoin)
  }
  if (options.onPlayerLeave) {
    emitter.on('playerLeave', options.onPlayerLeave)
  }
  if (options.onError) {
    emitter.on('error', options.onError)
  }

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log('Connected to Vibescale room:', roomName)

      const room: Room<T, M> = {
        on(event: 'playerUpdate' | 'playerJoin' | 'playerLeave', callback: PlayerEventCallback<T, M>): () => void {
          return emitter.on(event, callback)
        },

        off(event: 'playerUpdate' | 'playerJoin' | 'playerLeave', callback: PlayerEventCallback<T, M>): void {
          emitter.off(event, callback)
        },

        getPlayer: (id: PlayerId) => {
          return players.get(id) || null
        },

        setMetadata: (metadata: Partial<PlayerMetadata<M>>) => {
          if (!playerId || !playerMetadata) return

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
          }

          // Send to server
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'player:metadata',
                metadata: playerMetadata,
              })
            )
          }
        },

        disconnect: () => {
          ws.close()
        },
      }

      resolve(room)
    }

    ws.onclose = () => {
      console.log('Disconnected from Vibescale room:', roomName)
      playerId = null
      playerMetadata = null
      playerState = null
      players.clear()
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      emitter.emit('error', 'WebSocket connection error')
      reject(error)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage<T, M>
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing message:', error)
        emitter.emit('error', 'Error parsing server message')
      }
    }
  })

  function handleMessage(message: WebSocketMessage<T, M>) {
    switch (message.type) {
      case 'player:id':
        if (!message.id || !message.state || !message.metadata) return
        playerId = message.id
        playerMetadata = message.metadata
        playerState = message.state
        const playerComplete: PlayerComplete<T, M> = {
          ...message.state,
          metadata: message.metadata,
        }
        players.set(message.id, playerComplete)
        emitter.emit('playerJoin', playerComplete)
        break

      case 'player:state':
        if (!message.player || !message.player.id) return
        const existingPlayer = players.get(message.player.id)
        if (!existingPlayer) return

        const updatedPlayer: PlayerComplete<T, M> = {
          ...message.player,
          metadata: existingPlayer.metadata,
        }
        players.set(message.player.id, updatedPlayer)
        emitter.emit('playerUpdate', updatedPlayer)
        break

      case 'player:metadata':
        if (!message.metadata || !message.id) return
        const existingPlayerForMetadata = players.get(message.id)
        if (!existingPlayerForMetadata) return

        const playerWithUpdatedMetadata = {
          ...existingPlayerForMetadata,
          metadata: message.metadata,
        }
        players.set(message.id, playerWithUpdatedMetadata)
        emitter.emit('playerUpdate', playerWithUpdatedMetadata)
        break

      case 'player:leave':
        if (!message.id) return
        const leavingPlayer = players.get(message.id)
        if (leavingPlayer) {
          players.delete(message.id)
          emitter.emit('playerLeave', leavingPlayer)
        }
        break

      case 'error':
        if (!message.message) return
        emitter.emit('error', message.message)
        break

      default:
        console.warn('Unknown message type:', message)
    }
  }
}
