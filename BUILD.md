# Build Instructions for WASM Game Engine

## Quick Start

The easiest way to get started is to use the pre-built WASM files and run the game:

```bash
# Quick syntax check and serve
./build-quick.sh --serve
```

Then open http://localhost:8000/game.html in your browser.

## Build Methods

### Method 1: Using npm scripts (Recommended)

```bash
# Install dependencies
npm install

# Quick build (JavaScript only)
npm run build:quick

# Full WASM build
npm run build

# Start development server
npm run serve

# Run tests
npm test
```

### Method 2: Using Make

```bash
# Setup environment
make setup

# Build WASM module
make build

# Quick build (JavaScript only)
make quick

# Production build
make production

# Start server
make serve

# Run tests
make test
```

### Method 3: Using shell scripts directly

```bash
# Full build with Emscripten
./build.sh

# Quick JavaScript-only build
./build-quick.sh

# Build with Docker (no local Emscripten needed)
./build.sh --docker

# Build and run tests
./build.sh --test
```

## Build Options

### Full WASM Build

Requires Emscripten SDK. The build script will automatically install it if not present.

```bash
./build.sh [options]
  --docker    Build using Docker instead of local Emscripten
  --test      Run tests after building
  --setup     Setup development environment
  --help      Show help message
```

### Quick Build

For JavaScript-only changes when WASM files are already built:

```bash
./build-quick.sh [options]
  --check       Only check syntax
  --minify      Minify JavaScript files
  --production  Create production build
  --serve       Start local development server
  --help        Show help message
```

## Prerequisites

### For Full WASM Build

- **Option 1: Local Emscripten**
  - Git
  - Python 3
  - CMake (optional, for some Emscripten features)
  - Node.js (for running tests)

- **Option 2: Docker Build**
  - Docker installed and running
  - No other dependencies needed

### For Quick Build

- Node.js (for syntax checking)
- Python 3, PHP, or Node.js http-server (for development server)

## Installing Emscripten

If you want to build WASM locally:

```bash
# Automatic installation
./build.sh  # Will install if not found

# Manual installation
make install-emscripten
source emsdk/emsdk_env.sh
```

## Project Structure

```
/workspace/
├── wasm/                  # C++ source files
│   ├── game_engine.cpp    # Main game engine
│   └── include/           # Header files
├── public/                # Built files and assets
│   ├── game_engine.js     # Generated WASM JavaScript
│   └── game_engine.wasm   # Generated WASM binary
├── src/                   # JavaScript source files
│   └── ai/               # AI implementations
├── tests/                 # Test files
├── game.html             # Main game file
├── build.sh              # Full build script
├── build-quick.sh        # Quick build script
├── Makefile              # Make targets
└── package.json          # npm configuration
```

## Troubleshooting

### Emscripten not found

Run the automatic installation:
```bash
./build.sh --setup
```

Or install manually:
```bash
make install-emscripten
source emsdk/emsdk_env.sh
```

### Build fails with memory errors

The WASM module is configured to grow memory as needed. If you still have issues:

1. Check browser console for specific errors
2. Ensure your browser supports WebAssembly
3. Try a different browser (Chrome/Firefox recommended)

### Cannot start server

Install one of these:
- Python 3: `apt-get install python3`
- Node.js http-server: `npm install -g http-server`
- PHP: `apt-get install php`

### Tests failing

Tests require Node.js. Install with:
```bash
apt-get install nodejs npm
```

## Production Deployment

1. Create optimized build:
```bash
npm run build:production
# or
make production
```

2. Files will be in `dist/` directory

3. Deploy the `dist/` directory to your web server

4. Ensure your web server has correct MIME types:
   - `.wasm` → `application/wasm`
   - `.js` → `application/javascript`

## Development Workflow

1. **For C++ changes**: Run full build
   ```bash
   npm run build
   ```

2. **For JavaScript changes**: Run quick build
   ```bash
   npm run build:quick
   ```

3. **Start dev server**: 
   ```bash
   npm run serve
   ```

4. **Run tests**:
   ```bash
   npm test
   ```

## Performance Notes

- The WASM module is optimized with `-O3` flag
- Memory allocation uses `emmalloc` for better performance
- File system is disabled to reduce size
- The module is modularized for better loading

## Browser Compatibility

- Chrome 57+
- Firefox 52+
- Safari 11+
- Edge 16+

WebAssembly must be enabled in the browser.