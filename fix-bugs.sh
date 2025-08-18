#!/bin/bash

# Fix bugs in isometric-game.js

# 1. Fix joystick preventDefault
sed -i 's/function handleJoystickStart(e) {/function handleJoystickStart(e) {\n            if (e.preventDefault) e.preventDefault();/' isometric-game.js

# 2. Fix touchstart passive
sed -i "s/addEventListener('touchstart', handleJoystickStart);/addEventListener('touchstart', handleJoystickStart, { passive: false });/" isometric-game.js

# 3. Fix enemy bounds
sed -i 's/Math.max(0, Math.min(CONFIG.GRID_WIDTH, this.x))/Math.max(0.5, Math.min(CONFIG.GRID_WIDTH - 0.5, this.x))/' isometric-game.js
sed -i 's/Math.max(0, Math.min(CONFIG.GRID_HEIGHT, this.y))/Math.max(0.5, Math.min(CONFIG.GRID_HEIGHT - 0.5, this.y))/' isometric-game.js

# 4. Add null checks for visual effects
sed -i 's/if (visualEffects)/if (visualEffects \&\& visualEffects.update)/g' isometric-game.js
sed -i 's/if (visualEffects \&\& visualEffects.update \&\& visualEffects.update)/if (visualEffects \&\& visualEffects.update)/g' isometric-game.js

echo "Bug fixes applied!"