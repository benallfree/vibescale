import type { PartialDeep } from 'type-fest'
import type { PlayerBase, PlayerId } from '../../site/src/server/types'
import type { CoordinateConverter } from './coordinateConversion'
import type { Emitter } from './EventEmitter'

export * from '../../site/src/server/types'
export * from './coordinateConversion'

export type ProduceFn<T> = (state: T, mutator: (draft: T) => void) => T

/**
 * Function type for detecting significant state changes between two player states
 */
export type StateChangeDetectorFn<TPlayer extends PlayerBase = PlayerBase> = (
  currentState: TPlayer,
  nextState: TPlayer
) => boolean

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
  PlayerMutated = 'player:mutated',

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
  [RoomEventType.PlayerMutated]: TPlayer
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
  coordinateConverter?: CoordinateConverter
  produce?: ProduceFn<TPlayer>
}

export type PlayerMutator<TPlayer extends PlayerBase = PlayerBase> = (draft: TPlayer) => void

export type Room<TPlayer extends PlayerBase = PlayerBase> = {
  getPlayer: (id: PlayerId) => TPlayer | null
  getLocalPlayer: () => TPlayer | null
  getAllPlayers: () => TPlayer[]
  mutatePlayer: (mutator: PlayerMutator<TPlayer>) => TPlayer | null
  getRoomId: () => string
  disconnect: () => void
  isConnected: () => boolean
  connect: () => void
} & Emitter<RoomEvents<TPlayer>>
