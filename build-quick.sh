#!/bin/bash

# Quick Build Script for Development
# Skips WASM compilation if already built

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_DIR="$PROJECT_ROOT/public"

# Parse arguments
SERVE=false
PRODUCTION=false
CHECK_ONLY=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --serve) SERVE=true ;;
        --production) PRODUCTION=true ;;
        --check) CHECK_ONLY=true ;;
        --help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  --serve       Start development server after build"
            echo "  --production  Minify JavaScript files"
            echo "  --check       Check if build is needed"
            echo "  --help        Show this help message"
            exit 0
            ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Check if WASM files exist
check_wasm() {
    if [ ! -f "$PUBLIC_DIR/game_engine.js" ] || [ ! -f "$PUBLIC_DIR/game_engine.wasm" ]; then
        echo -e "${YELLOW}WASM files not found. Running full build...${NC}"
        ./build.sh
        return $?
    fi
    echo -e "${GREEN}WASM files found. Skipping compilation.${NC}"
    return 0
}

# Minify JavaScript files for production
minify_js() {
    echo -e "${YELLOW}Minifying JavaScript files...${NC}"
    
    if ! command -v uglifyjs &> /dev/null; then
        echo "Installing uglify-js..."
        npm install -g uglify-js
    fi
    
    for file in "$PUBLIC_DIR"/*.js; do
        if [ -f "$file" ] && [[ ! "$file" == *.min.js ]]; then
            output="${file%.js}.min.js"
            uglifyjs "$file" -o "$output" -c -m
            echo "Minified: $(basename "$file") -> $(basename "$output")"
        fi
    done
    
    echo -e "${GREEN}Minification complete!${NC}"
}

# Start development server
start_server() {
    echo -e "${YELLOW}Starting development server...${NC}"
    
    if ! command -v http-server &> /dev/null; then
        echo "Installing http-server..."
        npm install -g http-server
    fi
    
    echo -e "${GREEN}Server starting at http://localhost:8080${NC}"
    http-server . -p 8080 -c-1
}

# Main execution
main() {
    echo -e "${GREEN}=== Quick Build ===${NC}"
    
    # Check only mode
    if [ "$CHECK_ONLY" = true ]; then
        check_wasm
        exit $?
    fi
    
    # Ensure WASM files exist
    check_wasm
    
    # Production build
    if [ "$PRODUCTION" = true ]; then
        minify_js
    fi
    
    # Start server if requested
    if [ "$SERVE" = true ]; then
        start_server
    fi
    
    echo -e "${GREEN}=== Build Ready ===${NC}"
}

main