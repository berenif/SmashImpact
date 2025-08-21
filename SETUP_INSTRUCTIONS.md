# WASM Game Engine - Setup Instructions

## Quick Start for Future Agents

### 1. Environment Setup
Run the setup script to configure Emscripten and dependencies:
```bash
./setup-env.sh
```

### 2. Activate Emscripten (Required for each new shell session)
```bash
source /workspace/emsdk/emsdk_env.sh
```

### 3. Build the WASM Module
```bash
# Full build (includes WASM compilation)
./build.sh

# Quick build (JavaScript only, when WASM is already compiled)
./build-quick.sh
```

## Important Paths

- **Emscripten SDK**: `/workspace/emsdk/`
- **WASM Source**: `/workspace/wasm/game_engine.cpp`
- **Build Output**: 
  - `/workspace/public/game_engine.wasm`
  - `/workspace/public/game_engine.js`
- **Main Game**: `/workspace/game.html`
- **Documentation**: `/workspace/docs/`

## Build System Overview

### Available Build Scripts
- `./build.sh` - Main build script with Emscripten setup
- `./build-quick.sh` - Quick JS-only build
- `./setup-env.sh` - Environment setup helper
- `./scripts/wasm-build-helper.sh` - Advanced WASM build helper

### Build Options
```bash
# Setup development environment
./build.sh --setup

# Build with Docker (if Docker is available)
./build.sh --docker

# Run tests after building
./build.sh --test
```

## Verifying Installation

1. Check Emscripten:
```bash
source /workspace/emsdk/emsdk_env.sh
emcc --version
```

2. Check WASM output:
```bash
ls -la /workspace/public/game_engine.*
```

3. Run the game:
```bash
# Start a local server
cd /workspace
python3 -m http.server 8000
# Open http://localhost:8000/game.html in a browser
```

## Troubleshooting

### Emscripten Not Found
If `emcc` command is not found:
```bash
cd /workspace/emsdk
./emsdk activate latest
source ./emsdk_env.sh
```

### Build Fails
1. Ensure Emscripten is activated:
   ```bash
   source /workspace/emsdk/emsdk_env.sh
   ```
2. Check for build errors in:
   - `/workspace/wasm/game_engine.cpp`
   - Build logs

### Missing Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python (if needed for server)
apt-get update && apt-get install -y python3
```

## Project Structure

```
/workspace/
├── emsdk/                 # Emscripten SDK
├── wasm/                  # WASM source code
│   ├── game_engine.cpp    # Main WASM module
│   ├── include/           # Header files
│   └── src/               # Additional source files
├── public/                # Build output & assets
│   ├── game_engine.wasm   # Compiled WASM module
│   └── game_engine.js     # JS wrapper
├── src/                   # JavaScript source
├── docs/                  # Documentation
│   ├── WASM_API.md
│   ├── WASM_BUILD_GUIDE.md
│   └── WASM_README.md
├── build.sh               # Main build script
├── setup-env.sh           # Environment setup
└── game.html              # Main game file
```

## Notes for Future Development

1. **Emscripten is installed locally** in `/workspace/emsdk/`
2. **Always activate Emscripten** before building: `source /workspace/emsdk/emsdk_env.sh`
3. **WASM module is already compiled** - use `./build-quick.sh` for JS-only changes
4. **Documentation** is in `/workspace/docs/` directory
5. **GitHub workflows** are preserved in `.github/workflows/`

## Current State (as of last update)

- ✅ Emscripten SDK installed (version 4.0.13)
- ✅ WASM module compiled successfully
- ✅ Node.js dependencies installed
- ✅ Documentation restored in docs/ directory
- ✅ GitHub workflows preserved
- ✅ Docker and package.json configuration files restored
- ❌ Test files removed (as requested)
- ❌ Other .md files removed from root (moved to docs/)

Last successful build: Check timestamps on `/workspace/public/game_engine.wasm`