import type { Vector3 } from './types'

export type WorldScale = {
  x: number
  y: number
  z: number
}

export type CoordinateConverter = {
  serverToWorld: (serverPos: Vector3) => Vector3
  worldToServer: (worldPos: Vector3) => Vector3
}

/**
 * Creates coordinate conversion functions for translating between server normalized coordinates (-1:1)
 * and world coordinates with configurable scales for each axis.
 */
export function createCoordinateConverter(
  scaleOrX: number | WorldScale = 1,
  y?: number,
  z?: number
): CoordinateConverter {
  const worldScale = createWorldScale(scaleOrX, y, z)
  return {
    serverToWorld: (serverPos: Vector3): Vector3 => {
      const worldPos = {
        x: serverPos.x * worldScale.x,
        y: serverPos.y * worldScale.y,
        z: serverPos.z * worldScale.z,
      }
      // console.log('serverToWorld', JSON.stringify({ serverPos, worldPos }))
      return worldPos
    },

    worldToServer: (worldPos: Vector3): Vector3 => {
      const serverPos = {
        x: worldPos.x / worldScale.x,
        y: worldPos.y / worldScale.y,
        z: worldPos.z / worldScale.z,
      }
      // console.log('worldToServer', JSON.stringify({ worldPos, serverPos }))
      return serverPos
    },
  }
}

/**
 * Helper function to create a WorldScale from a single number or individual axis values
 */
export function createWorldScale(scaleOrX: number | WorldScale = 1, y?: number, z?: number): WorldScale {
  if (typeof scaleOrX === 'object') {
    return scaleOrX
  }

  return {
    x: scaleOrX,
    y: y ?? scaleOrX,
    z: z ?? scaleOrX,
  }
}
