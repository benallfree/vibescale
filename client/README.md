# vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale. vibescale.benallfree.com provides real-time multiplayer state synchronization with automatic reconnection handling and built-in debugging tools.

> **Design Philosophy**: Vibescale acts as the authoritative source of truth for all player states in your multiplayer game. This means that all player state updates are managed and synchronized through Vibescale, ensuring consistency across all connected clients.

> 🤖 **AI/LLM Integration**: If you're an AI model looking to integrate with Vibescale, check out our [LLM-specific RAG](./llm.md) for detailed WebSocket API documentation and best practices. Use `cp node_modules/vibescale/llm.md .cursor/rules/vibescale.mdc`.

## Installation

```bash
npm install vibescale
```

## Quick Start

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Connect to a room with optional custom endpoint
const room = createRoom('my-game', {
  endpoint: 'https://your-server.com', // Optional, defaults to https://vibescale.benallfree.com/
})

// Connect to the room (must be called explicitly)
room.connect()

> **Important**: Room connections are completely ephemeral. Disconnecting and reconnecting will produce a new player ID, and none of the old data should be trusted. Each connection is treated as a fresh start - there is no session persistence between connections.

// Listen for connection events
room.on(RoomEventType.Connected, ({ data }) => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, ({ data }) => {
  console.log('Disconnected from room')
})

// Handle player updates
room.on(RoomEventType.PlayerUpdated, ({ data: player }) => {
  console.log('Player updated:', player.id)
  console.log('Position:', player.position)
  console.log('Rotation:', player.rotation)
  console.log('Color:', player.color)
})

// Handle player joins/leaves
room.on(RoomEventType.PlayerJoined, ({ data: player }) => {
  console.log('New player:', player.id)
  console.log('Color:', player.color)
})

room.on(RoomEventType.PlayerLeft, ({ data: player }) => {
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
room.mutatePlayer(draft => {
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
function createRoom<TPlayer extends PlayerBase = PlayerBase>(
  roomName: string,
  options?: RoomOptions<TPlayer>
): Room<TPlayer>

interface RoomOptions<TPlayer extends PlayerBase = PlayerBase> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer>
}
```

### Events

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

### Room Interface

```typescript
import type { WritableDraft } from 'immer'

interface Room<TPlayer extends PlayerBase> {
  // Event handling
  on: <E extends RoomEventType>(event: E, callback: (event: EmitterEvent<RoomEvents<TPlayer>, E>) => void) => () => void
  off: <E extends RoomEventType>(event: E, callback: (event: EmitterEvent<RoomEvents<TPlayer>, E>) => void) => void
  emit: <E extends RoomEventType>(name: E, data: RoomEvents<TPlayer>[E]) => void

  // Player access
  getPlayer: (id: PlayerId) => TPlayer | null
  getLocalPlayer: () => TPlayer | null
  mutatePlayer: (mutator: (draft: WritableDraft<TPlayer>) => void) => void

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
const room = createRoom<GamePlayer>('my-game')

// TypeScript will now enforce your custom types
room.mutatePlayer((draft) => {
  draft.position = { x: 10, y: 5, z: 0 }
  draft.rotation = { x: 0, y: Math.PI / 2, z: 0 }
  draft.health = 100
  draft.speed = 5
})

// You can also mutate nested objects and arrays safely
room.mutatePlayer((draft) => {
  draft.position.x += 1 // Safe to mutate nested objects
  draft.effects = [...(draft.effects || []), 'shield'] // Safe array operations
})
```

## Room Options

```typescript
interface RoomOptions<TPlayer extends PlayerBase = PlayerBase> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer> // Custom state change detection
}
```

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
const room = createRoom<GamePlayer>('my-game')

// Update state with mutations
room.mutatePlayer((draft) => {
  // Update position and game state
  draft.position = { x: 10, y: 5, z: 0 }
  draft.health = 100
  draft.speed = 5
})

// Another mutation example
room.mutatePlayer((draft) => {
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
- State change detection with configurable thresholds
- Efficient broadcasting to room participants
- Automatic cleanup of disconnected players
- CORS support for cross-origin connections

## State Change Detection

The library includes built-in state change detection to optimize network traffic:

```typescript
import { createRoom, hasSignificantStateChange, type StateChangeDetectorFn } from 'vibescale'

// Default thresholds:
// - Position changes > 0.1 units in world space
// - Rotation changes > 0.1 radians

// Use default state change detector
const room = createRoom('my-game')

// Custom state change detector
const myDetector: StateChangeDetectorFn<PlayerBase<GameState>> = (current, next) => {
  return (
    hasSignificantStateChange(current, next) || // Check position/rotation
    Math.abs(current.state.health - next.state.health) > 5 // Check custom state
  )
}

const room = createRoom<PlayerBase<GameState>>('my-game', {
  stateChangeDetectorFn: myDetector,
})
```

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { createRoom, RoomEventType } from 'vibescale'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

const room = createRoom('three-js-room')
room.connect()

// Handle player updates
room.on(RoomEventType.PlayerUpdated, ({ data: player }) => {
  const mesh = players.get(player.id)
  if (mesh) {
    const pos = player.position
    const rot = player.rotation
    mesh.position.set(pos.x, pos.y, pos.z)
    mesh.rotation.set(rot.x, rot.y, rot.z)
  }
})

// Handle new players
room.on(RoomEventType.PlayerJoined, ({ data: player }) => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: player.color })
  const mesh = new THREE.Mesh(geometry, material)

  const pos = player.position
  const rot = player.rotation
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.rotation.set(rot.x, rot.y, rot.z)

  scene.add(mesh)
  players.set(player.id, mesh)
})

// Handle players leaving
room.on(RoomEventType.PlayerLeft, ({ data: player }) => {
  const mesh = players.get(player.id)
  if (mesh) {
    scene.remove(mesh)
    players.delete(player.id)
  }
})

// Update local player position and rotation
function onPlayerMove(position: Vector3, rotation: Vector3) {
  room.mutatePlayer((draft) => {
    draft.position = position
    draft.rotation = rotation
  })
}
```

## License

MIT
