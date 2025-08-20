#!/bin/bash
echo "Building WASM Game Engine (Debug Mode)..."
mkdir -p ../public
SOURCES="src/game_engine.cpp src/entity.cpp"
INCLUDES="-I./include"
# Use -O0 for no optimization and --minify=0 to keep readable output
FLAGS="-O0 --minify=0 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='GameEngineModule' --bind -std=c++17 -s ENVIRONMENT='web' -s EXPORT_ES6=1 -s MALLOC=emmalloc -s FILESYSTEM=0 -s ASSERTIONS=1"
OUTPUT="../public/game_engine"
echo "Compiling with debug settings..."
emcc $SOURCES $INCLUDES $FLAGS -o $OUTPUT.js
if [ $? -eq 0 ]; then
    echo "Build successful!"
    # Check if clearEntities is in the output
    if grep -q "clearEntities" $OUTPUT.js; then
        echo "✓ clearEntities found in generated JavaScript"
    else
        echo "⚠ clearEntities NOT found in generated JavaScript"
    fi
else
    echo "Build failed!"
fi