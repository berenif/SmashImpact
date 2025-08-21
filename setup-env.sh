#!/bin/bash

# Setup script for WASM development environment
# Run this script to configure Emscripten for building the WASM game engine

set -e

echo "========================================="
echo "Setting up WASM Development Environment"
echo "========================================="

# Check if Emscripten is already installed
if [ -d "/workspace/emsdk" ]; then
    echo "✓ Emscripten SDK found at /workspace/emsdk"
    
    # Source the environment
    echo "Configuring Emscripten environment..."
    source "/workspace/emsdk/emsdk_env.sh" > /dev/null 2>&1
    
    # Verify emcc is available
    if command -v emcc >/dev/null 2>&1; then
        echo "✓ Emscripten is properly configured"
        emcc --version | head -1
    else
        echo "⚠ Emscripten found but emcc not in PATH"
        echo "Attempting to activate..."
        cd /workspace/emsdk
        ./emsdk activate latest
        source ./emsdk_env.sh
    fi
else
    echo "✗ Emscripten not found. Installing..."
    
    # Install Emscripten
    cd /workspace
    git clone https://github.com/emscripten-core/emsdk.git
    cd emsdk
    
    # Fetch and install latest SDK
    ./emsdk install latest
    ./emsdk activate latest
    
    # Source the environment
    source ./emsdk_env.sh
    
    echo "✓ Emscripten installed successfully"
fi

# Check Node.js dependencies
echo ""
echo "Checking Node.js dependencies..."
if [ -f "/workspace/package.json" ]; then
    if [ ! -d "/workspace/node_modules" ]; then
        echo "Installing Node.js dependencies..."
        cd /workspace
        npm install
    else
        echo "✓ Node.js dependencies already installed"
    fi
else
    echo "⚠ No package.json found"
fi

# Verify WASM build files
echo ""
echo "Checking WASM build system..."
if [ -f "/workspace/public/game_engine.wasm" ]; then
    echo "✓ WASM module found: /workspace/public/game_engine.wasm"
    ls -lh /workspace/public/game_engine.* 2>/dev/null
else
    echo "⚠ WASM module not found. Run './build.sh' to compile"
fi

echo ""
echo "========================================="
echo "Environment Setup Complete!"
echo "========================================="
echo ""
echo "To use Emscripten in this shell session, run:"
echo "  source /workspace/emsdk/emsdk_env.sh"
echo ""
echo "To build the WASM module, run:"
echo "  cd /workspace && ./build.sh"
echo ""
echo "For quick builds (JS only), run:"
echo "  cd /workspace && ./build-quick.sh"
echo ""