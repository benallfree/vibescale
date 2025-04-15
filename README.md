# 🌊 Vibescale

A lightweight TypeScript client for building multiplayer games with Vibescale. vibescale.benallfree.com provides real-time multiplayer state synchronization with automatic reconnection handling and built-in debugging tools.

## Features

- 🚀 **Instant Setup**: No server installation required
- 🌐 **Serverless Architecture**: Built on Cloudflare Workers
- 🔄 **Real-time Sync**: Low-latency state synchronization with automatic reconnection
- 🎮 **Game-Ready**: Optimized for multiplayer games with built-in state change detection
- 🔒 **Secure**: Built-in security and data validation
- 🎯 **Type-Safe**: Full TypeScript support with generics
- ⚡ **High Performance**: Efficient state updates using Immer and intelligent change detection
- 🛠️ **Debug Tools**: Built-in debug panel for development

## Installation

```bash
# Using npm
npm install vibescale

# Using yarn
yarn add vibescale

# Using bun
bun add vibescale
```

## Quick Start

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Create and connect to a room
const room = createRoom('my-game', {
  endpoint: 'https://your-server.com', // Optional, defaults to https://vibescale.benallfree.com/
})

// Connect to the room
room.connect()

// Handle connection events
room.on(RoomEventType.Connected, () => {
  console.log('Connected to room')
})

// Update player state
room.mutatePlayer((player) => {
  player.position = { x: 10, y: 5, z: 0 }
  player.rotation = { x: 0, y: Math.PI / 2, z: 0 }
})
```

## Core Concepts

### Player State

Every player has base fields and optional custom state:

```typescript
// Base fields included automatically
type BasePlayerFields = {
  id: PlayerId // Unique player identifier
  position: Vector3 // 3D position in world space
  rotation: Vector3 // 3D rotation in radians
  color: string // Server-assigned color
  username: string // Player username
  isLocal: boolean // Whether this is the local player
  isConnected: boolean // Connection status
}

// Add custom state by extending PlayerBase
import type { PlayerBase } from 'vibescale'

type Player = PlayerBase<{
  health: number
  speed: number
  powerups: string[]
}>

const room = createRoom<Player>('my-game')

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

### Event System

```typescript
// Connection events
room.on(RoomEventType.Connected, () => {
  console.log('Connected to room')
})

room.on(RoomEventType.Disconnected, () => {
  console.log('Disconnected from room')
})

// Player events
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('Player joined:', player.id)
  console.log('Server color:', player.server.color)
})

room.on(RoomEventType.PlayerLeft, (player) => {
  console.log('Player left:', player.id)
})

room.on(RoomEventType.PlayerUpdated, (player) => {
  console.log('Player updated:', player.id)
  console.log('State:', player.state)
})
```

### State Change Detection

```typescript
import { createRoom, hasSignificantStateChange, type StateChangeDetectorFn } from 'vibescale'

// Custom state change detector
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

### Debug Panel

```typescript
import { DebugPanel } from 'vibescale/debug'

// Add to your UI
document.body.appendChild(DebugPanel())
```

Features:

- Real-time player position visualization (radar view)
- Player list with state inspection
- WebSocket message logging
- Connection status monitoring
- Manual player state manipulation
- Automatic wandering simulation for testing

## Advanced Topics

### Design Philosophy

Vibescale acts as the authoritative source of truth for all player states in your multiplayer game. This means that all player state updates are managed and synchronized through Vibescale, ensuring consistency across all connected clients.

### Connection Handling

Room connections are completely ephemeral. Disconnecting and reconnecting will produce a new player ID, and none of the old data should be trusted. Each connection is treated as a fresh start - there is no session persistence between connections.

This design enables:

- Clean state management without stale data
- Automatic cleanup of disconnected players
- Simplified reconnection logic
- No need for complex session management

## API Reference

### Room Creation

```typescript
function createRoom<TPlayer extends PlayerBase>(roomName: string, options?: RoomOptions<TPlayer>): Room<TPlayer>

type RoomOptions<TPlayer extends PlayerBase> = {
  endpoint?: string // Custom server URL (default: https://vibescale.benallfree.com/)
  stateChangeDetectorFn?: StateChangeDetectorFn<TPlayer> // Custom state change detection
}
```

### Room Interface

```typescript
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
  Any = '*',
}
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
