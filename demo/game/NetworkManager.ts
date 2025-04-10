import * as THREE from 'three'
import { CustomPlayerState } from '../types/custom'
import { PlayerId, Vector3 } from '../types/network'
import { EventEmitter } from '../utils/EventEmitter'
import { hasSignificantStateChange } from '../utils/stateChangeDetector'
import { Car } from './Car'
import { PlayerManager } from './PlayerManager'
import { UserManager } from './UserManager'
import { WebSocketClient } from './WebSocketClient'

export class NetworkManager {
  private wsClient: WebSocketClient

  constructor(
    private playerManager: PlayerManager,
    private car: Car,
    private userManager: UserManager & EventEmitter,
    private updateInterval: number = 50
  ) {
    this.wsClient = new WebSocketClient()
    this.car.setUsername(this.userManager.getUsername() || 'enpeasea')
    this.initializeNetworkHandlers()

    // Listen for username changes
    this.userManager.on('usernameChanged', (username: string | undefined) => {
      this.car.setUsername(username || 'enpeasea')
      this.forceStateUpdate() // Immediately send new state when username changes
    })
  }

  private initializeNetworkHandlers(): void {
    this.wsClient.onConnected((playerId, color, spawnPosition) => {
      this.car.setPlayerId(playerId)
      this.car.setColor(color)
      const threePosition = new THREE.Vector3(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      this.car.setPosition(threePosition)
    })

    this.wsClient.onPlayerUpdated((player) => {
      this.playerManager.updatePlayer(player)
    })

    this.wsClient.onPlayerLeft((playerId) => {
      this.playerManager.removePlayer(playerId)
    })
  }

  connect(): void {
    this.wsClient.connect()
  }

  disconnect(): void {
    this.wsClient.disconnect()
  }

  // Force an immediate state update regardless of time interval
  public forceStateUpdate(): void {
    const position = this.car.getPosition()
    const rotation = this.car.getMesh().rotation
    const hasCollided = this.car.getCollisionState()
    const collisionPoint = hasCollided ? this.car.getCollisionPoint() : undefined

    // Round rotation values to 3 decimal places to prevent floating point noise
    const roundedRotation = {
      x: Math.round(rotation.x * 1000) / 1000,
      y: Math.round(rotation.y * 1000) / 1000,
      z: Math.round(rotation.z * 1000) / 1000,
    }

    const currentState: CustomPlayerState = {
      id: this.car.getPlayerId()!,
      position: { x: position.x, y: position.y, z: position.z },
      rotation: roundedRotation,
      username: this.userManager.getUsername() || 'npc',
      hasCollided,
      color: this.car.getColor(),
      collisionPoint: collisionPoint ? { x: collisionPoint.x, y: collisionPoint.y, z: collisionPoint.z } : undefined,
    }

    // Only send update if state has changed significantly
    const hasChanged = hasSignificantStateChange(currentState)

    if (hasChanged) {
      // console.log('Sending state update')
      this.wsClient.updatePlayerState(currentState)
    }
  }

  updatePlayerState(lastUpdateTime: number): number {
    const now = Date.now()
    if (now - lastUpdateTime < this.updateInterval) return lastUpdateTime

    this.forceStateUpdate()
    return now
  }

  public onConnect(callback: (playerId: PlayerId, color: string, spawnPosition: Vector3) => void): void {
    this.wsClient.onConnected(callback)
  }

  // Add getter for WebSocketClient
  getWebSocketClient(): WebSocketClient {
    return this.wsClient
  }
}
