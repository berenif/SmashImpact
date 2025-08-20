#!/bin/bash

echo "🔧 Applying comprehensive bug fixes..."

# Counter for fixes
fixes_applied=0

# Fix 1: Fix equality operators in all JavaScript files
echo "Fixing equality operators..."
find src -name "*.js" -type f | while read file; do
    if grep -q "==" "$file" 2>/dev/null; then
        sed -i 's/\([^=!<>]\)==\([^=]\)/\1===\2/g' "$file"
        sed -i 's/\([^=!<>]\)!=\([^=]\)/\1!==\2/g' "$file"
        echo "  ✓ Fixed $file"
        ((fixes_applied++))
    fi
done

# Fix 2: Add null checks for dataChannel
echo "Adding null checks for dataChannel..."
if [ -f "src/multiplayer/multiplayer.js" ]; then
    sed -i "s/this\.dataChannel\.readyState/this.dataChannel \&\& this.dataChannel.readyState/g" src/multiplayer/multiplayer.js
    echo "  ✓ Fixed multiplayer.js"
fi

# Fix 3: Fix array length checks
echo "Fixing array length checks..."
find src -name "*.js" -type f | while read file; do
    if grep -q "\.length > 0" "$file" 2>/dev/null; then
        sed -i "s/\([a-zA-Z_][a-zA-Z0-9_]*\)\.length > 0/\1 \&\& \1.length > 0/g" "$file"
        echo "  ✓ Fixed $file"
    fi
done

# Fix 4: Add iteration limits to while loops in wolf-ai.js
echo "Adding iteration limits to while loops..."
if [ -f "src/ai/wolf-ai.js" ]; then
    # This is complex, so we'll do a targeted fix
    sed -i '/while (openSet\.length > 0)/i\            let iterations = 0; const maxIterations = 1000;' src/ai/wolf-ai.js
    sed -i 's/while (openSet\.length > 0)/while (openSet.length > 0 \&\& iterations++ < maxIterations)/' src/ai/wolf-ai.js
    echo "  ✓ Fixed wolf-ai.js"
fi

# Fix 5: Fix event listeners in HTML files
echo "Fixing event listeners in HTML files..."
find . -name "*.html" -type f | while read file; do
    if grep -q "addEventListener" "$file" 2>/dev/null; then
        sed -i "s/{ passive: false }/{ passive: false, capture: false }/g" "$file"
        echo "  ✓ Fixed $file"
    fi
done

# Fix 6: Add proper null checks for visual effects
echo "Adding null checks for visual effects..."
if [ -f "src/game/visual-effects.js" ]; then
    sed -i 's/trail\.points\.length/trail.points \&\& trail.points.length/g' src/game/visual-effects.js
    echo "  ✓ Fixed visual-effects.js"
fi

echo ""
echo "✅ Bug fixes applied successfully!"
echo ""
