# vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale. vibescale.benallfree.com provides real-time multiplayer state synchronization with automatic reconnection handling and built-in debugging tools.

> **Design Philosophy**: Vibescale acts as the authoritative source of truth for all player states in your multiplayer game. This means that all player state updates are managed and synchronized through Vibescale, ensuring consistency across all connected clients.

> 🤖 **AI/LLM Integration**: If you're an AI model looking to integrate with Vibescale, check out our [LLM-specific RAG](./llm.md) for detailed WebSocket API documentation and best practices. Use `cp node_modules/vibescale/llm.md .cursor/rules/vibescale.mdc`.

## Installation

```bash
npm install vibescale
```

### TypeScript Import (Better Minification)

For potentially better minification in your bundler, you can import the TypeScript source directly:

```typescript
import { vibescale, RoomEventType } from 'vibescale/ts'
```

This imports the raw TypeScript files instead of the compiled JavaScript, allowing your bundler to optimize the code during your build process.

## Quick Start

```typescript
import { vibescale, RoomEventType } from 'vibescale'

// Connect to a room with optional custom endpoint
const room = vibescale('my-game', {
  endpoint: 'https://your-server.com', // Optional, defaults to https://vibescale.benallfree.com/
})

// Connect to the room (must be called explicitly)
room.connect()
```

> **Important**: Room connections are completely ephemeral. Disconnecting and reconnecting will produce a new player ID, and none of the old data should be trusted. Each connection is treated as a fresh start - there is no session persistence between connections.

```ts
// Listen for connection events
room.on(RoomEventType.Connected, ({ data }) => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, ({ data }) => {
  console.log('Disconnected from room')
})

// Handle player updates
room.on(RoomEventType.RemotePlayerUpdated, ({ data: player }) => {
  console.log('Player updated:', player.id)
  console.log('Position:', player.position)
  console.log('Rotation:', player.rotation)
  console.log('Color:', player.color)
})

// Handle player joins/leaves
room.on(RoomEventType.RemotePlayerJoined, ({ data: player }) => {
  console.log('New player:', player.id)
  console.log('Color:', player.color)
})

room.on(RoomEventType.RemotePlayerLeft, ({ data: player }) => {
  console.log('Player left:', player.id)
})

// Handle WebSocket events
room.on(RoomEventType.Rx, ({ data: jsonMessage }) => {
  console.log('Raw WebSocket message received:', jsonMessage)
})

room.on(RoomEventType.Tx, ({ data: jsonMessage }) => {
  console.log('Message sent:', jsonMessage)
})

// Access player data
const localPlayer = room.getLocalPlayer()
const otherPlayer = room.getPlayer('some-player-id')

// Update local player state using Immer mutations
room.mutateLocalPlayer(draft => {
  draft.position = { x: 10, y: 5, z: 0 }
  draft.rotation = { x: 0, y: Math.PI / 2, z: 0 }
})

// Get the room identifier
const roomId = room.getRoomId() // Returns 'my-game'

// Check connection status
const isConnected = room.isConnected() // Returns true if connected to server
```

## Features

- Intelligent WebSocket reconnection with configurable exponential backoff
- Optimized state change detection to minimize network traffic
- Configurable state change detection through custom detector functions
- Comprehensive connection status management and error handling
- Server-assigned unique player IDs and colors
- Type-safe event system with mutator-based state updates
- Extensible player state
- Debug panel for development

## API Reference

### Room Creation

```typescript
function vibescale<TPlayer extends PlayerBase = PlayerBase>(
  roomName: string,
  options?: RoomOptions<TPlayer>
): Room<TPlayer>

interface RoomOptions<TPlayer extends PlayerBase = PlayerBase> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer>
  normalizePlayerState?: (state: PartialDeep<TPlayer>) => TPlayer
  worldScale?: number | WorldScale // Coordinate conversion scale (default: 1)
  produce?: ProduceFn // Custom state management function
}
```

### Events

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
  LocalPlayerJoined = 'local:player:joined',
  LocalPlayerUpdated = 'local:player:updated',
  AfterLocalPlayerMutated = 'local:player:after:mutated',

  // Player events
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
  PlayerUpdated = 'player:updated',

  // WebSocket events
  WebSocketInfo = 'websocket:info',
  Rx = 'rx',
  Tx = 'tx',

  // Version events
  Version = 'version',

  // Any event
  Any = '*',
}
```

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
room.on(RoomEventType.PlayerJoined, ({ name, data: player }) => {
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

#### Event Categories

The new event system provides granular control over different types of player events:

**Remote Player Events** - Events for other players in the room:

- `RemotePlayerJoined`: When a remote player joins
- `RemotePlayerLeft`: When a remote player leaves
- `RemotePlayerUpdated`: When a remote player's state changes

**Local Player Events** - Events for your own player:

- `LocalPlayerMutated`: When you mutate your local player state
- `LocalPlayerJoined`: When your local player first joins the room
- `LocalPlayerUpdated`: When your local player state is updated from the server
- `AfterLocalPlayerMutated`: After a local player mutation is complete

**Universal Player Events** - Events for any player (local or remote):

- `PlayerJoined`: When any player joins (fires for both local and remote)
- `PlayerLeft`: When any player leaves (fires for both local and remote)
- `PlayerUpdated`: When any player's state changes (fires for both local and remote)

This layered approach allows you to handle events at the granularity that makes sense for your application - listen to specific player types or use the universal events for simpler handling.

### Room Interface

```typescript
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
```

### Types

The type system is built around a flattened player type that you can extend:

```typescript
// Import base types from Vibescale
import type { PlayerBase, PlayerId, Vector3 } from 'vibescale'

// Base player type (already includes these fields)
interface PlayerBase {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  color: string
  username: string
  isLocal: boolean
  isConnected: boolean
}

// Extend the base player type for your game
interface GamePlayer extends PlayerBase {
  health: number
  speed: number
}

// Create a room with your custom type
const room = vibescale<GamePlayer>('my-game')

// TypeScript will now enforce your custom types
room.mutateLocalPlayer((draft) => {
  draft.position = { x: 10, y: 5, z: 0 }
  draft.rotation = { x: 0, y: Math.PI / 2, z: 0 }
  draft.health = 100
  draft.speed = 5
})

// You can also mutate nested objects and arrays safely
room.mutateLocalPlayer((draft) => {
  draft.position.x += 1 // Safe to mutate nested objects
  draft.effects = [...(draft.effects || []), 'shield'] // Safe array operations
})
```

## State Management Options

Vibescale supports different state management libraries for immutable updates. By default, it uses a simple shallow copy approach where you handle your own spreading for nested objects, but you can configure it to use libraries like Immer or Mutative for more sophisticated immutable updates.

### Default (shallow copy + manual spreading)

```typescript
// Uses built-in shallow copy - you handle nested object copying
const room = vibescale('my-game')

room.mutateLocalPlayer((draft) => {
  // Top-level properties can be mutated directly
  draft.health = 100
  
  // For nested objects, you need to spread manually
  draft.position = { ...draft.position, x: 10 }
  
  // For arrays, spread or use array methods that return new arrays
  draft.inventory = [...draft.inventory, newItem]
})
```

### With Immer

```typescript
import { produce } from 'immer'
import { vibescale } from 'vibescale'

// Configure room to use Immer's produce function
const room = vibescale('my-game', {
  produce // Pass immer's produce function
})

// Now you can use Immer's features - draft will be WritableDraft<TPlayer>
room.mutateLocalPlayer((draft) => {
  draft.position.x += delta.x // Safe mutations with Immer's proxy
  draft.inventory.push(newItem) // Array operations
})
```

### With Mutative

```typescript
import { produce } from 'mutative'
import { vibescale } from 'vibescale'

// Configure room to use Mutative's produce function
const room = vibescale('my-game', {
  produce // Pass mutative's produce function
})

// Now draft will be Mutative's Draft<TPlayer> type
room.mutateLocalPlayer((draft) => {
  draft.position = newPosition // Fast immutable updates with Mutative's proxy
})
```

### Custom Produce Function

You can also provide your own state management implementation:

```typescript
import { vibescale, type ProduceFn } from 'vibescale'

const customProduce: ProduceFn = <T>(state: T, mutator: (draft: T) => void): T => {
  // Your custom immutable update logic - this example does shallow copy
  const newState = { ...state } as T
  mutator(newState)
  return newState
}

const room = vibescale('my-game', {
  produce: customProduce
})
```

## Room Options

```typescript
interface RoomOptions<TPlayer extends PlayerBase = PlayerBase> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer> // Custom state change detection
  normalizePlayerState?: (state: PartialDeep<TPlayer>) => TPlayer // Player state normalization
  coordinateConverter?: CoordinateConverter // Coordinate conversion (default: no conversion)
  produce?: ProduceFn // Custom state management function
}

// Generic produce function type
type ProduceFn = <T>(state: T, mutator: (draft: T) => void) => T
```

### Player State Normalization

The `normalizePlayerState` option allows you to normalize player state received from the server. This is useful when:

- The server sends partial player data that needs to be filled with defaults
- You need to transform server data to match your client's player type
- You want to ensure all custom properties have proper default values

#### Basic Normalization Function

```typescript
interface GamePlayer extends PlayerBase {
  health: number
  stamina: number
  level: number
  equipment: string[]
}

const room = vibescale<GamePlayer>('my-game', {
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

#### Normalizer Factory

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

const room = vibescale<GamePlayer>('my-game', {
  normalizePlayerState: gameNormalizer
})
```

#### Default Normalization

The factory uses `defaultNormalizePlayerState` internally, which provides these defaults for base player properties:

- `position`: `{ x: 0, y: 0, z: 0 }`
- `rotation`: `{ x: 0, y: 0, z: 0 }`
- `color`: `'#ff0000'`
- `username`: `'enseapea'`
- `isLocal`: `false`
- `isConnected`: `false`
- `id`: `''`

```typescript
import { defaultNormalizePlayerState } from 'vibescale'

// Use default normalization directly
const room = vibescale('my-game', {
  normalizePlayerState: defaultNormalizePlayerState
})

// Or combine with custom logic
const room = vibescale<GamePlayer>('my-game', {
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

## Custom State

You can extend the base player type to include game-specific properties:

```typescript
// Game-specific player type
interface GamePlayer extends PlayerBase {
  health: number
  speed: number
  powerups: string[]
}

// Create room with custom type
const room = vibescale<GamePlayer>('my-game')

// Update state with mutations
room.mutateLocalPlayer((draft) => {
  // Update position and game state
  draft.position = { x: 10, y: 5, z: 0 }
  draft.health = 100
  draft.speed = 5
})

// Another mutation example
room.mutateLocalPlayer((draft) => {
  // Update nested fields and arrays
  draft.position.x += 1
  draft.rotation.y = Math.PI / 2
  draft.powerups.push('shield')
  draft.health = Math.min(100, draft.health + 10)
})
```

## Debug Panel

The library includes a built-in debug panel component that provides:

- Real-time player position visualization (radar view)
- Player list with state inspection
- WebSocket message logging
- Connection status monitoring
- Manual player state manipulation
- Automatic wandering simulation for testing

To use the debug panel in your application:

```typescript
import { DebugPanel } from 'vibescale/debug'

// Add to your UI
document.body.appendChild(DebugPanel())
```

## Server Features

The Vibescale server provides:

- Automatic player spawning with random colors and positions
- Efficient broadcasting to room participants
- Automatic cleanup of disconnected players
- CORS support for cross-origin connections

> **Self-Hosting**: Want to run your own Vibescale server? Check out our [Server Setup Guide](../site/) for deployment instructions and configuration options.

## Version/Protocol Compatibility

The Vibescale server sends a version message immediately after WebSocket connection to help clients screen for compatible server versions:

```typescript
// Listen for version information
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

The version message is sent before any other messages, allowing clients to perform early compatibility checks and gracefully handle version mismatches. This is particularly useful when deploying breaking changes or when maintaining backward compatibility across different client versions.

## State Change Detection

The library includes configurable state change detection to optimize network traffic by filtering out insignificant updates:

```typescript
import { 
  vibescale, 
  createStateChangeDetector, 
  hasSignificantStateChange, 
  type StateChangeDetectorFn,
  type StateChangeDetectorOptions 
} from 'vibescale'

// Use default state change detector (0.1 units position, 0.1 radians rotation)
const room = vibescale('my-game')

// Create custom detector with specific thresholds
const room = vibescale('precision-game', {
  stateChangeDetectorFn: createStateChangeDetector({
    positionDistance: 0.01, // Very precise - detect 1cm movements
    rotationAngle: 0.01,    // Very precise - detect small rotations
  })
})

// Large world with less sensitive detection
const room = vibescale('large-world', {
  stateChangeDetectorFn: createStateChangeDetector({
    positionDistance: 1.0,  // Ignore movements under 1 unit
    rotationAngle: 0.2,     // Less sensitive to rotation changes
  })
})

// Custom detector with game-specific property checks
interface GamePlayer extends PlayerBase {
  health: number
  ammo: number
  weaponId: string
  score: number
}

const room = vibescale<GamePlayer>('fps-game', {
  stateChangeDetectorFn: createStateChangeDetector<GamePlayer>({
    positionDistance: 0.1,
    rotationAngle: 0.05,
    customChecker: (current, next) => {
      // Always detect changes in game-specific properties
      return (
        Math.abs(current.health - next.health) > 5 || // Health changes > 5
        Math.abs(current.ammo - next.ammo) > 0 ||     // Any ammo change
        current.weaponId !== next.weaponId ||         // Weapon changes
        current.score !== next.score                  // Score changes
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

const room = vibescale<GamePlayer>('fps-game-alt', {
  stateChangeDetectorFn: gameDetector,
})
```

### State Change Detector Factory

The `createStateChangeDetector` factory provides configurable thresholds and custom checkers:

```typescript
interface StateChangeDetectorOptions<TPlayer extends PlayerBase> {
  positionDistance?: number // Units in world space (default: 0.1)
  rotationAngle?: number    // Radians (default: 0.1)
  customChecker?: (currentState: TPlayer, nextState: TPlayer) => boolean
}

// Default thresholds
const detector = createStateChangeDetector()

// Custom thresholds only
const detector = createStateChangeDetector({
  positionDistance: 0.05, // 5cm precision
  rotationAngle: 0.02,    // ~1 degree precision
})

// With custom property checker
interface MyPlayer extends PlayerBase {
  health: number
  level: number
}

const detector = createStateChangeDetector<MyPlayer>({
  positionDistance: 0.1,
  rotationAngle: 0.05,
  customChecker: (current, next) => {
    // Detect any health or level changes
    return current.health !== next.health || current.level !== next.level
  }
})
```

### Individual Change Detectors

You can also use individual position and rotation detectors:

```typescript
import { 
  createPositionChangeDetector, 
  createRotationChangeDetector 
} from 'vibescale'

const hasPositionChanged = createPositionChangeDetector(0.1)
const hasRotationChanged = createRotationChangeDetector(0.05)

// Use in custom logic
const customDetector = (current: PlayerBase, next: PlayerBase) => {
  return hasPositionChanged(current.position, next.position) ||
         hasRotationChanged(current.rotation, next.rotation)
}
```

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { vibescale, RoomEventType } from 'vibescale'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

// Create room with coordinate conversion for Three.js world space
const room = vibescale('three-js-room', {
  coordinateConverter: createCoordinateConverter(10) // Maps server -1:1 to Three.js -10:10
})
room.connect()

// Handle player updates
room.on(RoomEventType.RemotePlayerUpdated, ({ data: player }) => {
  const mesh = players.get(player.id)
  if (mesh) {
    // Coordinates are already converted to world space
    const pos = player.position
    const rot = player.rotation
    mesh.position.set(pos.x, pos.y, pos.z)
    mesh.rotation.set(rot.x, rot.y, rot.z)
  }
})

// Handle new players
room.on(RoomEventType.RemotePlayerJoined, ({ data: player }) => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: player.color })
  const mesh = new THREE.Mesh(geometry, material)

  // Coordinates are already converted to world space
  const pos = player.position
  const rot = player.rotation
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.rotation.set(rot.x, rot.y, rot.z)

  scene.add(mesh)
  players.set(player.id, mesh)
})

// Handle players leaving
room.on(RoomEventType.RemotePlayerLeft, ({ data: player }) => {
  const mesh = players.get(player.id)
  if (mesh) {
    scene.remove(mesh)
    players.delete(player.id)
  }
})

// Update local player position and rotation
function onPlayerMove(position: Vector3, rotation: Vector3) {
  room.mutateLocalPlayer((draft) => {
    // Use world coordinates directly - conversion happens automatically
    draft.position = position
    draft.rotation = rotation
  })
}
```

## Coordinate Conversion

Vibescale server uses normalized coordinates (-1 to 1) for all axes, but your game may use different coordinate systems. The client library provides automatic coordinate conversion:

```typescript
import { vibescale, createCoordinateConverter } from 'vibescale'

// Single scale for all axes
const room = vibescale('my-game', {
  coordinateConverter: createCoordinateConverter(10) // Maps server -1:1 to world -10:10
})

// Different scales per axis
const room = vibescale('my-game', {
  coordinateConverter: createCoordinateConverter({ x: 10, y: 5, z: 20 })
})

// Using the helper function with individual values
const room = vibescale('my-game', {
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
room.on(RoomEventType.RemotePlayerUpdated, ({ data: player }) => {
  console.log(player.position) // Already converted back to world coordinates
  // Server sent { x: 0.3, y: 0, z: -0.6 }
  // You receive { x: 3, y: 0, z: -6 }
})
```

### Manual Coordinate Conversion

You can also use the conversion functions directly:

```typescript
import { createCoordinateConverter } from 'vibescale'

const converter = createCoordinateConverter(10)

// Convert world to server coordinates
const serverPos = converter.worldToServer({ x: 5, y: 0, z: -8 })
// Result: { x: 0.5, y: 0, z: -0.8 }

// Convert server to world coordinates
const worldPos = converter.serverToWorld({ x: 0.3, y: 0, z: -0.6 })
// Result: { x: 3, y: 0, z: -6 }
```

## License

MIT
