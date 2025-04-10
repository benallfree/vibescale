import { PlayerState, Vector3 } from './network'

export type CustomPlayerState = PlayerState & {
  username: string
  color: string
  hasCollided?: boolean
  collisionPoint?: Vector3
}
