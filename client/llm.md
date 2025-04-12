# Vibescale LLM Integration Guide

This guide is specifically for AI language models integrating with Vibescale. It provides structured information about the client library API, event system, and state management.

## Basic Usage

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Create and connect to a room
const room = createRoom('my-room', {
  endpoint: 'https://vibescale.benallfree.com', // Optional
})

// Handle connection events
room.on(RoomEventType.Connected, () => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, () => {
  console.log('Disconnected from room')
})

// Handle player events
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('Player joined:', player.id)
  console.log('Player color:', player.server.color)
  console.log('Initial position:', player.delta.position)
})

room.on(RoomEventType.PlayerLeft, (player) => {
  console.log('Player left:', player.id)
})

room.on(RoomEventType.PlayerUpdated, (player) => {
  console.log('Player updated:', player.id)
  console.log('New position:', player.delta.position)
  console.log('New rotation:', player.delta.rotation)
})

// Handle errors
room.on(RoomEventType.Error, ({ message, error, details }) => {
  console.error('Error:', message, error, details)
})
```

## Event Types

```typescript
enum RoomEventType {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
  PlayerUpdated = 'player:updated',
  PlayerError = 'player:error',
  WebSocketInfo = 'websocket:info',
  Any = '*',
}
```

## Type Definitions

```typescript
interface Vector3 {
  x: number
  y: number
  z: number
}

interface PlayerDelta<T = {}> {
  position: Vector3
  rotation: Vector3
} & T

interface PlayerServerData {
  color: string // HSL format
}

interface Player<T = {}, M = {}> {
  id: string
  delta: PlayerDelta<T>
  server: PlayerServerData
  metadata: M
  isLocal: boolean
}

interface Room<T = {}, M = {}> {
  // Event handling
  on<E extends RoomEventType>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): () => void
  off<E extends RoomEventType>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): void

  // Player access
  getPlayer(id: string): Player<T, M> | null
  getLocalPlayer(): Player<T, M> | null

  // Local player updates
  setLocalPlayerDelta(delta: PlayerDelta<T>): void
  setLocalPlayerMetadata(metadata: M): void

  // Connection management
  disconnect(): void
}
```

## State Management

### High-Frequency Updates

Use `setLocalPlayerDelta` for frequently changing data:

```typescript
// Update position and rotation
room.setLocalPlayerDelta({
  position: { x: 10, y: 0, z: 5 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
})

// With custom game state
interface PlayerState {
  health: number
  speed: number
}

const room = createRoom<PlayerState>('my-room')
room.setLocalPlayerDelta({
  position: { x: 10, y: 0, z: 5 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  health: 100,
  speed: 5,
})
```

### Low-Frequency Updates

Use `setLocalPlayerMetadata` for infrequently changing data:

```typescript
interface GameMetadata {
  username: string
  level: number
  equipment: {
    weapon: string
    armor: string
  }
}

const room = createRoom<{}, GameMetadata>('my-room')
room.setLocalPlayerMetadata({
  username: 'Player1',
  level: 5,
  equipment: {
    weapon: 'sword',
    armor: 'leather',
  },
})
```

## Example: Game Integration

```typescript
interface PlayerState {
  health: number
  stamina: number
  effects: string[]
}

interface GameMetadata {
  username: string
  level: number
  class: string
}

// Create room with game-specific types
const room = createRoom<PlayerState, GameMetadata>('game-room')

// Track all players
const players = new Map<string, Player<PlayerState, GameMetadata>>()

// Handle player updates
room.on(RoomEventType.PlayerJoined, (player) => {
  players.set(player.id, player)
  console.log(`${player.metadata.username} (Level ${player.metadata.level}) joined`)
})

room.on(RoomEventType.PlayerUpdated, (player) => {
  players.set(player.id, player)
  console.log(`${player.metadata.username} updated:`)
  console.log('Position:', player.delta.position)
  console.log('Health:', player.delta.health)
  console.log('Effects:', player.delta.effects)
})

room.on(RoomEventType.PlayerLeft, (player) => {
  players.delete(player.id)
  console.log(`${player.metadata.username} left`)
})

// Update local player
function updatePlayerState(position: Vector3, health: number, stamina: number, effects: string[]) {
  room.setLocalPlayerDelta({
    position,
    rotation: { x: 0, y: 0, z: 0 },
    health,
    stamina,
    effects,
  })
}

function updatePlayerMetadata(username: string, level: number, characterClass: string) {
  room.setLocalPlayerMetadata({
    username,
    level,
    class: characterClass,
  })
}

// Clean up
function cleanup() {
  room.disconnect()
  players.clear()
}
```

## Best Practices

1. State Management

   - Use `PlayerDelta` for frequently changing game state
   - Use `PlayerMetadata` for persistent player data
   - Keep state updates minimal and focused
   - The server applies change detection to position/rotation updates

2. Type Safety

   - Define explicit interfaces for your game state and metadata
   - Use TypeScript generics when creating rooms
   - Leverage type checking for state updates

3. Event Handling

   - Always handle connection and error events
   - Clean up event listeners when disconnecting
   - Use type-safe event handlers

4. Performance

   - Only send necessary state updates
   - Group related state changes
   - Keep metadata updates infrequent
   - Clean up resources on disconnect

5. Error Handling
   - Handle connection errors and disconnects
   - Implement reconnection logic if needed
   - Log errors appropriately
   - Maintain game state during reconnection

The library handles WebSocket connection, reconnection, and message serialization automatically. Focus on using the high-level API provided by `createRoom` rather than managing WebSocket connections directly.
