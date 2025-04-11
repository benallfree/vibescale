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

### Prerequisites

- [Bun](https://bun.sh) (Latest version)
- Node.js 18+ (for some development tools)
- A Cloudflare account (for deployment)

### Development

1. Clone the repository:

```bash
bunx tiged benallfree/goodvibes
cd goodvibes
```

2. Install dependencies:

```bash
bun install
```

3. Start the development server:

```bash
bun run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
bun run build
```

### Deployment

Deploy to Cloudflare:

```bash
bun run build
bun run deploy
```

Or use the all-in-one command:

```bash
bun run ship
```

## Project Structure

```
src/
├── game/      # Core game logic and Three.js implementation
├── site/      # Vite site, Cloudflare Worker and Durable Objects
├── ui/        # User interface components
├── controls/  # Game control handlers
├── types/     # TypeScript type definitions
├── utils/     # Utility functions
├── styles/    # Global styles and Tailwind/DaisyUI
└── config/    # Application configuration
```

## Tech Stack

- **Frontend**:

  - Three.js for 3D rendering
  - TypeScript for type safety
  - Vite for fast development
  - Tailwind/DaisyUI for styling

- **Backend**:

  - Cloudflare Workers
  - Durable Objects for state management
  - WebSocket for real-time communication

- **Development**:
  - Bun as package manager
  - TypeScript for type safety
  - Vite for build tooling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
