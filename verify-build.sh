#!/bin/bash

# Verification script for WASM build
# This script checks that all components are properly set up

echo "========================================="
echo "WASM Build Verification"
echo "========================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track overall status
ALL_GOOD=true

# Check Emscripten
echo -e "\n${YELLOW}Checking Emscripten installation...${NC}"
if [ -d "/workspace/emsdk" ]; then
    echo -e "${GREEN}✓${NC} Emscripten SDK directory exists"
    
    # Try to source and check emcc
    if source /workspace/emsdk/emsdk_env.sh 2>/dev/null && command -v emcc >/dev/null 2>&1; then
        VERSION=$(emcc --version | head -1)
        echo -e "${GREEN}✓${NC} Emscripten is functional: $VERSION"
    else
        echo -e "${RED}✗${NC} Emscripten not properly configured"
        ALL_GOOD=false
    fi
else
    echo -e "${RED}✗${NC} Emscripten SDK not found"
    ALL_GOOD=false
fi

# Check WASM output files
echo -e "\n${YELLOW}Checking WASM build output...${NC}"
if [ -f "/workspace/public/game_engine.wasm" ]; then
    SIZE=$(ls -lh /workspace/public/game_engine.wasm | awk '{print $5}')
    echo -e "${GREEN}✓${NC} WASM module exists (size: $SIZE)"
else
    echo -e "${RED}✗${NC} WASM module not found"
    ALL_GOOD=false
fi

if [ -f "/workspace/public/game_engine.js" ]; then
    SIZE=$(ls -lh /workspace/public/game_engine.js | awk '{print $5}')
    echo -e "${GREEN}✓${NC} JavaScript wrapper exists (size: $SIZE)"
else
    echo -e "${RED}✗${NC} JavaScript wrapper not found"
    ALL_GOOD=false
fi

# Check main game files
echo -e "\n${YELLOW}Checking game files...${NC}"
if [ -f "/workspace/game.html" ]; then
    echo -e "${GREEN}✓${NC} Main game file exists"
else
    echo -e "${RED}✗${NC} Main game file not found"
    ALL_GOOD=false
fi

# Check Node.js dependencies
echo -e "\n${YELLOW}Checking Node.js dependencies...${NC}"
if [ -d "/workspace/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Node modules installed"
else
    echo -e "${YELLOW}⚠${NC} Node modules not installed (run: npm install)"
fi

# Check documentation
echo -e "\n${YELLOW}Checking documentation...${NC}"
DOC_COUNT=$(ls /workspace/docs/*.md 2>/dev/null | wc -l)
if [ $DOC_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Documentation files found ($DOC_COUNT files)"
    ls /workspace/docs/*.md 2>/dev/null | while read file; do
        echo "  - $(basename $file)"
    done
else
    echo -e "${YELLOW}⚠${NC} No documentation files found"
fi

# Check GitHub workflows
echo -e "\n${YELLOW}Checking GitHub workflows...${NC}"
if [ -d "/workspace/.github/workflows" ]; then
    WORKFLOW_COUNT=$(ls /workspace/.github/workflows/*.yml 2>/dev/null | wc -l)
    if [ $WORKFLOW_COUNT -gt 0 ]; then
        echo -e "${GREEN}✓${NC} GitHub workflows found ($WORKFLOW_COUNT files)"
    else
        echo -e "${YELLOW}⚠${NC} No workflow files found"
    fi
else
    echo -e "${YELLOW}⚠${NC} GitHub workflows directory not found"
fi

# Summary
echo -e "\n========================================="
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✓ All critical components are ready!${NC}"
    echo -e "\nYou can now:"
    echo "1. Run the game with a local server:"
    echo "   python3 -m http.server 8000"
    echo "2. Rebuild WASM if needed:"
    echo "   ./build.sh"
    echo "3. Make JS-only changes:"
    echo "   ./build-quick.sh"
else
    echo -e "${RED}✗ Some components need attention${NC}"
    echo -e "\nRun ${YELLOW}./setup-env.sh${NC} to fix most issues"
fi
echo "========================================="