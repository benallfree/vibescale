export type PlayerId = string

export interface Vector3 {
  x: number
  y: number
  z: number
}

/**
 * The ephemeral player state.
 *
 * This is the state that is sent to all clients when a player's state changes.
 *
 * The most recent state is stored in the Durable Object storage.
 *
 * The server will suppress broadcasting the state to the clients if there is no signiachange.
 *
 * You can have as many additional fields as you need for your game.
 */
export interface PlayerState {
  id: PlayerId
  position: Vector3
  rotation: Vector3
}

/**
 * Sent to the client when the player's ID is assigned.
 */
export type PlayerIdMessage = {
  type: 'player:id'
  id: PlayerId
  state: PlayerState
  metadata: PlayerMetadata
}

/**
 * Client: Sent to the server when the player's metadata changes.
 * Server: Sent to all clients when a player's metadata changes and upon connection after color assignment.
 *
 * Metadata is any additional data you want to store about the player which is not part of the ephemeral player state.
 *
 * Player color: upon connection, the server will assign a unique color to the player and send it to the client.
 */
export type PlayerMetadata<T = unknown> = {
  color: string
} & { [key: string]: T }

export type PlayerMetadataMessage = {
  type: 'player:metadata'
  metadata: PlayerMetadata
}

/**
 * Client: Sent to the server when the player's state changes.
 * Server: Sent to all clients when a player's state changes.
 */
export type PlayerStateMessage = {
  type: 'player:state'
  player: PlayerState
}

/**
 * Broadcast to all players when a player leaves the game (websocket close).
 */
export type PlayerLeaveMessage = {
  type: 'player:leave'
  id: PlayerId
}

export type WebSocketMessage =
  | PlayerIdMessage
  | PlayerMetadataMessage
  | PlayerStateMessage
  | PlayerLeaveMessage
  | {
      type: 'error'
      message: string
    }

export type PlayerAtRest = {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  extra: Record<string, unknown>
  metadata: {
    color: string
    [key: string]: unknown
  }
}
