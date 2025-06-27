# Vibescale LLM Integration Guide

This guide is specifically for AI language models integrating with Vibescale. It provides structured information about the client library API, event system, and state management.

> **Design Philosophy**: Vibescale is designed to be the authoritative source of truth for all player states in your multiplayer game. This means that all player state updates are managed and synchronized through Vibescale, ensuring consistency across all connected clients. When implementing game logic, always treat Vibescale's state as the canonical representation of player data.

## Basic Usage

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Create and connect to a room
const room = createRoom('my-room', {
  endpoint: 'https://vibescale.benallfree.com', // Optional
})

> **TypeScript Import for Better Minification**: You can import the TypeScript source directly with `import { createRoom, RoomEventType } from 'vibescale/ts'` for potentially better minification in your bundler.

> **Connection Ephemerality**: Room connections are completely ephemeral. Each disconnect/reconnect cycle generates a new player ID, and previous connection data should not be trusted. The `Connected` event handler should treat each connection as a fresh start by clearing all data structures. There is no session persistence between connections.

// Connect to the room (must be called explicitly)
room.connect()

// Handle connection events
room.on(RoomEventType.Connected, ({ data }) => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, ({ data }) => {
  console.log('Disconnected from room')
})

// Handle player events
room.on(RoomEventType.RemotePlayerJoined, ({ data: player }) => {
  console.log('Player joined:', player.id)
  console.log('Player color:', player.color)
  console.log('Initial position:', player.position)
})

room.on(RoomEventType.RemotePlayerLeft, ({ data: player }) => {
  console.log('Player left:', player.id)
})

room.on(RoomEventType.RemotePlayerUpdated, ({ data: player }) => {
  console.log('Player updated:', player.id)
  console.log('New position:', player.position)
  console.log('New rotation:', player.rotation)
})

// Handle errors
room.on(RoomEventType.Error, ({ data: { message, error, details } }) => {
  console.error('Error:', message, error, details)
})

// Handle WebSocket events
room.on(RoomEventType.Rx, ({ data: jsonMessage }) => {
  console.log('Raw WebSocket message received:', jsonMessage)
})

room.on(RoomEventType.Tx, ({ data: jsonMessage }) => {
  console.log('Message sent:', jsonMessage)
})

// Handle version information for compatibility checking
room.on(RoomEventType.Version, ({ data: { version } }) => {
  console.log('Server version:', version)
  
  // Check compatibility with your client
  if (!isCompatibleVersion(version)) {
    console.warn('Server version incompatible with client')
    room.disconnect()
    // Handle incompatibility (show error, redirect, etc.)
  }
})

function isCompatibleVersion(serverVersion: string): boolean {
  const [major, minor] = serverVersion.split('.').map(Number)
  const clientMajor = 2 // Your client's major version
  
  // Allow same major version, any minor version
  return major === clientMajor
}

// Get the room identifier
const roomId = room.getRoomId() // Returns 'my-room'

// Check connection status
const isConnected = room.isConnected() // Returns true if connected to server
```

## Event Types

```typescript
enum RoomEventType {
  // Core events
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',

  // Remote player events
  RemotePlayerJoined = 'remote:player:joined',
  RemotePlayerLeft = 'remote:player:left',
  RemotePlayerUpdated = 'remote:player:updated',

  // Local player events
  LocalPlayerMutated = 'local:player:mutated',
  AfterLocalPlayerMutated = 'local:player:after:mutated',

  // WebSocket events
  WebSocketInfo = 'websocket:info',
  Rx = 'rx',
  Tx = 'tx',

  // Version events
  Version = 'version',

  // Any event
  Any = '*',
}

// Event payloads
interface RoomEventPayloads<TPlayer extends PlayerBase = PlayerBase> {
  // Core events
  [RoomEventType.Connected]: undefined
  [RoomEventType.Disconnected]: undefined
  [RoomEventType.Error]: {
    message: string
    error: any
    details?: any
  }

  // Remote player events
  [RoomEventType.RemotePlayerJoined]: TPlayer
  [RoomEventType.RemotePlayerLeft]: TPlayer
  [RoomEventType.RemotePlayerUpdated]: TPlayer

  // Local player events
  [RoomEventType.LocalPlayerMutated]: TPlayer
  [RoomEventType.AfterLocalPlayerMutated]: TPlayer

  // WebSocket events
  [RoomEventType.WebSocketInfo]: Record<string, any>
  [RoomEventType.Rx]: string
  [RoomEventType.Tx]: string

  // Version events
  [RoomEventType.Version]: { version: string }

  // Special events
  [RoomEventType.Any]: {
    type: RoomEventType
    data: RoomEventPayloads<TPlayer>[RoomEventType]
  }
}
```

### Event Details

1. Core Events

   - `Connected`: Emitted when successfully connected to the room
   - `Disconnected`: Emitted when disconnected from the room
   - `Error`: Emitted for any error with message and details

2. Player Events

   - `RemotePlayerJoined`: Emitted when a new remote player joins with full player state
   - `RemotePlayerLeft`: Emitted when a remote player leaves with their last state
   - `RemotePlayerUpdated`: Emitted when any remote player's state changes
   - `LocalPlayerMutated`: Emitted when the local player's state is mutated
   - `AfterLocalPlayerMutated`: Emitted after the local player's state mutation is complete

3. WebSocket Events

   - `WebSocketInfo`: Emitted with connection details (endpoints, etc)
   - `Rx`: Emitted when a raw message is received
   - `Tx`: Emitted when a message is sent

4. Version Events

   - `Version`: Emitted immediately after connection with server version information for compatibility checking

5. Special Events
   - `Any`: Catches all events with their type and payload

## Type Definitions

```typescript
import type { PlayerBase, PlayerId, ProduceFn } from 'vibescale'

// Room interface
interface Room<TPlayer extends PlayerBase> {
  // Event handling
  on: <E extends RoomEventType>(event: E, callback: (event: EmitterEvent<RoomEvents<TPlayer>, E>) => void) => () => void
  off: <E extends RoomEventType>(event: E, callback: (event: EmitterEvent<RoomEvents<TPlayer>, E>) => void) => void
  emit: <E extends RoomEventType>(name: E, data: RoomEvents<TPlayer>[E]) => void

  // Player access
  getPlayer: (id: PlayerId) => TPlayer | null
  getLocalPlayer: () => TPlayer | null
  getAllPlayers: () => TPlayer[]
  mutateLocalPlayer: (mutator: (draft: TPlayer) => void) => TPlayer | null

  // Room information
  getRoomId: () => string
  isConnected: () => boolean
  getEndpointUrl: () => string

  // Connection management
  connect: () => void
  disconnect: () => void
}

// Room creation options
interface RoomOptions<TPlayer extends PlayerBase> {
  endpoint?: string
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer>
  normalizePlayerState?: (state: PartialDeep<TPlayer>) => TPlayer
  coordinateConverter?: CoordinateConverter // Coordinate conversion (default: no conversion)
  produce?: ProduceFn // Custom state management function
}

// Generic produce function type
type ProduceFn = <T>(state: T, mutator: (draft: T) => void) => T

// State change detector function type
type StateChangeDetectorFn<TPlayer extends PlayerBase> = (currentState: TPlayer, nextState: TPlayer) => boolean
```

## Endpoint Management

The library provides endpoint management through the `getEndpointUrl` method and `endpoint` option:

```typescript
// Default endpoint
const room = createRoom('my-room')
console.log(room.getEndpointUrl()) // https://vibescale.benallfree.com/my-room

// Custom endpoint
const room = createRoom('my-room', {
  endpoint: 'https://custom-server.com',
})
console.log(room.getEndpointUrl()) // https://custom-server.com
```

The `getEndpointUrl` method:

- Returns the full endpoint URL being used for the room connection
- Respects the custom endpoint if provided in options
- Defaults to vibescale.benallfree.com if no custom endpoint is specified
- Is used internally for WebSocket connection management

## Player State Normalization

The `normalizePlayerState` option allows you to normalize player state received from the server. This is useful when:

- The server sends partial player data that needs to be filled with defaults
- You need to transform server data to match your client's player type
- You want to ensure all custom properties have proper default values

### Basic Normalization Function

```typescript
interface GamePlayer extends PlayerBase {
  health: number
  stamina: number
  level: number
  equipment: string[]
}

const room = createRoom<GamePlayer>('my-game', {
  normalizePlayerState: (partialPlayer) => {
    // Fill in defaults for any missing custom properties
    return {
      ...partialPlayer,
      health: partialPlayer.health ?? 100,       // Default health
      stamina: partialPlayer.stamina ?? 100,     // Default stamina  
      level: partialPlayer.level ?? 1,           // Default level
      equipment: partialPlayer.equipment ?? [],  // Default empty equipment
    } as GamePlayer
  }
})
```

### Normalizer Factory

For more complex scenarios, you can use the `createPlayerStateNormalizer` factory which provides default normalization for base player properties and allows custom normalization:

```typescript
import { createPlayerStateNormalizer } from 'vibescale'

interface GamePlayer extends PlayerBase {
  health: number
  stamina: number
  level: number
  equipment: string[]
}

// Create a normalizer with custom logic
const gameNormalizer = createPlayerStateNormalizer<GamePlayer>({
  customNormalizer: (state) => {
    return {
      ...state,
      health: state.health ?? 100,
      stamina: state.stamina ?? 100,
      level: state.level ?? 1,
      equipment: state.equipment ?? [],
    } as GamePlayer
  }
})

const room = createRoom<GamePlayer>('my-game', {
  normalizePlayerState: gameNormalizer
})
```

### Normalizer Factory Options

The `createPlayerStateNormalizer` factory accepts configuration options:

```typescript
interface PlayerStateNormalizerFactoryOptions {
  customNormalizer?: <TPlayer extends PlayerBase>(
    state: PartialDeep<PlayerBase>
  ) => PartialDeep<TPlayer>
}

// Type definitions
type PlayerStateNormalizerFactoryOptions = {
  customNormalizer?: <TPlayer extends PlayerBase>(
    state: PartialDeep<PlayerBase>
  ) => PartialDeep<TPlayer>
}

function createPlayerStateNormalizer<TPlayer extends PlayerBase>(
  options: PlayerStateNormalizerFactoryOptions
): (state: PartialDeep<TPlayer>) => TPlayer

function defaultNormalizePlayerState<TPlayer extends PlayerBase>(
  state: PartialDeep<TPlayer>
): TPlayer
```

### Default Normalization

The factory uses `defaultNormalizePlayerState` internally, which provides these defaults for base player properties:

- `position`: `{ x: 0, y: 0, z: 0 }`
- `rotation`: `{ x: 0, y: 0, z: 0 }`
- `color`: `'#ff0000'`
- `username`: `'enseapea'`
- `isLocal`: `false`
- `isConnected`: `false`
- `id`: `''`

```typescript
import { defaultNormalizePlayerState, createPlayerStateNormalizer } from 'vibescale'

// Use default normalization directly
const room = createRoom('my-game', {
  normalizePlayerState: defaultNormalizePlayerState
})

// Create normalizer with only custom logic (no default normalization)
const customOnlyNormalizer = createPlayerStateNormalizer<GamePlayer>({
  customNormalizer: (state) => {
    return {
      ...state,
      health: state.health ?? 100,
      stamina: state.stamina ?? 100,
    } as GamePlayer
  }
})

// Combine default and custom normalization manually
const room = createRoom<GamePlayer>('my-game', {
  normalizePlayerState: (partialPlayer) => {
    // First apply default normalization
    const normalized = defaultNormalizePlayerState(partialPlayer)
    
    // Then add custom properties
    return {
      ...normalized,
      health: partialPlayer.health ?? 100,
      stamina: partialPlayer.stamina ?? 100,
    } as GamePlayer
  }
})
```

The normalization function:
- Receives `PartialDeep<TPlayer>` (allows partial/missing properties)
- Must return a complete `TPlayer` object
- Is called for every player state message from the server
- Runs before coordinate conversion and event emission
- Can be created using the factory pattern or implemented as a direct function

## State Management

The library supports configurable state management libraries for immutable updates. By default, it uses a simple shallow copy approach where you handle your own spreading for nested objects, but you can configure it to use libraries like Immer or Mutative:

```typescript
// Base player state is flattened (not nested)
interface PlayerBase {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  color: string
  username: string
  isLocal: boolean
  isConnected: boolean
}

// Define your game-specific state by extending PlayerBase
interface GamePlayer extends PlayerBase {
  health: number
  stamina: number
  effects: string[]
}

// Create room with your custom state type
const room = createRoom<GamePlayer>('game-room')

// Track all players with proper typing
const players = new Map<PlayerId, GamePlayer>()

// Handle player updates with type safety
room.on(RoomEventType.PlayerJoined, ({ data: player }) => {
  players.set(player.id, player)
  console.log(`Player ${player.id} joined with health: ${player.health}`)
})

room.on(RoomEventType.PlayerUpdated, ({ data: player }) => {
  players.set(player.id, player)
  console.log(`Player ${player.id} updated:`)
  console.log('Position:', player.position)
  console.log('Health:', player.health)
  console.log('Effects:', player.effects)
})

// Update local player using Immer-style mutations
room.mutateLocalPlayer((draft) => {
  draft.position = { x: 10, y: 0, z: 5 }
  draft.health = 100
  draft.stamina = 100
})

// Another mutation example
room.mutateLocalPlayer((draft) => {
  draft.position.x += 1 // Safe to mutate nested objects
  draft.effects.push('shield') // Array mutations are safe
})
```

### State Management Options

```typescript
// Default (shallow copy + manual spreading)
const room = createRoom<GamePlayer>('game-room')

// With Immer
import { produce } from 'immer'
const room = createRoom<GamePlayer>('game-room', { produce })

// With Mutative
import { produce } from 'mutative'
const room = createRoom<GamePlayer>('game-room', { produce })

// Custom produce function
import { type ProduceFn } from 'vibescale'
const customProduce: ProduceFn = <T>(state: T, mutator: (draft: T) => void): T => {
  const newState = { ...state } as T // Shallow copy
  mutator(newState)
  return newState
}
const room = createRoom<GamePlayer>('game-room', { produce: customProduce })
```

The state management system has these key features:

1. Configurable state management (default: shallow copy, optional: Immer, Mutative, or custom)
2. Flattened player state structure (no nested state/server fields)
3. Type-safe mutations with full TypeScript support
4. Automatic state change detection
5. Efficient delta updates to the server

## Example: Game Integration

```typescript
// Define your game state
interface GamePlayer extends PlayerBase {
  health: number
  stamina: number
  effects: string[]
}

// Create room with game-specific state
const room = createRoom<GamePlayer>('game-room')

// Track all players
const players = new Map<PlayerId, GamePlayer>()

// Handle player updates
room.on(RoomEventType.RemotePlayerJoined, ({ data: player }) => {
  players.set(player.id, player)
  console.log(`Player ${player.id} joined with health: ${player.health}`)
})

room.on(RoomEventType.RemotePlayerUpdated, ({ data: player }) => {
  players.set(player.id, player)
  console.log(`Player ${player.id} updated:`)
  console.log('Position:', player.position)
  console.log('Health:', player.health)
  console.log('Effects:', player.effects)
})

room.on(RoomEventType.RemotePlayerLeft, ({ data: player }) => {
  players.delete(player.id)
  console.log(`Player ${player.id} left`)
})

// Handle errors
room.on(RoomEventType.Error, ({ data: { message, error } }) => {
  // Reconnection attempts will use exponential backoff
  console.log(message, error)
})

// Update local player
function updatePlayerState(position: Vector3, health: number, stamina: number, effects: string[]) {
  room.mutateLocalPlayer((draft) => {
    draft.position = position
    draft.health = health
    draft.stamina = stamina
    draft.effects = effects
  })
}

// Clean up
function cleanup() {
  room.disconnect()
  players.clear()
}
```

## State Change Detection

The library provides configurable state change detection through the `createStateChangeDetector` factory to optimize network traffic:

```typescript
import { 
  createRoom, 
  createStateChangeDetector, 
  hasSignificantStateChange,
  type StateChangeDetectorFn,
  type StateChangeDetectorOptions 
} from 'vibescale'

// Use default detector (0.1 units position, 0.1 radians rotation)
const room = createRoom<GamePlayer>('my-game')

// Custom detector with specific thresholds
const room = createRoom<GamePlayer>('precision-game', {
  stateChangeDetectorFn: createStateChangeDetector({
    positionDistance: 0.01, // 1cm precision
    rotationAngle: 0.01,    // ~0.5 degree precision
  })
})

// Large world detector
const room = createRoom<GamePlayer>('large-world', {
  stateChangeDetectorFn: createStateChangeDetector({
    positionDistance: 1.0,  // 1 unit threshold
    rotationAngle: 0.2,     // ~11 degree threshold
  })
})

// Custom detector with game-specific property checks
interface GamePlayer extends PlayerBase {
  health: number
  ammo: number
  weaponId: string
}

const room = createRoom<GamePlayer>('fps-game', {
  stateChangeDetectorFn: createStateChangeDetector<GamePlayer>({
    positionDistance: 0.1,
    rotationAngle: 0.05,
    customChecker: (current, next) => {
      // Always detect changes in game-specific properties
      return (
        Math.abs(current.health - next.health) > 5 || // Health changes > 5
        Math.abs(current.ammo - next.ammo) > 0 ||     // Any ammo change
        current.weaponId !== next.weaponId            // Weapon changes
      )
    }
  })
})

// Alternatively, create a custom detector function from scratch
const gameDetector = (current: GamePlayer, next: GamePlayer): boolean => {
  // Check position/rotation changes first
  const baseDetector = createStateChangeDetector<GamePlayer>({
    positionDistance: 0.1,
    rotationAngle: 0.05,
  })
  
  if (baseDetector(current, next)) {
    return true
  }
  
  // Check game-specific changes
  return (
    Math.abs(current.health - next.health) > 5 || // Health changes > 5
    Math.abs(current.ammo - next.ammo) > 0        // Any ammo change
  )
}

const room = createRoom<GamePlayer>('fps-game-alt', {
  stateChangeDetectorFn: gameDetector,
})
```

### State Change Detector Options

The `StateChangeDetectorOptions` interface defines configurable detection sensitivity and custom checkers:

```typescript
interface StateChangeDetectorOptions<TPlayer extends PlayerBase> {
  positionDistance?: number // Units in world space (default: 0.1)
  rotationAngle?: number    // Radians (default: 0.1)
  customChecker?: (currentState: TPlayer, nextState: TPlayer) => boolean
}

// Factory function creates detectors with custom options
function createStateChangeDetector<TPlayer extends PlayerBase>(
  options?: StateChangeDetectorOptions<TPlayer>
): StateChangeDetectorFn<TPlayer>

// Individual detector factories
function createPositionChangeDetector(threshold?: number): (current: Vector3, next: Vector3) => boolean
function createRotationChangeDetector(threshold?: number): (current: Vector3, next: Vector3) => boolean
```

This system allows you to:

1. **Optimize network traffic** by filtering out insignificant movements
2. **Customize sensitivity** based on your game's world scale and precision requirements
3. **Combine position/rotation detection** with game-specific state changes
4. **Use individual detectors** for fine-grained control
5. **Add custom property checks** for game-specific state changes (health, ammo, etc.)
6. **Always detect username/color changes** automatically

## Connection Management

The library provides robust connection management with the following features:

```typescript
interface ConnectionConfig {
  maxReconnectAttempts: number // Default: 10
  baseReconnectDelay: number // Default: 1000ms
  maxReconnectDelay: number // Default: 30000ms
}

// Connection status checking
const isConnected = room.isConnected()

// Manual disconnection
room.disconnect()

// Automatic reconnection
room.on(RoomEventType.Error, ({ data: { message, error } }) => {
  // Reconnection attempts will use exponential backoff
  console.log(message, error)
})
```

The reconnection system uses exponential backoff with the following behavior:

- Initial delay starts at 1 second
- Each attempt doubles the delay
- Maximum delay is capped at 30 seconds
- Maximum 10 reconnection attempts

## Best Practices

1. State Management

   - Use `mutateLocalPlayer` with safe mutations for state updates
   - Keep mutations minimal and focused
   - Use the draft parameter to safely mutate nested objects and arrays
   - The server applies change detection to all state updates
   - Mutations are batched and optimized automatically
   - Configure a `produce` function for your preferred state management library (Immer, Mutative, etc.)

2. Type Safety

   - Define explicit interfaces extending `PlayerBase`
   - Use TypeScript generics when creating rooms
   - Leverage type checking for mutations
   - Use the draft parameter type hints for better code completion

3. Event Handling

   - Always handle connection and error events
   - Clean up event listeners when disconnecting
   - Use type-safe event handlers
   - Remember that connections are ephemeral

4. Performance

   - Only mutate what needs to change
   - Let your configured produce function handle immutability
   - The library automatically handles change detection
   - Clean up resources on disconnect

5. Error Handling
   - Handle connection errors and disconnects
   - Implement reconnection logic if needed
   - Log errors appropriately
   - Maintain game state during reconnection

The library handles WebSocket connection, reconnection, and message serialization automatically. Focus on using the high-level API provided by `createRoom` rather than managing WebSocket connections directly.

## Event System

### Event Structure

All events in Vibescale follow a consistent structure using the `EmitterEvent` type:

```typescript
type EmitterEvent<Events, E extends keyof Events = keyof Events> = {
  name: E
  data: Events[E]
}
```

When handling events, you'll receive an event object with:

- `name`: The event type (from RoomEventType)
- `data`: The event payload, typed according to the event type

For example:

```typescript
// Connected event (no data)
room.on(RoomEventType.Connected, ({ name, data }) => {
  console.log('Connected event received')
})

// Player event with typed data
room.on(RoomEventType.RemotePlayerJoined, ({ name, data: player }) => {
  console.log(`Player ${player.id} joined`)
})

// Error event with structured data
room.on(RoomEventType.Error, ({ name, data: { message, error, details } }) => {
  console.error('Error:', message, error, details)
})
```

The event system provides full type safety:

- Event names are restricted to RoomEventType values
- Event payloads are typed according to RoomEventPayloads
- Event handlers receive properly typed event objects
- The wildcard event '\*' captures all events with their proper types

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

  // Any event
  Any = '*',
}

// Event payloads
interface RoomEventPayloads<TPlayer extends PlayerBase = PlayerBase> {
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

## Version/Protocol Compatibility

The Vibescale server sends a version message immediately after WebSocket connection to help clients screen for compatible server versions. This message is sent **before** any other messages, allowing clients to perform early compatibility checks:

```typescript
// Handle version information for compatibility checking
room.on(RoomEventType.Version, ({ data: { version } }) => {
  console.log('Server version:', version)
  
  // Check compatibility with your client
  if (!isCompatibleVersion(version)) {
    console.warn('Server version incompatible with client')
    room.disconnect()
    // Handle incompatibility (show error, redirect, etc.)
  }
})

// Example compatibility check function
function isCompatibleVersion(serverVersion: string): boolean {
  const [major, minor] = serverVersion.split('.').map(Number)
  const clientMajor = 2 // Your client's major version
  
  // Allow same major version, any minor version
  return major === clientMajor
}
```

The version message structure:

```typescript
{
  type: 'version',
  version: string // Semantic version string (e.g., "2.1.3")
}
```

This feature is particularly useful for:

- Ensuring client-server compatibility before establishing gameplay
- Gracefully handling version mismatches in production
- Implementing different behavior based on server capabilities
- Providing clear error messages to users about version incompatibility
- Supporting backward compatibility strategies

The version message is sent as the first message after WebSocket connection establishment, before the local player state message, allowing immediate compatibility validation.

## Coordinate Conversion

Vibescale server uses normalized coordinates (-1 to 1) for all axes, but your game may use different coordinate systems. The client library provides automatic coordinate conversion through the `coordinateConverter` option:

```typescript
import { createRoom, createCoordinateConverter } from 'vibescale'

// Single scale for all axes
const room = createRoom('my-game', {
  coordinateConverter: createCoordinateConverter(10) // Maps server -1:1 to world -10:10
})

// Different scales per axis
const room = createRoom('my-game', {
  coordinateConverter: createCoordinateConverter({ x: 10, y: 5, z: 20 })
})

// Using the helper function with individual values
const room = createRoom('my-game', {
  coordinateConverter: createCoordinateConverter(10, 5, 20) // x=10, y=5, z=20
})
```

### How Coordinate Conversion Works

1. **Outgoing** (client to server): World coordinates are automatically converted to normalized coordinates (-1:1) before sending
2. **Incoming** (server to client): Normalized coordinates are automatically converted to world coordinates using your scale

```typescript
// With coordinateConverter: createCoordinateConverter(10)
room.mutateLocalPlayer((draft) => {
  draft.position = { x: 5, y: 0, z: -8 } // World coordinates
  // Automatically converted to { x: 0.5, y: 0, z: -0.8 } for server
})

// When receiving player updates:
room.on(RoomEventType.PlayerUpdated, ({ data: player }) => {
  console.log(player.position) // Already converted back to world coordinates
  // Server sent { x: 0.3, y: 0, z: -0.6 }
  // You receive { x: 3, y: 0, z: -6 }
})
```

### Coordinate Conversion Types

```typescript
type WorldScale = {
  x: number
  y: number
  z: number
}

type CoordinateConverter = {
  serverToWorld: (serverPos: Vector3) => Vector3
  worldToServer: (worldPos: Vector3) => Vector3
}

// Manual coordinate conversion (if needed)
import { createCoordinateConverter } from 'vibescale'

const converter = createCoordinateConverter(10)

// Convert world to server coordinates
const serverPos = converter.worldToServer({ x: 5, y: 0, z: -8 })
// Result: { x: 0.5, y: 0, z: -0.8 }

// Convert server to world coordinates
const worldPos = converter.serverToWorld({ x: 0.3, y: 0, z: -0.6 })
// Result: { x: 3, y: 0, z: -6 }
```
