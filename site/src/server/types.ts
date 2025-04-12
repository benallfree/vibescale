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
export type PlayerDelta<T = {}> = {
  position: Vector3
  rotation: Vector3
} & T

export type PlayerMetadata<M = {}> = M

export type PlayerServerData = {
  color: string
}

export type Player<T = {}, M = {}> = {
  id: PlayerId
  delta: PlayerDelta<T>
  server: PlayerServerData
  metadata: PlayerMetadata<M>
  isLocal: boolean
}

export enum MessageType {
  Player = 'player',
  PlayerDelta = 'player:delta',
  PlayerMetadata = 'player:metadata',
  PlayerLeave = 'player:leave',
  Error = 'error',
}

// WebSocket message types

export type PlayerMessage<T = {}, M = {}> = {
  type: MessageType.Player
  player: Player<T, M>
}

export type PlayerDeltaMessage<T = {}> = {
  type: MessageType.PlayerDelta
  id: PlayerId
  delta: PlayerDelta<T>
}

export type PlayerMetadataMessage<M = {}> = {
  type: MessageType.PlayerMetadata
  id: PlayerId
  metadata: PlayerMetadata<M>
}

export type PlayerLeaveMessage = {
  type: MessageType.PlayerLeave
  id: PlayerId
}

export type ErrorMessage = {
  type: MessageType.Error
  message: string
}

export type WebSocketMessage<T = {}, M = {}> =
  | PlayerMessage<T, M>
  | PlayerDeltaMessage<T>
  | PlayerMetadataMessage<M>
  | PlayerLeaveMessage
  | ErrorMessage

// Server-specific types (not used by client)
export type RoomName = string

export type WsMeta = {
  player: Player
  roomName: RoomName
}
