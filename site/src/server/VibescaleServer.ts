import { DurableObject } from 'cloudflare:workers'
import { text } from 'itty-router'
import packageJson from '../../package.json'
import {
  MessageType,
  type PlayerBase,
  type PlayerId,
  type RoomName,
  type Vector3,
  type WebSocketMessage,
  type WsMeta,
} from './types'

// Extend WebSocket type to include Cloudflare-specific methods
interface CloudflareWebSocket extends WebSocket {
  serializeAttachment(value: WsMeta): void
  deserializeAttachment(): WsMeta
}

export class VibescaleServer extends DurableObject<Env> {
  private readonly wsRef = new Set<CloudflareWebSocket>()
  private readonly wsStateByWs = new Map<CloudflareWebSocket, WsMeta>()

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    // Initialize maps from existing websockets
    for (const ws of ctx.getWebSockets()) {
      const cloudflareWs = ws as CloudflareWebSocket
      const meta = cloudflareWs.deserializeAttachment()
      if (!meta?.player) {
        ws.close(1000, 'Invalid WebSocket attachment')
        continue
      }

      this.addWebSocket(cloudflareWs, meta.player)
    }
  }

  private addWebSocket(ws: CloudflareWebSocket, player: PlayerBase) {
    const meta: WsMeta = { player }
    this.wsStateByWs.set(ws, meta)
    this.wsRef.add(ws)
  }

  private removeWebSocket(ws: CloudflareWebSocket) {
    const meta = this.wsStateByWs.get(ws)
    if (!meta?.player) return

    this.wsStateByWs.delete(ws)
    this.wsRef.delete(ws)
  }

  private playersOnline() {
    return this.wsRef.size
  }

  async fetch(request: Request) {
    const parsed = new URL(request.url)
    const [roomName, command] = parsed.pathname.split('/').filter(Boolean)
    if (!roomName) {
      return text(`Expected room name`, {
        status: 400,
      })
    }

    switch (command) {
      case 'websocket':
        return this.handleWebSocket(request, roomName)
      case undefined:
        return text(`${roomName} is healthy. ${this.playersOnline()} players online.`)
      default:
        return text(`Unknown command: ${command}`, {
          status: 400,
        })
    }
  }

  private handleWebSocket(request: Request, roomName: RoomName) {
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

    const initialPlayer: PlayerBase = {
      id: playerId,
      position: spawnPosition,
      rotation: { x: 0, y: 0, z: 0 },
      color,
      username: 'enpeasea',
      isLocal: false,
      isConnected: true,
    }

    this.ctx.acceptWebSocket(ws)

    cloudflareWs.serializeAttachment({
      player: initialPlayer,
    })

    this.addWebSocket(cloudflareWs, initialPlayer)

    // Send version information first
    this.sendMessage(cloudflareWs, {
      type: MessageType.Version,
      version: packageJson.version,
    })

    // Send the player their ID, color, and spawn position
    this.sendMessage(cloudflareWs, {
      type: MessageType.PlayerState,
      ...initialPlayer,
      isLocal: true,
    })

    this.sendInitialGameState(playerId, cloudflareWs)
    this.announcePlayerJoin(initialPlayer)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private announcePlayerJoin(player: PlayerBase) {
    this.broadcast(
      {
        type: MessageType.PlayerState,
        ...player,
        isLocal: false,
      },
      player.id
    )
  }

  private sendInitialGameState(playerId: PlayerId, cloudflareWs: CloudflareWebSocket) {
    this.wsRef.forEach((socket) => {
      if (socket.readyState !== WebSocket.OPEN) return
      const wsState = this.wsStateByWs.get(socket)
      if (!wsState?.player || wsState.player.id === playerId) return

      this.sendMessage(cloudflareWs, {
        type: MessageType.PlayerState,
        ...wsState.player,
        isLocal: false,
      })
    })
  }

  private sendMessage<T extends WebSocketMessage>(ws: CloudflareWebSocket, message: T) {
    const wsState = this.wsStateByWs.get(ws)
    if (!wsState?.player) return
    if (ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(message))
  }

  async webSocketError(ws: CloudflareWebSocket, error: unknown) {
    console.log('webSocketError', error)
  }

  // Incoming messages from the client
  async webSocketMessage(ws: CloudflareWebSocket, message: string) {
    const data = JSON.parse(message) as WebSocketMessage
    const wsState = this.wsStateByWs.get(ws)
    if (!wsState?.player) return

    switch (data.type) {
      case MessageType.PlayerState: {
        const nextState = data as PlayerBase

        this.savePlayer(ws, nextState)
        this.broadcast(
          {
            type: MessageType.PlayerState,
            ...nextState,
            isLocal: false,
          },
          wsState.player.id
        )
        break
      }

      default:
        const errorMessage: WebSocketMessage = {
          type: MessageType.Error,
          message: `Unknown message type: ${data.type}`,
        }
        this.sendMessage(ws, errorMessage)
        console.error(errorMessage.message)
        break
    }
  }

  async webSocketClose(ws: CloudflareWebSocket, code: number, reason: string, wasClean: boolean) {
    const wsState = this.wsStateByWs.get(ws)
    if (!wsState?.player) return

    this.removeWebSocket(ws)

    // Notify others of the disconnection
    this.broadcast(
      {
        type: MessageType.PlayerState,
        ...wsState.player,
        isLocal: false,
        isConnected: false,
      },
      wsState.player.id
    )

    ws.close(code, 'Durable Object is closing WebSocket')
  }

  private broadcast(message: WebSocketMessage, excludePlayerId: PlayerId) {
    for (const socket of this.wsRef) {
      const wsState = this.wsStateByWs.get(socket)
      if (!wsState?.player || wsState.player.id === excludePlayerId) continue
      if (socket.readyState !== WebSocket.OPEN) continue

      if (message.type === MessageType.PlayerState) {
        const playerMessage = message as WebSocketMessage & { player: PlayerBase }
        this.sendMessage(socket, {
          ...message,
          player: { ...playerMessage.player, isLocal: false },
        })
      } else {
        this.sendMessage(socket, message)
      }
    }
  }

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
    // Generate a random position in a circle around the center (0, 0)
    // Using normalized coordinates (-1 to 1 scale)
    const radius = Math.random() // Random radius between 0-1 for full circle coverage
    const angle = Math.random() * Math.PI * 2 // Random angle
    return {
      x: Math.cos(angle) * radius, // Center at 0 with circular offset
      y: 0,
      z: Math.sin(angle) * radius, // Center at 0 with circular offset
    }
  }

  private savePlayer(ws: CloudflareWebSocket, player: PlayerBase) {
    const wsState = this.wsStateByWs.get(ws)
    if (!wsState) return

    // Update local cache
    this.wsStateByWs.set(ws, {
      ...wsState,
      player,
    })

    // Write through to WebSocket metadata
    ws.serializeAttachment({
      ...wsState,
      player,
    })
  }
}
