# Project Architecture

## Overview
This document describes the architecture of the co-op arena survival game, designed for maintainability, extensibility, and clear separation of concerns.

## Directory Structure

```
/workspace
├── src/
│   ├── core/               # Core engine systems
│   │   ├── Engine.js       # Main game engine
│   │   ├── GameLoop.js     # Game loop management
│   │   ├── EventBus.js     # Event system
│   │   ├── ResourceManager.js
│   │   └── InputManager.js
│   │
│   ├── game/               # Game-specific logic
│   │   ├── GameState.js    # Centralized state
│   │   ├── GameConfig.js   # Configuration
│   │   ├── GameModes.js    # Game mode definitions
│   │   │
│   │   ├── entities/       # Game entities
│   │   │   ├── heroes/
│   │   │   │   ├── Hero.js
│   │   │   │   ├── Runner.js
│   │   │   │   └── Anchor.js
│   │   │   │
│   │   │   ├── enemies/
│   │   │   │   ├── Enemy.js
│   │   │   │   ├── Brawler.js
│   │   │   │   ├── Stalker.js
│   │   │   │   └── ...
│   │   │   │
│   │   │   └── projectiles/
│   │   │       └── Projectile.js
│   │   │
│   │   ├── systems/        # Game systems
│   │   │   ├── CombatSystem.js
│   │   │   ├── MovementSystem.js
│   │   │   ├── AbilitySystem.js
│   │   │   ├── CoopSystem.js
│   │   │   └── WaveSystem.js
│   │   │
│   │   ├── ai/            # AI systems
│   │   │   ├── UtilityAI.js
│   │   │   ├── SquadDirector.js
│   │   │   ├── InfluenceMap.js
│   │   │   └── Blackboard.js
│   │   │
│   │   └── arena/         # Arena/Level management
│   │       ├── Arena.js
│   │       ├── ArenaLoader.js
│   │       └── Objectives.js
│   │
│   ├── scenes/            # Scene management
│   │   ├── SceneManager.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   ├── PauseScene.js
│   │   └── ResultScene.js
│   │
│   ├── rendering/         # Rendering systems
│   │   ├── Renderer.js
│   │   ├── Camera.js
│   │   ├── ParticleSystem.js
│   │   └── UIRenderer.js
│   │
│   ├── network/           # Networking
│   │   ├── NetworkManager.js
│   │   ├── WebRTCConnection.js
│   │   ├── MessageProtocol.js
│   │   └── StateSync.js
│   │
│   ├── ui/               # UI components
│   │   ├── HUD.js
│   │   ├── DebugPanel.js
│   │   ├── Minimap.js
│   │   └── components/
│   │
│   ├── utils/            # Utilities
│   │   ├── math/
│   │   ├── collision/
│   │   ├── pathfinding/
│   │   └── helpers/
│   │
│   └── config/           # Configuration files
│       ├── game.config.js
│       ├── balance.config.js
│       └── debug.config.js
│
├── assets/               # Game assets
│   ├── audio/
│   ├── sprites/
│   └── data/
│
├── tests/               # Test files
└── docs/               # Documentation
```

## Core Architecture Principles

### 1. Separation of Concerns
- **Core Engine**: Generic game engine functionality
- **Game Logic**: Game-specific rules and mechanics
- **Rendering**: Visual representation
- **Networking**: Communication layer
- **UI**: User interface components

### 2. Entity-Component-System (ECS) Pattern
```javascript
// Entity: Container with unique ID
class Entity {
  constructor(id) {
    this.id = id;
    this.components = new Map();
  }
}

// Component: Data only
class PositionComponent {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

// System: Logic that operates on components
class MovementSystem {
  update(entities, dt) {
    // Process entities with position + velocity
  }
}
```

### 3. Event-Driven Communication
```javascript
// Decoupled communication via events
EventBus.emit('player.damaged', { playerId, damage, source });
EventBus.on('enemy.killed', (data) => { /* handle */ });
```

### 4. State Management
```javascript
// Centralized, immutable state updates
GameState.dispatch({
  type: 'UPDATE_PLAYER_HEALTH',
  payload: { playerId, health }
});
```

## Key Systems

### Game Loop
```javascript
class GameLoop {
  constructor(targetFPS = 60) {
    this.targetDelta = 1000 / targetFPS;
    this.accumulator = 0;
  }
  
  run() {
    // Fixed timestep with interpolation
    while (this.accumulator >= this.targetDelta) {
      this.fixedUpdate(this.targetDelta / 1000);
      this.accumulator -= this.targetDelta;
    }
    this.render(this.accumulator / this.targetDelta);
  }
}
```

### Resource Management
```javascript
class ResourceManager {
  async loadResources(manifest) {
    // Centralized asset loading
    // Caching and reference counting
    // Memory management
  }
}
```

### Scene Management
```javascript
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.activeScene = null;
  }
  
  transition(sceneName, data) {
    // Handle scene transitions
    // Cleanup and initialization
  }
}
```

## Configuration System

### Game Configuration
```javascript
// config/game.config.js
export default {
  gameplay: {
    roundDuration: 120,
    scoreToWin: 10,
    respawnTime: 3
  },
  
  heroes: {
    runner: {
      health: 100,
      speed: 320,
      abilities: { /* ... */ }
    },
    anchor: { /* ... */ }
  },
  
  enemies: { /* ... */ },
  
  // Hot-reloadable during development
  debug: {
    showHitboxes: false,
    showInfluenceMap: false,
    aiUpdateRate: 10
  }
};
```

### Balance Configuration
```javascript
// config/balance.config.js
export default {
  difficulty: {
    easy: { enemyHealth: 0.7, enemyDamage: 0.8 },
    normal: { enemyHealth: 1.0, enemyDamage: 1.0 },
    hard: { enemyHealth: 1.3, enemyDamage: 1.2 }
  },
  
  scaling: {
    waveMultiplier: 1.15,
    healthPerWave: 1.1
  }
};
```

## Network Architecture

### Authority Model
```javascript
class NetworkManager {
  constructor() {
    this.isHost = false;
    this.tickRate = 30; // Hz
    this.sendRate = 15; // Hz
  }
  
  // Host authoritative
  // - Host owns: enemies, objectives, game state
  // - Clients own: their input
  // - Prediction + rollback for responsiveness
}
```

### Message Protocol
```javascript
// Efficient binary protocol
class MessageProtocol {
  static encode(message) {
    // Type (uint8) + Data
    // Position: int16 x,y
    // Angle: uint16
    // Health: uint8
  }
  
  static decode(buffer) {
    // Deserialize with validation
  }
}
```

## Development Tools

### Debug Panel
```javascript
class DebugPanel {
  constructor() {
    this.stats = {
      fps: 0,
      entities: 0,
      networkLatency: 0
    };
  }
  
  // Live configuration editing
  // Performance monitoring
  // State inspection
}
```

### Hot Reload Support
```javascript
// Development mode features
if (DEV_MODE) {
  // Hot reload configurations
  // Live balance tweaking
  // State snapshots
}
```

## Performance Considerations

### Update Frequencies
- Game Logic: 60 Hz
- AI Utility: 5-10 Hz
- Squad Director: 2 Hz
- Network Send: 15-30 Hz
- Network State: 3-5 Hz

### Memory Management
- Object pooling for frequent allocations
- Spatial indexing for collision detection
- Efficient data structures (TypedArrays)

### Rendering Optimizations
- Dirty rectangle rendering
- Culling off-screen entities
- Batched draw calls

## Extension Points

### Adding New Enemy Types
1. Create class extending `Enemy`
2. Register in `EnemyFactory`
3. Add configuration to `balance.config.js`
4. AI behavior automatically integrated

### Adding New Abilities
1. Create ability definition
2. Register in `AbilitySystem`
3. Add UI component
4. Network sync handled automatically

### Adding New Game Modes
1. Extend `GameMode` class
2. Define rules and win conditions
3. Register in `GameModes`
4. UI automatically adapts

## Testing Strategy

### Unit Tests
- Pure functions in utils/
- Component logic
- System calculations

### Integration Tests
- System interactions
- Network protocols
- State management

### Performance Tests
- Frame rate targets
- Memory usage
- Network bandwidth

## Build and Deployment

### Development
```bash
npm run dev
# Hot reload, debug tools, verbose logging
```

### Production
```bash
npm run build
# Minified, optimized, error tracking
```

### Environment Variables
```javascript
// .env
API_URL=https://api.game.com
DEBUG_MODE=false
NETWORK_TICK_RATE=30
```