#!/bin/bash

# Build script for compiling Snake game to WebAssembly

echo "Building Snake game WASM module..."

# Check if emscripten is installed
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten (emcc) is not installed."
    echo "Please install Emscripten first: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Compile C to WASM
emcc snake.c \
    -o snake.js \
    -s WASM=1 \
    -s EXPORTED_FUNCTIONS='["_init_game", "_update_game", "_set_direction", "_get_grid_state", "_get_score", "_is_game_over", "_get_grid_width", "_get_grid_height", "_malloc", "_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createSnakeModule' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -O2

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Generated files: snake.js and snake.wasm"
else
    echo "Build failed!"
    exit 1
fi