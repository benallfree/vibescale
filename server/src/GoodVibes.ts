import { DurableObject } from 'cloudflare:workers'
import { text } from 'itty-router'
import type { PlayerId, PlayerState, Vector3, WebSocketMessage } from '../../client/src/templates/types'
import { hasSignificantStateChange } from '../../shared/stateChangeDetector'

// Extend WebSocket type to include Cloudflare-specific methods
interface CloudflareWebSocket extends WebSocket {
  getTags(): string[]
}

export class GoodVibes extends DurableObject<Env> {
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

  /**
   * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
   * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
   *
   * @param ctx - The interface for interacting with Durable Object state
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async fetch(request: Request) {
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
    this.ctx.acceptWebSocket(ws, [playerId])

    // Send the player their ID, color, and spawn position
    const idMessage: WebSocketMessage = {
      type: 'player:id',
      id: playerId,
      color,
      spawnPosition,
    }
    this.sendMessage(cloudflareWs, idMessage)

    // Store initial player state with color and spawn position
    const initialState: PlayerState = {
      id: playerId,
      position: spawnPosition,
      rotation: { x: 0, y: 0, z: 0 },
      color,
      username: 'enpeasea', // Default username until player sets their own
    }
    await this.ctx.storage.put(`player:${playerId}`, initialState)

    // Send all existing player states to the new player
    const sockets = this.ctx.getWebSockets() as CloudflareWebSocket[]
    for (const socket of sockets) {
      if (socket.readyState !== WebSocket.OPEN) continue

      const existingPlayerId = this.ctx.getTags(socket)[0]
      if (!existingPlayerId || existingPlayerId === playerId) continue

      const existingState = await this.ctx.storage.get<PlayerState>(`player:${existingPlayerId}`)
      if (!existingState) continue

      const stateUpdate: WebSocketMessage = {
        type: 'player:state',
        player: existingState,
      }
      this.sendMessage(cloudflareWs, stateUpdate)
    }

    // Broadcast the new player's initial state to all other players
    const stateUpdate: WebSocketMessage = {
      type: 'player:state',
      player: initialState,
    }
    this.broadcast(stateUpdate, playerId)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
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

        // Create new state preserving color from last state
        const newState: PlayerState = {
          id: playerId,
          position: data.player.position,
          rotation: data.player.rotation,
          color: lastState?.color || this.generateRandomColor(),
          username: data.player.username || lastState?.username || 'enpeasea',
        }

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
