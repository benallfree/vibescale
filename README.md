# 🏝️ GoodVibes

Vibescale Three.js Game Starter Kit for Building Multiplayer Web Games

https://github.com/user-attachments/assets/5bf9fdb7-186a-45ea-84f2-ea92c0aa0659

📺 [Installation Walkthrough](https://x.com/benallfree/status/1909934375359381513)

## Features

- 🎮 Build Multiplayer Web Games Fast
- 🌐 Real-time WebSocket Networking
- 🚀 Cloudflare Edge Deployment
- ⚡ Vite + TypeScript + Three.js
- 🔌 Durable Objects for Game State
- 📚 Comprehensive Documentation

## Getting Started

### Development

```bash
# Install dependencies
bun i

# Start client development server
bun run --cwd client dev

# Start server development
bun run --cwd server dev
```

### Deployment

```bash
# Build the project
bun run build

# Deploy to Cloudflare
bun run deploy
```

## Testing

### MMO Testing Made Easy

Test your multiplayer game interactions easily using [VibeCheck](https://vibecheck.benallfree.com) - a powerful testing tool that allows you to run multiple game clients simultaneously in iframes within a single browser window. This makes it simple to observe and debug real-time interactions between different players in your MMO game.

## Project Structure

```
goodvibes/
├── client/         # Frontend application
├── server/         # Cloudflare Workers + Durable Objects
└── shared/         # Shared types and utilities
```

## Tech Stack

- **Frontend**: Three.js, TypeScript, Vite
- **Backend**: Cloudflare Workers, Durable Objects
- **Package Manager**: Bun
- **Deployment**: Cloudflare Pages

## Documentation

The project includes comprehensive RAG (Retrieval-Augmented Generation) rules for maintaining and extending the codebase. These rules provide guidance for implementing features and following best practices.
