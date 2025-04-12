# vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale.

## Installation

```bash
npm install vibescale
```

## Quick Start

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Connect to a room
const room = createRoom('my-game')

// Easy debugging - listen to all events
room.on(RoomEventType.Any, ({ type, data }) => {
  console.log('Event:', type, 'Data:', data)
})

// Listen for player updates using enum
room.on(RoomEventType.PlayerUpdated, (player) => {
  console.log('Player updated:', player.id)
  console.log('Position:', player.delta.position)
  console.log('Rotation:', player.delta.rotation)
  console.log('Server data:', player.server)
})

// Handle player joins
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('New player:', player.id)
  console.log('Server color:', player.server.color)
})

// Get your own player data
const localPlayer = room.getLocalPlayer()
if (localPlayer) {
  console.log('My ID:', localPlayer.id)
  console.log('My server color:', localPlayer.server.color)
}

// Get another player's data
const otherPlayer = room.getPlayer('some-player-id')
if (otherPlayer) {
  console.log('Other player color:', otherPlayer.server.color)
}
```

## API Reference

### `createRoom<T = {}, M = {}>(roomName: string, options?: RoomOptions): Room<T, M>`

Creates and connects to a Vibescale room. Supports generic types for custom state (T) and metadata (M).

#### Options

```typescript
interface RoomOptions {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
}
```

### Room Interface

```typescript
interface Room<T = {}, M = {}> {
  // Event handling
  on<E extends keyof RoomEvents<T, M>>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): () => void

  off<E extends keyof RoomEvents<T, M>>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): void

  // Player access
  getPlayer: (id: PlayerId) => Player<T, M> | null
  getLocalPlayer: () => Player<T, M> | null

  // Local player updates
  setLocalPlayerDelta: (delta: PlayerDelta<T>) => void
  setLocalPlayerMetadata: (metadata: PlayerMetadata<M>) => void

  // Connection management
  disconnect: () => void
}

// Available events
enum RoomEventType {
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
  PlayerJoined = 'player:joined',
  PlayerLeft = 'player:left',
  PlayerUpdated = 'player:updated',
  PlayerError = 'player:error',
  WebSocketInfo = 'websocket:info',
  Rx = 'rx',
  Tx = 'tx',
  Any = '*',
}
```

### Event System

The room uses a strongly-typed event system. You can listen to specific events or use '\*' to listen to all events:

```typescript
// Listen to all events
room.on(RoomEventType.Any, ({ type, data }) => {
  console.log('Event:', type, 'Data:', data)
})

// Listen to specific events
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('Player joined:', player)
})

room.on(RoomEventType.PlayerUpdated, (player) => {
  console.log('Player updated:', player)
})

room.on(RoomEventType.Error, ({ message, error, details }) => {
  console.error('Error:', message, error, details)
})
```

### State vs Metadata

The client provides two methods for updating player data:

- `setLocalPlayerDelta`: Used for frequently changing data like position, rotation, or any game state that updates many times per second. This is optimized for high-frequency updates and should contain only the essential data needed for real-time gameplay.

- `setLocalPlayerMetadata`: Used for infrequently changing data that is specific to your game. This is separate from state to avoid sending this data with every state update, reducing network traffic.

For example:

```typescript
// Define your custom state and metadata types
interface GameState {
  health: number
  speed: number
}

interface GameMetadata {
  username: string
  level: number
}

// Create a room with your custom types
const room = createRoom<GameState, GameMetadata>('my-game')

// Frequently updated state (many times per second)
room.setLocalPlayerDelta({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  health: 100,
  speed: 5,
})

// Infrequently updated metadata
room.setLocalPlayerMetadata({
  username: 'Player1',
  level: 5,
})
```

### Types

```typescript
type PlayerId = string

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
  color: string
}

interface Player<T = {}, M = {}> {
  id: PlayerId
  delta: PlayerDelta<T>
  server: PlayerServerData
  metadata: PlayerMetadata<M>
  isLocal: boolean
}

// Event payloads
interface RoomEventPayloads<T = {}, M = {}> {
  'connected': undefined
  'disconnected': undefined
  'error': { message: string; error: any; details?: any }
  'player:joined': Player<T, M>
  'player:left': Player<T, M>
  'player:updated': Player<T, M>
  'player:error': { type: string; error: string; details?: any }
  'websocket:info': Record<string, any>
  'rx': { event: MessageEvent }
  'tx': { message: WebSocketMessage<T, M> }
}
```

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { createRoom, RoomEventType } from 'vibescale'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

const room = createRoom('three-js-room')

// Handle player updates (state changes)
room.on(RoomEventType.PlayerUpdated, (player) => {
  const mesh = players.get(player.id)
  if (mesh) {
    const pos = player.delta.position
    const rot = player.delta.rotation
    mesh.position.set(pos.x, pos.y, pos.z)
    mesh.rotation.set(rot.x, rot.y, rot.z)
  }
})

// Handle new players
room.on(RoomEventType.PlayerJoined, (player) => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: player.server.color })
  const mesh = new THREE.Mesh(geometry, material)

  const pos = player.delta.position
  const rot = player.delta.rotation
  mesh.position.set(pos.x, pos.y, pos.z)
  mesh.rotation.set(rot.x, rot.y, rot.z)

  scene.add(mesh)
  players.set(player.id, mesh)
})

// Handle players leaving
room.on(RoomEventType.PlayerLeft, (player) => {
  const mesh = players.get(player.id)
  if (mesh) {
    scene.remove(mesh)
    players.delete(player.id)
  }
})

// Update local player position and rotation
function onPlayerMove(position: Vector3, rotation: Vector3) {
  room.setLocalPlayerDelta({
    position,
    rotation,
  })
}
```

## License

MIT

## Advanced Examples

### Updating Player State and Metadata

The room provides methods to update your local player's state and metadata:

```typescript
import { createRoom, RoomEventType } from 'vibescale'

const room = createRoom('my-game')

// Update position and rotation (high-frequency updates)
room.setLocalPlayerDelta({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
})

// Update metadata (low-frequency updates)
room.setLocalPlayerMetadata({
  color: '#ff0000', // Required base field
})
```

### Custom Player State and Metadata

You can extend the base `PlayerState` and `PlayerMetadata` types to add custom properties for your game:

```typescript
import { createRoom, RoomEventType, type PlayerState, type PlayerMetadata } from 'vibescale'

// Extend PlayerState with game-specific properties
interface GamePlayerState extends PlayerState {
  health: number
  score: number
  powerups: string[]
  lastAttackTime: number
}

// Extend PlayerMetadata with game-specific properties
interface GamePlayerMetadata extends PlayerMetadata {
  username: string
  team: 'red' | 'blue'
  rank: number
  cosmetics: {
    skin: string
    emotes: string[]
  }
}

// Create a room with your custom types
const room = createRoom<GamePlayerState, GamePlayerMetadata>('my-game')

// TypeScript now knows about your custom properties
room.on(RoomEventType.PlayerUpdated, (player) => {
  // Base properties from PlayerState
  console.log('Position:', player.position)
  console.log('Rotation:', player.rotation)

  // Your custom state properties
  console.log('Health:', player.health)
  console.log('Score:', player.score)
  console.log('Active powerups:', player.powerups)

  // Your custom metadata
  console.log('Team:', player.metadata.team)
  console.log('Rank:', player.metadata.rank)
  console.log('Skin:', player.metadata.cosmetics.skin)
})

// Update with custom state properties
room.setLocalPlayerDelta({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  health: 75,
  score: 100,
  powerups: ['speed', 'shield'],
  lastAttackTime: Date.now(),
})

// Update with custom metadata
room.setLocalPlayerMetadata({
  color: '#ff0000',
  username: 'ProGamer123',
  team: 'blue',
  rank: 42,
  cosmetics: {
    skin: 'dragon',
    emotes: ['dance', 'wave', 'thumbsup'],
  },
})

// Type checking ensures you can't set invalid properties
room.setLocalPlayerDelta({
  invalidProperty: true, // TypeScript error!
})

// Or miss required properties when setting metadata
room.setLocalPlayerMetadata({
  username: 'Player1', // TypeScript error: missing required 'color' property
  team: 'green', // TypeScript error: 'green' is not assignable to 'red' | 'blue'
})
```

This example demonstrates:

- Extending base types with custom properties
- Type safety for custom properties
- Complex nested types
- Union types for constrained values
- Full TypeScript type checking for all operations
