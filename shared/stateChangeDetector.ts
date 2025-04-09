import type { PlayerId, PlayerState } from '../client/src/templates/types'

const THRESHOLDS = {
  POSITION_DISTANCE: 0.1, // Units in world space
  ROTATION_ANGLE: 0.1, // Radians
} as const

// Store last significant states per player
let lastSignificantStates = new Map<PlayerId, PlayerState>()

/**
 * Calculates the Euclidean distance between two Vector3 points
 */
function calculatePositionDistance(current: PlayerState['position'], previous: PlayerState['position']): number {
  return Math.sqrt(
    Math.pow(current.x - previous.x, 2) + Math.pow(current.y - previous.y, 2) + Math.pow(current.z - previous.z, 2)
  )
}

/**
 * Calculates the total angular difference between two rotation states
 */
function calculateRotationDifference(current: PlayerState['rotation'], previous: PlayerState['rotation']): number {
  return Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y) + Math.abs(current.z - previous.z)
}

/**
 * Determines if a player state has changed significantly from its last significant state.
 * Returns true if there are significant changes, false otherwise.
 * When true is returned, the current state becomes the new "last significant state".
 */
export function hasSignificantStateChange(currentState: PlayerState): boolean {
  //   console.log(`Checking for significant state change for player ${currentState.id}`)
  const previousState = lastSignificantStates.get(currentState.id)

  // If no previous state exists, this is significant by default
  if (!previousState) {
    lastSignificantStates.set(currentState.id, { ...currentState })
    return true
  }

  // Always consider username changes significant
  if (currentState.username !== previousState.username) {
    // console.log('Username changed:', previousState.username, '->', currentState.username)
    lastSignificantStates.set(currentState.id, { ...currentState })
    return true
  }

  // Check position change
  const positionDiff = calculatePositionDistance(currentState.position, previousState.position)
  const rotationDiff = calculateRotationDifference(currentState.rotation, previousState.rotation)

  if (positionDiff > THRESHOLDS.POSITION_DISTANCE) {
    // console.log('Significant position change:', positionDiff)
    lastSignificantStates.set(currentState.id, { ...currentState })
    return true
  }

  if (rotationDiff > THRESHOLDS.ROTATION_ANGLE) {
    // console.log('Significant rotation change:', rotationDiff)
    lastSignificantStates.set(currentState.id, { ...currentState })
    return true
  }

  return false
}
