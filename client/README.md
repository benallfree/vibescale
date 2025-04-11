# vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale.

## Installation

```bash
npm install vibescale
```

## Quick Start

```typescript
import { createRoom } from 'vibescale'

// Connect to a room
const room = createRoom('my-awesome-game')

// Listen for player updates (state or metadata changes)
room.on('playerUpdate', (player) => {
  console.log('Player updated:', player)
})

// Handle player joins
room.on('playerJoin', (player) => {
  console.log('Player joined:', player)
})

// Handle player leaves
room.on('playerLeave', (player) => {
  console.log('Player left:', player)
})

// Update local player state (high-frequency updates)
room.setLocalPlayerState({
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
})
```

## API Reference

### `createRoom<T = {}, M = {}>(roomName: string, options?: RoomOptions<T, M>): Room<T, M>`

Creates and connects to a Vibescale room. Supports generic types for custom state (T) and metadata (M).

#### Options

```typescript
interface RoomOptions<T = {}, M = {}> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
}
```

### Room Interface

```typescript
interface Room<T = {}, M = {}> {
  // Event handling
  on<E extends keyof RoomEvents>(event: E, callback: (payload: RoomEvents[E]) => void): () => void
  off<E extends keyof RoomEvents>(event: E, callback: (payload: RoomEvents[E]) => void): void

  // Player access
  getPlayer: (id: PlayerId) => PlayerComplete<T, M> | null
  getLocalPlayer: () => PlayerComplete<T, M> | null

  // Local player updates
  setLocalPlayerState: (state: Partial<Omit<PlayerState<T>, 'id'>>) => void
  setLocalPlayerMetadata: (metadata: Partial<PlayerMetadata<M>>) => void

  // Connection management
  disconnect: () => void
}

// Available events in RoomEvents
interface RoomEvents<T = {}, M = {}> {
  playerUpdate: PlayerComplete<T, M> // Emitted when any player's state or metadata updates
  playerJoin: PlayerComplete<T, M> // Emitted when a player joins
  playerLeave: PlayerComplete<T, M> // Emitted when a player leaves
  connected: undefined // Emitted when connected to the room
  disconnected: undefined // Emitted when disconnected from the room
  error: string // Emitted when an error occurs
  debug: DebugEvent // Emitted for debugging information
}
```

### State vs Metadata

The client provides two methods for updating player data:

- `setLocalPlayerState`: Used for frequently changing data like position, rotation, or any game state that updates many times per second. This is optimized for high-frequency updates and should contain only the essential data needed for real-time gameplay.

- `setLocalPlayerMetadata`: Used for infrequently changing data like player name, color, or other static attributes. This is separate from state to avoid sending this data with every state update, reducing network traffic.

For example:

```typescript
// Frequently updated state (many times per second)
room.setLocalPlayerState({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  health: 100, // Game state that changes during gameplay
})

// Infrequently updated metadata (occasional updates)
room.setLocalPlayerMetadata({
  name: 'Player1',
  color: '#ff0000',
  avatar: 'warrior', // Static attributes that rarely change
})
```

### Types

```typescript
// Core types with support for custom state (T) and metadata (M)
type PlayerId = string

interface Vector3 {
  x: number
  y: number
  z: number
}

interface PlayerState<T = {}> {
  id: PlayerId
  position: Vector3
  rotation: Vector3
} & T

interface PlayerMetadata<M = {}> {
  color: string
  [key: string]: unknown
} & M

interface PlayerComplete<T = {}, M = {}> extends PlayerState<T> {
  metadata: PlayerMetadata<M>
}

// Room events
interface RoomEvents<T = {}, M = {}> {
  playerUpdate: PlayerComplete<T, M>  // Emitted when any player's state or metadata updates
  playerJoin: PlayerComplete<T, M>    // Emitted when a player joins
  playerLeave: PlayerComplete<T, M>   // Emitted when a player leaves
  connected: undefined                 // Emitted when connected to the room
  disconnected: undefined             // Emitted when disconnected from the room
  error: string                       // Emitted when an error occurs
  debug: DebugEvent                   // Emitted for debugging information
}

// Room configuration
interface RoomOptions<T = {}, M = {}> {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
}

// Debug events (if needed for advanced usage)
interface DebugEvent {
  type: DebugEventType
  data?: any
}

type DebugEventType =
  | 'info'
  | 'ws:open'
  | 'ws:close'
  | 'ws:error'
  | 'ws:message:raw'
  | 'ws:message:parsed'
  | 'ws:message:error'
  | 'message:handle:start'
  | 'message:handle:complete'
  | 'message:handle:error'
  | 'player:id:received'
  | 'player:state:updated'
  | 'player:metadata:updated'
  | 'player:leave:processed'
  | 'metadata:update:start'
  | 'metadata:update:local'
  | 'metadata:update:send'
  | 'state:update:start'
  | 'state:update:local'
  | 'state:update:send'
  | 'disconnect'
```

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { createRoom } from 'vibescale'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

const room = createRoom('three-js-room')

// Handle player updates (state changes)
room.on('playerUpdate', (player) => {
  const mesh = players.get(player.id)
  if (mesh) {
    mesh.position.set(player.position.x, player.position.y, player.position.z)
    mesh.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z)
  }
})

// Handle new players
room.on('playerJoin', (player) => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: player.metadata.color })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(player.position.x, player.position.y, player.position.z)
  mesh.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z)

  scene.add(mesh)
  players.set(player.id, mesh)
})

// Handle players leaving
room.on('playerLeave', (player) => {
  const mesh = players.get(player.id)
  if (mesh) {
    scene.remove(mesh)
    players.delete(player.id)
  }
})

// Update local player position and rotation
function onPlayerMove(position: Vector3, rotation: Vector3) {
  room.setLocalPlayerState({
    position,
    rotation,
  })
}
```

## License

MIT
