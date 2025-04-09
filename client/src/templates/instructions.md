# LLM Guide for "{{roomName}}"

REST endpoint: https://mmo.vibescale.benallfree.com/{{roomName}}
WebSocket endpoint: https://mmo.vibescale.benallfree.com/{{roomname}}/websocket

## REST API

### `/health`

Returns `{ "status": "ok"}` JSON 200 if healthy

## WebSocket API

### Message Types

#### Server → Client Messages

1. `player:id`

   ```typescript
   {
     type: 'player:id',
     id: string,      // UUID of the player
     color: string,   // HSL color assigned to the player
     spawnPosition: {
       x: number,
       y: number,
       z: number
     }
   }
   ```

   Sent immediately after connection to provide the player with their unique ID, color, and spawn position.

2. `player:state`

   ```typescript
   {
     type: 'player:state',
     player: {
       id: string,
       position: { x: number, y: number, z: number },
       rotation: { x: number, y: number, z: number },
       color: string,
       username: string
     }
   }
   ```

   Sent when any player's state changes (position, rotation, etc). Also sent for all existing players when a new player joins.

3. `player:leave`

   ```typescript
   {
     type: 'player:leave',
     id: string      // ID of the player who left
   }
   ```

   Sent when a player disconnects from the game.

4. `error`
   ```typescript
   {
     type: 'error',
     message: string  // Error description
   }
   ```
   Sent when an error occurs (e.g., unknown message type received).

#### Client → Server Messages

1. `player:state`
   ```typescript
   {
     type: 'player:state',
     player: {
       position: { x: number, y: number, z: number },
       rotation: { x: number, y: number, z: number },
       metadata?: Record<string, unknown> // Optional custom metadata object
     }
   }
   ```
   Send to update the player's position, rotation, and username. Note: The server will preserve the player's assigned color.

### Connection Flow

1. Client connects to WebSocket endpoint
2. Server immediately sends `player:id` message with unique ID and spawn details
3. Server sends `player:state` messages for all existing players
4. Client can begin sending `player:state` updates
5. Server broadcasts state changes to all other connected players
6. On disconnect, server broadcasts `player:leave` to all other players

### State Change Detection

The server implements state change detection with thresholds:

- Position changes less than 0.1 units are ignored
- Rotation changes less than 0.1 radians are ignored

This helps reduce unnecessary network traffic for minor updates.

## Reference: WebSocket API Typescript Definitions

```typescript
export type PlayerId = string

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface PlayerState {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  metadata?: Record<string, unknown>
}

export type WebSocketMessage =
  | {
      type: 'player:id'
      id: PlayerId
    }
  | {
      type: 'player:state'
      player: PlayerState
    }
  | {
      type: 'player:leave'
      id: PlayerId
    }
  | {
      type: 'error'
      message: string
    }
```
