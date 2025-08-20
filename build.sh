#!/bin/bash

# Build script for WASM Game Engine
# This script handles Emscripten installation and WASM compilation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}WASM Game Engine Build Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Emscripten
install_emscripten() {
    echo -e "${YELLOW}Installing Emscripten SDK...${NC}"
    
    # Check if emsdk directory exists
    if [ ! -d "emsdk" ]; then
        echo "Cloning Emscripten SDK..."
        git clone https://github.com/emscripten-core/emsdk.git
    fi
    
    cd emsdk
    
    # Fetch the latest version
    echo "Fetching latest Emscripten..."
    ./emsdk install latest
    
    # Activate the latest version
    echo "Activating Emscripten..."
    ./emsdk activate latest
    
    # Source the environment
    source ./emsdk_env.sh
    
    cd ..
    
    echo -e "${GREEN}Emscripten installed successfully!${NC}"
}

# Function to build the WASM module
build_wasm() {
    echo -e "${YELLOW}Building WASM module...${NC}"
    
    cd wasm
    
    # Create output directory
    mkdir -p ../public
    
    # Define source files
    SOURCES="game_engine.cpp"
    
    # Define include directories
    INCLUDES="-I./include"
    
    # Define compilation flags
    FLAGS="-O3 \
           -s WASM=1 \
           -s ALLOW_MEMORY_GROWTH=1 \
           -s MODULARIZE=1 \
           -s EXPORT_NAME='GameEngineModule' \
           --bind \
           -std=c++17 \
           -s ENVIRONMENT='web' \
           -s EXPORT_ES6=1 \
           -s MALLOC=emmalloc \
           -s FILESYSTEM=0 \
           -s NO_EXIT_RUNTIME=1 \
           -s ASSERTIONS=0 \
           -s SAFE_HEAP=0"
    
    # Output file
    OUTPUT="../public/game_engine"
    
    # Compile
    echo "Compiling WASM module..."
    emcc $SOURCES $INCLUDES $FLAGS -o $OUTPUT.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}WASM build successful!${NC}"
        echo "Output files:"
        ls -lh ../public/game_engine.*
    else
        echo -e "${RED}WASM build failed!${NC}"
        exit 1
    fi
    
    cd ..
}

# Function to build with Docker (alternative method)
build_with_docker() {
    echo -e "${YELLOW}Building with Docker...${NC}"
    
    # Check if Docker is installed
    if ! command_exists docker; then
        echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
        exit 1
    fi
    
    # Create a Dockerfile for Emscripten build
    cat > Dockerfile.emscripten << 'EOF'
FROM emscripten/emsdk:latest

WORKDIR /app

# Copy source files
COPY wasm/ ./wasm/
COPY public/ ./public/

# Build the WASM module
WORKDIR /app/wasm

RUN emcc game_engine.cpp \
    -I./include \
    -O3 \
    -s WASM=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='GameEngineModule' \
    --bind \
    -std=c++17 \
    -s ENVIRONMENT='web' \
    -s EXPORT_ES6=1 \
    -s MALLOC=emmalloc \
    -s FILESYSTEM=0 \
    -s NO_EXIT_RUNTIME=1 \
    -o ../public/game_engine.js

WORKDIR /app
EOF

    # Build Docker image
    echo "Building Docker image..."
    docker build -f Dockerfile.emscripten -t wasm-game-builder .
    
    # Run container to build WASM
    echo "Running build in Docker container..."
    docker run --rm -v "$(pwd)/public:/app/public" wasm-game-builder
    
    # Clean up
    rm Dockerfile.emscripten
    
    echo -e "${GREEN}Docker build completed!${NC}"
}

# Function to setup development environment
setup_dev_environment() {
    echo -e "${YELLOW}Setting up development environment...${NC}"
    
    # Install Node.js dependencies if package.json exists
    if [ -f "package.json" ]; then
        echo "Installing Node.js dependencies..."
        npm install
    fi
    
    # Create necessary directories
    mkdir -p public
    mkdir -p wasm/build
    
    echo -e "${GREEN}Development environment ready!${NC}"
}

# Function to run tests
run_tests() {
    echo -e "${YELLOW}Running tests...${NC}"
    
    if [ -f "tests/test-game.js" ]; then
        node tests/test-game.js
    fi
    
    if [ -f "tests/wolf-ai-tests.js" ]; then
        node tests/wolf-ai-tests.js
    fi
}

# Main build process
main() {
    # Parse command line arguments
    BUILD_METHOD="emscripten"
    RUN_TESTS=false
    SETUP_ENV=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                BUILD_METHOD="docker"
                shift
                ;;
            --test)
                RUN_TESTS=true
                shift
                ;;
            --setup)
                SETUP_ENV=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --docker    Build using Docker instead of local Emscripten"
                echo "  --test      Run tests after building"
                echo "  --setup     Setup development environment"
                echo "  --help      Show this help message"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Setup environment if requested
    if [ "$SETUP_ENV" = true ]; then
        setup_dev_environment
    fi
    
    # Build based on selected method
    if [ "$BUILD_METHOD" = "docker" ]; then
        build_with_docker
    else
        # Check if emcc is available
        if ! command_exists emcc; then
            echo -e "${YELLOW}Emscripten not found. Installing...${NC}"
            install_emscripten
            
            # Source the environment again
            if [ -f "emsdk/emsdk_env.sh" ]; then
                source emsdk/emsdk_env.sh
            else
                echo -e "${RED}Failed to setup Emscripten environment${NC}"
                exit 1
            fi
        fi
        
        # Build WASM
        build_wasm
    fi
    
    # Run tests if requested
    if [ "$RUN_TESTS" = true ]; then
        run_tests
    fi
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main "$@"