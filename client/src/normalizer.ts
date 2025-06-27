import type { PartialDeep } from 'type-fest'
import type { PlayerBase } from './types'

export const normalizePlayerBase = (state: PartialDeep<PlayerBase>) => {
  return {
    ...state,
    position: {
      x: state.position?.x || 0,
      y: state.position?.y || 0,
      z: state.position?.z || 0, // Keep original y as z (not used in 2D)
    },
    rotation: {
      x: state.rotation?.x || 0,
      y: state.rotation?.y || 0,
      z: state.rotation?.z || 0,
    },
    color: state.color || '#ff0000',
    username: state.username || 'enseapea',
    isLocal: state.isLocal || false,
    isConnected: state.isConnected || false,
    id: state.id || '',
  } as PlayerBase
}
