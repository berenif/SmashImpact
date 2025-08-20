/**
 * WebAssembly Game Engine Wrapper
 * This module provides a high-level JavaScript interface to the WebAssembly game engine
 * and integrates it with the existing game code for maximum performance.
 */

import GameEngineModule from './game_engine.js';

export class WasmGameEngine {
    constructor() {
        this.module = null;
        this.engine = null;
        this.initialized = false;
        this.entityIdMap = new Map();
        this.performanceStats = {
            wasmUpdateTime: 0,
            jsRenderTime: 0,
            totalFrameTime: 0,
            fps: 0,
            frameCount: 0,
            lastFpsUpdate: performance.now()
        };
    }
    
    /**
     * Initialize the WebAssembly module and create the game engine
     * @param {number} width - World width
     * @param {number} height - World height
     * @returns {Promise<void>}
     */
    async initialize(width, height) {
        try {
            console.log('Initializing WebAssembly game engine...');
            this.module = await GameEngineModule();
            this.engine = new this.module.GameEngine(width, height);
            this.initialized = true;
            console.log('✓ WebAssembly engine initialized successfully');
            return this;
        } catch (error) {
            console.error('Failed to initialize WebAssembly engine:', error);
            throw error;
        }
    }
    
    /**
     * Create a player entity
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @returns {number} Player entity ID
     */
    createPlayer(x, y) {
        if (!this.initialized) throw new Error('Engine not initialized');
        const id = this.engine.createPlayer(x, y);
        this.entityIdMap.set('player', id);
        return id;
    }
    
    /**
     * Create an enemy entity
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} speed - Enemy movement speed
     * @returns {number} Enemy entity ID
     */
    createEnemy(x, y, speed = 2.0) {
        if (!this.initialized) throw new Error('Engine not initialized');
        return this.engine.createEnemy(x, y, speed);
    }
    
    /**
     * Create a wolf entity
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @returns {number} Wolf entity ID
     */
    createWolf(x, y) {
        if (!this.initialized) throw new Error('Engine not initialized');
        return this.engine.createWolf(x, y);
    }
    
    /**
     * Create a projectile entity
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     * @param {number} damage - Projectile damage
     * @param {number} ownerId - ID of the entity that created the projectile
     * @returns {number} Projectile entity ID
     */
    createProjectile(x, y, vx, vy, damage, ownerId) {
        if (!this.initialized) throw new Error('Engine not initialized');
        return this.engine.createProjectile(x, y, vx, vy, damage, ownerId);
    }
    
    /**
     * Remove an entity from the game
     * @param {number} id - Entity ID to remove
     */
    removeEntity(id) {
        if (!this.initialized) throw new Error('Engine not initialized');
        this.engine.removeEntity(id);
    }
    
    /**
     * Update player input
     * @param {number} dx - X-axis input (-1 to 1)
     * @param {number} dy - Y-axis input (-1 to 1)
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    updatePlayerInput(dx, dy, deltaTime) {
        if (!this.initialized) throw new Error('Engine not initialized');
        this.engine.updatePlayerInput(dx, dy, deltaTime);
    }
    
    /**
     * Activate player boost
     */
    activateBoost() {
        if (!this.initialized) throw new Error('Engine not initialized');
        const playerId = this.entityIdMap.get('player');
        if (playerId) {
            this.engine.activateBoost(playerId);
        }
    }
    
    /**
     * Deactivate player boost
     */
    deactivateBoost() {
        if (!this.initialized) throw new Error('Engine not initialized');
        const playerId = this.entityIdMap.get('player');
        if (playerId) {
            this.engine.deactivateBoost(playerId);
        }
    }
    
    /**
     * Start blocking
     */
    startBlock() {
        if (!this.initialized) throw new Error('Engine not initialized');
        const playerId = this.entityIdMap.get('player');
        if (playerId && this.engine.startBlock) {
            this.engine.startBlock(playerId);
        }
    }
    
    /**
     * End blocking
     */
    endBlock() {
        if (!this.initialized) throw new Error('Engine not initialized');
        const playerId = this.entityIdMap.get('player');
        if (playerId && this.engine.endBlock) {
            this.engine.endBlock(playerId);
        }
    }
    
    /**
     * Check if player is blocking
     * @returns {boolean}
     */
    isBlocking() {
        if (!this.initialized) return false;
        const playerId = this.entityIdMap.get('player');
        if (playerId && this.engine.isBlocking) {
            return this.engine.isBlocking(playerId);
        }
        return false;
    }
    
    /**
     * Check if in perfect parry window
     * @returns {boolean}
     */
    isPerfectParryWindow() {
        if (!this.initialized) return false;
        const playerId = this.entityIdMap.get('player');
        if (playerId && this.engine.isPerfectParryWindow) {
            return this.engine.isPerfectParryWindow(playerId);
        }
        return false;
    }
    
    /**
     * Update the game engine
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.initialized) return;
        
        const startTime = performance.now();
        this.engine.update(deltaTime);
        this.performanceStats.wasmUpdateTime = performance.now() - startTime;
        
        // Update FPS counter
        this.performanceStats.frameCount++;
        const now = performance.now();
        if (now - this.performanceStats.lastFpsUpdate > 1000) {
            this.performanceStats.fps = this.performanceStats.frameCount;
            this.performanceStats.frameCount = 0;
            this.performanceStats.lastFpsUpdate = now;
        }
    }
    
    /**
     * Get all entity positions and states
     * @returns {Array} Array of entity data objects
     */
    getEntityPositions() {
        if (!this.initialized) return [];
        const positions = this.engine.getEntityPositions();
        const result = [];
        for (let i = 0; i < positions.length; i++) {
            result.push(positions[i]);
        }
        return result;
    }
    
    /**
     * Get player state
     * @returns {Object|null} Player state object or null if no player
     */
    getPlayerState() {
        if (!this.initialized) return null;
        return this.engine.getPlayerState();
    }
    
    /**
     * Get performance metrics from the engine
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        if (!this.initialized) {
            return {
                physicsTime: 0,
                collisionTime: 0,
                collisionChecks: 0,
                entityCount: 0,
                activeEntities: 0,
                wasmUpdateTime: 0,
                jsRenderTime: 0,
                fps: 0
            };
        }
        
        const engineMetrics = this.engine.getPerformanceMetrics();
        return {
            ...engineMetrics,
            wasmUpdateTime: this.performanceStats.wasmUpdateTime,
            jsRenderTime: this.performanceStats.jsRenderTime,
            fps: this.performanceStats.fps
        };
    }
    
    /**
     * Set world bounds
     * @param {number} width - World width
     * @param {number} height - World height
     */
    setWorldBounds(width, height) {
        if (!this.initialized) return;
        this.engine.setWorldBounds(width, height);
    }
    
    /**
     * Clean up and destroy the engine
     */
    destroy() {
        if (this.engine) {
            // The engine will be garbage collected
            this.engine = null;
        }
        this.module = null;
        this.initialized = false;
        this.entityIdMap.clear();
    }
}

/**
 * Integration adapter for the existing UnifiedGame class
 * This class adapts the WebAssembly engine to work with the existing game code
 */
export class WasmGameAdapter {
    constructor(game) {
        this.game = game;
        this.wasmEngine = null;
        this.useWasm = true;
        this.entityMapping = new Map();
    }
    
    /**
     * Initialize the WebAssembly adapter
     */
    async initialize() {
        try {
            this.wasmEngine = new WasmGameEngine();
            await this.wasmEngine.initialize(
                this.game.canvas.width,
                this.game.canvas.height
            );
            
            // Create player in WASM engine
            if (this.game.player) {
                const playerId = this.wasmEngine.createPlayer(
                    this.game.player.x,
                    this.game.player.y
                );
                this.entityMapping.set(this.game.player, playerId);
            }
            
            console.log('✓ WebAssembly adapter initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize WebAssembly adapter:', error);
            console.log('Falling back to JavaScript implementation');
            this.useWasm = false;
            return false;
        }
    }
    
    /**
     * Update game using WebAssembly engine
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.useWasm || !this.wasmEngine) {
            // Fall back to original JavaScript update
            return false;
        }
        
        // Update player input in WASM
        if (this.game.player) {
            const input = this.getPlayerInput();
            this.wasmEngine.updatePlayerInput(input.dx, input.dy, deltaTime);
            
            // Handle boost
            if (this.game.input.keys[' '] || 
                (this.game.input.buttons.boost && this.game.input.buttons.boost.isPressed())) {
                this.wasmEngine.activateBoost();
            } else {
                this.wasmEngine.deactivateBoost();
            }
        }
        
        // Sync enemies to WASM engine
        this.syncEntitiesToWasm();
        
        // Update WASM engine
        this.wasmEngine.update(deltaTime);
        
        // Sync state back from WASM
        this.syncStateFromWasm();
        
        return true;
    }
    
    /**
     * Get player input from the game
     */
    getPlayerInput() {
        let dx = 0, dy = 0;
        
        // Keyboard input
        if (this.game.input.keys['w'] || this.game.input.keys['arrowup']) dy -= 1;
        if (this.game.input.keys['s'] || this.game.input.keys['arrowdown']) dy += 1;
        if (this.game.input.keys['a'] || this.game.input.keys['arrowleft']) dx -= 1;
        if (this.game.input.keys['d'] || this.game.input.keys['arrowright']) dx += 1;
        
        // Joystick input
        if (this.game.input.joystick) {
            const joystickInput = this.game.input.joystick.getInput();
            dx += joystickInput.x;
            dy += joystickInput.y;
        }
        
        return { dx, dy };
    }
    
    /**
     * Sync JavaScript entities to WebAssembly engine
     */
    syncEntitiesToWasm() {
        // Sync new enemies
        for (const enemy of this.game.enemies) {
            if (!this.entityMapping.has(enemy)) {
                let wasmId;
                if (enemy.type === 'wolf') {
                    wasmId = this.wasmEngine.createWolf(enemy.x, enemy.y);
                } else {
                    wasmId = this.wasmEngine.createEnemy(enemy.x, enemy.y, enemy.speed);
                }
                this.entityMapping.set(enemy, wasmId);
            }
        }
        
        // Sync projectiles
        for (const projectile of this.game.projectiles) {
            if (!this.entityMapping.has(projectile)) {
                const wasmId = this.wasmEngine.createProjectile(
                    projectile.x, projectile.y,
                    projectile.vx, projectile.vy,
                    projectile.damage || 10,
                    this.entityMapping.get(this.game.player) || 0
                );
                this.entityMapping.set(projectile, wasmId);
            }
        }
    }
    
    /**
     * Sync state from WebAssembly engine back to JavaScript
     */
    syncStateFromWasm() {
        // Get entity positions from WASM
        const entities = this.wasmEngine.getEntityPositions();
        
        // Update player state
        const playerState = this.wasmEngine.getPlayerState();
        if (playerState && this.game.player) {
            this.game.player.x = playerState.x;
            this.game.player.y = playerState.y;
            this.game.player.vx = playerState.vx;
            this.game.player.vy = playerState.vy;
            this.game.player.health = playerState.health;
            this.game.player.energy = playerState.energy;
            this.game.player.invulnerable = playerState.invulnerable;
            this.game.player.boosting = playerState.boosting;
            this.game.player.boostCooldown = playerState.boostCooldown;
        }
        
        // Create a map of WASM entities for quick lookup
        const wasmEntityMap = new Map();
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            wasmEntityMap.set(entity.id, entity);
        }
        
        // Update JavaScript entities from WASM state
        for (const [jsEntity, wasmId] of this.entityMapping.entries()) {
            const wasmEntity = wasmEntityMap.get(wasmId);
            if (wasmEntity) {
                // Update position and velocity
                if (jsEntity !== this.game.player) {
                    jsEntity.x = wasmEntity.x;
                    jsEntity.y = wasmEntity.y;
                    jsEntity.vx = wasmEntity.vx;
                    jsEntity.vy = wasmEntity.vy;
                    jsEntity.health = wasmEntity.health;
                }
            } else {
                // Entity was destroyed in WASM
                if (jsEntity !== this.game.player) {
                    jsEntity.active = false;
                }
            }
        }
        
        // Remove inactive entities from JavaScript arrays
        this.game.enemies = this.game.enemies.filter(e => e.active !== false);
        this.game.projectiles = this.game.projectiles.filter(p => p.active !== false);
        
        // Clean up entity mapping
        for (const [jsEntity, wasmId] of this.entityMapping.entries()) {
            if (jsEntity.active === false) {
                this.entityMapping.delete(jsEntity);
                this.wasmEngine.removeEntity(wasmId);
            }
        }
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.useWasm || !this.wasmEngine) {
            return null;
        }
        return this.wasmEngine.getPerformanceMetrics();
    }
    
    /**
     * Clean up the adapter
     */
    destroy() {
        if (this.wasmEngine) {
            this.wasmEngine.destroy();
            this.wasmEngine = null;
        }
        this.entityMapping.clear();
    }
}

// Export for use in the main game
window.WasmGameEngine = WasmGameEngine;
window.WasmGameAdapter = WasmGameAdapter;