#!/bin/bash

# Quick build script for JavaScript-only changes
# Use this when WASM files are already built

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Quick Build Script${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to check file syntax
check_syntax() {
    echo -e "${YELLOW}Checking JavaScript syntax...${NC}"
    
    # Check main game file
    if [ -f "game.html" ]; then
        # Extract JavaScript from HTML and check for basic syntax errors
        node -c <(grep -v "^[[:space:]]*<" game.html | grep -v "^[[:space:]]*>" | head -n -1) 2>/dev/null || {
            echo -e "${YELLOW}Note: Cannot fully validate inline JavaScript in HTML${NC}"
        }
    fi
    
    # Check JavaScript files
    for file in src/**/*.js tests/*.js public/*.js; do
        if [ -f "$file" ]; then
            echo "Checking $file..."
            node --check "$file" || {
                echo -e "${RED}Syntax error in $file${NC}"
                exit 1
            }
        fi
    done
    
    echo -e "${GREEN}Syntax check passed!${NC}"
}

# Function to minify JavaScript (optional)
minify_js() {
    echo -e "${YELLOW}Minifying JavaScript files...${NC}"
    
    # Check if uglify-js is installed
    if command -v uglifyjs >/dev/null 2>&1; then
        for file in public/*.js; do
            if [ -f "$file" ] && [[ ! "$file" == *.min.js ]] && [[ ! "$file" == *game_engine.js ]]; then
                output="${file%.js}.min.js"
                echo "Minifying $file -> $output"
                uglifyjs "$file" -o "$output" -c -m
            fi
        done
    else
        echo "uglify-js not found. Skipping minification."
        echo "Install with: npm install -g uglify-js"
    fi
}

# Function to create production build
create_production_build() {
    echo -e "${YELLOW}Creating production build...${NC}"
    
    # Create dist directory
    mkdir -p dist
    
    # Copy necessary files
    cp game.html dist/index.html
    cp -r public dist/
    cp -r src dist/
    cp -r assets dist/ 2>/dev/null || true
    
    echo -e "${GREEN}Production build created in dist/${NC}"
}

# Function to start local server
start_server() {
    echo -e "${YELLOW}Starting local development server...${NC}"
    
    # Check for Python 3
    if command -v python3 >/dev/null 2>&1; then
        echo -e "${GREEN}Server running at http://localhost:8000${NC}"
        echo "Press Ctrl+C to stop"
        python3 -m http.server 8000
    # Check for Node.js http-server
    elif command -v http-server >/dev/null 2>&1; then
        echo -e "${GREEN}Server running at http://localhost:8080${NC}"
        echo "Press Ctrl+C to stop"
        http-server -p 8080
    # Check for PHP
    elif command -v php >/dev/null 2>&1; then
        echo -e "${GREEN}Server running at http://localhost:8000${NC}"
        echo "Press Ctrl+C to stop"
        php -S localhost:8000
    else
        echo -e "${RED}No suitable web server found.${NC}"
        echo "Install one of: python3, http-server (npm), or php"
        exit 1
    fi
}

# Main function
main() {
    # Parse arguments
    CHECK_ONLY=false
    MINIFY=false
    PRODUCTION=false
    SERVE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --check)
                CHECK_ONLY=true
                shift
                ;;
            --minify)
                MINIFY=true
                shift
                ;;
            --production)
                PRODUCTION=true
                shift
                ;;
            --serve)
                SERVE=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --check       Only check syntax"
                echo "  --minify      Minify JavaScript files"
                echo "  --production  Create production build"
                echo "  --serve       Start local development server"
                echo "  --help        Show this help message"
                exit 0
                ;;
            *)
                echo -e "${RED}Unknown option: $1${NC}"
                exit 1
                ;;
        esac
    done
    
    # Always check syntax first
    check_syntax
    
    if [ "$CHECK_ONLY" = true ]; then
        exit 0
    fi
    
    # Minify if requested
    if [ "$MINIFY" = true ]; then
        minify_js
    fi
    
    # Create production build if requested
    if [ "$PRODUCTION" = true ]; then
        create_production_build
    fi
    
    # Start server if requested
    if [ "$SERVE" = true ]; then
        start_server
    fi
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Build completed!${NC}"
    echo -e "${GREEN}========================================${NC}"
}

# Run main function
main "$@"