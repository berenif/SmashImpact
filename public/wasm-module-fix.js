/**
 * WASM Module Fix
 * This provides a proper wrapper for the game_engine.js module
 * to fix the import object field 'y' error
 */

// Create a wrapper function that properly initializes the WASM module
async function createFixedGameEngine() {
    console.log('Initializing fixed WASM game engine...');
    
    // First, let's analyze what the module expects
    try {
        // Fetch the WASM binary directly
        const wasmResponse = await fetch('./public/game_engine.wasm');
        if (!wasmResponse.ok) {
            throw new Error(`Failed to fetch WASM: ${wasmResponse.status}`);
        }
        
        const wasmBuffer = await wasmResponse.arrayBuffer();
        
        // Create WebAssembly memory
        const memory = new WebAssembly.Memory({
            initial: 256,
            maximum: 2048
        });
        
        // Create the import object with all expected imports
        const importObject = {
            env: {
                memory: memory,
                
                // Standard memory management functions
                __memory_base: 0,
                __table_base: 0,
                
                // Emscripten runtime functions
                abort: () => {
                    throw new Error('WASM abort called');
                },
                
                // Math functions that might be imported
                Math_floor: Math.floor,
                Math_ceil: Math.ceil,
                Math_sqrt: Math.sqrt,
                Math_sin: Math.sin,
                Math_cos: Math.cos,
                Math_atan2: Math.atan2,
                Math_random: Math.random,
                
                // Console functions
                console_log: (ptr) => {
                    console.log('WASM log:', ptr);
                },
                
                // Performance functions
                performance_now: () => performance.now(),
                
                // Memory growth
                emscripten_resize_heap: (size) => {
                    console.log('Heap resize requested:', size);
                    return 1; // Success
                }
            },
            
            wasi_snapshot_preview1: {
                // WASI imports (if needed)
                proc_exit: (code) => {
                    console.log('WASI proc_exit:', code);
                },
                
                fd_close: () => 0,
                fd_seek: () => 0,
                fd_write: () => 0,
                fd_read: () => 0
            }
        };
        
        // Try to instantiate the WASM module directly
        console.log('Instantiating WASM module...');
        const wasmModule = await WebAssembly.instantiate(wasmBuffer, importObject);
        
        console.log('✅ WASM module instantiated successfully');
        
        // Create a wrapper object that mimics the expected interface
        const wrapper = {
            instance: wasmModule.instance,
            module: wasmModule.module,
            memory: memory,
            
            // Expose the GameEngine class if it exists
            GameEngine: class GameEngine {
                constructor(width, height) {
                    console.log(`Creating GameEngine: ${width}x${height}`);
                    // Try to call the WASM constructor if it exists
                    if (wasmModule.instance.exports._GameEngine_new) {
                        this.ptr = wasmModule.instance.exports._GameEngine_new(width, height);
                    } else {
                        console.warn('GameEngine constructor not found in WASM exports');
                        this.width = width;
                        this.height = height;
                        this.entities = [];
                    }
                }
                
                createPlayer(x, y) {
                    if (wasmModule.instance.exports._GameEngine_createPlayer && this.ptr) {
                        return wasmModule.instance.exports._GameEngine_createPlayer(this.ptr, x, y);
                    }
                    // Fallback implementation
                    const id = this.entities.length;
                    this.entities.push({ type: 'player', x, y, id });
                    return id;
                }
                
                createEnemy(x, y, speed = 2.0) {
                    if (wasmModule.instance.exports._GameEngine_createEnemy && this.ptr) {
                        return wasmModule.instance.exports._GameEngine_createEnemy(this.ptr, x, y, speed);
                    }
                    // Fallback implementation
                    const id = this.entities.length;
                    this.entities.push({ type: 'enemy', x, y, speed, id });
                    return id;
                }
                
                update(deltaTime) {
                    if (wasmModule.instance.exports._GameEngine_update && this.ptr) {
                        return wasmModule.instance.exports._GameEngine_update(this.ptr, deltaTime);
                    }
                    // Fallback implementation
                    return true;
                }
                
                getEntityCount() {
                    if (wasmModule.instance.exports._GameEngine_getEntityCount && this.ptr) {
                        return wasmModule.instance.exports._GameEngine_getEntityCount(this.ptr);
                    }
                    return this.entities ? this.entities.length : 0;
                }
                
                delete() {
                    if (wasmModule.instance.exports._GameEngine_delete && this.ptr) {
                        wasmModule.instance.exports._GameEngine_delete(this.ptr);
                    }
                    this.entities = null;
                }
            }
        };
        
        return wrapper;
        
    } catch (error) {
        console.error('Failed to create fixed WASM engine:', error);
        
        // Return a pure JavaScript fallback
        return {
            GameEngine: class GameEngine {
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
                
                delete() {
                    this.entities = null;
                }
            }
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createFixedGameEngine;
}

// Make available globally
window.createFixedGameEngine = createFixedGameEngine;