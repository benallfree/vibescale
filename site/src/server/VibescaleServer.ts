import { DurableObject } from 'cloudflare:workers'
import { text } from 'itty-router'
import { hasSignificantStateChange } from './stateChangeDetector'
import {
  MessageType,
  type Player,
  type PlayerId,
  type PlayerMetadataMessage,
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

    const initialPlayer: Player = {
      id: playerId,
      delta: {
        position: spawnPosition,
        rotation: { x: 0, y: 0, z: 0 },
      },
      metadata: {},
      server: {
        color,
      },
    }

    // Send the player their ID, color, and spawn position
    this.sendMessage(cloudflareWs, {
      type: MessageType.Player,
      player: initialPlayer,
      isLocal: true,
    })

    await this.savePlayer(initialPlayer)

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

      return this.loadPlayer(playerId).then((playerState) => {
        if (!playerState) return

        this.sendMessage(cloudflareWs, {
          type: MessageType.Player,
          player: playerState,
          isLocal: false,
        })
      })
    })
  }

  private async loadPlayer(playerId: PlayerId): Promise<Player | undefined> {
    return await this.ctx.storage.get<Player>(`player:${playerId}`)
  }

  private async savePlayer(player: Player) {
    await this.ctx.storage.put(`player:${player.id}`, player)
  }

  private sendMessage<T extends WebSocketMessage>(ws: CloudflareWebSocket, message: T) {
    const playerId = ws.deserializeAttachment()?.playerId
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
    const playerId = ws.deserializeAttachment()?.playerId
    if (!playerId) {
      // console.log('Skipping webSocketMessage because player ID was not found')
      return
    }

    switch (data.type) {
      case MessageType.PlayerDelta: {
        // console.log('player:state', data)
        const player = await this.loadPlayer(playerId)
        if (!player) {
          const errorMessage: WebSocketMessage = {
            type: MessageType.Error,
            message: `Player not found: ${playerId}`,
          }
          this.sendMessage(ws, errorMessage)
          return
        }

        const nextState: Player = {
          ...player,
          delta: data.delta,
        }

        // Skip update if no significant change using shared detector
        if (!hasSignificantStateChange(nextState)) {
          return
        }

        // Update storage and broadcast
        await this.savePlayer(nextState)
        this.broadcast(
          {
            type: MessageType.PlayerDelta,
            id: playerId,
            delta: data.delta,
          },
          playerId
        )
        break
      }

      case MessageType.PlayerMetadata:
        // Load existing player data
        const player = await this.loadPlayer(playerId)
        if (!player) {
          const errorMessage: WebSocketMessage = {
            type: MessageType.Error,
            message: `Player not found: ${playerId}`,
          }
          this.sendMessage(ws, errorMessage)
          return
        }

        // Update storage
        await this.savePlayer({
          ...player,
          metadata: data.metadata,
        })

        // Broadcast to all clients including the sender
        const metadataUpdate: PlayerMetadataMessage = {
          type: MessageType.PlayerMetadata,
          id: playerId,
          metadata: data.metadata,
        }
        this.broadcast(metadataUpdate, playerId)
        break

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
    const meta = ws.deserializeAttachment()
    const playerId = meta?.playerId
    if (playerId) {
      // console.log('Removing player', playerId, 'from the game')
      await this.ctx.storage.delete(`player:${playerId}`)
      // console.log('Removed player', playerId, 'from the game')

      // Notify others of the disconnection
      this.broadcast(
        {
          type: MessageType.PlayerLeave,
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
      const meta = socket.deserializeAttachment()
      const playerId = meta?.playerId
      if (playerId === excludePlayerId) {
        // console.log('Skipping message to', playerId, 'because it is the sender')
        continue
      }
      if (socket.readyState !== WebSocket.OPEN) {
        // console.log('Skipping message to', playerId, 'because WebSocket is not open')
        continue
      }

      if ('isLocal' in message && 'id' in message) {
        const isLocal = message.id === playerId
        this.sendMessage(socket, {
          ...message,
          isLocal,
        })
      } else {
        this.sendMessage(socket, message)
      }
    }
  }
}
