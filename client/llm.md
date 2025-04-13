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
  // Core events
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',

  // Player events
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
  PlayerUpdated = 'player:updated',
  PlayerError = 'player:error',

  // WebSocket events
  WebSocketInfo = 'websocket:info',
  Rx = 'rx',
  Tx = 'tx',

  // Any event
  Any = '*',
}

// Event payloads
interface RoomEventPayloads<T = {}, M = {}> {
  // Core events
  [RoomEventType.Connected]: undefined
  [RoomEventType.Disconnected]: undefined
  [RoomEventType.Error]: {
    message: string
    error: any
    details?: any
  }

  // Player events
  [RoomEventType.PlayerJoined]: Player<T, M>
  [RoomEventType.PlayerLeft]: Player<T, M>
  [RoomEventType.PlayerUpdated]: Player<T, M>
  [RoomEventType.PlayerError]: {
    type: string
    error: string
    details?: any
  }

  // WebSocket events
  [RoomEventType.WebSocketInfo]: Record<string, any>
  [RoomEventType.Rx]: { event: MessageEvent }
  [RoomEventType.Tx]: { message: WebSocketMessage<T, M> }

  // Special events
  [RoomEventType.Any]: {
    type: RoomEventType
    data: RoomEventPayloads<T, M>[RoomEventType]
  }
}
```

### Event Details

1. Core Events

   - `Connected`: Emitted when successfully connected to the room
   - `Disconnected`: Emitted when disconnected from the room
   - `Error`: Emitted for any error with message and details

2. Player Events

   - `PlayerJoined`: Emitted when a new player joins with full player state
   - `PlayerLeft`: Emitted when a player leaves with their last state
   - `PlayerUpdated`: Emitted when any player's state changes
   - `PlayerError`: Emitted for player-specific errors

3. WebSocket Events

   - `WebSocketInfo`: Emitted with connection details (endpoints, etc)
   - `Rx`: Emitted when a raw message is received
   - `Tx`: Emitted when a message is sent

4. Special Events
   - `Any`: Catches all events with their type and payload

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

  // Room information
  getRoomId(): string

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

## State Change Detection

The library exports a state change detection system that helps optimize network traffic by only sending significant state updates. This is particularly useful for real-time games and simulations where frequent small updates might occur.

```typescript
import {
  createRoom,
  hasSignificantStateChange,
  hasSignificantPositionChangeFactory,
  hasSignificantRotationChangeFactory,
  type StateChangeDetectorFn,
} from 'vibescale'

interface GameState {
  health: number
  position: Vector3
  rotation: Vector3
}

// Default state change detection
const room = createRoom<GameState>('my-room')

// Custom state change detector with individual checks
const hasPositionChange = hasSignificantPositionChangeFactory(0.2) // Custom threshold
const hasRotationChange = hasSignificantRotationChangeFactory() // Default threshold

const myDetector: StateChangeDetectorFn<GameState> = (current, next) => {
  return (
    hasPositionChange(current.delta.position, next.delta.position) || // Check position
    hasRotationChange(current.delta.rotation, next.delta.rotation) || // Check rotation
    Math.abs(current.delta.health - next.delta.health) > 5 // Check custom state
  )
}

const room = createRoom<GameState>('my-room', {
  stateChangeDetectorFn: myDetector,
})

// Compose with default detector
const composedDetector: StateChangeDetectorFn<GameState> = (current, next) => {
  return (
    hasSignificantStateChange<GameState>()(current, next) || // Check position/rotation
    Math.abs(current.delta.health - next.delta.health) > 5 // Check custom state
  )
}

const room = createRoom<GameState>('my-room', {
  stateChangeDetectorFn: composedDetector,
})
```

The state change detector uses the following thresholds by default:

- Position changes: > 0.1 units in world space (using Euclidean distance)
- Rotation changes: > 0.1 radians (using absolute angular difference)

### Implementation Details

```typescript
type StateChangeDetectorFn<T = {}, M = {}> = (currentState: Player<T, M>, nextState: Player<T, M>) => boolean

interface RoomOptions<T = {}, M = {}> {
  endpoint?: string
  stateChangeDetectorFn?: StateChangeDetectorFn<T, M>
}

// Factory functions for individual change detectors
function hasSignificantPositionChangeFactory(threshold?: number): (current: Vector3, next: Vector3) => boolean
function hasSignificantRotationChangeFactory(threshold?: number): (current: Vector3, next: Vector3) => boolean

// Factory function that creates the default composed detector
function hasSignificantStateChange<T = {}, M = {}>(): StateChangeDetectorFn<T, M>
```

Parameters for StateChangeDetectorFn:

- `currentState`: The current player state
- `nextState`: The proposed new state

Returns:

- `true` if the state change is significant enough to send
- `false` if the changes are below the significance thresholds

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
