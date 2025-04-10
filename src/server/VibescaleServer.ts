import { DurableObject } from 'cloudflare:workers'
import { text } from 'itty-router'
import type {
  PlayerAtRest,
  PlayerId,
  PlayerIdMessage,
  PlayerState,
  Vector3,
  WebSocketMessage,
} from '../templates/network'
import { hasSignificantStateChange } from '../templates/stateChangeDetector'

// Extend WebSocket type to include Cloudflare-specific methods
interface CloudflareWebSocket extends WebSocket {
  serializeAttachment(value: WsMeta): void
  deserializeAttachment(): WsMeta
}

type RoomName = string

type WsMeta = {
  playerId: PlayerId
  roomName: RoomName
}

export class VibescaleServer extends DurableObject<Env> {
  private readonly POSITION_THRESHOLD = 0.1
  private readonly ROTATION_THRESHOLD = 0.1

  /**
   * Generates a random color that is visually distinct and visible
   * Uses HSL color space to ensure good contrast and visibility
   */
  private generateRandomColor(): string {
    // Random hue (0-360)
    const hue = Math.floor(Math.random() * 360)
    // Fixed saturation (70-100%) for vibrant colors
    const saturation = 70 + Math.floor(Math.random() * 30)
    // Fixed lightness (40-60%) for good visibility
    const lightness = 40 + Math.floor(Math.random() * 20)

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`
  }

  private generateSpawnPosition(): Vector3 {
    // Generate a random position in a circle around the center
    const radius = 5 // Distance from center
    const angle = Math.random() * Math.PI * 2 // Random angle
    return {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius,
    }
  }

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async fetch(request: Request) {
    console.log('fetch', request.url)
    const parsed = new URL(request.url)
    console.log('parsed', parsed)
    const [roomName, command] = parsed.pathname.split('/').filter(Boolean)
    if (!roomName) {
      return text(`Expected room name`, {
        status: 400,
      })
    }

    console.log('roomName', roomName)
    console.log('command', command)

    switch (command) {
      case 'websocket':
        return this.handleWebSocket(request, roomName)
      case undefined:
        return text(`${roomName} is healthy. ${this.playersOnline(roomName)} players online.`)
      default:
        return text(`Unknown command: ${command}`, {
          status: 400,
        })
    }
  }

  private playersOnline(roomName: string) {
    return this.getWebSocketsForRoom(roomName).length
  }

  private getWebSocketsForRoom(roomName: RoomName): CloudflareWebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws.deserializeAttachment()?.roomName === roomName)
  }

  private async handleWebSocket(request: Request, roomName: RoomName) {
    const upgradeHeader = request.headers.get('Upgrade')

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return text(`Durable Object expected Upgrade: websocket`, {
        status: 426,
      })
    }

    const webSocketPair = new WebSocketPair()
    const [client, ws] = Object.values(webSocketPair)
    const cloudflareWs = ws as CloudflareWebSocket

    const playerId = crypto.randomUUID()
    const color = this.generateRandomColor()
    const spawnPosition = this.generateSpawnPosition()
    this.ctx.acceptWebSocket(ws)

    cloudflareWs.serializeAttachment({
      playerId,
      roomName,
    })

    // Send the player their ID, color, and spawn position
    const idMessage: PlayerIdMessage = {
      type: 'player:id',
      id: playerId,
      metadata: {
        color,
      },
      state: {
        id: playerId,
        position: spawnPosition,
        rotation: { x: 0, y: 0, z: 0 },
      },
    }
    this.sendMessage(cloudflareWs, idMessage)

    const playerAtRest: PlayerAtRest = {
      id: playerId,
      position: spawnPosition,
      rotation: { x: 0, y: 0, z: 0 },
      metadata: {
        color,
      },
      extra: {},
    }
    await this.savePlayerAtRest(playerId, playerAtRest)

    this.sendInitialGameState(roomName, playerId, cloudflareWs)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private sendInitialGameState(roomName: RoomName, playerId: PlayerId, cloudflareWs: CloudflareWebSocket) {
    // Send all existing player states to the new player
    this.getWebSocketsForRoom(roomName).forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) return
      if (playerId === socket.deserializeAttachment()?.playerId) return

      return this.loadPlayerAtRest(playerId).then((existingState) => {
        if (!existingState) return

        const stateUpdate: WebSocketMessage = {
          type: 'player:state',
          player: existingState,
        }
        this.sendMessage(cloudflareWs, stateUpdate)
      })
    })
  }

  private async loadPlayerAtRest(playerId: PlayerId): Promise<PlayerAtRest | undefined> {
    return await this.ctx.storage.get<PlayerAtRest>(`player:${playerId}`)
  }

  private async savePlayerAtRest(playerId: PlayerId, playerAtRest: PlayerAtRest) {
    await this.ctx.storage.put(`player:${playerId}`, playerAtRest)
  }

  private sendMessage<T extends WebSocketMessage>(ws: CloudflareWebSocket, message: T) {
    // console.log('sendMessage', message)
    const playerId = this.ctx.getTags(ws)[0]
    if (!playerId) {
      // console.log('Skipping sendMessage because player ID was not found')
      return
    }
    if (ws.readyState !== WebSocket.OPEN) {
      // console.log('Skipping sendMessage to', playerId, 'because WebSocket is not open')
      return
    }
    // console.log('Sending message to', playerId, message)
    ws.send(JSON.stringify(message))
  }

  async webSocketError(ws: CloudflareWebSocket, error: unknown) {
    // console.log('webSocketError', error)
  }

  // Incoming messages from the client
  async webSocketMessage(ws: CloudflareWebSocket, message: string) {
    const data = JSON.parse(message) as WebSocketMessage
    // console.log('Received message', message)
    const playerId = this.ctx.getTags(ws)[0]
    if (!playerId) {
      // console.log('Skipping webSocketMessage because player ID was not found')
      return
    }

    switch (data.type) {
      case 'player:state':
        // console.log('player:state', data)
        const lastState = await this.ctx.storage.get<PlayerState>(`player:${playerId}`)
        const newState = data.player

        // Skip update if no significant change using shared detector
        if (lastState && !hasSignificantStateChange(newState)) {
          return
        }

        // Update storage and broadcast
        await this.ctx.storage.put(`player:${playerId}`, newState)
        const stateUpdate: WebSocketMessage = {
          type: 'player:state',
          player: newState,
        }
        this.broadcast(stateUpdate, playerId)
        break

      default:
        const errorMessage: WebSocketMessage = {
          type: 'error',
          message: `Unknown message type: ${data.type}`,
        }
        this.sendMessage(ws, errorMessage)
        console.error(errorMessage.message)
        break
    }
  }

  async webSocketClose(ws: CloudflareWebSocket, code: number, reason: string, wasClean: boolean) {
    const playerId = this.ctx.getTags(ws)[0]
    if (playerId) {
      // console.log('Removing player', playerId, 'from the game')
      await this.ctx.storage.delete(`player:${playerId}`)
      // console.log('Removed player', playerId, 'from the game')

      // Notify others of the disconnection
      this.broadcast(
        {
          type: 'player:leave',
          id: playerId,
        },
        playerId
      )
    }
    ws.close(code, 'Durable Object is closing WebSocket')
    // console.log('WebSocket closed', code, reason, wasClean)
  }

  private broadcast(message: WebSocketMessage, excludePlayerId: PlayerId) {
    const sockets = this.ctx.getWebSockets() as CloudflareWebSocket[]
    // console.log('Broadcasting message to', sockets.length - 1, 'players')

    for (const socket of sockets) {
      const playerId = this.ctx.getTags(socket)[0]
      if (playerId === excludePlayerId) {
        // console.log('Skipping message to', playerId, 'because it is the sender')
        continue
      }
      if (socket.readyState !== WebSocket.OPEN) {
        // console.log('Skipping message to', playerId, 'because WebSocket is not open')
        continue
      }
      this.sendMessage(socket, message)
    }
  }
}
