import * as THREE from 'three'
import { CustomPlayerState } from '../types/custom'
import { PlayerId } from '../types/network'
import { createCarMesh } from '../utils/createCarMesh'
import { AudioManager } from './AudioManager'

interface InterpolationState {
  currentPosition: THREE.Vector3
  targetPosition: THREE.Vector3
  currentRotation: THREE.Vector3
  targetRotation: THREE.Vector3
  lastUpdateTime: number
}

interface PlayerObjects {
  group: THREE.Group
  lastPosition?: THREE.Vector3
}

export class PlayerManager {
  private players = new Map<PlayerId, PlayerObjects>()
  private interpolationStates = new Map<PlayerId, InterpolationState>()
  private scene: THREE.Scene
  private readonly INTERPOLATION_DURATION = 0.1 // 100ms interpolation
  private audioManager?: AudioManager

  constructor(scene: THREE.Scene) {
    this.scene = scene
  }

  setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  addPlayer(state: CustomPlayerState): void {
    if (this.players.has(state.id)) {
      return
    }

    // Create car mesh for the remote player
    const playerGroup = createCarMesh({
      bodyColor: state.color,
      username: state.username,
    })

    // Create player objects container
    const playerObjects: PlayerObjects = {
      group: playerGroup,
    }

    // Position the player
    playerGroup.position.set(state.position.x, state.position.y, state.position.z)
    const rotation = new THREE.Vector3(state.rotation.x, state.rotation.y, state.rotation.z)
    playerGroup.rotation.setFromVector3(rotation)

    // Initialize interpolation state
    this.interpolationStates.set(state.id, {
      currentPosition: playerGroup.position.clone(),
      targetPosition: playerGroup.position.clone(),
      currentRotation: new THREE.Vector3().setFromEuler(playerGroup.rotation),
      targetRotation: rotation.clone(),
      lastUpdateTime: performance.now(),
    })

    // Add to scene and store reference
    this.scene.add(playerGroup)
    this.players.set(state.id, playerObjects)
  }

  updatePlayer(state: CustomPlayerState): void {
    const playerObjects = this.players.get(state.id)
    const interpolationState = this.interpolationStates.get(state.id)

    if (!playerObjects || !interpolationState) {
      this.addPlayer(state)
      return
    }

    // Play collision sounds if the player has collided
    if (state.hasCollided && state.collisionPoint && this.audioManager) {
      const soundPosition = new THREE.Vector3(state.collisionPoint.x, state.collisionPoint.y, state.collisionPoint.z)
      this.audioManager.playCollisionSounds(soundPosition)
    }

    // Update username if changed
    if (state.username !== playerObjects.group.userData.username) {
      // Remove old group from scene
      this.scene.remove(playerObjects.group)

      // Create new group with updated username
      const newGroup = createCarMesh({
        bodyColor: state.color,
        username: state.username,
      })
      newGroup.position.copy(playerObjects.group.position)
      newGroup.rotation.copy(playerObjects.group.rotation)
      newGroup.userData.username = state.username

      // Update references
      playerObjects.group = newGroup
      this.scene.add(newGroup)
    }

    // Update interpolation targets
    interpolationState.currentPosition.copy(playerObjects.group.position)
    interpolationState.currentRotation.setFromEuler(playerObjects.group.rotation)
    interpolationState.targetPosition.set(state.position.x, state.position.y, state.position.z)
    interpolationState.targetRotation.set(state.rotation.x, state.rotation.y, state.rotation.z)
    interpolationState.lastUpdateTime = performance.now()
  }

  update(): void {
    const currentTime = performance.now()

    this.interpolationStates.forEach((state, playerId) => {
      const playerObjects = this.players.get(playerId)
      if (!playerObjects) return

      const timeDelta = (currentTime - state.lastUpdateTime) / 1000
      const alpha = Math.min(timeDelta / this.INTERPOLATION_DURATION, 1)

      // Interpolate position
      playerObjects.group.position.lerpVectors(state.currentPosition, state.targetPosition, alpha)

      // Interpolate rotation
      const interpolatedRotation = new THREE.Vector3()
      interpolatedRotation.lerpVectors(state.currentRotation, state.targetRotation, alpha)
      playerObjects.group.rotation.setFromVector3(interpolatedRotation)
    })
  }

  removePlayer(playerId: PlayerId): void {
    const playerObjects = this.players.get(playerId)
    if (!playerObjects) return

    this.scene.remove(playerObjects.group)
    this.players.delete(playerId)
    this.interpolationStates.delete(playerId)
  }

  public getPlayers(): Map<PlayerId, PlayerObjects> {
    return this.players
  }
}
