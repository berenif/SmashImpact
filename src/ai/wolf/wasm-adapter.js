/**
 * WASM Adapter for Wolf AI System
 * @module wolf/wasm-adapter
 * 
 * This adapter ensures the Wolf AI system is compatible with the WebAssembly game engine
 * by providing efficient data exchange and synchronization between JavaScript and WASM.
 */

import { Wolf } from './wolf.js';
import { WolfManager } from './wolf-manager.js';
import { WOLF_CONFIG } from './config.js';

/**
 * WASM-compatible Wolf AI Adapter
 * Bridges the JavaScript Wolf AI with the WebAssembly game engine
 * @class
 */
export class WolfWasmAdapter {
    /**
     * @param {WolfManager} wolfManager - Wolf manager instance
     * @param {Object} wasmEngine - WebAssembly engine instance
     */
    constructor(wolfManager, wasmEngine) {
        this.wolfManager = wolfManager;
        this.wasmEngine = wasmEngine;
        this.wasmWolfMap = new Map(); // Maps JS wolf ID to WASM entity ID
        this.jsWolfMap = new Map();   // Maps WASM entity ID to JS wolf
        this.syncBuffer = null;        // Shared buffer for efficient data transfer
        this.lastSyncTime = 0;
        this.syncInterval = 16;       // Sync every frame (60 FPS)
    }

    /**
     * Initialize the adapter
     */
    initialize() {
        // Create shared buffer for efficient data transfer
        this.createSyncBuffer();
        
        console.log('Wolf WASM Adapter initialized');
    }

    /**
     * Create a shared buffer for efficient data synchronization
     */
    createSyncBuffer() {
        // Allocate buffer for up to MAX_WOLVES wolves
        // Each wolf needs: id(4), x(4), y(4), vx(4), vy(4), health(4), state(4) = 28 bytes
        const MAX_WOLVES = 100;
        const BYTES_PER_WOLF = 28;
        this.syncBuffer = new ArrayBuffer(MAX_WOLVES * BYTES_PER_WOLF);
        this.syncView = new DataView(this.syncBuffer);
    }

    /**
     * Create a wolf in both JS and WASM
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Wolf configuration
     * @returns {Wolf} Created wolf instance
     */
    createWolf(x, y, config = {}) {
        // Create JavaScript wolf
        const jsWolf = this.wolfManager.createWolf(x, y, config);
        
        // Create corresponding WASM entity
        if (this.wasmEngine && this.wasmEngine.initialized) {
            const wasmId = this.wasmEngine.createWolf(x, y);
            
            // Map IDs
            this.wasmWolfMap.set(jsWolf.id, wasmId);
            this.jsWolfMap.set(wasmId, jsWolf);
            
            // Set initial properties in WASM
            this.syncWolfToWasm(jsWolf, wasmId);
        }
        
        return jsWolf;
    }

    /**
     * Remove a wolf from both systems
     * @param {string} wolfId - Wolf ID to remove
     */
    removeWolf(wolfId) {
        const wasmId = this.wasmWolfMap.get(wolfId);
        
        // Remove from WASM
        if (wasmId !== undefined && this.wasmEngine) {
            this.wasmEngine.removeEntity(wasmId);
            this.jsWolfMap.delete(wasmId);
        }
        
        // Remove from JS
        this.wolfManager.removeWolf(wolfId);
        this.wasmWolfMap.delete(wolfId);
    }

    /**
     * Sync wolf data from JS to WASM
     * @param {Wolf} wolf - JavaScript wolf instance
     * @param {number} wasmId - WASM entity ID
     */
    syncWolfToWasm(wolf, wasmId) {
        if (!this.wasmEngine || !this.wasmEngine.initialized) return;
        
        // Update position and velocity in WASM
        this.wasmEngine.updateEntityPosition(wasmId, wolf.x, wolf.y);
        this.wasmEngine.updateEntityVelocity(wasmId, wolf.vx, wolf.vy);
        
        // Update health if method exists
        if (this.wasmEngine.updateEntityHealth) {
            this.wasmEngine.updateEntityHealth(wasmId, wolf.health);
        }
    }

    /**
     * Sync wolf data from WASM to JS
     * @param {number} wasmId - WASM entity ID
     * @param {Object} wasmData - Data from WASM
     */
    syncWolfFromWasm(wasmId, wasmData) {
        const wolf = this.jsWolfMap.get(wasmId);
        if (!wolf) return;
        
        // Update position from WASM physics
        wolf.x = wasmData.x;
        wolf.y = wasmData.y;
        
        // Update health if changed
        if (wasmData.health !== undefined) {
            wolf.health = wasmData.health;
        }
        
        // Handle collision events
        if (wasmData.colliding) {
            this.handleWasmCollision(wolf, wasmData.collidingWith);
        }
    }

    /**
     * Main update cycle - sync between JS and WASM
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const currentTime = performance.now();
        
        // Throttle sync to avoid performance issues
        if (currentTime - this.lastSyncTime < this.syncInterval) {
            // Just update JS wolves without syncing
            this.wolfManager.update(deltaTime);
            return;
        }
        
        this.lastSyncTime = currentTime;
        
        // Phase 1: Update JS AI (decision making)
        this.wolfManager.update(deltaTime);
        
        // Phase 2: Sync JS decisions to WASM
        this.syncAllToWasm();
        
        // Phase 3: Let WASM handle physics
        // (This is done by the main WASM update loop)
        
        // Phase 4: Sync WASM physics results back to JS
        this.syncAllFromWasm();
    }

    /**
     * Sync all wolves from JS to WASM
     */
    syncAllToWasm() {
        if (!this.wasmEngine || !this.wasmEngine.initialized) return;
        
        const wolves = this.wolfManager.getLivingWolves();
        
        for (const wolf of wolves) {
            const wasmId = this.wasmWolfMap.get(wolf.id);
            if (wasmId !== undefined) {
                this.syncWolfToWasm(wolf, wasmId);
            }
        }
    }

    /**
     * Sync all wolves from WASM to JS
     */
    syncAllFromWasm() {
        if (!this.wasmEngine || !this.wasmEngine.initialized) return;
        
        // Get entity positions from WASM
        const entities = this.wasmEngine.getEntityPositions();
        
        for (const entity of entities) {
            if (entity.type === 'wolf') {
                this.syncWolfFromWasm(entity.id, entity);
            }
        }
    }

    /**
     * Handle collision detected by WASM
     * @param {Wolf} wolf - Wolf that collided
     * @param {Object} other - Entity collided with
     */
    handleWasmCollision(wolf, other) {
        // Let the wolf AI handle the collision response
        if (other.type === 'player') {
            wolf.performAttack();
        } else if (other.type === 'projectile') {
            wolf.takeDamage(other.damage || 10);
        }
    }

    /**
     * Batch create wolves (more efficient for WASM)
     * @param {Array} positions - Array of {x, y} positions
     * @param {Object} config - Wolf configuration
     * @returns {Array} Created wolves
     */
    batchCreateWolves(positions, config = {}) {
        const wolves = [];
        
        // Prepare batch data for WASM
        const batchSize = positions.length;
        const batchBuffer = new Float32Array(batchSize * 2);
        
        for (let i = 0; i < batchSize; i++) {
            batchBuffer[i * 2] = positions[i].x;
            batchBuffer[i * 2 + 1] = positions[i].y;
        }
        
        // Create wolves in JS
        for (const pos of positions) {
            const wolf = this.wolfManager.createWolf(pos.x, pos.y, config);
            wolves.push(wolf);
        }
        
        // Batch create in WASM if available
        if (this.wasmEngine && this.wasmEngine.batchCreateWolves) {
            const wasmIds = this.wasmEngine.batchCreateWolves(batchBuffer);
            
            // Map IDs
            for (let i = 0; i < wolves.length && i < wasmIds.length; i++) {
                this.wasmWolfMap.set(wolves[i].id, wasmIds[i]);
                this.jsWolfMap.set(wasmIds[i], wolves[i]);
            }
        }
        
        return wolves;
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance statistics
     */
    getPerformanceMetrics() {
        const metrics = {
            jsWolves: this.wolfManager.getLivingWolves().length,
            wasmEntities: this.wasmWolfMap.size,
            syncedWolves: this.jsWolfMap.size,
            lastSyncTime: this.lastSyncTime,
            syncInterval: this.syncInterval
        };
        
        // Add WASM metrics if available
        if (this.wasmEngine && this.wasmEngine.getPerformanceMetrics) {
            const wasmMetrics = this.wasmEngine.getPerformanceMetrics();
            metrics.wasmUpdateTime = wasmMetrics.updateTime;
            metrics.wasmCollisionChecks = wasmMetrics.collisionChecks;
        }
        
        return metrics;
    }

    /**
     * Optimize sync rate based on performance
     * @param {number} targetFPS - Target frames per second
     */
    optimizeSyncRate(targetFPS = 60) {
        const targetFrameTime = 1000 / targetFPS;
        const metrics = this.getPerformanceMetrics();
        
        if (metrics.wasmUpdateTime > targetFrameTime * 0.5) {
            // WASM is taking too long, reduce sync frequency
            this.syncInterval = Math.min(33, this.syncInterval * 1.1);
        } else if (metrics.wasmUpdateTime < targetFrameTime * 0.2) {
            // WASM has headroom, increase sync frequency
            this.syncInterval = Math.max(8, this.syncInterval * 0.9);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clear all wolves from WASM
        for (const [wolfId, wasmId] of this.wasmWolfMap) {
            if (this.wasmEngine) {
                this.wasmEngine.removeEntity(wasmId);
            }
        }
        
        // Clear maps
        this.wasmWolfMap.clear();
        this.jsWolfMap.clear();
        
        // Clear buffer
        this.syncBuffer = null;
        this.syncView = null;
    }
}

/**
 * Factory function to create WASM-compatible wolf system
 * @param {Object} gameState - Game state
 * @param {Object} wasmEngine - WASM engine instance
 * @returns {Object} Wolf system with WASM adapter
 */
export function createWasmWolfSystem(gameState, wasmEngine) {
    // Create wolf manager
    const wolfManager = new WolfManager(gameState);
    wolfManager.initialize();
    
    // Create WASM adapter
    const adapter = new WolfWasmAdapter(wolfManager, wasmEngine);
    adapter.initialize();
    
    // Return combined system
    return {
        manager: wolfManager,
        adapter: adapter,
        
        // Proxy methods that use adapter when available
        spawnWolves(config) {
            if (adapter && wasmEngine) {
                const positions = wolfManager.generateSpawnPoints(
                    config.count,
                    config.position
                );
                return adapter.batchCreateWolves(positions, config);
            } else {
                return wolfManager.spawnWolves(config);
            }
        },
        
        update(deltaTime) {
            if (adapter && wasmEngine) {
                adapter.update(deltaTime);
            } else {
                wolfManager.update(deltaTime);
            }
        },
        
        render(ctx) {
            wolfManager.render(ctx);
        },
        
        getPerformanceMetrics() {
            return adapter ? adapter.getPerformanceMetrics() : {};
        },
        
        destroy() {
            if (adapter) {
                adapter.destroy();
            }
            wolfManager.clearAllWolves();
        }
    };
}