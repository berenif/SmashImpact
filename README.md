# WASM Game Engine

A high-performance WebAssembly-based game engine with advanced AI and physics capabilities.

## Features

- **WebAssembly Core**: High-performance game engine compiled to WASM
- **Advanced AI**: Sophisticated enemy AI with state machines and behaviors
- **Real-time Rendering**: Optimized canvas-based rendering system
- **Input Handling**: Comprehensive keyboard and mouse input management
- **Modular Architecture**: Clean separation of concerns with ES6 modules

## Project Structure

```
wasm-game-engine/
├── src/                    # Source code
│   ├── game/              # Core game modules
│   │   ├── game-core.js  # Main game class
│   │   ├── renderer.js   # Rendering system
│   │   ├── input-handler.js # Input management
│   │   ├── game-loop.js  # Game loop logic
│   │   ├── ui-manager.js # UI components
│   │   └── wasm-loader.js # WASM loading
│   ├── core/              # Core utilities
│   │   ├── EventBus.js   # Event system
│   │   └── GameState.js  # State management
│   ├── ai/                # AI systems
│   │   └── wolf/          # Wolf AI module
│   └── multiplayer/       # Multiplayer features
├── wasm/                  # WebAssembly source
│   ├── game_engine.cpp   # C++ game engine
│   └── include/          # C++ headers
├── public/               # Static assets
│   ├── assets/          # Game assets
│   └── css/             # Stylesheets
├── tests/               # Test suites
├── scripts/             # Build scripts
└── docs/               # Documentation
```

## Quick Start

### Prerequisites

- Node.js >= 14.0.0
- Emscripten SDK (for building WASM)
- Modern web browser with WebAssembly support

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/wasm-game-engine.git
cd wasm-game-engine
```

2. Install dependencies:
```bash
npm install
```

3. Set up Emscripten (if building WASM):
```bash
./setup-env.sh
```

### Development

Run the development server:
```bash
npm run dev
```

Build the project:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## Building from Source

### Quick Build
```bash
npm run build:quick
```

### Production Build
```bash
npm run build:production
```

### Docker Build
```bash
npm run build:docker
```

## Testing

Run all tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## Scripts

- `npm run build` - Full build with WASM compilation
- `npm run build:quick` - Quick build without WASM recompilation
- `npm run serve` - Start development server
- `npm test` - Run test suite
- `npm run clean` - Clean build artifacts

## Browser Support

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

## License

MIT License - see LICENSE file for details

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## Authors

- Your Name - Initial work

## Acknowledgments

- Built with Emscripten
- Uses modern ES6+ JavaScript features
- WebAssembly for high-performance computing