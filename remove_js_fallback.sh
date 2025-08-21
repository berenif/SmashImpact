#!/bin/bash

# Script to remove JavaScript fallback and ensure only WASM is used

echo "Removing JavaScript fallback code from game.html..."

# Backup the original file
cp game.html game.html.backup

# Replace the initGameJS call with error handling
sed -i 's/initGameJS();/console.error("WASM engine not initialized"); return;/' game.html

# Comment out JavaScript fallback functions
sed -i '/function initGameJS()/,/^        }/s/^/\/\/ /' game.html
sed -i '/function updateJS()/,/^        }/s/^/\/\/ /' game.html
sed -i '/function checkCollisionsJS()/,/^        }/s/^/\/\/ /' game.html
sed -i '/function spawnWaveJS()/,/^        }/s/^/\/\/ /' game.html
sed -i '/function loadLevelJS()/,/^        }/s/^/\/\/ /' game.html
sed -i '/function renderJS()/,/^        }/s/^/\/\/ /' game.html

# Replace renderJS() call
sed -i 's/renderJS();/console.error("WASM engine not available for rendering"); return;/' game.html

# Update the fallback message
sed -i 's/Using JavaScript fallback/WASM is required - no fallback available/' game.html

echo "JavaScript fallback code has been removed."
echo "WASM is now required for the game to run."