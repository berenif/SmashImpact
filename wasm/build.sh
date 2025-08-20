#!/bin/bash
echo "Building WASM Game Engine..."
mkdir -p ../public
SOURCES="src/game_engine.cpp src/entity.cpp"
INCLUDES="-I./include"
FLAGS="-O3 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='GameEngineModule' --bind -std=c++17 -s ENVIRONMENT='web' -s EXPORT_ES6=1 -s MALLOC=emmalloc -s FILESYSTEM=0"
OUTPUT="../public/game_engine"
echo "Compiling..."
emcc $SOURCES $INCLUDES $FLAGS -o $OUTPUT.js
if [ $? -eq 0 ]; then
    echo "Build successful!"
else
    echo "Build failed!"
fi
