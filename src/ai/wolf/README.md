# Wolf AI System - Modular Architecture

## Overview

The Wolf AI system has been refactored from a monolithic 1160-line file into a clean, modular architecture with clear separation of concerns. This makes the codebase much easier to understand, maintain, and extend.

## Architecture

### Module Structure

```
src/ai/wolf/
├── index.js              # Main export module
├── config.js            # Configuration and constants
├── wolf.js              # Wolf entity class
├── behaviors.js         # Behavior implementations
├── state-machine.js     # State management
├── pathfinding.js       # A* pathfinding system
├── pack-coordinator.js  # Pack tactics and coordination
├── wolf-manager.js      # Wolf lifecycle management
└── README.md           # This file
```

### Key Components

#### 1. **Configuration Module** (`config.js`)
- Centralized configuration for all wolf parameters
- Movement speeds, detection ranges, combat stats
- Wolf states and roles enumerations
- Scaling functions for difficulty adjustment

#### 2. **Wolf Entity** (`wolf.js`)
- Main wolf class with position, health, and movement
- Integrates all other modules
- Handles rendering and animation
- Manages individual wolf behavior

#### 3. **Behaviors Module** (`behaviors.js`)
- Implements all wolf behaviors (patrol, stalk, chase, etc.)
- Aggression calculation
- Threat assessment
- Movement patterns

#### 4. **State Machine** (`state-machine.js`)
- Manages wolf state transitions
- Handles state-specific enter/exit logic
- Validates transitions
- Tracks state timing

#### 5. **Pathfinding** (`pathfinding.js`)
- A* algorithm implementation
- Maze-aware navigation
- Path caching for performance
- Line-of-sight calculations
- Dynamic obstacle avoidance

#### 6. **Pack Coordinator** (`pack-coordinator.js`)
- Manages wolf packs and formations
- Coordinates pack tactics (surround, flank, ambush)
- Role assignment (alpha, chaser, flanker)
- Morale and coordination systems

#### 7. **Wolf Manager** (`wolf-manager.js`)
- Spawning and lifecycle management
- Statistics tracking
- Event handling
- Integration with game systems

## Usage

### Basic Setup

```javascript
import { setupWolfAI } from './src/ai/wolf/index.js';

// Initialize with game state
const gameState = {
    mapWidth: 800,
    mapHeight: 600,
    gridWidth: 25,
    gridHeight: 20,
    obstacles: [],
    players: [],
    // ... other game properties
};

const wolfManager = setupWolfAI(gameState);
```

### Manual Setup

```javascript
import { WolfManager } from './src/ai/wolf/wolf-manager.js';

const wolfManager = new WolfManager(gameState);
wolfManager.initialize();

// Spawn a wolf pack
const wolves = wolfManager.spawnPack(
    { x: 400, y: 300 },  // position
    3,                    // count
    { difficulty: 1.5 }   // options
);

// Update in game loop
function gameLoop(deltaTime) {
    wolfManager.update(deltaTime);
    wolfManager.render(ctx);
}
```

### Integration

```javascript
import { WolfAIIntegration } from './src/ai/wolf-integration-modular.js';

const integration = new WolfAIIntegration(gameState);
integration.initialize();

// The integration automatically hooks into:
// - Wave manager for spawning
// - Update loop for AI updates
// - Render loop for drawing
// - Event system for reactions
```

## Features

### Individual Wolf Behavior
- **State-based AI**: 11 different states (idle, patrol, stalking, chasing, etc.)
- **Smart pathfinding**: A* algorithm with maze awareness
- **Adaptive behavior**: Aggression changes based on health, pack size, and situation
- **Smooth movement**: Velocity-based movement with collision detection

### Pack Coordination
- **Dynamic roles**: Alpha leadership with specialized pack roles
- **Coordinated tactics**: Surround, flank, ambush, and drive tactics
- **Pack morale**: Affects aggression and coordination
- **Communication**: Howling system for pack coordination

### Performance Optimizations
- **Path caching**: Reduces pathfinding calculations
- **Efficient state machine**: Minimal overhead for state management
- **Modular rendering**: Only renders visible wolves
- **Smart target acquisition**: Efficient player detection

## Configuration

### Adjusting Difficulty

```javascript
import { WOLF_CONFIG, getScaledConfig } from './src/ai/wolf/config.js';

// Get scaled configuration for higher difficulty
const hardConfig = getScaledConfig(1.5);

// Or modify specific values
WOLF_CONFIG.movement.BASE_SPEED = 3.0;
WOLF_CONFIG.combat.DAMAGE = 15;
```

### Custom Behaviors

```javascript
import { WolfBehaviors } from './src/ai/wolf/behaviors.js';

class CustomBehaviors extends WolfBehaviors {
    // Override or add new behaviors
    customBehavior(target) {
        // Implementation
        return { vx: 0, vy: 0 };
    }
}
```

## Testing

Run the test suite:

```javascript
import { WolfAITestSuite } from './tests/wolf-ai-tests.js';

const suite = new WolfAITestSuite();
await suite.runAll();
```

## API Reference

### WolfManager

```javascript
// Spawn wolves
spawnWolves(config)
spawnPack(position, count, options)

// Management
getWolf(id)
getAllWolves()
getLivingWolves()
removeWolf(id)
clearAllWolves()

// Control
increaseAggression(amount)
triggerCoordinatedHowl()
setGlobalTarget(target)

// Updates
update(deltaTime)
render(ctx)
```

### Wolf Entity

```javascript
// Properties
wolf.x, wolf.y           // Position
wolf.health, wolf.maxHealth
wolf.state              // Current AI state
wolf.role               // Pack role
wolf.target             // Current target

// Methods
wolf.update(deltaTime, players, wolves)
wolf.takeDamage(amount)
wolf.performAttack()
wolf.render(ctx)
```

### PackCoordinator

```javascript
// Pack management
createPack(wolves)
disbandPack(packId)
mergePacks(packId1, packId2)

// Coordination
updatePack(packId, deltaTime)
triggerHowl(pack)

// Queries
getPack(packId)
getAllPacks()
```

## Benefits of Refactoring

1. **Maintainability**: Each module has a single responsibility
2. **Testability**: Components can be tested in isolation
3. **Reusability**: Modules can be used independently
4. **Extensibility**: Easy to add new behaviors or states
5. **Performance**: Better optimization opportunities
6. **Documentation**: Clear module boundaries and JSDoc comments
7. **Debugging**: Easier to locate and fix issues

## Migration Guide

If you're migrating from the old monolithic system:

1. Replace script imports:
```html
<!-- Old -->
<script src="wolf-ai.js"></script>

<!-- New -->
<script type="module">
import { setupWolfAI } from './src/ai/wolf/index.js';
</script>
```

2. Update initialization:
```javascript
// Old
window.WolfAI.PackCoordinator()

// New
import { WolfManager } from './src/ai/wolf/wolf-manager.js';
const wolfManager = new WolfManager(gameState);
```

3. The API is largely compatible, but some global references need updating.

## Future Enhancements

- [ ] Add more sophisticated pack formations
- [ ] Implement learning/adaptation over time
- [ ] Add territorial behavior
- [ ] Implement scent tracking
- [ ] Add weather/time-of-day effects on behavior
- [ ] Create wolf variants (arctic, dire, shadow)
- [ ] Add save/load functionality for wolf state

## Contributing

When adding new features:

1. Follow the existing module structure
2. Add JSDoc comments for all public methods
3. Write unit tests for new functionality
4. Update this README with new features
5. Maintain backward compatibility when possible