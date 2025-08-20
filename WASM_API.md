# WASM Game Engine API Reference

## Complete List of Available Methods

The following methods are now fully implemented in the WASM game engine and exposed to JavaScript:

### Entity Creation
- `createPlayer(x, y)` - Creates a player entity at the specified position
- `createEnemy(x, y, speed)` - Creates an enemy entity with specified speed
- `createWolf(x, y)` - Creates a wolf entity (advanced enemy type)
- `createProjectile(x, y, dirX, dirY, damage, ownerId)` - Creates a projectile
- `createPowerUp(x, y, type)` - Creates a power-up entity
- `createObstacle(x, y, radius, destructible)` - Creates an obstacle (destructible or not)

### Entity Management
- `removeEntity(id)` - Removes an entity by ID
- `clearEntities()` - Clears all entities except the player

### Player Controls
- `updatePlayerInput(dx, dy, aimX, aimY)` - Updates player movement and aim direction
- `playerShoot(aimX, aimY)` - Player shoots a projectile towards aim position
- `playerBoost()` - Activates player boost ability
- `playerSpecialAbility()` - Triggers player's special ability (area attack)
- `activateBoost(playerId)` - Activates boost for specific player
- `deactivateBoost(playerId)` - Deactivates boost for specific player
- `startBlock(playerId)` - Player starts blocking/shielding
- `endBlock(playerId)` - Player stops blocking/shielding

### Game Loop
- `update(deltaTime)` - Main update loop (physics + collisions)
- `checkCollisions()` - Explicitly check and handle collisions

### Data Retrieval
- `getEntityPositions()` - Returns array of all entity positions and data
- `getAllEntities()` - Alias for getEntityPositions()
- `getPlayerState()` - Returns detailed player state object
- `getPerformanceMetrics()` - Returns performance statistics

### World Management
- `setWorldBounds(width, height)` - Sets the world boundaries

### State Queries
- `isBlocking(playerId)` - Check if player is currently blocking
- `isPerfectParryWindow(playerId)` - Check if player is in perfect parry window

## Usage in JavaScript

```javascript
// After loading the WASM module
const engine = new Game.wasmModule.GameEngine(1920, 1080);

// Create player
const playerId = engine.createPlayer(960, 540);

// Create enemies
engine.createEnemy(100, 100, 2.0);
engine.createWolf(200, 200);

// Update player input
engine.updatePlayerInput(dx, dy, mouseX, mouseY);

// Player actions
engine.playerShoot(targetX, targetY);
engine.playerBoost();
engine.playerSpecialAbility();

// Game loop
function gameLoop(deltaTime) {
    engine.update(deltaTime / 1000); // Convert to seconds
    engine.checkCollisions(); // Optional - update() already does this
    
    const entities = engine.getAllEntities();
    const playerState = engine.getPlayerState();
    
    // Render entities...
}
```

## Entity Types

The engine supports the following entity types:
- `PLAYER` (0) - The player character
- `ENEMY` (1) - Basic enemy
- `WOLF` (2) - Advanced enemy with pack behavior
- `PROJECTILE` (3) - Projectiles fired by player or enemies
- `POWERUP` (4) - Power-up items
- `OBSTACLE` (5) - Static or destructible obstacles

## Player State Object

The `getPlayerState()` method returns an object with:
```javascript
{
    id: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
    health: number,
    maxHealth: number,
    energy: number,
    maxEnergy: number,
    invulnerable: boolean,
    boosting: boolean,
    boostCooldown: number,
    blocking: boolean,
    blockCooldown: number,
    perfectParryWindow: boolean
}
```

## Performance Metrics

The `getPerformanceMetrics()` method returns:
```javascript
{
    physicsTime: number,      // Time spent on physics (ms)
    collisionTime: number,    // Time spent on collision detection (ms)
    collisionChecks: number,  // Number of collision checks performed
    entityCount: number,      // Total entity count
    activeEntities: number    // Active entity count
}
```

## Notes

- All positions are in pixels
- All times are in milliseconds
- The engine uses spatial hashing for efficient collision detection
- The engine automatically handles entity cleanup for inactive entities
- Perfect parry window is 150ms after starting block
- Special ability costs 50 energy and deals area damage