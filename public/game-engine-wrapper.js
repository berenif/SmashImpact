/**
 * Game Engine Wrapper
 * Provides a high-level interface for the WASM game engine
 */

import { wasmLoader } from './wasm-loader.js';

export class GameEngineWrapper {
    constructor() {
        this.engine = null;
        this.module = null;
        this.entities = [];
        this.player = null;
        this.config = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
    
    /**
     * Initialize the game engine
     * @param {Object} config - Configuration options
     */
    async initialize(config = {}) {
        this.config = { ...this.config, ...config };
        
        // Initialize WASM loader
        this.engine = await wasmLoader.initialize({
            width: this.config.width,
            height: this.config.height,
            onRuntimeInitialized: config.onRuntimeInitialized
        });
        
        this.module = wasmLoader.getModule();
        
        return this.engine;
    }
    
    /**
     * Create a player entity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @returns {Object} Player entity
     */
    createPlayer(x, y) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        if (this.engine.createPlayer) {
            this.player = this.engine.createPlayer(x, y);
        } else {
            // Fallback to generic entity creation
            const playerId = this.engine.addEntity(x, y, 20, 100, 50, 'player');
            this.player = { id: playerId, x, y, health: 100, energy: 100 };
        }
        
        return this.player;
    }
    
    /**
     * Create an enemy entity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} health - Enemy health
     * @returns {number} Entity ID
     */
    createEnemy(x, y, health = 100) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        if (this.engine.createEnemy) {
            return this.engine.createEnemy(x, y, health);
        } else {
            return this.engine.addEntity(x, y, 15, health, 30, 'enemy');
        }
    }
    
    /**
     * Create a wolf entity
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {boolean} isAlpha - Whether it's an alpha wolf
     * @returns {number} Entity ID
     */
    createWolf(x, y, isAlpha = false) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        if (this.engine.createWolf) {
            return this.engine.createWolf(x, y, isAlpha);
        } else {
            const health = isAlpha ? 200 : 150;
            const speed = isAlpha ? 60 : 45;
            return this.engine.addEntity(x, y, 18, health, speed, 'wolf');
        }
    }
    
    /**
     * Create an obstacle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Obstacle radius
     * @param {boolean} destructible - Whether the obstacle can be destroyed
     * @returns {number} Entity ID
     */
    createObstacle(x, y, radius, destructible = false) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        if (this.engine.createObstacle) {
            return this.engine.createObstacle(x, y, radius, destructible);
        } else {
            return this.engine.addEntity(x, y, radius, destructible ? 50 : 999999, 0, 'obstacle');
        }
    }
    
    /**
     * Create a power-up
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} type - Power-up type
     * @returns {number} Entity ID
     */
    createPowerUp(x, y, type) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        if (this.engine.createPowerUp) {
            return this.engine.createPowerUp(x, y, type);
        } else {
            return this.engine.addEntity(x, y, 10, 1, 0, 'powerup');
        }
    }
    
    /**
     * Update the game state
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.engine) throw new Error('Engine not initialized');
        
        this.engine.update(deltaTime);
        
        // Check collisions if available
        if (this.engine.checkCollisions) {
            this.engine.checkCollisions();
        }
    }
    
    /**
     * Get all entities
     * @returns {Array} Array of entities
     */
    getAllEntities() {
        if (!this.engine) return [];
        
        if (this.engine.getAllEntities) {
            return this.engine.getAllEntities();
        }
        
        // Fallback: try to get entities from game state
        const state = this.getGameState();
        return state.entities || [];
    }
    
    /**
     * Get the current game state
     * @returns {Object} Game state
     */
    getGameState() {
        if (!this.engine) return { entities: [], score: 0 };
        
        if (this.engine.getGameState) {
            return this.engine.getGameState();
        }
        
        return { entities: [], score: 0 };
    }
    
    /**
     * Get player state
     * @returns {Object} Player state
     */
    getPlayerState() {
        if (!this.engine) return null;
        
        if (this.engine.getPlayerState) {
            return this.engine.getPlayerState();
        }
        
        return this.player;
    }
    
    /**
     * Update player input
     * @param {number} dx - X direction (-1, 0, 1)
     * @param {number} dy - Y direction (-1, 0, 1)
     * @param {number} aimX - Aim X position
     * @param {number} aimY - Aim Y position
     */
    updatePlayerInput(dx, dy, aimX, aimY) {
        if (!this.engine) return;
        
        if (this.engine.updatePlayerInput) {
            this.engine.updatePlayerInput(dx, dy, aimX, aimY);
        } else if (this.engine.setPlayerVelocity) {
            this.engine.setPlayerVelocity(dx * 200, dy * 200);
        }
    }
    
    /**
     * Player shoot action
     */
    playerShoot() {
        if (!this.engine) return;
        
        if (this.engine.playerShoot) {
            this.engine.playerShoot();
        } else if (this.engine.playerAttack) {
            this.engine.playerAttack();
        }
    }
    
    /**
     * Player boost action
     */
    playerBoost() {
        if (!this.engine) return;
        
        if (this.engine.playerBoost) {
            this.engine.playerBoost();
        }
    }
    
    /**
     * Player special ability
     */
    playerSpecialAbility() {
        if (!this.engine) return;
        
        if (this.engine.playerSpecialAbility) {
            this.engine.playerSpecialAbility();
        }
    }
    
    /**
     * Player attack action
     */
    playerAttack() {
        if (!this.engine) return;
        
        if (this.engine.playerAttack) {
            this.engine.playerAttack();
        } else {
            this.playerShoot();
        }
    }
    
    /**
     * Start blocking
     * @param {number} playerId - Player ID
     */
    startBlock(playerId) {
        if (!this.engine) return;
        
        if (this.engine.startBlock) {
            this.engine.startBlock(playerId);
        }
    }
    
    /**
     * End blocking
     * @param {number} playerId - Player ID
     */
    endBlock(playerId) {
        if (!this.engine) return;
        
        if (this.engine.endBlock) {
            this.engine.endBlock(playerId);
        }
    }
    
    /**
     * Player roll/dodge action
     * @param {number} dirX - X direction
     * @param {number} dirY - Y direction
     */
    playerRoll(dirX, dirY) {
        if (!this.engine) return;
        
        if (this.engine.playerRoll) {
            this.engine.playerRoll(dirX, dirY);
        } else if (this.engine.playerDodge) {
            this.engine.playerDodge(dirX, dirY);
        }
    }
    
    /**
     * Clear all entities
     */
    clearEntities() {
        if (!this.engine) return;
        
        if (this.engine.clearEntities) {
            this.engine.clearEntities();
        } else if (this.engine.reset) {
            this.engine.reset();
        }
        
        this.entities = [];
        this.player = null;
    }
    
    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        if (!this.engine) return { fps: 0, entities: 0, updateTime: 0 };
        
        if (this.engine.getPerformanceMetrics) {
            return this.engine.getPerformanceMetrics();
        }
        
        return {
            fps: 0,
            entities: this.getAllEntities().length,
            updateTime: 0
        };
    }
    
    /**
     * Set joystick input for mobile controls
     * @param {number} x - X input (-1 to 1)
     * @param {number} y - Y input (-1 to 1)
     */
    setJoystickInput(x, y) {
        if (!this.engine) return;
        
        if (this.engine.setJoystickInput) {
            this.engine.setJoystickInput(x, y);
        } else {
            this.updatePlayerInput(x, y, 0, 0);
        }
    }
    
    /**
     * Cleanup and destroy the engine
     */
    cleanup() {
        if (this.engine && this.engine.cleanup) {
            this.engine.cleanup();
        }
        
        wasmLoader.cleanup();
        
        this.engine = null;
        this.module = null;
        this.entities = [];
        this.player = null;
    }
}

// Export singleton instance
export const gameEngine = new GameEngineWrapper();