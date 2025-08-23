#!/bin/bash

# WASM Game Engine Build Script
# Handles both local and Docker builds

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WASM_DIR="$PROJECT_ROOT/wasm"
PUBLIC_DIR="$PROJECT_ROOT/public"
BUILD_DIR="$WASM_DIR/build"
EMSDK_DIR="$PROJECT_ROOT/emsdk"

# Build options
BUILD_METHOD=""
SETUP_ONLY=false
PRODUCTION=false

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --docker) BUILD_METHOD="docker" ;;
        --setup) SETUP_ONLY=true ;;
        --production) PRODUCTION=true ;;
        --help) 
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --docker      Build using Docker"
            echo "  --setup       Setup environment only"
            echo "  --production  Production build with optimizations"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Function to setup Emscripten
setup_emscripten() {
    echo -e "${YELLOW}Setting up Emscripten SDK...${NC}"
    
    if [ ! -d "$EMSDK_DIR" ]; then
        git clone https://github.com/emscripten-core/emsdk.git "$EMSDK_DIR"
    fi
    
    cd "$EMSDK_DIR"
    ./emsdk install latest
    ./emsdk activate latest
    source ./emsdk_env.sh
    cd "$PROJECT_ROOT"
    
    echo -e "${GREEN}Emscripten setup complete!${NC}"
}

# Function to build WASM module
build_wasm() {
    echo -e "${YELLOW}Building WASM module...${NC}"
    
    # Ensure build directory exists
    mkdir -p "$BUILD_DIR"
    
    # Source files
    SOURCES="$WASM_DIR/game_engine.cpp"
    
    # Include directories
    INCLUDES="-I$WASM_DIR/include"
    
    # Compiler flags
    FLAGS="-O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME='GameEngine'"
    FLAGS="$FLAGS -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=512MB"
    FLAGS="$FLAGS -s EXPORTED_FUNCTIONS='[\"_malloc\",\"_free\"]'"
    FLAGS="$FLAGS -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\",\"getValue\",\"setValue\"]'"
    
    if [ "$PRODUCTION" = true ]; then
        FLAGS="$FLAGS -s ASSERTIONS=0 --closure 1"
    else
        FLAGS="$FLAGS -s ASSERTIONS=1"
    fi
    
    # Output files
    OUTPUT="$PUBLIC_DIR/game_engine"
    
    echo "Compiling WASM module..."
    emcc $SOURCES $INCLUDES $FLAGS -o "$OUTPUT.js"
    
    if [ -f "$OUTPUT.js" ] && [ -f "$OUTPUT.wasm" ]; then
        echo -e "${GREEN}WASM build successful!${NC}"
        echo "Generated files:"
        echo "  - $OUTPUT.js"
        echo "  - $OUTPUT.wasm"
    else
        echo -e "${RED}WASM build failed!${NC}"
        exit 1
    fi
}

# Function to build with Docker
build_with_docker() {
    echo -e "${YELLOW}Building with Docker...${NC}"
    
    # Create Dockerfile if it doesn't exist
    cat > "$PROJECT_ROOT/Dockerfile.build" << 'EOF'
FROM emscripten/emsdk:latest

WORKDIR /app

COPY wasm /app/wasm
COPY public /app/public

RUN mkdir -p /app/public && \
    emcc /app/wasm/game_engine.cpp \
    -I/app/wasm/include \
    -O3 -s WASM=1 -s MODULARIZE=1 \
    -s EXPORT_NAME='GameEngine' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MAXIMUM_MEMORY=512MB \
    -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","getValue","setValue"]' \
    -o /app/public/game_engine.js

CMD ["echo", "Build complete"]
EOF

    # Build Docker image
    docker build -f Dockerfile.build -t wasm-game-engine-builder .
    
    # Run build in container
    docker run --rm -v "$PROJECT_ROOT/public:/app/public" wasm-game-engine-builder
    
    # Clean up
    rm -f Dockerfile.build
    
    echo -e "${GREEN}Docker build complete!${NC}"
}

# Function to verify build
verify_build() {
    echo -e "${YELLOW}Verifying build...${NC}"
    
    if [ ! -f "$PUBLIC_DIR/game_engine.js" ] || [ ! -f "$PUBLIC_DIR/game_engine.wasm" ]; then
        echo -e "${RED}Build verification failed: Missing output files${NC}"
        return 1
    fi
    
    # Check file sizes
    JS_SIZE=$(stat -c%s "$PUBLIC_DIR/game_engine.js" 2>/dev/null || stat -f%z "$PUBLIC_DIR/game_engine.js" 2>/dev/null)
    WASM_SIZE=$(stat -c%s "$PUBLIC_DIR/game_engine.wasm" 2>/dev/null || stat -f%z "$PUBLIC_DIR/game_engine.wasm" 2>/dev/null)
    
    echo "Build artifacts:"
    echo "  game_engine.js: $(( JS_SIZE / 1024 )) KB"
    echo "  game_engine.wasm: $(( WASM_SIZE / 1024 )) KB"
    
    echo -e "${GREEN}Build verification passed!${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}=== WASM Game Engine Build ===${NC}"
    echo "Project root: $PROJECT_ROOT"
    
    # Setup only mode
    if [ "$SETUP_ONLY" = true ]; then
        setup_emscripten
        exit 0
    fi
    
    # Ensure public directory exists
    mkdir -p "$PUBLIC_DIR"
    
    # Build based on method
    if [ "$BUILD_METHOD" = "docker" ]; then
        build_with_docker
    else
        # Check if Emscripten is available
        if ! command -v emcc &> /dev/null; then
            echo -e "${YELLOW}Emscripten not found. Setting up...${NC}"
            setup_emscripten
        fi
        
        # Source Emscripten environment if available
        if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
            source "$EMSDK_DIR/emsdk_env.sh"
        fi
        
        build_wasm
    fi
    
    # Verify the build
    verify_build
    
    echo -e "${GREEN}=== Build Complete ===${NC}"
}

# Run main function
main