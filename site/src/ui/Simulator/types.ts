import { type EmitterEvent, type PlayerBase, type Room, type RoomEvents } from '../../../../client/src'

export interface DebugState {
  history: Array<EmitterEvent<RoomEvents> & { timestamp: string }>
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  localPlayer: PlayerBase | null
  url: string
  room: Room | null
  players: Record<string, PlayerBase>
  selectedPlayerId: string | null
  editorValue: string
  activeTab: 'radar' | 'logs'
  isWandering: boolean
  wanderAnimationId: number | null
}

export type { EmitterEvent, PlayerBase, Room, RoomEvents }
