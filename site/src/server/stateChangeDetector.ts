import type { StateChangeDetectorFn, Vector3 } from './types'

const THRESHOLDS = {
  POSITION_DISTANCE: 0.1, // Units in world space
  ROTATION_ANGLE: 0.1, // Radians
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
export function hasSignificantPositionChangeFactory(threshold: number = THRESHOLDS.POSITION_DISTANCE) {
  return (current: Vector3, next: Vector3): boolean => {
    return calculatePositionDistance(next, current) > threshold
  }
}

/**
 * Factory function that creates a rotation change detector with a configurable threshold
 */
export function hasSignificantRotationChangeFactory(threshold: number = THRESHOLDS.ROTATION_ANGLE) {
  return (current: Vector3, next: Vector3): boolean => {
    return calculateRotationDifference(next, current) > threshold
  }
}

// Create singleton detectors with default thresholds
const hasSignificantPositionChange = hasSignificantPositionChangeFactory()
const hasSignificantRotationChange = hasSignificantRotationChangeFactory()

/**
 * Determines if a player state has changed significantly from its last significant state.
 * Returns true if there are significant changes in position or rotation.
 */
export const hasSignificantStateChange =
  <T, M>(): StateChangeDetectorFn<T, M> =>
  (currentState, nextState) => {
    return (
      hasSignificantPositionChange(currentState.delta.position, nextState.delta.position) ||
      hasSignificantRotationChange(currentState.delta.rotation, nextState.delta.rotation)
    )
  }
