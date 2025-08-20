#!/bin/bash

# Script to migrate from monolithic to modular architecture
# This preserves the old code while setting up the new structure

set -e

echo "🔄 Migrating to modular WASM architecture..."

# Backup the old monolithic file
if [ -f "game_engine.cpp" ]; then
    echo "📦 Backing up monolithic game_engine.cpp..."
    cp game_engine.cpp game_engine_monolithic_backup.cpp
    echo "✅ Backup created: game_engine_monolithic_backup.cpp"
fi

# Create directory structure if not exists
echo "📁 Creating modular directory structure..."
mkdir -p src/entities
mkdir -p src/systems  
mkdir -p src/effects
mkdir -p src/math
mkdir -p src/memory
mkdir -p src/utils

# Check if we need to create stub implementations
echo "📝 Creating stub implementations for new modules..."

# Create stub files if they don't exist
create_stub_if_needed() {
    local file=$1
    local content=$2
    
    if [ ! -f "$file" ]; then
        echo "$content" > "$file"
        echo "  ✅ Created: $file"
    else
        echo "  ⏭️  Exists: $file"
    fi
}

# Entity stubs
create_stub_if_needed "src/entities/player.cpp" '#include "../../include/entities/player.h"

// Player implementation
// Most methods are inline in the header'

create_stub_if_needed "src/entities/enemy.cpp" '#include "../../include/entities/enemy.h"

// Enemy implementation  
// Most methods are inline in the header'

create_stub_if_needed "src/entities/wolf.cpp" '#include "../../include/entities/wolf.h"

// Wolf implementation
// Most methods are inline in the header'

create_stub_if_needed "src/entities/projectile.cpp" '#include "../../include/entities/projectile.h"

// Projectile implementation
// Most methods are inline in the header'

create_stub_if_needed "src/entities/powerup.cpp" '#include "../../include/entities/powerup.h"

// PowerUp implementation
// Most methods are inline in the header'

create_stub_if_needed "src/entities/obstacle.cpp" '#include "../../include/entities/obstacle.h"

// Obstacle implementation
// Most methods are inline in the header'

# System stubs
create_stub_if_needed "src/systems/collision_system.cpp" '#include "../../include/systems/collision_system.h"

// Collision system implementation
// Most methods are inline in the header'

create_stub_if_needed "src/systems/wave_system.cpp" '#include "../../include/systems/wave_system.h"

// Wave system implementation
// Most methods are inline in the header'

create_stub_if_needed "src/systems/physics_system.cpp" '#include "../../include/systems/physics_system.h"

// Physics system implementation
// Most methods are inline in the header'

# Effects stubs
create_stub_if_needed "src/effects/visual_effects.cpp" '#include "../../include/effects/visual_effects.h"

// Visual effects implementation
// Most methods are inline in the header'

create_stub_if_needed "src/effects/particle_system.cpp" '#include "../../include/effects/particle.h"

// Particle system implementation
// Most methods are inline in the header'

echo ""
echo "🔧 Setting up build configuration..."

# Make build scripts executable
chmod +x build-cmake.sh
chmod +x build.sh
chmod +x build-debug.sh

echo ""
echo "✅ Migration preparation complete!"
echo ""
echo "Next steps:"
echo "1. Review the modular structure in include/ and src/"
echo "2. Activate Emscripten: source /workspace/emsdk/emsdk_env.sh"
echo "3. Build with CMake: ./build-cmake.sh Release"
echo "4. Or use the legacy build: ./build.sh"
echo ""
echo "The old monolithic code is preserved in:"
echo "  - game_engine.cpp (original)"
echo "  - game_engine_monolithic_backup.cpp (backup)"