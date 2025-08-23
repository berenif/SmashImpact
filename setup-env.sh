#!/bin/bash

# Environment Setup Script
# Sets up development environment for WASM Game Engine

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== WASM Game Engine Environment Setup ===${NC}"

# Check Node.js
check_node() {
    echo -e "${YELLOW}Checking Node.js...${NC}"
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js ${NODE_VERSION} found${NC}"
    else
        echo -e "${RED}✗ Node.js not found. Please install Node.js >= 14.0.0${NC}"
        exit 1
    fi
}

# Check npm
check_npm() {
    echo -e "${YELLOW}Checking npm...${NC}"
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo -e "${GREEN}✓ npm ${NPM_VERSION} found${NC}"
    else
        echo -e "${RED}✗ npm not found. Please install npm${NC}"
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing Node.js dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
}

# Setup Emscripten
setup_emscripten() {
    echo -e "${YELLOW}Setting up Emscripten SDK...${NC}"
    
    if [ -d "emsdk" ]; then
        echo "Emscripten SDK directory already exists"
    else
        echo "Cloning Emscripten SDK..."
        git clone https://github.com/emscripten-core/emsdk.git
    fi
    
    cd emsdk
    ./emsdk install latest
    ./emsdk activate latest
    source ./emsdk_env.sh
    cd ..
    
    echo -e "${GREEN}✓ Emscripten SDK setup complete${NC}"
}

# Create necessary directories
create_directories() {
    echo -e "${YELLOW}Creating project directories...${NC}"
    mkdir -p public/assets
    mkdir -p public/css
    mkdir -p public/js
    mkdir -p wasm/build
    echo -e "${GREEN}✓ Directories created${NC}"
}

# Main setup
main() {
    check_node
    check_npm
    install_dependencies
    create_directories
    
    # Ask about Emscripten
    read -p "Do you want to install Emscripten SDK? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_emscripten
    else
        echo -e "${YELLOW}Skipping Emscripten setup. You'll need it to build WASM files.${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Run 'npm run build' to build the WASM module"
    echo "  2. Run 'npm run dev' to start development server"
    echo "  3. Open http://localhost:8080 in your browser"
    echo ""
}

main