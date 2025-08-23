#!/bin/bash

# Simple compile script for Enhanced Combat Engine
# This assumes Emscripten is already installed

echo "Attempting to compile Enhanced Combat Engine..."

# Try to find emcc in common locations
EMCC=""
if command -v emcc >/dev/null 2>&1; then
    EMCC="emcc"
elif [ -f "/emsdk/upstream/emscripten/emcc" ]; then
    EMCC="/emsdk/upstream/emscripten/emcc"
elif [ -f "./emsdk/upstream/emscripten/emcc" ]; then
    EMCC="./emsdk/upstream/emscripten/emcc"
elif [ -f "$HOME/emsdk/upstream/emscripten/emcc" ]; then
    EMCC="$HOME/emsdk/upstream/emscripten/emcc"
else
    echo "Error: emcc not found. Trying to source emsdk_env.sh..."
    
    # Try to source emsdk environment
    if [ -f "/emsdk/emsdk_env.sh" ]; then
        source /emsdk/emsdk_env.sh
    elif [ -f "./emsdk/emsdk_env.sh" ]; then
        source ./emsdk/emsdk_env.sh
    elif [ -f "$HOME/emsdk/emsdk_env.sh" ]; then
        source $HOME/emsdk/emsdk_env.sh
    fi
    
    # Check again
    if command -v emcc >/dev/null 2>&1; then
        EMCC="emcc"
    else
        echo "Failed to find emcc. Please install Emscripten first."
        echo "You can run: ./setup-env.sh"
        exit 1
    fi
fi

echo "Using emcc at: $EMCC"

# Navigate to wasm directory
cd wasm

# Compile the enhanced combat engine
echo "Compiling enhanced_combat_engine.cpp..."

$EMCC enhanced_combat_engine.cpp \
    -o ../public/enhanced_combat_engine.js \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME='EnhancedCombatModule' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web' \
    -s NO_EXIT_RUNTIME=1 \
    -lembind \
    -std=c++17 \
    -O2

if [ $? -eq 0 ]; then
    echo "✓ Compilation successful!"
    echo "Files created:"
    ls -lh ../public/enhanced_combat_engine.* 2>/dev/null || echo "Check public/ directory for output files"
    
    # Create the wrapper if it doesn't exist
    if [ ! -f "../public/enhanced_combat_wrapper.js" ]; then
        echo "Creating wrapper file..."
        cat > ../public/enhanced_combat_wrapper.js << 'WRAPPER_EOF'
// Enhanced Combat Engine Wrapper
// Provides WASM implementation with JS fallback

class EnhancedCombatGameWASM {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wasmEngine = null;
        this.isWASM = false;
    }
    
    async init() {
        try {
            // Try to load WASM module
            const Module = await EnhancedCombatModule();
            this.wasmEngine = new Module.EnhancedCombatEngine();
            this.wasmEngine.init(this.canvas.width, this.canvas.height);
            this.isWASM = true;
            console.log('Using WASM implementation with 10px roll distance');
            return true;
        } catch (error) {
            console.warn('WASM failed, using JS fallback:', error);
            this.isWASM = false;
            return false;
        }
    }
}

// Make available globally
window.EnhancedCombatGameWASM = EnhancedCombatGameWASM;
WRAPPER_EOF
        echo "✓ Wrapper created"
    fi
    
    echo ""
    echo "Build complete! The roll distance is now set to 10 pixels."
    echo "To use in your HTML, add:"
    echo '  <script type="module" src="enhanced_combat_engine.js"></script>'
    echo '  <script src="enhanced_combat_wrapper.js"></script>'
else
    echo "✗ Compilation failed"
    exit 1
fi