#!/bin/bash

# WASM Quick Start Script
# One-command setup and build for the WASM module

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║         WASM Game Engine - Quick Start Setup              ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if this is first run
if [ ! -f ".wasm-setup-complete" ]; then
    echo -e "${CYAN}First-time setup detected. Installing dependencies...${NC}"
    
    # Check for Emscripten
    if ! command -v emcc &> /dev/null; then
        echo -e "${YELLOW}Emscripten not found. Would you like to install it? (y/n)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            echo -e "${CYAN}Installing Emscripten SDK...${NC}"
            ./scripts/wasm-build-helper.sh setup
        fi
    fi
    
    # Mark setup as complete
    touch .wasm-setup-complete
    echo -e "${GREEN}✓ Initial setup complete!${NC}"
fi

# Show menu
echo ""
echo "What would you like to do?"
echo ""
echo "  1) Build WASM module (release mode)"
echo "  2) Build WASM module (debug mode)"
echo "  3) Start file watcher (auto-rebuild)"
echo "  4) Build with Docker (no setup required)"
echo "  5) Show build statistics"
echo "  6) Clean build artifacts"
echo "  7) Run tests"
echo "  8) Exit"
echo ""
echo -n "Enter your choice [1-8]: "
read -r choice

case $choice in
    1)
        echo -e "${CYAN}Building WASM module in release mode...${NC}"
        ./scripts/wasm-build-helper.sh build release
        ;;
    2)
        echo -e "${CYAN}Building WASM module in debug mode...${NC}"
        ./scripts/wasm-build-helper.sh build debug
        ;;
    3)
        echo -e "${CYAN}Starting file watcher...${NC}"
        echo "Choose build mode:"
        echo "  1) Release (optimized)"
        echo "  2) Debug (with assertions)"
        echo "  3) Profile (with profiling)"
        echo -n "Enter mode [1-3]: "
        read -r mode_choice
        
        mode="release"
        case $mode_choice in
            2) mode="debug" ;;
            3) mode="profile" ;;
        esac
        
        ./scripts/wasm-build-helper.sh watch $mode
        ;;
    4)
        echo -e "${CYAN}Building with Docker...${NC}"
        if command -v docker &> /dev/null; then
            docker-compose run --rm wasm-builder
        else
            echo -e "${YELLOW}Docker not found. Please install Docker first.${NC}"
            echo "Visit: https://docs.docker.com/get-docker/"
        fi
        ;;
    5)
        echo -e "${CYAN}Build Statistics:${NC}"
        if [ -f "scripts/wasm-build-monitor.py" ]; then
            python3 scripts/wasm-build-monitor.py stats
        else
            echo "No statistics available yet."
        fi
        ;;
    6)
        echo -e "${CYAN}Cleaning build artifacts...${NC}"
        ./scripts/wasm-build-helper.sh clean
        ;;
    7)
        echo -e "${CYAN}Running tests...${NC}"
        ./scripts/wasm-build-helper.sh test
        ;;
    8)
        echo -e "${GREEN}Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${YELLOW}Invalid choice. Please run the script again.${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Operation complete!${NC}"
echo ""
echo "Quick commands for next time:"
echo "  make -f Makefile.wasm wasm        # Build"
echo "  make -f Makefile.wasm wasm-watch  # Watch mode"
echo "  ./wasm-quick-start.sh             # This menu"