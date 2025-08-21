#!/bin/bash

# Script to run WASM module tests
# This script starts a local server and opens the test pages

echo "========================================="
echo "WASM Module Test Runner"
echo "========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Python is available
if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "Error: Python is not installed. Please install Python to run the tests."
    exit 1
fi

# Kill any existing Python servers on port 8000
echo -e "${YELLOW}Stopping any existing servers on port 8000...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Start the server in the background
echo -e "${YELLOW}Starting local server on port 8000...${NC}"
cd /workspace
$PYTHON_CMD -m http.server 8000 > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Check if server is running
if ps -p $SERVER_PID > /dev/null; then
    echo -e "${GREEN}✓ Server started successfully (PID: $SERVER_PID)${NC}"
else
    echo "Error: Failed to start server"
    exit 1
fi

echo ""
echo "========================================="
echo -e "${GREEN}Test Pages Available:${NC}"
echo "========================================="
echo ""
echo "1. Quick Tests (Simple):"
echo "   http://localhost:8000/wasm-test.html"
echo ""
echo "2. Full Test Suite (Comprehensive):"
echo "   http://localhost:8000/tests/wasm/test-runner.html"
echo ""
echo "3. Main Game:"
echo "   http://localhost:8000/game.html"
echo ""
echo "========================================="
echo ""
echo -e "${YELLOW}Open one of the URLs above in your browser to run the tests.${NC}"
echo -e "${YELLOW}The tests will auto-run when the page loads.${NC}"
echo ""
echo "Press Ctrl+C to stop the server when done."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping server...${NC}"
    kill $SERVER_PID 2>/dev/null
    echo -e "${GREEN}✓ Server stopped${NC}"
    exit 0
}

# Set up trap to cleanup on Ctrl+C
trap cleanup INT

# Keep the script running
while true; do
    sleep 1
done