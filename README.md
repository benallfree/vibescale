# Using yarn

yarn add vibescale

# Using bun

bun add vibescale

## Basic Usage

```typescript
import { createRoom, RoomEventType } from 'vibescale'

// Create and connect to a room
const room = createRoom('my-room')

// Handle connection events
room.on(RoomEventType.Connected, () => {
  console.log('Connected to room')
})

// Handle player events
room.on(RoomEventType.PlayerJoined, (player) => {
  console.log('Player joined:', player.id)
  console.log('Player color:', player.server.color)
  console.log('Initial position:', player.delta.position)
})

// Update local player position and rotation
room.setLocalPlayerDelta({
  position: { x: 10, y: 0, z: 5 },
  rotation: { x: 0, y: Math.PI / 2, z: 0 },
})

// Add custom game state
interface GameState {
  health: number
  speed: number
}

interface GameMetadata {
  username: string
  level: number
}

const gameRoom = createRoom<GameState, GameMetadata>('game-room')
```

## Features

- �� **Instant Setup**: No server installation required
- 🌐 **Serverless Architecture**: Built on Cloudflare Workers
- 🔄 **Real-time Sync**: Low-latency state synchronization
- 🎮 **Game-Ready**: Optimized for multiplayer games
- 🔒 **Secure**: Built-in security and data validation
- 🎯 **Type-Safe**: Full TypeScript support with generics
- ⚡ **High Performance**: Efficient state updates and change detection

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
