#!/bin/bash

# WASM Build Helper Script
# Automated build system for WebAssembly module with dependency checking and error handling

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
WORKSPACE_DIR="/workspace"
WASM_DIR="$WORKSPACE_DIR/wasm"
PUBLIC_DIR="$WORKSPACE_DIR/public"
EMSDK_DIR="$WORKSPACE_DIR/emsdk"
BUILD_LOG="$WORKSPACE_DIR/build.log"
BUILD_CACHE="$WORKSPACE_DIR/.build-cache"

# Build modes
BUILD_MODE=${1:-"release"}  # release, debug, profile
WATCH_MODE=${2:-"false"}    # true for file watching

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}[$(date '+%H:%M:%S')] ${message}${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check and install dependencies
check_dependencies() {
    print_status "$CYAN" "Checking dependencies..."
    
    local missing_deps=()
    
    # Check for required tools
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    if ! command_exists python3; then
        missing_deps+=("python3")
    fi
    
    if ! command_exists cmake; then
        missing_deps+=("cmake")
    fi
    
    if ! command_exists make; then
        missing_deps+=("make")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        print_status "$RED" "Missing dependencies: ${missing_deps[*]}"
        print_status "$YELLOW" "Installing missing dependencies..."
        
        # Try to install missing dependencies
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y "${missing_deps[@]}"
        elif command_exists yum; then
            sudo yum install -y "${missing_deps[@]}"
        elif command_exists brew; then
            brew install "${missing_deps[@]}"
        else
            print_status "$RED" "Cannot automatically install dependencies. Please install: ${missing_deps[*]}"
            exit 1
        fi
    fi
    
    print_status "$GREEN" "All dependencies are installed!"
}

# Function to setup Emscripten
setup_emscripten() {
    print_status "$CYAN" "Setting up Emscripten SDK..."
    
    # Check if emsdk is already installed
    if [ -d "$EMSDK_DIR" ]; then
        print_status "$YELLOW" "Emscripten SDK already exists. Updating..."
        cd "$EMSDK_DIR"
        git pull
    else
        print_status "$YELLOW" "Cloning Emscripten SDK..."
        cd "$WORKSPACE_DIR"
        git clone https://github.com/emscripten-core/emsdk.git
        cd "$EMSDK_DIR"
    fi
    
    # Install and activate latest version
    print_status "$YELLOW" "Installing latest Emscripten..."
    ./emsdk install latest
    ./emsdk activate latest
    
    # Source the environment
    source ./emsdk_env.sh
    
    print_status "$GREEN" "Emscripten setup complete!"
    cd "$WORKSPACE_DIR"
}

# Function to check if Emscripten is available
check_emscripten() {
    if ! command_exists emcc; then
        if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
            print_status "$YELLOW" "Sourcing Emscripten environment..."
            source "$EMSDK_DIR/emsdk_env.sh"
        else
            print_status "$RED" "Emscripten not found. Setting up..."
            setup_emscripten
        fi
    fi
    
    # Verify emcc is now available
    if ! command_exists emcc; then
        print_status "$RED" "Failed to setup Emscripten!"
        exit 1
    fi
    
    print_status "$GREEN" "Emscripten is ready! Version: $(emcc --version | head -n1)"
}

# Function to calculate file hash for change detection
calculate_hash() {
    local file=$1
    if [ -f "$file" ]; then
        md5sum "$file" | cut -d' ' -f1
    else
        echo ""
    fi
}

# Function to check if rebuild is needed
needs_rebuild() {
    local source_file=$1
    local cache_file="$BUILD_CACHE/$(basename $source_file).hash"
    
    # Create cache directory if it doesn't exist
    mkdir -p "$BUILD_CACHE"
    
    # Get current hash
    local current_hash=$(calculate_hash "$source_file")
    
    # Get cached hash
    local cached_hash=""
    if [ -f "$cache_file" ]; then
        cached_hash=$(cat "$cache_file")
    fi
    
    # Compare hashes
    if [ "$current_hash" != "$cached_hash" ]; then
        echo "$current_hash" > "$cache_file"
        return 0  # Needs rebuild
    else
        return 1  # No rebuild needed
    fi
}

# Function to get build flags based on mode
get_build_flags() {
    local mode=$1
    local flags="-s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='GameEngineModule' --bind -std=c++17 -s ENVIRONMENT='web' -s EXPORT_ES6=1 -s FILESYSTEM=0 -s NO_EXIT_RUNTIME=1"
    
    case $mode in
        debug)
            flags="$flags -O0 -g4 -s ASSERTIONS=2 -s SAFE_HEAP=1 -s STACK_OVERFLOW_CHECK=2 -s DEMANGLE_SUPPORT=1"
            print_status "$YELLOW" "Building in DEBUG mode (slower, with assertions)"
            ;;
        profile)
            flags="$flags -O2 -g2 --profiling -s ASSERTIONS=1"
            print_status "$YELLOW" "Building in PROFILE mode (optimized with profiling)"
            ;;
        release|*)
            flags="$flags -O3 -s MALLOC=emmalloc --closure 1"
            print_status "$YELLOW" "Building in RELEASE mode (fully optimized)"
            ;;
    esac
    
    echo "$flags"
}

# Function to build WASM module
build_wasm() {
    print_status "$CYAN" "Building WASM module..."
    
    # Ensure public directory exists
    mkdir -p "$PUBLIC_DIR"
    
    # Get source files
    local main_source="$WASM_DIR/game_engine.cpp"
    local entity_source="$WASM_DIR/src/entity.cpp"
    
    # Check if source files exist
    if [ ! -f "$main_source" ]; then
        print_status "$RED" "Source file not found: $main_source"
        exit 1
    fi
    
    # Check if rebuild is needed
    local needs_build=false
    if needs_rebuild "$main_source" || [ ! -f "$PUBLIC_DIR/game_engine.wasm" ]; then
        needs_build=true
    fi
    
    if [ -f "$entity_source" ] && needs_rebuild "$entity_source"; then
        needs_build=true
    fi
    
    if [ "$needs_build" = false ]; then
        print_status "$GREEN" "No changes detected. Skipping build."
        return 0
    fi
    
    # Prepare source list
    local sources="$main_source"
    if [ -f "$entity_source" ]; then
        sources="$sources $entity_source"
    fi
    
    # Get build flags
    local flags=$(get_build_flags "$BUILD_MODE")
    
    # Include directories
    local includes="-I$WASM_DIR/include"
    
    # Output files
    local output="$PUBLIC_DIR/game_engine"
    
    # Build command
    local build_cmd="emcc $sources $includes $flags -o ${output}.js"
    
    print_status "$BLUE" "Build command: $build_cmd"
    print_status "$CYAN" "Compiling..."
    
    # Execute build with error handling
    if eval "$build_cmd" 2>&1 | tee "$BUILD_LOG"; then
        print_status "$GREEN" "✓ Build successful!"
        
        # Check output files
        if [ -f "${output}.js" ] && [ -f "${output}.wasm" ]; then
            local js_size=$(du -h "${output}.js" | cut -f1)
            local wasm_size=$(du -h "${output}.wasm" | cut -f1)
            print_status "$GREEN" "Output files:"
            print_status "$GREEN" "  - game_engine.js: $js_size"
            print_status "$GREEN" "  - game_engine.wasm: $wasm_size"
        fi
    else
        print_status "$RED" "✗ Build failed! Check $BUILD_LOG for details"
        tail -n 20 "$BUILD_LOG"
        exit 1
    fi
}

# Function to watch files for changes
watch_files() {
    print_status "$CYAN" "Starting file watcher..."
    print_status "$YELLOW" "Watching for changes in $WASM_DIR"
    print_status "$YELLOW" "Press Ctrl+C to stop"
    
    # Initial build
    build_wasm
    
    # Watch for changes
    while true; do
        # Use inotifywait if available, otherwise fall back to polling
        if command_exists inotifywait; then
            inotifywait -r -e modify,create,delete "$WASM_DIR" --exclude '\.git' 2>/dev/null
        else
            sleep 2  # Poll every 2 seconds
            
            # Check for changes
            local changed=false
            for file in "$WASM_DIR"/*.cpp "$WASM_DIR"/src/*.cpp "$WASM_DIR"/include/*.h; do
                if [ -f "$file" ] && needs_rebuild "$file"; then
                    changed=true
                    break
                fi
            done
            
            if [ "$changed" = false ]; then
                continue
            fi
        fi
        
        print_status "$YELLOW" "Changes detected. Rebuilding..."
        build_wasm
        print_status "$GREEN" "Waiting for changes..."
    done
}

# Function to clean build artifacts
clean_build() {
    print_status "$CYAN" "Cleaning build artifacts..."
    
    rm -rf "$BUILD_CACHE"
    rm -f "$BUILD_LOG"
    rm -f "$PUBLIC_DIR/game_engine.js"
    rm -f "$PUBLIC_DIR/game_engine.wasm"
    
    print_status "$GREEN" "Clean complete!"
}

# Function to run tests
run_tests() {
    print_status "$CYAN" "Running WASM tests..."
    
    # Check if test files exist
    if [ -f "$WORKSPACE_DIR/tests/test-wasm.js" ]; then
        node "$WORKSPACE_DIR/tests/test-wasm.js"
    else
        print_status "$YELLOW" "No tests found. Skipping..."
    fi
}

# Function to show help
show_help() {
    echo "WASM Build Helper - Automated build system for WebAssembly module"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  build [mode]     Build WASM module (modes: release, debug, profile)"
    echo "  watch [mode]     Watch files and rebuild on changes"
    echo "  clean           Clean build artifacts"
    echo "  setup           Setup Emscripten SDK"
    echo "  test            Run tests after building"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 build              # Build in release mode"
    echo "  $0 build debug        # Build in debug mode"
    echo "  $0 watch              # Watch and rebuild in release mode"
    echo "  $0 watch debug        # Watch and rebuild in debug mode"
    echo "  $0 clean              # Clean build artifacts"
    echo ""
}

# Main execution
main() {
    print_status "$MAGENTA" "========================================="
    print_status "$MAGENTA" "    WASM Build Helper v1.0"
    print_status "$MAGENTA" "========================================="
    
    # Parse command
    local command=${1:-"build"}
    shift || true
    
    case $command in
        build)
            BUILD_MODE=${1:-"release"}
            check_dependencies
            check_emscripten
            build_wasm
            ;;
        watch)
            BUILD_MODE=${1:-"release"}
            check_dependencies
            check_emscripten
            watch_files
            ;;
        clean)
            clean_build
            ;;
        setup)
            check_dependencies
            setup_emscripten
            ;;
        test)
            BUILD_MODE=${1:-"release"}
            check_dependencies
            check_emscripten
            build_wasm
            run_tests
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_status "$RED" "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"