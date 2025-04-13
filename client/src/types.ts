import type {
  Player,
  PlayerDelta,
  PlayerId,
  PlayerMetadata,
  StateChangeDetectorFn,
  WebSocketMessage,
} from '../../site/src/server/types'
import type { Emitter } from './EventEmitter'

export * from '../../site/src/server/types'

export type PlayerEventCallback<T = {}, M = {}> = (player: Player<T, M>) => void

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

  // Any event
  Any = '*',
}

export type AnyEventPayload<T = {}, M = {}> = {
  type: RoomEventType
  data: RoomEventPayloads<T, M>[RoomEventType]
}

// Event payloads
export interface RoomEventPayloads<T = {}, M = {}> {
  [RoomEventType.Connected]: undefined
  [RoomEventType.Disconnected]: undefined
  [RoomEventType.Error]: { message: string; error: any; details?: any }

  [RoomEventType.PlayerJoined]: Player<T, M>
  [RoomEventType.PlayerLeft]: Player<T, M>
  [RoomEventType.PlayerUpdated]: Player<T, M>
  [RoomEventType.PlayerError]: { type: string; error: string; details?: any }

  [RoomEventType.WebSocketInfo]: Record<string, any>
  [RoomEventType.Rx]: MessageEvent
  [RoomEventType.Tx]: WebSocketMessage<T, M>

  [RoomEventType.Any]: AnyEventPayload<T, M>
}

// Update RoomEvents to use RoomEventPayloads
export type RoomEvents<T = {}, M = {}> = RoomEventPayloads<T, M>

export interface RoomOptions<T = {}, M = {}> {
  endpoint?: string
  stateChangeDetectorFn?: StateChangeDetectorFn<T, M>
}

export type Room<T = {}, M = {}> = {
  getPlayer: (id: PlayerId) => Player<T, M> | null
  getLocalPlayer: () => Player<T, M> | null
  setLocalPlayerMetadata: (metadata: PlayerMetadata<M>) => void
  setLocalPlayerDelta: (delta: PlayerDelta<T>) => void
  getRoomId: () => string
  disconnect: () => void
} & Emitter<RoomEvents<T, M>>
