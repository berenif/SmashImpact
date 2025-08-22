#!/bin/bash

# Test script for Wolf AI WASM build
echo "Testing Wolf AI WASM Build"
echo "=========================="

# Source Emscripten environment if available
if [ -f "./emsdk/emsdk_env.sh" ]; then
    echo "Setting up EMSDK environment..."
    source ./emsdk/emsdk_env.sh
else
    echo "Warning: emsdk not found in current directory"
    echo "Attempting to use system emscripten..."
fi

# Check if em++ is available
if ! command -v em++ &> /dev/null; then
    echo "Error: em++ (Emscripten C++ compiler) is not available"
    echo "Please install Emscripten or source the emsdk_env.sh"
    exit 1
fi

echo "Emscripten version:"
em++ --version

# Create output directory
mkdir -p wasm

echo ""
echo "Building Wolf AI WASM module..."
echo "Command: em++ wolf_ai_wasm.cpp -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='WolfAIModule' -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\"]' -s ALLOW_MEMORY_GROWTH=1 -s ENVIRONMENT='web,worker' -s SINGLE_FILE=0 -lembind --bind -o wasm/wolf_ai.js"
echo ""

# Build the module
em++ wolf_ai_wasm.cpp \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='WolfAIModule' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web,worker' \
    -s SINGLE_FILE=0 \
    -lembind \
    --bind \
    -o wasm/wolf_ai.js

# Check if build was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo "Generated files:"
    ls -lh wasm/wolf_ai.* 2>/dev/null
    
    # Verify the module exports
    if [ -f "wasm/wolf_ai.js" ]; then
        echo ""
        echo "Checking module structure..."
        grep -q "WolfAIModule" wasm/wolf_ai.js && echo "✓ Module name correct"
        grep -q "WolfPackManager" wasm/wolf_ai.js && echo "✓ WolfPackManager class found"
    fi
else
    echo ""
    echo "❌ Build failed!"
    echo "Please check the error messages above"
    exit 1
fi

echo ""
echo "Build test complete!"