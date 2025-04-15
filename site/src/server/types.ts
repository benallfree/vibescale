/**
 * Shared type definitions for client-server communication.
 * Base types are generic with empty defaults, allowing extension by clients.
 */

// Base types
export type PlayerId = string

export type Vector3 = {
  x: number
  y: number
  z: number
}

export interface BasePlayerFields {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  color: string
  username: string
  isLocal: boolean
  isConnected: boolean
}

export type PlayerStateExtension = {
  [K in keyof BasePlayerFields]?: any
}

export type PlayerBase<TStateExtension extends PlayerStateExtension = PlayerStateExtension> = BasePlayerFields &
  TStateExtension

/**
 * Function type for detecting significant state changes between two player states
 */
export type StateChangeDetectorFn<TPlayerStateExtension extends PlayerStateExtension = PlayerStateExtension> = (
  currentState: PlayerBase<TPlayerStateExtension>,
  nextState: PlayerBase<TPlayerStateExtension>
) => boolean

// Message types
export enum MessageType {
  PlayerState = 'player:state',
  Error = 'error',
}

// WebSocket message types
export type PlayerStateMessageBase<TPlayerStateExtension extends PlayerStateExtension = PlayerStateExtension> = {
  type: MessageType.PlayerState
} & PlayerBase<TPlayerStateExtension>

export type ErrorMessage = {
  type: MessageType.Error
  message: string
}

export type WebSocketMessage<TPlayerStateExtension extends PlayerStateExtension = PlayerStateExtension> =
  | PlayerStateMessageBase<TPlayerStateExtension>
  | ErrorMessage

// Server-specific types (not used by client)
export type RoomName = string

export type WsMeta<TPlayerStateExtension extends PlayerStateExtension = PlayerStateExtension> = {
  player: PlayerBase<TPlayerStateExtension>
  roomName: RoomName
}
