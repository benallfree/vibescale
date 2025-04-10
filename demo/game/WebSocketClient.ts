import { CustomPlayerState } from '../types/custom'
import { PlayerId, PlayerState, Vector3, WebSocketMessage } from '../types/network'
import { EventEmitter } from '../utils/EventEmitter'

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private playerId: PlayerId | null = null
  private color: string | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000 // Start with 1 second delay
  private serverUrl: string

  private onPlayerJoinedCallbacks: ((player: PlayerState) => void)[] = []
  private onPlayerLeftCallbacks: ((playerId: PlayerId) => void)[] = []
  private onPlayerUpdatedCallbacks: ((player: CustomPlayerState) => void)[] = []
  private onConnectedCallbacks: ((playerId: PlayerId, color: string, spawnPosition: Vector3) => void)[] = []

  constructor() {
    super()
    this.serverUrl = `/websocket`
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.serverUrl)

    this.ws.onopen = () => {
      console.log('Connected to game server')
      this.reconnectAttempts = 0 // Reset reconnect attempts on successful connection
    }

    this.ws.onmessage = (event) => {
      this.emit('message:received', event.data)
      const message = JSON.parse(event.data) as WebSocketMessage
      this.handleMessage(message)
    }

    this.ws.onclose = () => {
      console.log('Disconnected from game server')
      this.attemptReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    console.log(`Attempting to reconnect in ${delay}ms...`)

    setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case 'player:id':
        this.playerId = message.id
        this.onConnectedCallbacks.forEach((cb) => cb(message.id, message.metadata.color, message.state.position))
        break

      case 'player:state':
        if (message.player.id === this.playerId) return // Ignore our own updates
        this.onPlayerUpdatedCallbacks.forEach((cb) => cb(message.player as CustomPlayerState))
        break

      case 'player:leave':
        this.onPlayerLeftCallbacks.forEach((cb) => cb(message.id))
        break

      case 'error':
        console.error('Server error:', message.message)
        break
    }
  }

  updatePlayerState(state: CustomPlayerState) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.playerId) return

    const stateMessage: WebSocketMessage = {
      type: 'player:state',
      player: state,
    }

    const data = JSON.stringify(stateMessage)
    // console.log('WebSocket sending message:', state.player)
    this.emit('message:sent', data)
    this.ws.send(data)
  }

  getServerUrl(): string {
    return this.serverUrl
  }

  onPlayerJoined(callback: (player: PlayerState) => void) {
    this.onPlayerJoinedCallbacks.push(callback)
  }

  onPlayerLeft(callback: (playerId: PlayerId) => void) {
    this.onPlayerLeftCallbacks.push(callback)
  }

  onPlayerUpdated(callback: (player: CustomPlayerState) => void) {
    this.onPlayerUpdatedCallbacks.push(callback)
  }

  onConnected(callback: (playerId: PlayerId, color: string, spawnPosition: Vector3) => void) {
    this.onConnectedCallbacks.push(callback)
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this.playerId = null
    this.color = null
  }
}
