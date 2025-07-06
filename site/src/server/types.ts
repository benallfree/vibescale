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

export interface PlayerBase {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  color: string
  username: string
  isLocal: boolean
  isConnected: boolean
}

export type PlayerStateExtension = {
  [K in keyof PlayerBase]?: any
}

/**
 * Function type for detecting significant state changes between two player states
 */
export type StateChangeDetectorFn<TPlayer extends PlayerBase = PlayerBase> = (
  currentState: TPlayer,
  nextState: TPlayer
) => boolean

// Message types
export enum MessageType {
  PlayerState = 'player:state',
  Version = 'version',
  Error = 'error',
}

// WebSocket message types
export type PlayerStateMessageBase<TPlayer extends PlayerBase = PlayerBase> = {
  type: MessageType.PlayerState
} & TPlayer

export type VersionMessage = {
  type: MessageType.Version
  version: string
}

export type ErrorMessage = {
  type: MessageType.Error
  message: string
}

export type WebSocketMessage<TPlayer extends PlayerBase = PlayerBase> =
  | PlayerStateMessageBase<TPlayer>
  | VersionMessage
  | ErrorMessage

// Server-specific types (not used by client)
export type RoomName = string

export type WsMeta = {
  player: PlayerBase
}
