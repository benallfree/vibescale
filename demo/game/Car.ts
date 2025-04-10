import * as THREE from 'three'
import { CarPhysicsConfig, defaultCarPhysics } from '../demo/config/carPhysics'
import type { JoystickState } from '../demo/controls/TouchControls'
import { createCarMesh } from '../utils/createCarMesh'
import { AudioManager } from './AudioManager'

export class Car {
  private mesh: THREE.Group
  private velocity: THREE.Vector3
  private physics: CarPhysicsConfig
  private username?: string
  private playerId?: string
  private audioManager?: AudioManager
  private hasCollided = false
  private collisionReported = false
  private lastCollisionPoint?: THREE.Vector3
  private readonly boundingBox: THREE.Box3
  private readonly CAR_WIDTH = 2
  private readonly CAR_LENGTH = 4
  private polls: THREE.Mesh[] = []
  private obstacles: THREE.Mesh[] = []
  private walls: THREE.Mesh[] = []
  private otherPlayers = new Map<string, THREE.Group>()

  constructor(physics: CarPhysicsConfig = defaultCarPhysics) {
    this.mesh = createCarMesh()
    this.velocity = new THREE.Vector3()
    this.physics = physics
    this.boundingBox = new THREE.Box3()
  }

  public setAudioManager(audioManager: AudioManager): void {
    this.audioManager = audioManager
  }

  public setPollObjects(polls: THREE.Mesh[]): void {
    this.polls = polls
  }

  public setObstacles(obstacles: THREE.Mesh[]): void {
    this.obstacles = obstacles
  }

  public setWalls(walls: THREE.Mesh[]): void {
    this.walls = walls
  }

  public setOtherPlayers(players: Map<string, { group: THREE.Group }>): void {
    this.otherPlayers = new Map([...players].map(([id, obj]) => [id, obj.group]))
  }

  private handleCollisions(): boolean {
    // Update our bounding box
    this.boundingBox.setFromObject(this.mesh)
    let collided = false
    let collisionPoint: THREE.Vector3 | undefined
    const IMPACT_VELOCITY_THRESHOLD = 5 // Only count as collision if impact speed is above this

    // Check all collidable objects
    const allObjects = [...this.walls, ...this.obstacles, ...this.polls]
    for (const obj of allObjects) {
      const objBox = new THREE.Box3().setFromObject(obj)
      if (this.boundingBox.intersectsBox(objBox)) {
        // Get overlap on each axis
        const overlap = new THREE.Vector3()
        overlap.x = Math.min(this.boundingBox.max.x - objBox.min.x, objBox.max.x - this.boundingBox.min.x)
        overlap.z = Math.min(this.boundingBox.max.z - objBox.min.z, objBox.max.z - this.boundingBox.min.z)

        // Push back along smallest overlap axis
        if (overlap.x < overlap.z) {
          // Move back to just touching
          this.mesh.position.x += overlap.x * (this.boundingBox.min.x < objBox.min.x ? -1 : 1)

          // Only apply bounce effects if impact is significant
          if (Math.abs(this.velocity.x) > IMPACT_VELOCITY_THRESHOLD) {
            collided = true
            collisionPoint = obj.position.clone()
            collisionPoint.y = 1
            this.lastCollisionPoint = collisionPoint
            this.velocity.x *= -this.physics.bounceRestitution
          } else {
            // For low speed, just zero out velocity in collision direction
            this.velocity.x = 0
          }
        } else {
          // Move back to just touching
          this.mesh.position.z += overlap.z * (this.boundingBox.min.z < objBox.min.z ? -1 : 1)

          // Only apply bounce effects if impact is significant
          if (Math.abs(this.velocity.z) > IMPACT_VELOCITY_THRESHOLD) {
            collided = true
            collisionPoint = obj.position.clone()
            collisionPoint.y = 1
            this.lastCollisionPoint = collisionPoint
            this.velocity.z *= -this.physics.bounceRestitution
          } else {
            // For low speed, just zero out velocity in collision direction
            this.velocity.z = 0
          }
        }
        this.mesh.position.y = 0
        break
      }
    }

    // Check other player collisions - same logic as static objects
    for (const [id, otherCar] of this.otherPlayers) {
      if (id === this.playerId) continue
      const otherBox = new THREE.Box3().setFromObject(otherCar)
      if (this.boundingBox.intersectsBox(otherBox)) {
        // Get overlap on each axis
        const overlap = new THREE.Vector3()
        overlap.x = Math.min(this.boundingBox.max.x - otherBox.min.x, otherBox.max.x - this.boundingBox.min.x)
        overlap.z = Math.min(this.boundingBox.max.z - otherBox.min.z, otherBox.max.z - this.boundingBox.min.z)

        // Push back along smallest overlap axis
        if (overlap.x < overlap.z) {
          // Move back to just touching
          this.mesh.position.x += overlap.x * (this.boundingBox.min.x < otherBox.min.x ? -1 : 1)

          // Only apply bounce effects if impact is significant
          if (Math.abs(this.velocity.x) > IMPACT_VELOCITY_THRESHOLD) {
            collided = true
            collisionPoint = otherCar.position.clone()
            collisionPoint.y = 1
            this.lastCollisionPoint = collisionPoint
            this.velocity.x *= -this.physics.bounceRestitution
          } else {
            // For low speed, just zero out velocity in collision direction
            this.velocity.x = 0
          }
        } else {
          // Move back to just touching
          this.mesh.position.z += overlap.z * (this.boundingBox.min.z < otherBox.min.z ? -1 : 1)

          // Only apply bounce effects if impact is significant
          if (Math.abs(this.velocity.z) > IMPACT_VELOCITY_THRESHOLD) {
            collided = true
            collisionPoint = otherCar.position.clone()
            collisionPoint.y = 1
            this.lastCollisionPoint = collisionPoint
            this.velocity.z *= -this.physics.bounceRestitution
          } else {
            // For low speed, just zero out velocity in collision direction
            this.velocity.z = 0
          }
        }
        this.mesh.position.y = 0
        break
      }
    }

    return collided
  }

  public update(input: JoystickState, deltaTime: number): void {
    // Update rotation based on input
    if (Math.abs(input.x) > 0.1) {
      this.mesh.rotation.y -= input.x * this.physics.turnSpeed * deltaTime
    }

    // Calculate forward direction
    const forward = new THREE.Vector3(0, 0, 1)
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mesh.rotation.y)

    // Update velocity based on input
    if (Math.abs(input.y) > 0.1) {
      const acceleration = forward.multiplyScalar(input.y * this.physics.acceleration * deltaTime)
      this.velocity.add(acceleration)
    }

    // Apply friction
    this.velocity.multiplyScalar(1 - this.physics.friction * deltaTime)

    // Limit speed
    const speed = this.velocity.length()
    if (speed > this.physics.maxSpeed) {
      this.velocity.multiplyScalar(this.physics.maxSpeed / speed)
    }

    // Keep velocity in XZ plane
    this.velocity.y = 0

    // Update position
    const newPosition = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime))
    newPosition.y = 0 // Keep Y position at 0
    this.mesh.position.copy(newPosition)

    // Handle collisions and get collision state
    const collided = this.handleCollisions()

    // Update collision state and play sounds
    if (collided && !this.collisionReported) {
      this.hasCollided = true
      this.collisionReported = true
      if (this.audioManager && this.lastCollisionPoint) {
        this.audioManager.playCollisionSounds(this.lastCollisionPoint)
      }
    } else if (!collided) {
      this.hasCollided = false
      this.collisionReported = false
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }

  public getMesh(): THREE.Group {
    return this.mesh
  }

  public getCollisionState(): boolean {
    return this.hasCollided
  }

  public getCollisionPoint(): THREE.Vector3 | undefined {
    return this.lastCollisionPoint?.clone()
  }

  public setUsername(username: string): void {
    this.username = username
    // Recreate car mesh with new username
    const oldPosition = this.mesh.position.clone()
    const oldRotation = this.mesh.rotation.clone()
    const bodyMesh = this.mesh.children[0] as THREE.Mesh
    const oldColor = (bodyMesh.material as THREE.MeshPhongMaterial).color

    // Store old scene reference
    const scene = this.mesh.parent

    // Remove old mesh from scene
    if (scene) {
      scene.remove(this.mesh)
    }

    // Create new mesh with username
    this.mesh = createCarMesh({
      bodyColor: oldColor.getHex(),
      username: username,
    })

    // Restore position and rotation
    this.mesh.position.copy(oldPosition)
    this.mesh.rotation.copy(oldRotation)

    // Add back to scene if it was in one
    if (scene) {
      scene.add(this.mesh)
    }
  }

  public getUsername(): string | undefined {
    return this.username
  }

  public setPlayerId(id: string): void {
    this.playerId = id
  }

  public getPlayerId(): string | undefined {
    return this.playerId
  }

  public setColor(color: string | number): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.MeshPhongMaterial) {
          if (child.material.color.getHex() === 0x2196f3) {
            child.material.color.set(color)
          }
        }
      }
    })
  }

  public getColor(): string {
    // Find the body mesh (first child) and get its color
    const bodyMesh = this.mesh.children[0] as THREE.Mesh
    if (bodyMesh && bodyMesh.material instanceof THREE.MeshPhongMaterial) {
      return '#' + bodyMesh.material.color.getHexString()
    }
    return '#2196f3' // Default color if not found
  }

  public reset(): void {
    this.mesh.position.set(0, 0, 0)
    this.mesh.rotation.set(0, 0, 0)
    this.velocity.set(0, 0, 0)
    this.hasCollided = false
    this.collisionReported = false
    this.lastCollisionPoint = undefined
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position)
  }
}
