import type { Player, PlayerId, Vector3 } from './types'

const THRESHOLDS = {
  POSITION_DISTANCE: 0.1, // Units in world space
  ROTATION_ANGLE: 0.1, // Radians
} as const

// Store last significant states per player
let currentStates = new Map<PlayerId, Player>()

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
 * Determines if a player state has changed significantly from its last significant state.
 * Returns true if there are significant changes, false otherwise.
 * When true is returned, the current state becomes the new "last significant state".
 *
 * If extraChecks is provided, it will be called with the current and next state.
 * If extraChecks returns true, the next state will be set as the new "last significant state".
 */
export function hasSignificantStateChange(
  nextState: Player,
  extraChecks?: (currentState: Player, nextState: Player) => boolean
): boolean {
  //   console.log(`Checking for significant state change for player ${currentState.id}`)
  const currentState = currentStates.get(nextState.id)

  // If no previous state exists, this is significant by default
  if (!currentState) {
    currentStates.set(nextState.id, nextState)
    return true
  }

  // Check position change
  const positionDiff = calculatePositionDistance(nextState.delta.position, currentState.delta.position)
  if (positionDiff > THRESHOLDS.POSITION_DISTANCE) {
    // console.log('Significant position change:', positionDiff)
    currentStates.set(nextState.id, nextState)
    return true
  }

  const rotationDiff = calculateRotationDifference(nextState.delta.rotation, currentState.delta.rotation)
  if (rotationDiff > THRESHOLDS.ROTATION_ANGLE) {
    // console.log('Significant rotation change:', rotationDiff)
    currentStates.set(nextState.id, nextState)
    return true
  }

  return extraChecks?.(currentState, nextState) ?? false
}
