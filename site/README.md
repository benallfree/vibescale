# Vibescale Server Setup Guide

This guide walks you through setting up and deploying your own Vibescale server using Cloudflare Workers and Durable Objects.

## Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/benallfree/vibescale.git
   cd vibescale
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Set up Cloudflare Workers:**
   ```bash
   cd site
   npx wrangler login
   ```

4. **Deploy:**
   ```bash
   bun run ship
   ```

Your server will be available at `https://vibescale.<your-subdomain>.workers.dev`

## Project Structure

```
site/
├── src/
│   ├── server/
│   │   ├── VibescaleServer.ts    # Main Durable Object class
│   │   ├── index.ts              # Worker entry point
│   │   └── types.ts              # Shared type definitions
│   ├── ui/                       # Web UI components
│   └── main.ts                   # Client-side entry point
├── wrangler.toml                 # Cloudflare Workers configuration
└── package.json                  # Dependencies and scripts
```

## Configuration

### `wrangler.toml`

The main configuration file for Cloudflare Workers:

```toml
name = "vibescale"                    # Your worker name
compatibility_date = "2025-04-04"     # Cloudflare runtime version
main = "./src/server/index.ts"        # Entry point

[durable_objects]
bindings = [
  { class_name = "VibescaleServer", name = "VIBESCALE" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = [ "VibescaleServer" ]

[observability]
enabled = true                        # Enable metrics and logging

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "single-page-application"
```

### Server Configuration

The server is ready to use out of the box with sensible defaults. Configuration is handled through `wrangler.toml` and environment variables.

## Development

### Local Development

1. **Start the development server:**
   ```bash
   cd site
   bun run dev
   ```

2. **Access the development server:**
   - Server: `http://localhost:5173`
   - WebSocket: `ws://localhost:5173/<room-name>/websocket`

### Building

```bash
cd site
bun run build
```

This creates:
- Server bundle in `dist/vibescale/`
- Client assets in `dist/client/`

## Deployment

### Production Deployment

1. **Build and deploy:**
   ```bash
   cd site
   bun run ship
   ```

2. **Deploy only (after building):**
   ```bash
   bun run deploy
   ```

### Custom Domain

To use a custom domain:

1. **Add custom domain in Cloudflare Dashboard:**
   - Go to Workers & Pages > Your Worker > Settings > Triggers
   - Add custom domain

2. **Update your client configuration:**
   ```typescript
   const room = createRoom('my-game', {
     endpoint: 'https://your-custom-domain.com'
   })
   ```

## Server Features

### Player Management

- **Automatic player spawning** with unique IDs and colors
- **Real-time state synchronization** across all connected players
- **Efficient broadcasting** to room participants
- **Graceful disconnection handling**

### WebSocket API

The server exposes a WebSocket API at `/<room-name>/websocket`:

```typescript
// Message types
enum MessageType {
  PlayerState = 'player:state',
  Version = 'version',
  Error = 'error',
}

// Connection flow
1. Client connects to WebSocket
2. Server sends version message
3. Server sends initial player state (with isLocal: true)
4. Server sends states of all existing players
5. Client can send player state updates
6. Server broadcasts updates to other players
```

## Monitoring

### Cloudflare Dashboard

Monitor your server through the Cloudflare Dashboard:

- **Workers & Pages** > Your Worker > Metrics
- Real-time request metrics
- Error rates and response times
- Durable Object usage

### Logging

Enable observability in `wrangler.toml`:

```toml
[observability]
enabled = true
```

View logs with:
```bash
wrangler tail
```

### Debug Panel

The server includes a built-in debug panel accessible at your server URL:

- Real-time player visualization
- WebSocket message logging
- Connection status monitoring
- Player state inspection

## Security

### CORS Configuration

The server includes CORS headers for cross-origin requests:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```



## Scaling

### Cloudflare Workers Benefits

- **Global edge deployment** - Low latency worldwide
- **Automatic scaling** - Handles traffic spikes
- **Durable Objects** - Consistent state per room
- **WebSocket support** - Real-time connections

### Performance Considerations

- Each room runs in its own Durable Object
- Players are automatically load-balanced across edge locations
- State is persisted in Durable Object storage
- Coordinate conversion happens on normalized space (-1 to 1)

## Troubleshooting

### Common Issues

1. **"Durable Object not found"**
   - Ensure migrations are applied: `wrangler deploy`
   - Check `wrangler.toml` configuration

2. **WebSocket connection fails**
   - Verify the endpoint URL format
   - Check CORS configuration
   - Ensure room name is valid



### Debugging

1. **Enable detailed logging:**
   ```bash
   wrangler tail --format=pretty
   ```

2. **Check Durable Object state:**
   ```bash
   wrangler d1 execute vibescale --command="SELECT * FROM rooms"
   ```

3. **Test WebSocket connection:**
   ```bash
   wscat -c "wss://your-server.workers.dev/test-room/websocket"
   ```

## Environment Variables

You can set environment variables in `wrangler.toml`:

```toml
[vars]
DEBUG_MODE = "true"
CUSTOM_SETTING = "value"
```

Access them in your code:
```typescript
const debugMode = env.DEBUG_MODE === 'true'
const customSetting = env.CUSTOM_SETTING || 'default'
```

## Advanced Configuration

### Custom State Validation

Add server-side state validation:

```typescript
async webSocketMessage(ws: CloudflareWebSocket, message: string) {
  const data = JSON.parse(message) as WebSocketMessage
  
  // Custom validation
  if (data.type === MessageType.PlayerState) {
    const player = data as PlayerBase
    
    // Validate position bounds
    if (Math.abs(player.position.x) > 1 || 
        Math.abs(player.position.z) > 1) {
      ws.close(1003, 'Invalid position')
      return
    }
  }
  
  // ... rest of message handling
}
```

### Custom Room Logic

Extend the server for game-specific logic:

```typescript
export class GameServer extends VibescaleServer {
  async webSocketMessage(ws: CloudflareWebSocket, message: string) {
    // Game-specific message handling
    const data = JSON.parse(message)
    
    if (data.type === 'game:action') {
      // Handle game actions
      this.handleGameAction(ws, data)
      return
    }
    
    // Delegate to base class
    super.webSocketMessage(ws, message)
  }
}
```

## Support

- **Documentation**: [Client README](./client/README.md)
- **Issues**: [GitHub Issues](https://github.com/benallfree/vibescale/issues)
- **Community**: [Discord](https://discord.gg/vibescale) (if available)

## License

MIT - See [LICENSE](./LICENSE) for details. 