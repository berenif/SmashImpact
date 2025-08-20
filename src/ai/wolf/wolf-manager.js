/**
 * Wolf AI Manager Module
 * @module wolf/wolf-manager
 * 
 * Manages wolf spawning, lifecycle, and coordination
 */

import { Wolf } from './wolf.js';
import { PackCoordinator } from './pack-coordinator.js';
import { WOLF_CONFIG } from './config.js';

/**
 * Wolf spawn configuration
 * @typedef {Object} WolfSpawnConfig
 * @property {number} waveNumber - Current wave number
 * @property {number} count - Number of wolves to spawn
 * @property {Object} position - Spawn position {x, y}
 * @property {number} difficulty - Difficulty multiplier
 */

/**
 * Manages all wolf entities in the game
 * @class
 */
export class WolfManager {
    /**
     * @param {Object} gameState - Game state reference
     */
    constructor(gameState) {
        this.gameState = gameState;
        this.wolves = new Map();
        this.packCoordinator = new PackCoordinator();
        this.wolfIdCounter = 0;
        this.statistics = {
            totalSpawned: 0,
            totalKilled: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0
        };
    }

    /**
     * Initialize wolf manager
     */
    initialize() {
        console.log('Wolf Manager initialized');
        
        // Set up event listeners if event bus exists
        if (this.gameState.eventBus) {
            this.gameState.eventBus.on('wave_start', this.onWaveStart.bind(this));
            this.gameState.eventBus.on('wave_end', this.onWaveEnd.bind(this));
            this.gameState.eventBus.on('player_death', this.onPlayerDeath.bind(this));
        }
    }

    /**
     * Spawn wolves for a wave
     * @param {WolfSpawnConfig} config - Spawn configuration
     * @returns {Array} Array of spawned wolves
     */
    spawnWolves(config) {
        const wolves = [];
        const spawnPoints = this.generateSpawnPoints(config.count, config.position);
        
        for (let i = 0; i < config.count; i++) {
            const wolf = this.createWolf(
                spawnPoints[i].x,
                spawnPoints[i].y,
                config
            );
            
            wolves.push(wolf);
            this.wolves.set(wolf.id, wolf);
            this.statistics.totalSpawned++;
        }
        
        // Create pack if multiple wolves
        if (wolves.length > 1) {
            const packId = this.packCoordinator.createPack(wolves);
            console.log(`Created wolf pack ${packId} with ${wolves.length} members`);
        }
        
        return wolves;
    }

    /**
     * Create a single wolf
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} config - Configuration
     * @returns {Wolf} New wolf instance
     */
    createWolf(x, y, config = {}) {
        const id = `wolf_${this.wolfIdCounter++}`;
        const wolf = new Wolf(x, y, id, this.gameState);
        
        // Apply difficulty scaling
        if (config.difficulty) {
            wolf.maxHealth *= config.difficulty;
            wolf.health = wolf.maxHealth;
            wolf.damage *= Math.sqrt(config.difficulty);
            wolf.aggression = Math.min(1, wolf.aggression + config.difficulty * 0.1);
        }
        
        // Apply wave-specific modifications
        if (config.waveNumber) {
            const waveBonus = Math.pow(1.1, config.waveNumber - 1);
            wolf.maxHealth *= waveBonus;
            wolf.health = wolf.maxHealth;
            wolf.damage *= Math.sqrt(waveBonus);
        }
        
        return wolf;
    }

    /**
     * Generate spawn points for wolves
     * @param {number} count - Number of spawn points
     * @param {Object} centerPosition - Center position for spawning
     * @returns {Array} Array of spawn positions
     */
    generateSpawnPoints(count, centerPosition = null) {
        const points = [];
        const center = centerPosition || this.getMapCenter();
        
        if (count === 1) {
            points.push(center);
        } else {
            // Arrange in circle around center
            const radius = Math.min(10, 3 + count);
            const angleStep = (Math.PI * 2) / count;
            
            for (let i = 0; i < count; i++) {
                const angle = angleStep * i;
                const offset = (Math.random() - 0.5) * angleStep * 0.3; // Add randomness
                
                points.push({
                    x: center.x + Math.cos(angle + offset) * radius,
                    y: center.y + Math.sin(angle + offset) * radius
                });
            }
        }
        
        // Validate spawn points
        return points.map(point => this.validateSpawnPoint(point));
    }

    /**
     * Validate and adjust spawn point if needed
     * @param {Object} point - Spawn point to validate
     * @returns {Object} Valid spawn point
     */
    validateSpawnPoint(point) {
        // Check if point is walkable
        if (this.gameState.isWalkable && !this.gameState.isWalkable(point.x, point.y)) {
            // Find nearest walkable position
            for (let radius = 1; radius < 10; radius++) {
                for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                    const testX = point.x + Math.cos(angle) * radius;
                    const testY = point.y + Math.sin(angle) * radius;
                    
                    if (this.gameState.isWalkable(testX, testY)) {
                        return { x: testX, y: testY };
                    }
                }
            }
        }
        
        return point;
    }

    /**
     * Get map center position
     * @returns {Object} Center position
     */
    getMapCenter() {
        return {
            x: (this.gameState.mapWidth || 800) / 2,
            y: (this.gameState.mapHeight || 600) / 2
        };
    }

    /**
     * Update all wolves
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        const players = this.gameState.players || [];
        const wolvesArray = Array.from(this.wolves.values());
        
        // Update each wolf
        for (const wolf of wolvesArray) {
            if (wolf.health > 0) {
                wolf.update(deltaTime, players, wolvesArray);
            } else {
                this.removeWolf(wolf.id);
            }
        }
        
        // Update pack coordination
        const packs = this.packCoordinator.getAllPacks();
        for (const pack of packs) {
            this.packCoordinator.updatePack(pack.id, deltaTime);
        }
    }

    /**
     * Render all wolves
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        for (const wolf of this.wolves.values()) {
            if (wolf.health > 0) {
                wolf.render(ctx);
            }
        }
    }

    /**
     * Remove a wolf
     * @param {string} wolfId - Wolf ID to remove
     */
    removeWolf(wolfId) {
        const wolf = this.wolves.get(wolfId);
        if (!wolf) return;
        
        this.wolves.delete(wolfId);
        this.statistics.totalKilled++;
        
        // Remove from game state arrays if present
        if (this.gameState.enemies) {
            const index = this.gameState.enemies.indexOf(wolf);
            if (index !== -1) {
                this.gameState.enemies.splice(index, 1);
            }
        }
        
        if (this.gameState.wolves) {
            const index = this.gameState.wolves.indexOf(wolf);
            if (index !== -1) {
                this.gameState.wolves.splice(index, 1);
            }
        }
    }

    /**
     * Get wolf by ID
     * @param {string} wolfId - Wolf ID
     * @returns {Wolf|null} Wolf instance or null
     */
    getWolf(wolfId) {
        return this.wolves.get(wolfId) || null;
    }

    /**
     * Get all wolves
     * @returns {Array} Array of all wolves
     */
    getAllWolves() {
        return Array.from(this.wolves.values());
    }

    /**
     * Get living wolves
     * @returns {Array} Array of living wolves
     */
    getLivingWolves() {
        return this.getAllWolves().filter(wolf => wolf.health > 0);
    }

    /**
     * Clear all wolves
     */
    clearAllWolves() {
        for (const wolf of this.wolves.values()) {
            this.removeWolf(wolf.id);
        }
        
        // Clear all packs
        const packs = this.packCoordinator.getAllPacks();
        for (const pack of packs) {
            this.packCoordinator.disbandPack(pack.id);
        }
    }

    /**
     * Handle wave start event
     * @param {Object} event - Wave start event
     */
    onWaveStart(event) {
        const waveNumber = event.waveNumber || 1;
        
        // Calculate wolf count based on wave
        const baseCount = 2;
        const waveMultiplier = Math.floor((waveNumber - 1) / 3);
        const wolfCount = Math.min(
            baseCount + waveMultiplier,
            WOLF_CONFIG.pack.MAX_PACK_SIZE
        );
        
        // Only spawn wolves after wave 2
        if (waveNumber > 2) {
            this.spawnWolves({
                waveNumber: waveNumber,
                count: wolfCount,
                position: null,
                difficulty: 1 + (waveNumber - 3) * 0.2
            });
        }
    }

    /**
     * Handle wave end event
     * @param {Object} event - Wave end event
     */
    onWaveEnd(event) {
        // Reset recent kills counter for wolves
        for (const wolf of this.wolves.values()) {
            wolf.recentKills = 0;
        }
    }

    /**
     * Handle player death event
     * @param {Object} event - Player death event
     */
    onPlayerDeath(event) {
        // Wolves might change behavior when player dies
        for (const wolf of this.wolves.values()) {
            if (wolf.target === event.player) {
                wolf.target = null;
                wolf.kills++;
                wolf.recentKills++;
            }
        }
    }

    /**
     * Get manager statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        return {
            ...this.statistics,
            currentWolves: this.wolves.size,
            livingWolves: this.getLivingWolves().length,
            packs: this.packCoordinator.getAllPacks().length
        };
    }

    /**
     * Spawn wolf pack at specific location
     * @param {Object} position - Spawn position
     * @param {number} count - Number of wolves
     * @param {Object} options - Additional options
     * @returns {string} Pack ID
     */
    spawnPack(position, count = 3, options = {}) {
        const wolves = this.spawnWolves({
            count: count,
            position: position,
            difficulty: options.difficulty || 1,
            waveNumber: options.waveNumber || 1
        });
        
        if (wolves && wolves && wolves && wolves.length > 0) {
            const packId = this.packCoordinator.createPack(wolves);
            
            // Set pack target if provided
            if (options.target) {
                const pack = this.packCoordinator.getPack(packId);
                if (pack) {
                    pack.target = options.target;
                }
            }
            
            return packId;
        }
        
        return null;
    }

    /**
     * Make wolves more aggressive
     * @param {number} amount - Aggression increase (0-1)
     */
    increaseAggression(amount = 0.1) {
        for (const wolf of this.wolves.values()) {
            wolf.aggression = Math.min(1, wolf.aggression + amount);
        }
    }

    /**
     * Trigger coordinated howl
     */
    triggerCoordinatedHowl() {
        const packs = this.packCoordinator.getAllPacks();
        
        if (packs && packs && packs && packs.length > 0) {
            // Random pack starts howling
            const pack = packs[Math.floor(Math.random() * packs.length)];
            this.packCoordinator.triggerHowl(pack);
        } else {
            // Individual wolves howl
            const wolves = this.getLivingWolves();
            if (wolves && wolves && wolves && wolves.length > 0) {
                const wolf = wolves[Math.floor(Math.random() * wolves.length)];
                wolf.performHowl();
            }
        }
    }

    /**
     * Set all wolves to target specific entity
     * @param {Object} target - Target entity
     */
    setGlobalTarget(target) {
        for (const wolf of this.wolves.values()) {
            wolf.target = target;
            wolf.alertLevel = 1;
        }
        
        // Update pack targets
        const packs = this.packCoordinator.getAllPacks();
        for (const pack of packs) {
            pack.target = target;
        }
    }

    /**
     * Debug: Show wolf paths
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    debugRenderPaths(ctx) {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 1;
        
        for (const wolf of this.wolves.values()) {
            if (wolf.currentPath && wolf.currentPath && currentPath && currentPath && currentPath.length > 0) {
                ctx.beginPath();
                ctx.moveTo(wolf.x, wolf.y);
                
                for (const point of wolf.currentPath) {
                    ctx.lineTo(point.x, point.y);
                }
                
                ctx.stroke();
            }
        }
    }
}