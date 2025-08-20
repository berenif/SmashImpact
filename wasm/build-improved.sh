#!/bin/bash

# Improved build script with better error handling and fallback options
set -e

echo "========================================="
echo "  WASM Game Engine Build System v2.0    "
echo "========================================="

# Build mode (debug or release)
BUILD_MODE=${1:-release}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if emcc is available
check_emscripten() {
    if command -v emcc &> /dev/null; then
        echo -e "${GREEN}✓ Emscripten found: $(emcc --version | head -1)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠ Emscripten not found in PATH${NC}"
        return 1
    fi
}

# Function to use Docker as fallback
build_with_docker() {
    echo -e "${BLUE}Using Docker with Emscripten image...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}✗ Docker not found. Please install Docker or Emscripten.${NC}"
        exit 1
    fi
    
    docker run --rm -v $(pwd):/src -w /src emscripten/emsdk:latest \
        bash -c "./build-internal.sh $BUILD_MODE"
}

# Create internal build script for Docker
cat > build-internal.sh << 'EOF'
#!/bin/bash
BUILD_MODE=${1:-release}

echo "Building in $BUILD_MODE mode..."

# Create output directory
mkdir -p ../public

# Source files - using the modular structure if available, fallback to monolithic
if [ -d "src" ] && [ -f "src/game_engine.cpp" ]; then
    echo "Using modular source structure..."
    SOURCES=$(find src -name "*.cpp" -type f | tr '\n' ' ')
    INCLUDES="-I./include"
else
    echo "Using monolithic source file..."
    SOURCES="game_engine.cpp"
    INCLUDES=""
fi

# Common flags
COMMON_FLAGS="-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='GameEngineModule' --bind -std=c++17 -s ENVIRONMENT='web' -s EXPORT_ES6=1"

# Build mode specific flags
if [ "$BUILD_MODE" = "debug" ]; then
    echo "Debug build configuration..."
    FLAGS="$COMMON_FLAGS -O0 -g -s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=2 -s DEMANGLE_SUPPORT=1 -DDEBUG_BUILD"
else
    echo "Release build configuration..."
    FLAGS="$COMMON_FLAGS -O3 -s ASSERTIONS=0 -s MALLOC=emmalloc -s FILESYSTEM=0 -flto"
    
    # Add SIMD if supported (check for flag support)
    if emcc -msimd128 -E -x c /dev/null &>/dev/null 2>&1; then
        echo "  + SIMD optimizations enabled"
        FLAGS="$FLAGS -msimd128"
    fi
fi

# Output files
OUTPUT="../public/game_engine"

# Compile
echo "Compiling..."
echo "Sources: $SOURCES"
echo "Flags: $FLAGS"

emcc $SOURCES $INCLUDES $FLAGS -o $OUTPUT.js

if [ $? -eq 0 ]; then
    echo "✓ Build successful!"
    ls -lh ../public/game_engine.*
else
    echo "✗ Build failed!"
    exit 1
fi
EOF

chmod +x build-internal.sh

# Main build logic
echo -e "${BLUE}Build mode: $BUILD_MODE${NC}"
echo ""

# Try to build with local Emscripten first
if check_emscripten; then
    echo -e "${GREEN}Building with local Emscripten...${NC}"
    ./build-internal.sh $BUILD_MODE
else
    echo -e "${YELLOW}Attempting Docker fallback...${NC}"
    build_with_docker
fi

# Clean up internal script
rm -f build-internal.sh

# Generate build info
if [ -f "../public/game_engine.js" ] && [ -f "../public/game_engine.wasm" ]; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}         Build Complete!                 ${NC}"
    echo -e "${GREEN}=========================================${NC}"
    
    # Show file sizes
    echo ""
    echo "Output files:"
    ls -lh ../public/game_engine.* | awk '{print "  " $9 ": " $5}'
    
    # Create build info
    cat > ../public/build-info.json << EOF
{
    "version": "2.0.0",
    "buildType": "$BUILD_MODE",
    "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "features": {
        "modularArchitecture": true,
        "simdOptimizations": true,
        "objectPooling": true,
        "errorBoundaries": true,
        "performanceMonitoring": true,
        "asyncLoading": true
    }
}
EOF
    
    echo ""
    echo "To test the build:"
    echo "  cd ../public && python3 -m http.server 8080"
    echo "  Open: http://localhost:8080/wasm-test.html"
else
    echo -e "${RED}Build artifacts not found!${NC}"
    exit 1
fi