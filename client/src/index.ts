console.log('Hello via Bun!')

export interface Vector3 {
  x: number
  y: number
  z: number
}

export type PlayerId = string

export interface PlayerState {
  id: PlayerId
  position: Vector3
  rotation: Vector3
}

export interface PlayerMetadata {
  color: string
  [key: string]: unknown
}

export interface PlayerAtRest {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  metadata: PlayerMetadata
  extra: Record<string, unknown>
}

export interface RoomOptions {
  url?: string
  onStateChange?: (state: PlayerState) => void
  onPlayerJoin?: (player: PlayerAtRest) => void
  onPlayerLeave?: (playerId: PlayerId) => void
  onError?: (error: string) => void
}

export interface Room {
  broadcast: (message: any) => void
  onStateChange: (callback: (state: PlayerState) => void) => void
  onPlayerJoin: (callback: (player: PlayerAtRest) => void) => void
  onPlayerLeave: (callback: (playerId: PlayerId) => void) => void
  getPlayerId: () => PlayerId | null
  getPlayerMetadata: () => PlayerMetadata | null
  getPlayerState: () => PlayerState | null
  disconnect: () => void
}

interface WebSocketMessage {
  type: 'player:id' | 'player:state' | 'player:leave' | 'error'
  id?: PlayerId
  state?: PlayerState
  player?: PlayerState
  metadata?: PlayerMetadata
  message?: string
}

export async function createRoom(roomName: string, options: RoomOptions = {}): Promise<Room> {
  const ws = new WebSocket(`${options.url || 'wss://vibescale.benallfree.com'}/${roomName}/websocket`)
  let playerId: PlayerId | null = null
  let playerMetadata: PlayerMetadata | null = null
  let playerState: PlayerState | null = null

  // Event callbacks
  let onStateChangeCallback = options.onStateChange || (() => {})
  let onPlayerJoinCallback = options.onPlayerJoin || (() => {})
  let onPlayerLeaveCallback = options.onPlayerLeave || (() => {})
  let onErrorCallback = options.onError || console.error

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      console.log('Connected to Vibescale room:', roomName)

      const room: Room = {
        broadcast: (message: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message))
          }
        },

        onStateChange: (callback) => {
          onStateChangeCallback = callback
        },

        onPlayerJoin: (callback) => {
          onPlayerJoinCallback = callback
        },

        onPlayerLeave: (callback) => {
          onPlayerLeaveCallback = callback
        },

        getPlayerId: () => playerId,
        getPlayerMetadata: () => playerMetadata,
        getPlayerState: () => playerState,

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
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      onErrorCallback('WebSocket connection error')
      reject(error)
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage
        handleMessage(message)
      } catch (error) {
        console.error('Error parsing message:', error)
        onErrorCallback('Error parsing server message')
      }
    }
  })

  function handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'player:id':
        if (!message.id || !message.state || !message.metadata) return
        playerId = message.id
        playerMetadata = message.metadata
        playerState = message.state
        const playerAtRest: PlayerAtRest = {
          id: message.id,
          position: message.state.position,
          rotation: message.state.rotation,
          metadata: message.metadata,
          extra: {},
        }
        onPlayerJoinCallback(playerAtRest)
        break

      case 'player:state':
        if (!message.player) return
        onStateChangeCallback(message.player)
        break

      case 'player:leave':
        if (!message.id) return
        onPlayerLeaveCallback(message.id)
        break

      case 'error':
        if (!message.message) return
        onErrorCallback(message.message)
        break

      default:
        console.warn('Unknown message type:', message)
    }
  }
}
