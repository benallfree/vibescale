# @vibescale/client

A lightweight TypeScript client for building multiplayer games with Vibescale.

## Installation

```bash
npm install @vibescale/client
```

## Quick Start

```typescript
import { createRoom } from '@vibescale/client'

// Connect to a room
const room = await createRoom('my-awesome-game')

// Listen for state updates
room.onStateChange((state) => {
  console.log('Player state updated:', state)
})

// Handle player joins
room.onPlayerJoin((player) => {
  console.log('Player joined:', player)
})

// Handle player leaves
room.onPlayerLeave((playerId) => {
  console.log('Player left:', playerId)
})

// Send updates to other players
room.broadcast({
  type: 'PLAYER_MOVE',
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
})
```

## API Reference

### `createRoom(roomName: string, options?: RoomOptions): Promise<Room>`

Creates and connects to a Vibescale room.

#### Options

```typescript
interface RoomOptions {
  url?: string // Custom server URL (default: wss://vibescale.benallfree.com)
  onStateChange?: (state: PlayerState) => void // Called when any player's state updates
  onPlayerJoin?: (player: PlayerAtRest) => void // Called when a new player joins
  onPlayerLeave?: (playerId: PlayerId) => void // Called when a player leaves
  onError?: (error: string) => void // Called on errors
}
```

### Room Interface

```typescript
interface Room {
  // Send a message to all players in the room
  broadcast: (message: any) => void

  // Event handlers
  onStateChange: (callback: (state: PlayerState) => void) => void
  onPlayerJoin: (callback: (player: PlayerAtRest) => void) => void
  onPlayerLeave: (callback: (playerId: PlayerId) => void) => void

  // Get current player information
  getPlayerId: () => PlayerId | null
  getPlayerMetadata: () => PlayerMetadata | null
  getPlayerState: () => PlayerState | null

  // Disconnect from the room
  disconnect: () => void
}
```

### Types

```typescript
interface Vector3 {
  x: number
  y: number
  z: number
}

type PlayerId = string

interface PlayerState {
  id: PlayerId
  position: Vector3
  rotation: Vector3
}

interface PlayerMetadata {
  color: string
  [key: string]: unknown
}

interface PlayerAtRest {
  id: PlayerId
  position: Vector3
  rotation: Vector3
  metadata: PlayerMetadata
  extra: Record<string, unknown>
}
```

## Example: Three.js Integration

```typescript
import * as THREE from 'three'
import { createRoom } from '@vibescale/client'

const scene = new THREE.Scene()
const players = new Map<string, THREE.Mesh>()

const room = await createRoom('three-js-room')

// Handle state updates
room.onStateChange((state) => {
  const player = players.get(state.id)
  if (player) {
    player.position.set(state.position.x, state.position.y, state.position.z)
    player.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z)
  }
})

// Handle new players
room.onPlayerJoin((player) => {
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({ color: player.metadata.color })
  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.set(player.position.x, player.position.y, player.position.z)
  mesh.rotation.set(player.rotation.x, player.rotation.y, player.rotation.z)

  scene.add(mesh)
  players.set(player.id, mesh)
})

// Handle players leaving
room.onPlayerLeave((playerId) => {
  const player = players.get(playerId)
  if (player) {
    scene.remove(player)
    players.delete(playerId)
  }
})

// Update player position
function onPlayerMove(position: Vector3, rotation: Vector3) {
  room.broadcast({
    type: 'PLAYER_MOVE',
    position,
    rotation,
  })
}
```

## License

MIT
