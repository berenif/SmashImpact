#!/bin/bash

# CI/CD Optimized Build Script
# This script is designed for fast builds in GitHub Actions

set -e

# Colors for output (works in GitHub Actions logs)
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Start timer
START_TIME=$(date +%s)

echo "::group::Build Information"
echo -e "${GREEN}CI/CD Optimized Build Script${NC}"
echo "Build started at: $(date)"
echo "Runner: ${RUNNER_NAME:-local}"
echo "OS: ${RUNNER_OS:-$(uname -s)}"
echo "::endgroup::"

# Function to check if WASM needs rebuilding
check_wasm_cache() {
    echo "::group::Checking WASM cache"
    
    if [ -f "public/game_engine.wasm" ] && [ -f "public/game_engine.js" ]; then
        # Check if source files are newer than built files
        WASM_OUTDATED=false
        
        for src in wasm/*.cpp wasm/include/*.h; do
            if [ -f "$src" ] && [ "$src" -nt "public/game_engine.wasm" ]; then
                WASM_OUTDATED=true
                break
            fi
        done
        
        if [ "$WASM_OUTDATED" = false ]; then
            echo -e "${GREEN}✓ WASM artifacts are up to date${NC}"
            echo "::endgroup::"
            return 0
        fi
    fi
    
    echo -e "${YELLOW}WASM rebuild required${NC}"
    echo "::endgroup::"
    return 1
}

# Function for parallel asset processing
process_assets_parallel() {
    echo "::group::Processing assets in parallel"
    
    # Process JavaScript files in parallel
    if command -v uglifyjs >/dev/null 2>&1; then
        echo "Minifying JavaScript files..."
        
        # Export function for parallel execution
        export -f minify_single_js
        
        find src public -name "*.js" -not -name "*.min.js" -not -name "game_engine.js" \
            | parallel -j4 --no-notice "
                output=\$(echo {} | sed 's/\.js$/.min.js/')
                uglifyjs {} -o \$output -c -m 2>/dev/null && echo '✓ Minified: {}'
            " 2>/dev/null || {
                # Fallback to sequential if parallel is not available
                for file in src/*.js public/*.js; do
                    if [ -f "$file" ] && [[ ! "$file" == *.min.js ]] && [[ ! "$file" == *game_engine.js ]]; then
                        output="${file%.js}.min.js"
                        uglifyjs "$file" -o "$output" -c -m 2>/dev/null && echo "✓ Minified: $file"
                    fi
                done
            }
    fi
    
    echo "::endgroup::"
}

# Function for quick syntax check
quick_syntax_check() {
    echo "::group::Syntax validation"
    
    ERROR_COUNT=0
    
    # Check JavaScript files
    for file in src/**/*.js public/*.js; do
        if [ -f "$file" ]; then
            node --check "$file" 2>/dev/null || {
                echo "::error file=$file::JavaScript syntax error"
                ((ERROR_COUNT++))
            }
        fi
    done
    
    if [ $ERROR_COUNT -gt 0 ]; then
        echo "::error::Found $ERROR_COUNT syntax errors"
        echo "::endgroup::"
        return 1
    fi
    
    echo -e "${GREEN}✓ All files passed syntax check${NC}"
    echo "::endgroup::"
    return 0
}

# Main build process
main() {
    # Create necessary directories
    mkdir -p public dist
    
    # Check if WASM rebuild is needed
    if ! check_wasm_cache; then
        if [ -n "$SKIP_WASM_BUILD" ]; then
            echo "::warning::WASM build skipped (SKIP_WASM_BUILD is set)"
        else
            echo "::error::WASM build required but Emscripten not available in CI"
            echo "Please build WASM locally and commit the artifacts"
            exit 1
        fi
    fi
    
    # Quick syntax check
    quick_syntax_check || {
        echo "::error::Build failed due to syntax errors"
        exit 1
    }
    
    # Process assets in parallel (if possible)
    process_assets_parallel
    
    # Prepare distribution
    echo "::group::Preparing distribution"
    
    # Copy files efficiently
    rsync -a --exclude='*.test.js' --exclude='*.map' --exclude='.git' \
        --exclude='node_modules' --exclude='emsdk' \
        public/ src/ *.html dist/ 2>/dev/null || {
        # Fallback to cp if rsync is not available
        cp -r public dist/
        cp -r src dist/
        cp *.html dist/
    }
    
    # Generate build info
    cat > dist/build-info.json << EOF
{
    "version": "${GITHUB_SHA:-local}",
    "build_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "branch": "${GITHUB_REF_NAME:-unknown}",
    "runner": "${RUNNER_NAME:-local}"
}
EOF
    
    echo "::endgroup::"
    
    # End timer
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "::group::Build Summary"
    echo -e "${GREEN}✓ Build completed successfully!${NC}"
    echo "Duration: ${DURATION} seconds"
    echo "Output directory: dist/"
    echo "::endgroup::"
    
    # Set outputs for GitHub Actions
    if [ -n "$GITHUB_OUTPUT" ]; then
        echo "build_duration=${DURATION}" >> "$GITHUB_OUTPUT"
        echo "build_status=success" >> "$GITHUB_OUTPUT"
    fi
}

# Run main function
main "$@"