# Vibescale LLM Integration Guide

This guide is specifically for AI language models integrating with Vibescale. It provides structured information about the client library API, event system, and state management.

## Core Architecture

### Design Philosophy

Vibescale acts as the authoritative source of truth for all player states in your multiplayer game. All player state updates are managed and synchronized through Vibescale, ensuring consistency across all connected clients.

### Connection Model

Room connections are completely ephemeral. Each disconnect/reconnect cycle generates a new player ID, and previous connection data should not be trusted. The `Connected` event handler should treat each connection as a fresh start by clearing all data structures. There is no session persistence between connections.

### Base Types

```typescript
// Base player fields - automatically included for all players
type BasePlayerFields = {
  id: PlayerId // Unique player identifier
  position: Vector3 // 3D position in world space
  rotation: Vector3 // 3D rotation in radians
  color: string // Server-assigned color
  username: string // Player username
  isLocal: boolean // Whether this is the local player
  isConnected: boolean // Connection status
}

// Vector3 type used for position and rotation
type Vector3 = {
  x: number
  y: number
  z: number
}

// Room creation options
type RoomOptions<TPlayer extends PlayerBase> = {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer> // Custom state change detection
}

// Room interface
type Room<TPlayer extends PlayerBase> = {
  // Event handling
  on(event: RoomEventType, handler: Function): void
  off(event: RoomEventType, handler: Function): void

  // Player management
  getPlayer(id: PlayerId): TPlayer | null
  getLocalPlayer(): TPlayer | null
  mutatePlayer(mutator: (player: TPlayer) => void): void

  // Room information
  getRoomId(): string
  isConnected(): boolean
  getEndpointUrl(): string

  // Connection management
  connect(): void
  disconnect(): void
}
```

## Event System

### Event Types

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
  Any = '*',
}
```

### Event Payloads

```typescript
type RoomEventPayloads<TPlayer extends PlayerBase> = {
  // Core events
  [RoomEventType.Connected]: undefined
  [RoomEventType.Disconnected]: undefined
  [RoomEventType.Error]: {
    message: string
    error: any
    details?: any
  }

  // Player events
  [RoomEventType.PlayerJoined]: TPlayer
  [RoomEventType.PlayerLeft]: TPlayer
  [RoomEventType.PlayerUpdated]: TPlayer
  [RoomEventType.PlayerError]: {
    type: string
    error: string
    details?: any
  }

  // WebSocket events
  [RoomEventType.WebSocketInfo]: Record<string, any>
  [RoomEventType.Rx]: MessageEvent
  [RoomEventType.Tx]: WebSocketMessage<TPlayer>

  // Special events
  [RoomEventType.Any]: {
    type: RoomEventType
    data: RoomEventPayloads<TPlayer>[RoomEventType]
  }
}
```

## State Management

### Custom State Types

```typescript
import type { PlayerBase } from 'vibescale'

// Example custom player type
type Player = PlayerBase<{
  health: number
  speed: number
  powerups: string[]
}>

// Create room with custom player type
const room = createRoom<Player>('my-game')

// Update state using mutator pattern
room.mutatePlayer((player) => {
  // Base fields accessed directly
  player.position = { x: 10, y: 5, z: 0 }
  player.rotation = { x: 0, y: Math.PI / 2, z: 0 }

  // Custom fields accessed through state
  player.state.health = 100
  player.state.speed = 5
  player.state.powerups = ['shield', 'boost']
})
```

### State Change Detection

```typescript
import { createRoom, hasSignificantStateChange, type StateChangeDetectorFn } from 'vibescale'

// Default thresholds:
// - Position changes > 0.1 units in world space
// - Rotation changes > 0.1 radians

// Custom state change detector example
const myDetector: StateChangeDetectorFn<Player> = (current, next) => {
  return (
    hasSignificantStateChange(current, next) || // Check position/rotation
    Math.abs(current.state.health - next.state.health) > 5 // Check custom state
  )
}

const room = createRoom<Player>('my-game', {
  stateChangeDetectorFn: myDetector,
})
```

## Connection Management

### Configuration

```typescript
type ConnectionConfig = {
  maxReconnectAttempts: number // Default: 10
  baseReconnectDelay: number // Default: 1000ms
  maxReconnectDelay: number // Default: 30000ms
}
```

### Reconnection Behavior

- Initial delay starts at 1 second
- Each attempt doubles the delay (exponential backoff)
- Maximum delay is capped at 30 seconds
- Maximum 10 reconnection attempts
- Automatic cleanup of disconnected players
- No session persistence between connections

## Implementation Guidelines

### State Updates

1. Use `mutatePlayer` for all state changes
2. Access base fields directly on player object
3. Access custom fields through player.state
4. Keep state updates minimal and focused
5. Use state change detection for optimizing network traffic

### Event Handling

1. Always handle Connected/Disconnected events
2. Clear data structures on new connections
3. Track players using a Map<PlayerId, Player>
4. Update player state on PlayerUpdated events
5. Remove players on PlayerLeft events

### Error Handling

1. Listen for Error events
2. Handle reconnection attempts
3. Clear state on disconnection
4. Log errors with appropriate context
5. Maintain game state during reconnection if needed

### Performance Optimization

1. Use state change detection
2. Group related state changes
3. Clean up resources on disconnect
4. Only track necessary player data
5. Use appropriate data structures for player tracking

## Example: Game Integration

```typescript
// Define custom player type
type Player = PlayerBase<{
  health: number
  stamina: number
  effects: string[]
}>

// Create room
const room = createRoom<Player>('game-room')
const players = new Map<PlayerId, Player>()

// Handle connection events
room.on(RoomEventType.Connected, () => {
  players.clear() // Fresh start
})

room.on(RoomEventType.Disconnected, () => {
  players.clear() // Clean up
})

// Handle player events
room.on(RoomEventType.PlayerJoined, (player) => {
  players.set(player.id, player)
})

room.on(RoomEventType.PlayerUpdated, (player) => {
  players.set(player.id, player)
})

room.on(RoomEventType.PlayerLeft, (player) => {
  players.delete(player.id)
})

// Handle errors
room.on(RoomEventType.Error, ({ message, error, details }) => {
  console.error('Error:', message, error, details)
})

// Update local player
function updatePlayer(position: Vector3, health: number, effects: string[]) {
  room.mutatePlayer((player) => {
    player.position = position
    player.state.health = health
    player.state.effects = effects
  })
}

// Clean up
function cleanup() {
  room.disconnect()
  players.clear()
}
```
