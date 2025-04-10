export interface CarPhysicsConfig {
  acceleration: number // Units per second
  maxSpeed: number // Maximum units per second
  friction: number // Percentage of velocity lost per second (0.1-1.0)
  turnSpeed: number // Radians per second
  bounceRestitution: number // How bouncy collisions are (0-1)
  collisionRadius: number // Radius for collision detection with polls
}

export const defaultCarPhysics: CarPhysicsConfig = {
  acceleration: 40, // 20 units/second
  maxSpeed: 30, // 30 units/second
  friction: 0.8, // Lose 80% speed per second
  turnSpeed: 3, // ~170 degrees per second
  bounceRestitution: 0.5,
  collisionRadius: 2,
}
