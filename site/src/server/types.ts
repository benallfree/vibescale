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
export type PlayerDeltaBase<TCustom = {}> = {
  position: Vector3
  rotation: Vector3
} & TCustom

export type PlayerMetadataBase<TCustom = {}> = {} & TCustom

export type PlayerServerData = {
  color: string
}

export type PlayerBase<TDelta = {}, TMetadata = {}> = {
  id: PlayerId
  delta: PlayerDeltaBase<TDelta>
  server: PlayerServerData
  metadata: PlayerMetadataBase<TMetadata>
  isLocal: boolean
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
  Player = 'player',
  PlayerDelta = 'player:delta',
  PlayerMetadata = 'player:metadata',
  PlayerLeave = 'player:leave',
  Error = 'error',
}

// WebSocket message types

export type PlayerMessageBase<TPlayer extends PlayerBase = PlayerBase> = {
  type: MessageType.Player
  player: TPlayer
}

export type PlayerDeltaMessageBase<TPlayer extends PlayerBase = PlayerBase> = {
  type: MessageType.PlayerDelta
  id: PlayerId
  delta: PlayerDeltaBase<TPlayer['delta']>
}

export type PlayerMetadataMessageBase<TPlayer extends PlayerBase = PlayerBase> = {
  type: MessageType.PlayerMetadata
  id: PlayerId
  metadata: PlayerMetadataBase<TPlayer['metadata']>
}

export type PlayerLeaveMessage = {
  type: MessageType.PlayerLeave
  id: PlayerId
}

export type ErrorMessage = {
  type: MessageType.Error
  message: string
}

export type WebSocketMessage<TPlayer extends PlayerBase = PlayerBase> =
  | PlayerMessageBase<TPlayer>
  | PlayerDeltaMessageBase<TPlayer>
  | PlayerMetadataMessageBase<TPlayer>
  | PlayerLeaveMessage
  | ErrorMessage

// Server-specific types (not used by client)
export type RoomName = string

export type WsMeta<TPlayer extends PlayerBase = PlayerBase> = {
  player: TPlayer
  roomName: RoomName
}
