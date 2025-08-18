#!/bin/bash

# Generate version based on current timestamp
VERSION=$(date +%s)

# Update game-iso.html with new version numbers
if [ -f "game-iso.html" ]; then
    sed -i "s/\?v=[0-9.]*/?v=$VERSION/g" game-iso.html
    echo "✅ Updated game-iso.html cache version to: $VERSION"
fi

# Also update game.html if it exists
if [ -f "game.html" ]; then
    # Check if game.html has versioned scripts
    if grep -q "\.js?v=" game.html; then
        sed -i "s/\?v=[0-9.]*/?v=$VERSION/g" game.html
        echo "✅ Updated game.html cache version to: $VERSION"
    fi
fi

# Update any other HTML files that might have versioned scripts
for file in *.html; do
    if [[ "$file" != "game-iso.html" && "$file" != "game.html" ]]; then
        if grep -q "\.js?v=" "$file" 2>/dev/null; then
            sed -i "s/\?v=[0-9.]*/?v=$VERSION/g" "$file"
            echo "✅ Updated $file cache version to: $VERSION"
        fi
    fi
done

echo "📦 Cache version update complete!"
echo "🚀 Files will now bypass browser cache on next deployment"# Test comment
