/**
 * Shared type definitions for client-server communication.
 * Base types are generic with empty defaults, allowing extension by clients.
 */

// Base types
export interface Vector3 {
  x: number
  y: number
  z: number
}

export type PlayerId = string

// Core player state types with empty generic defaults
export type PlayerState<T = {}> = {
  id: PlayerId
  position: Vector3
  rotation: Vector3
} & T

export type PlayerMetadata<M = {}> = {
  color: string
} & M

export type PlayerComplete<T = {}, M = {}> = PlayerState<T> & {
  metadata: PlayerMetadata<M>
}

// WebSocket message types
export type PlayerIdMessage<T = {}, M = {}> = {
  type: 'player:id'
  id: PlayerId
  state: PlayerState<T>
  metadata: PlayerMetadata<M>
}

export type PlayerStateMessage<T = {}> = {
  type: 'player:state'
  player: PlayerState<T>
}

export type PlayerMetadataMessage<M = {}> = {
  type: 'player:metadata'
  id: PlayerId
  metadata: PlayerMetadata<M>
}

export type PlayerLeaveMessage = {
  type: 'player:leave'
  id: PlayerId
}

export type ErrorMessage = {
  type: 'error'
  message: string
}

export type WebSocketMessage<T = {}, M = {}> =
  | PlayerIdMessage<T, M>
  | PlayerStateMessage<T>
  | PlayerMetadataMessage<M>
  | PlayerLeaveMessage
  | ErrorMessage

// Server-specific types (not used by client)
export type RoomName = string

export type WsMeta = {
  playerId: PlayerId
  roomName: RoomName
}
