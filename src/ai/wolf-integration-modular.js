/**
 * Wolf AI Integration Module (Modular Version)
 * 
 * This file integrates the modular Wolf AI system into the game
 */

import { WolfManager } from './wolf/wolf-manager.js';
import { WOLF_CONFIG } from './wolf/config.js';

/**
 * Wolf AI Integration class
 * @class
 */
export class WolfAIIntegration {
    /**
     * @param {Object} gameState - Game state reference
     */
    constructor(gameState) {
        this.gameState = gameState;
        this.wolfManager = null;
        this.initialized = false;
    }

    /**
     * Initialize Wolf AI Integration
     * @returns {boolean} Success status
     */
    initialize() {
        try {
            // Create wolf manager
            this.wolfManager = new WolfManager(this.gameState);
            this.wolfManager.initialize();
            
            // Add wolves array to game state if not present
            if (!this.gameState.wolves) {
                this.gameState.wolves = [];
            }
            
            // Hook into game systems
            this.setupGameHooks();
            
            this.initialized = true;
            console.log('Wolf AI integration (modular) initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Wolf AI integration:', error);
            return false;
        }
    }

    /**
     * Setup hooks into game systems
     */
    setupGameHooks() {
        // Hook into wave manager if present
        if (this.gameState.waveManager) {
            this.hookWaveManager();
        }
        
        // Hook into update loop
        this.hookUpdateLoop();
        
        // Hook into render loop if needed
        this.hookRenderLoop();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    /**
     * Hook into wave manager
     */
    hookWaveManager() {
        const waveManager = this.gameState.waveManager;
        const originalStartWave = waveManager.startWave;
        
        waveManager.startWave = (waveNumber) => {
            // Call original
            if (originalStartWave) {
                originalStartWave.call(waveManager, waveNumber);
            }
            
            // Spawn wolves for wave
            this.spawnWolvesForWave(waveNumber);
        };
    }

    /**
     * Hook into game update loop
     */
    hookUpdateLoop() {
        // Store original update function
        const originalUpdate = window.updateGame || (() => {});
        
        // Replace with wrapped version
        window.updateGame = (deltaTime) => {
            // Call original
            originalUpdate(deltaTime);
            
            // Update wolves
            if (this.wolfManager) {
                this.updateWolves(deltaTime);
            }
        };
    }

    /**
     * Hook into render loop
     */
    hookRenderLoop() {
        // Store original render function
        const originalRender = window.renderGame || (() => {});
        
        // Replace with wrapped version
        window.renderGame = (ctx) => {
            // Call original
            originalRender(ctx);
            
            // Render wolves
            if (this.wolfManager && ctx) {
                this.wolfManager.render(ctx);
                
                // Debug rendering if enabled
                if (this.gameState.debug) {
                    this.wolfManager.debugRenderPaths(ctx);
                }
            }
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for game events if event bus exists
        if (this.gameState.eventBus) {
            this.gameState.eventBus.on('player_damaged', this.onPlayerDamaged.bind(this));
            this.gameState.eventBus.on('enemy_killed', this.onEnemyKilled.bind(this));
            this.gameState.eventBus.on('power_up_collected', this.onPowerUpCollected.bind(this));
        }
        
        // Keyboard events for testing
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', this.handleKeyPress.bind(this));
        }
    }

    /**
     * Spawn wolves for a specific wave
     * @param {number} waveNumber - Wave number
     */
    spawnWolvesForWave(waveNumber) {
        // Start spawning wolves from wave 3
        if (waveNumber < 3) return;
        
        // Calculate wolf count
        const baseCount = 2;
        const scaling = Math.floor((waveNumber - 3) / 2);
        const wolfCount = Math.min(
            baseCount + scaling,
            WOLF_CONFIG.pack.MAX_PACK_SIZE
        );
        
        // Spawn wolves
        const wolves = this.wolfManager.spawnWolves({
            waveNumber: waveNumber,
            count: wolfCount,
            position: this.getSpawnPosition(),
            difficulty: 1 + (waveNumber - 3) * 0.15
        });
        
        // Add to game state
        if (this.gameState.enemies) {
            this.gameState.enemies.push(...wolves);
        }
        
        if (this.gameState.wolves) {
            this.gameState.wolves.push(...wolves);
        }
        
        console.log(`Spawned ${wolfCount} wolves for wave ${waveNumber}`);
    }

    /**
     * Get spawn position for wolves
     * @returns {Object} Spawn position
     */
    getSpawnPosition() {
        // Try to spawn away from players
        if (this.gameState.players && this.gameState.players.length > 0) {
            const player = this.gameState.players[0];
            const angle = Math.random() * Math.PI * 2;
            const distance = 15 + Math.random() * 10;
            
            return {
                x: player.x + Math.cos(angle) * distance,
                y: player.y + Math.sin(angle) * distance
            };
        }
        
        // Default to map edges
        const side = Math.floor(Math.random() * 4);
        const mapWidth = this.gameState.mapWidth || 800;
        const mapHeight = this.gameState.mapHeight || 600;
        
        switch (side) {
            case 0: // Top
                return { x: Math.random() * mapWidth, y: 50 };
            case 1: // Right
                return { x: mapWidth - 50, y: Math.random() * mapHeight };
            case 2: // Bottom
                return { x: Math.random() * mapWidth, y: mapHeight - 50 };
            case 3: // Left
                return { x: 50, y: Math.random() * mapHeight };
        }
    }

    /**
     * Update wolves
     * @param {number} deltaTime - Time since last update
     */
    updateWolves(deltaTime) {
        if (!this.wolfManager) return;
        
        // Update wolf manager
        this.wolfManager.update(deltaTime);
        
        // Sync with game state
        this.syncGameState();
        
        // Check for collisions
        this.checkWolfCollisions();
    }

    /**
     * Sync wolves with game state
     */
    syncGameState() {
        // Update game state wolves array
        if (this.gameState.wolves) {
            this.gameState.wolves = this.wolfManager.getLivingWolves();
        }
        
        // Update enemies array if wolves are included
        if (this.gameState.enemies) {
            // Remove dead wolves
            this.gameState.enemies = this.gameState.enemies.filter(enemy => {
                if (enemy.id && enemy.id.startsWith('wolf_')) {
                    return enemy.health > 0;
                }
                return true;
            });
        }
    }

    /**
     * Check wolf collisions with players
     */
    checkWolfCollisions() {
        if (!this.gameState.players) return;
        
        const wolves = this.wolfManager.getLivingWolves();
        
        for (const wolf of wolves) {
            for (const player of this.gameState.players) {
                if (player.health <= 0) continue;
                
                const dx = player.x - wolf.x;
                const dy = player.y - wolf.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < WOLF_CONFIG.detection.ATTACK_RANGE) {
                    // Wolf can attack
                    wolf.performAttack();
                }
            }
        }
    }

    /**
     * Handle player damaged event
     * @param {Object} event - Event data
     */
    onPlayerDamaged(event) {
        // Make nearby wolves more aggressive
        const wolves = this.wolfManager.getLivingWolves();
        const damagedPlayer = event.player;
        
        for (const wolf of wolves) {
            const dx = damagedPlayer.x - wolf.x;
            const dy = damagedPlayer.y - wolf.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < WOLF_CONFIG.detection.COORDINATION_RANGE) {
                wolf.aggression = Math.min(1, wolf.aggression + 0.1);
                wolf.target = damagedPlayer;
            }
        }
    }

    /**
     * Handle enemy killed event
     * @param {Object} event - Event data
     */
    onEnemyKilled(event) {
        // Check if it was a wolf
        if (event.enemy && event.enemy.id && event.enemy.id.startsWith('wolf_')) {
            this.wolfManager.removeWolf(event.enemy.id);
        }
    }

    /**
     * Handle power-up collected event
     * @param {Object} event - Event data
     */
    onPowerUpCollected(event) {
        // Wolves might react to certain power-ups
        if (event.powerUp && event.powerUp.type === 'rage') {
            // Trigger coordinated howl
            this.wolfManager.triggerCoordinatedHowl();
        }
    }

    /**
     * Handle keyboard input for testing
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyPress(event) {
        if (!this.gameState.debug) return;
        
        switch (event.key) {
            case 'w':
                // Spawn test wolf pack
                this.spawnTestPack();
                break;
            case 'h':
                // Trigger howl
                this.wolfManager.triggerCoordinatedHowl();
                break;
            case 'a':
                // Increase aggression
                this.wolfManager.increaseAggression(0.2);
                console.log('Increased wolf aggression');
                break;
        }
    }

    /**
     * Spawn a test wolf pack
     */
    spawnTestPack() {
        const player = this.gameState.players?.[0];
        const position = player ? 
            { x: player.x + 10, y: player.y + 10 } : 
            { x: 400, y: 300 };
        
        const packId = this.wolfManager.spawnPack(position, 3, {
            difficulty: 1,
            target: player
        });
        
        console.log(`Spawned test pack: ${packId}`);
    }

    /**
     * Get integration statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        if (!this.wolfManager) {
            return { initialized: false };
        }
        
        return {
            initialized: this.initialized,
            ...this.wolfManager.getStatistics()
        };
    }

    /**
     * Clean up integration
     */
    cleanup() {
        if (this.wolfManager) {
            this.wolfManager.clearAllWolves();
        }
        
        // Remove event listeners
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.handleKeyPress);
        }
        
        this.initialized = false;
        console.log('Wolf AI integration cleaned up');
    }
}

/**
 * Quick setup function for backward compatibility
 * @param {Object} gameState - Game state
 * @returns {WolfAIIntegration} Integration instance
 */
export function initWolfIntegration(gameState) {
    const integration = new WolfAIIntegration(gameState);
    integration.initialize();
    
    // Store reference in game state
    gameState.wolfIntegration = integration;
    
    return integration;
}

// Export for global access if needed
if (typeof window !== 'undefined') {
    window.WolfAIIntegration = WolfAIIntegration;
    window.initWolfIntegration = initWolfIntegration;
}