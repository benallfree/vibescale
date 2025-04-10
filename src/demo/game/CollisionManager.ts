import * as THREE from 'three'
import { CarPhysicsConfig } from '../demo/config/carPhysics'

interface Collidable {
  mesh: THREE.Mesh | THREE.Group
  type: 'wall' | 'poll' | 'obstacle' | 'player'
  boundingBox?: THREE.Box3
  radius?: number
}

export class CollisionManager {
  private readonly boundingBox: THREE.Box3
  private readonly localBox: THREE.Box3
  private readonly physics: CarPhysicsConfig
  private readonly CAR_WIDTH = 2
  private readonly CAR_LENGTH = 4
  private collidables: Collidable[] = []
  private lastCollisionPoint?: THREE.Vector3
  private hasCollided = false

  constructor(physics: CarPhysicsConfig) {
    this.physics = physics
    this.localBox = new THREE.Box3(
      new THREE.Vector3(-this.CAR_WIDTH / 2, 0, -this.CAR_LENGTH / 2),
      new THREE.Vector3(this.CAR_WIDTH / 2, 1, this.CAR_LENGTH / 2)
    )
    this.boundingBox = new THREE.Box3()
  }

  public setCollidables(objects: { mesh: THREE.Mesh | THREE.Group; type: Collidable['type'] }[]): void {
    this.collidables = objects.map((obj) => {
      const collidable: Collidable = { ...obj }

      // Pre-compute bounding boxes for box-shaped objects
      if (obj.type === 'wall' || obj.type === 'obstacle') {
        collidable.boundingBox = new THREE.Box3().setFromObject(obj.mesh)
      }

      // Set radius for cylindrical objects
      if (obj.type === 'poll') {
        collidable.radius = this.physics.collisionRadius + 1 // 1 is poll radius
      }

      return collidable
    })
  }

  public checkCollisions(
    carMesh: THREE.Group,
    velocity: THREE.Vector3
  ): {
    newVelocity: THREE.Vector3
    collided: boolean
    collisionPoint?: THREE.Vector3
  } {
    // Update car's bounding box
    this.boundingBox.copy(this.localBox).applyMatrix4(carMesh.matrixWorld)
    const carPosition = carMesh.position.clone()
    carPosition.y = 0 // Ignore height for 2D collision detection

    let collided = false
    let collisionPoint: THREE.Vector3 | undefined
    const newVelocity = velocity.clone()

    for (const collidable of this.collidables) {
      const objPosition = collidable.mesh.position.clone()
      objPosition.y = 0 // 2D collision detection

      if (collidable.type === 'poll') {
        // Circular collision detection for polls
        const distance = carPosition.distanceTo(objPosition)
        if (distance < (collidable.radius || 0)) {
          const normal = carPosition.clone().sub(objPosition).normalize()
          this.handleCollision(newVelocity, normal, distance, objPosition)
          collided = true
          collisionPoint = objPosition.clone()
          break
        }
      } else if (collidable.boundingBox) {
        // Box collision detection for walls and obstacles
        if (this.boundingBox.intersectsBox(collidable.boundingBox)) {
          const normal = this.calculateCollisionNormal(carPosition, objPosition)
          const penetrationDepth = this.calculatePenetrationDepth(this.boundingBox, collidable.boundingBox)
          this.handleCollision(newVelocity, normal, penetrationDepth, objPosition)
          collided = true
          collisionPoint = objPosition.clone()
          break
        }
      }
    }

    if (collisionPoint) {
      collisionPoint.y = 1 // Set sound height to 1 unit above ground
    }

    return {
      newVelocity,
      collided,
      collisionPoint,
    }
  }

  private handleCollision(
    velocity: THREE.Vector3,
    normal: THREE.Vector3,
    penetrationDepth: number,
    collisionPoint: THREE.Vector3
  ): void {
    const dot = velocity.dot(normal)
    if (dot < 0) {
      // Only bounce if moving towards the object
      const speed = velocity.length()
      const speedFactor = Math.max(0.2, 1.0 - speed / (this.physics.maxSpeed * 2))

      // Split velocity into normal and tangential components
      const normalVelocity = normal.clone().multiplyScalar(dot)
      const tangentVelocity = velocity.clone().sub(normalVelocity)

      // Apply scaled bounce and friction
      velocity
        .copy(tangentVelocity.multiplyScalar(0.8)) // Reduce sliding friction
        .sub(normalVelocity.multiplyScalar(this.physics.bounceRestitution * speedFactor))

      // Add push-out velocity scaled by speed
      const pushOutVelocity = normal.clone().multiplyScalar(-penetrationDepth * (1 + speedFactor))
      velocity.add(pushOutVelocity)
    }
  }

  private calculateCollisionNormal(carPos: THREE.Vector3, objPos: THREE.Vector3): THREE.Vector3 {
    const normal = new THREE.Vector3()
    const carToObj = objPos.clone().sub(carPos)

    if (Math.abs(carToObj.x) > Math.abs(carToObj.z)) {
      normal.x = Math.sign(carToObj.x) * -1
    } else {
      normal.z = Math.sign(carToObj.z) * -1
    }

    return normal
  }

  private calculatePenetrationDepth(box1: THREE.Box3, box2: THREE.Box3): number {
    const xOverlap = Math.min(Math.abs(box1.max.x - box2.min.x), Math.abs(box1.min.x - box2.max.x))
    const zOverlap = Math.min(Math.abs(box1.max.z - box2.min.z), Math.abs(box1.min.z - box2.max.z))
    return Math.min(xOverlap, zOverlap)
  }
}
