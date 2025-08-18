#!/bin/bash

# Generate version based on current timestamp
VERSION=$(date +%s)

# Update game-iso.html with new version numbers
sed -i "s/\?v=[0-9.]*/?v=$VERSION/g" game-iso.html

echo "Updated cache version to: $VERSION"
echo "Files will now bypass browser cache on next deployment"