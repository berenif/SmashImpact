#!/bin/bash

# Modern WebAssembly build script using CMake
# Follows current best practices for Emscripten builds

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Build configuration
BUILD_TYPE=${1:-Release}
ENABLE_THREADING=${2:-OFF}
BUILD_DIR="build"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  WebAssembly Game Engine Build System  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Emscripten is available
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}Error: Emscripten not found!${NC}"
    echo "Please activate Emscripten SDK first:"
    echo "  source /workspace/emsdk/emsdk_env.sh"
    exit 1
fi

echo -e "${YELLOW}Build Configuration:${NC}"
echo "  Build Type: $BUILD_TYPE"
echo "  Threading: $ENABLE_THREADING"
echo "  Build Directory: $BUILD_DIR"
echo ""

# Create build directory
echo -e "${YELLOW}Creating build directory...${NC}"
mkdir -p $BUILD_DIR
cd $BUILD_DIR

# Configure with CMake
echo -e "${YELLOW}Configuring with CMake...${NC}"
emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=$BUILD_TYPE \
    -DENABLE_THREADING=$ENABLE_THREADING \
    -DCMAKE_VERBOSE_MAKEFILE=OFF

# Build
echo -e "${YELLOW}Building WebAssembly module...${NC}"
emmake make -j$(nproc)

# Check if build was successful
if [ -f "../public/game_engine.js" ] && [ -f "../public/game_engine.wasm" ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo -e "${GREEN}Output files:${NC}"
    echo "  - ../public/game_engine.js"
    echo "  - ../public/game_engine.wasm"
    
    # Show file sizes
    echo ""
    echo -e "${YELLOW}File sizes:${NC}"
    ls -lh ../public/game_engine.* | awk '{print "  " $9 ": " $5}'
    
    # Generate build info
    echo ""
    echo -e "${YELLOW}Generating build info...${NC}"
    cat > ../public/build-info.json << EOF
{
    "version": "1.0.0",
    "buildType": "$BUILD_TYPE",
    "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "threading": $([[ "$ENABLE_THREADING" == "ON" ]] && echo "true" || echo "false"),
    "simd": true,
    "features": {
        "objectPooling": true,
        "simdOptimizations": true,
        "spatialHashing": true,
        "asyncLoading": true,
        "errorBoundaries": true
    }
}
EOF
    echo -e "${GREEN}✓ Build info generated${NC}"
    
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}         Build Complete!                ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "To test the build, run:"
echo "  cd ../public && python3 -m http.server 8080"
echo "Then open: http://localhost:8080/wasm-test.html"