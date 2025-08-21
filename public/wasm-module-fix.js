/**
 * WASM Module Fix
 * This provides a proper wrapper for the game_engine.js module
 * to fix import object errors
 */

// Import the Emscripten-generated module
async function createFixedGameEngine() {
    console.log('Initializing fixed WASM game engine...');
    
    try {
        // Import the Emscripten module factory
        const moduleFactory = (await import('./game_engine.js')).default;
        
        console.log('Module factory loaded, creating instance...');
        
        // Create the module instance
        // The Emscripten module handles all the import object setup internally
        const wasmModule = await moduleFactory({
            // Optional configuration
            print: (text) => console.log('[WASM]:', text),
            printErr: (text) => console.error('[WASM Error]:', text),
            
            // Locate the WASM file
            locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                    return 'public/game_engine.wasm';
                }
                return path;
            },
            
            // Handle initialization
            onRuntimeInitialized: () => {
                console.log('✅ WASM runtime initialized');
            }
        });
        
        console.log('✅ WASM module created successfully');
        
        // The module should already have the GameEngine class bound
        if (!wasmModule.GameEngine) {
            console.warn('GameEngine class not found in module, creating wrapper...');
            
            // Create a wrapper if needed
            return {
                GameEngine: createFallbackGameEngine()
            };
        }
        
        // Return the module with the GameEngine class
        return wasmModule;
        
    } catch (error) {
        console.error('Failed to create fixed WASM engine:', error);
        console.error('Error details:', error.message, error.stack);
        
        // Return a pure JavaScript fallback
        return {
            GameEngine: createFallbackGameEngine()
        };
    }
}

// Fallback JavaScript implementation
function createFallbackGameEngine() {
    return class GameEngine {
        constructor(width, height) {
            console.log(`Creating JS fallback GameEngine: ${width}x${height}`);
            this.width = width;
            this.height = height;
            this.entities = [];
            this.nextId = 1;
        }
        
        createPlayer(x, y) {
            const id = this.nextId++;
            this.entities.push({
                id,
                type: 'player',
                x,
                y,
                vx: 0,
                vy: 0,
                radius: 20,
                health: 100,
                maxHealth: 100
            });
            return id;
        }
        
        createEnemy(x, y, speed = 2.0) {
            const id = this.nextId++;
            this.entities.push({
                id,
                type: 'enemy',
                x,
                y,
                vx: 0,
                vy: 0,
                radius: 15,
                speed,
                health: 50,
                maxHealth: 50
            });
            return id;
        }
        
        createWolf(x, y) {
            const id = this.nextId++;
            this.entities.push({
                id,
                type: 'wolf',
                x,
                y,
                vx: 0,
                vy: 0,
                radius: 18,
                speed: 3.0,
                health: 75,
                maxHealth: 75
            });
            return id;
        }
        
        createProjectile(x, y, vx, vy, damage, ownerId) {
            const id = this.nextId++;
            this.entities.push({
                id,
                type: 'projectile',
                x,
                y,
                vx,
                vy,
                damage,
                ownerId
            });
            return id;
        }
        
        removeEntity(id) {
            this.entities = this.entities.filter(e => e.id !== id);
        }
        
        update(deltaTime) {
            // Update entity positions
            for (const entity of this.entities) {
                if (entity.vx) entity.x += entity.vx * deltaTime;
                if (entity.vy) entity.y += entity.vy * deltaTime;
                
                // Keep entities in bounds
                entity.x = Math.max(0, Math.min(this.width, entity.x));
                entity.y = Math.max(0, Math.min(this.height, entity.y));
            }
            return true;
        }
        
        getEntityCount() {
            return this.entities.length;
        }
        
        getEntities() {
            return this.entities;
        }
        
        getAllEntities() {
            // Return a copy of entities array with proper structure
            return this.entities.map(e => ({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                vx: e.vx || 0,
                vy: e.vy || 0,
                radius: e.radius || 20,
                health: e.health || 100,
                maxHealth: e.maxHealth || 100,
                speed: e.speed || 0
            }));
        }
        
        checkCollisions() {
            // Basic collision detection
            const player = this.entities.find(e => e.type === 'player');
            if (!player) return;
            
            for (const entity of this.entities) {
                if (entity.type === 'enemy' || entity.type === 'wolf') {
                    const dx = player.x - entity.x;
                    const dy = player.y - entity.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 40) { // Basic collision radius
                        player.health = Math.max(0, player.health - 1);
                    }
                }
            }
        }
        
        setJoystickInput(x, y) {
            const player = this.entities.find(e => e.type === 'player');
            if (player) {
                player.vx = x * 300; // Speed multiplier
                player.vy = y * 300;
            }
        }
        
        delete() {
            this.entities = null;
        }
    };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createFixedGameEngine;
}

// Make available globally
window.createFixedGameEngine = createFixedGameEngine;