import type { PlayerComplete, PlayerId, PlayerMetadata } from '../../server/src/templates/network'

export * from '../../server/src/templates/network'

export type PlayerEventCallback<T = {}, M = {}> = (player: PlayerComplete<T, M>) => void

export type DebugEventType =
  | 'info'
  | 'ws:open'
  | 'ws:close'
  | 'ws:error'
  | 'ws:message:raw'
  | 'ws:message:parsed'
  | 'ws:message:error'
  | 'message:handle:start'
  | 'message:handle:complete'
  | 'message:handle:error'
  | 'player:id:received'
  | 'player:state:updated'
  | 'player:metadata:updated'
  | 'player:leave:processed'
  | 'metadata:update:start'
  | 'metadata:update:local'
  | 'metadata:update:send'
  | 'disconnect'

export type DebugEvent = {
  type: DebugEventType
  data?: any
}

export type DebugEventCallback = (event: DebugEvent) => void

// Define all possible room events and their payload types
export interface RoomEvents<T = {}, M = {}> {
  playerUpdate: PlayerComplete<T, M>
  playerJoin: PlayerComplete<T, M>
  playerLeave: PlayerComplete<T, M>
  debug: DebugEvent
  error: string
  connected: undefined
  disconnected: undefined
}

export type RoomEventType = keyof RoomEvents

export type RoomOptions<T = {}, M = {}> = {
  endpoint?: string
}

export interface Room<T = {}, M = {}> {
  on<E extends keyof RoomEvents<T, M>>(event: E, callback: (payload: RoomEvents<T, M>[E]) => void): () => void
  off<E extends keyof RoomEvents<T, M>>(event: E, callback: (payload: RoomEvents<T, M>[E]) => void): void
  getPlayer: (id: PlayerId) => PlayerComplete<T, M> | null
  setMetadata: (metadata: Partial<PlayerMetadata<M>>) => void
  disconnect: () => void
}
