import type { PartialDeep } from 'type-fest'
import type { PlayerBase, PlayerId, StateChangeDetectorFn } from '../../site/src/server/types'
import type { Emitter } from './EventEmitter'
import type { WorldScale } from './coordinateConversion'

export * from '../../site/src/server/types'
export * from './coordinateConversion'

// Generic produce function type that works with immer, mutative, or custom implementations
// This allows the draft type to be different from the input type (e.g., WritableDraft<T>, Draft<T>)
export type ProduceFn = <T>(state: T, mutator: (draft: any) => void) => T

export type PlayerEventCallback = (player: PlayerBase) => void

// Enum for all possible event names
export enum RoomEventType {
  // Core events
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',

  // Player events
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
  PlayerUpdated = 'player:updated',
  PlayerError = 'player:error',

  // WebSocket events
  WebSocketInfo = 'websocket:info',
  Rx = 'rx',
  Tx = 'tx',

  // Version events
  Version = 'version',

  // Any event
  Any = '*',
}

export type AnyEventPayload<TPlayer extends PlayerBase> = {
  type: RoomEventType
  data: RoomEventPayloads<TPlayer>[RoomEventType]
}

// Event payloads
export interface RoomEventPayloads<TPlayer extends PlayerBase = PlayerBase> {
  [RoomEventType.Connected]: undefined
  [RoomEventType.Disconnected]: undefined
  [RoomEventType.Error]: { message: string; error: any; details?: any }

  [RoomEventType.PlayerJoined]: TPlayer
  [RoomEventType.PlayerLeft]: TPlayer
  [RoomEventType.PlayerUpdated]: TPlayer
  [RoomEventType.PlayerError]: { type: string; error: string; details?: any }

  [RoomEventType.WebSocketInfo]: Record<string, any>
  [RoomEventType.Rx]: string
  [RoomEventType.Tx]: string

  [RoomEventType.Version]: { version: string }

  [RoomEventType.Any]: AnyEventPayload<TPlayer>
}

// Update RoomEvents to use RoomEventPayloads
export type RoomEvents<TPlayer extends PlayerBase = PlayerBase> = RoomEventPayloads<TPlayer>

export interface RoomOptions<TPlayer extends PlayerBase> {
  endpoint?: string
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer>
  normalizePlayerState?: (state: PartialDeep<TPlayer>) => TPlayer
  worldScale?: number | WorldScale
  produce?: ProduceFn
}

export type Room<TPlayer extends PlayerBase = PlayerBase> = {
  getPlayer: (id: PlayerId) => TPlayer | null
  getLocalPlayer: () => TPlayer | null
  mutatePlayer: (mutator: (draft: TPlayer) => void) => void
  getRoomId: () => string
  disconnect: () => void
  isConnected: () => boolean
  getEndpointUrl: () => string
  connect: () => void
} & Emitter<RoomEvents<TPlayer>>
