# vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale. vibescale.benallfree.com provides real-time multiplayer state synchronization with automatic reconnection handling and built-in debugging tools.

> 🤖 **AI/LLM Integration**: If you're an AI model looking to integrate with Vibescale, check out our [LLM-specific RAG](./llm.md) for detailed WebSocket API documentation and best practices.

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

// Listen for connection events
room.on(RoomEventType.Connected, () => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, () => {
  console.log('Disconnected from room')
})

// Handle player updates
room.on(RoomEventType.PlayerUpdated, (player) => {
  console.log('Player updated:', player.id)
  console.log('Position:', player.delta.position)
  console.log('Rotation:', player.delta.rotation)
  console.log('Server data:', player.server) // Includes server-assigned color
})

// Handle player joins/leaves
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('New player:', player.id)
  console.log('Server color:', player.server.color)
})

room.on(RoomEventType.PlayerLeft, (player) => {
  console.log('Player left:', player.id)
})

// Access player data
const localPlayer = room.getLocalPlayer()
const otherPlayer = room.getPlayer('some-player-id')

// Update local player state
room.setLocalPlayerDelta({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
})

// Update local player metadata
room.setLocalPlayerMetadata({
  username: 'Player1',
})
```

## Features

- Automatic WebSocket reconnection with exponential backoff
- Server-assigned unique player IDs and colors
- Built-in state change detection to minimize network traffic
- Type-safe event system
- Extensible player state and metadata
- Debug panel for development

## API Reference

### Room Creation

```typescript
function createRoom<T = {}, M = {}>(roomName: string, options?: RoomOptions): Room<T, M>

interface RoomOptions {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
}
```

### Events

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
  Rx = 'rx',
  Tx = 'tx',
  Any = '*',
}
```

### Room Interface

```typescript
interface Room<T = {}, M = {}> {
  // Event handling
  on<E extends keyof RoomEvents<T, M>>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): () => void
  off<E extends keyof RoomEvents<T, M>>(event: E | '*', callback: (payload: RoomEvents<T, M>[E]) => void): void

  // Player access
  getPlayer(id: PlayerId): Player<T, M> | null
  getLocalPlayer(): Player<T, M> | null

  // Local player updates
  setLocalPlayerDelta(delta: PlayerDelta<T>): void
  setLocalPlayerMetadata(metadata: PlayerMetadata<M>): void

  // Connection management
  disconnect(): void
}
```

### Types

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
  color: string // Server-assigned HSL color
}

interface Player<T = {}, M = {}> {
  id: PlayerId
  delta: PlayerDelta<T>
  server: PlayerServerData
  metadata: PlayerMetadata<M>
  isLocal: boolean
}
```

## Custom State and Metadata

You can extend the base types to include game-specific properties:

```typescript
// Game-specific state (high-frequency updates)
interface PlayerState {
  health: number
  speed: number
  powerups: string[]
}

// Game-specific metadata (low-frequency updates)
interface PlayerMeta {
  username: string
  level: number
  equipment: {
    weapon: string
    armor: string
  }
}

// Create room with custom types
const room = createRoom<PlayerState, PlayerMeta>('my-game')

// Update state (frequent updates)
room.setLocalPlayerDelta({
  position: { x: 10, y: 5, z: 0 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
  health: 100,
  speed: 5,
  powerups: ['shield', 'speed'],
})

// Update metadata (infrequent updates)
room.setLocalPlayerMetadata({
  username: 'Player1',
  level: 5,
  equipment: {
    weapon: 'sword',
    armor: 'leather',
  },
})
```

## Debug Panel

The library includes a built-in debug panel component that provides:

- Real-time player position visualization (radar view)
- Player list with state/metadata inspection
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

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { createRoom, RoomEventType } from 'vibescale'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

const room = createRoom('three-js-room')

// Handle player updates
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
