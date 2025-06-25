import type { PlayerBase, StateChangeDetectorFn, Vector3 } from './types'

export interface StateChangeDetectorOptions<TPlayer extends PlayerBase> {
  positionDistance?: number
  rotationAngle?: number
  customChecker?: (currentState: TPlayer, nextState: TPlayer) => boolean
}

const DEFAULT_THRESHOLDS = {
  positionDistance: 0.1, // Units in world space
  rotationAngle: 0.1, // Radians
} as const

/**
 * Calculates the Euclidean distance between two Vector3 points
 */
function calculatePositionDistance(current: Vector3, previous: Vector3): number {
  return Math.sqrt(
    Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2) + Math.pow(current.z - previous.z, 2)
  )
}

/**
 * Calculates the total angular difference between two rotation states
 */
function calculateRotationDifference(current: Vector3, previous: Vector3): number {
  return Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y) + Math.abs(current.z - previous.z)
}

/**
 * Factory function that creates a position change detector with a configurable threshold
 */
export function createPositionChangeDetector(threshold: number = DEFAULT_THRESHOLDS.positionDistance) {
  return (current: Vector3, next: Vector3): boolean => {
    return calculatePositionDistance(next, current) > threshold
  }
}

/**
 * Factory function that creates a rotation change detector with a configurable threshold
 */
export function createRotationChangeDetector(threshold: number = DEFAULT_THRESHOLDS.rotationAngle) {
  return (current: Vector3, next: Vector3): boolean => {
    return calculateRotationDifference(next, current) > threshold
  }
}

/**
 * Factory function that creates a state change detector with configurable thresholds and custom checker
 */
export function createStateChangeDetector<TPlayer extends PlayerBase>(
  options: StateChangeDetectorOptions<TPlayer> = {}
): StateChangeDetectorFn<TPlayer> {
  const positionThreshold = options.positionDistance ?? DEFAULT_THRESHOLDS.positionDistance
  const rotationThreshold = options.rotationAngle ?? DEFAULT_THRESHOLDS.rotationAngle
  const customChecker = options.customChecker

  const hasSignificantPositionChange = createPositionChangeDetector(positionThreshold)
  const hasSignificantRotationChange = createRotationChangeDetector(rotationThreshold)

  return (currentState: TPlayer, nextState: TPlayer): boolean => {
    // Check for username and color changes (always significant)
    if (currentState.username !== nextState.username || currentState.color !== nextState.color) {
      return true
    }

    // Check custom properties/logic if provided
    if (customChecker && customChecker(currentState, nextState)) {
      return true
    }

    // Check for position and rotation changes with thresholds
    const hasChange =
      hasSignificantPositionChange(currentState.position, nextState.position) ||
      hasSignificantRotationChange(currentState.rotation, nextState.rotation)
    return hasChange
  }
}

// Re-export factory functions for backwards compatibility
export const hasSignificantPositionChangeFactory = createPositionChangeDetector
export const hasSignificantRotationChangeFactory = createRotationChangeDetector
