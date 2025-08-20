/**
 * Game Core Module
 * Main game controller that coordinates all modules
 */

import WASMLoader from './wasm-loader.js';
import InputHandler from './input-handler.js';
import Renderer from './renderer.js';
import GameLoop from './game-loop.js';
import UIManager from './ui-manager.js';

export class Game {
    constructor() {
        // Core components
        this.wasmLoader = new WASMLoader();
        this.engine = null;
        this.canvas = null;
        this.minimap = null;
        
        // Game modules
        this.inputHandler = null;
        this.renderer = null;
        this.gameLoop = null;
        this.uiManager = null;
        
        // Game state
        this.running = false;
        this.paused = false;
        this.mode = null;
        this.player = null;
        this.currentWave = 0;
        this.currentLevel = 0;
        
        // Stats
        this.stats = {
            score: 0,
            enemiesDefeated: 0,
            wave: 0,
            playTime: 0
        };
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    /**
     * Initialize the game
     */
    async initialize() {
        try {
            // Initialize UI animations
            UIManager.initializeAnimations();
            
            // Create UI manager
            this.uiManager = new UIManager(this);
            
            // Show loading screen
            this.uiManager.showLoading();
            
            // Initialize WASM
            const success = await this.wasmLoader.initialize();
            
            if (!success) {
                throw new Error('Failed to initialize WASM module');
            }
            
            this.engine = this.wasmLoader.getEngine();
            
            // Setup canvas
            this.canvas = document.getElementById('gameCanvas');
            this.minimap = document.getElementById('minimap');
            
            if (!this.canvas) {
                throw new Error('Game canvas not found');
            }
            
            // Initialize modules
            this.inputHandler = new InputHandler(this);
            this.renderer = new Renderer(this.canvas, this.minimap);
            this.gameLoop = new GameLoop(this);
            
            // Hide loading and show main menu
            this.uiManager.hideLoading();
            this.uiManager.showMainMenu();
            
            console.log('Game initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.uiManager.showNotification('Failed to initialize game: ' + error.message, 'error');
        }
    }

    /**
     * Start the game with specified mode
     */
    start(mode) {
        if (!this.engine) {
            console.error('Game engine not initialized');
            return;
        }
        
        this.mode = mode;
        this.running = true;
        this.paused = false;
        
        // Reset stats
        this.stats = {
            score: 0,
            enemiesDefeated: 0,
            wave: 0,
            playTime: 0
        };
        
        // Hide menu and show game UI
        this.uiManager.hideMainMenu();
        this.uiManager.showGameUI();
        
        // Initialize game based on mode
        this.initializeGameMode();
        
        // Start game loop
        this.gameLoop.start();
        
        // Show mode notification
        this.uiManager.showNotification(`${mode.toUpperCase()} MODE`, 'info', 2000);
    }

    /**
     * Initialize game mode
     */
    initializeGameMode() {
        // Clear existing entities
        this.engine.clearEntities();
        
        // Create player
        this.player = this.engine.createPlayer(
            this.canvas.width / 2,
            this.canvas.height / 2
        );
        
        // Initialize based on mode
        switch(this.mode) {
            case 'survival':
                this.currentWave = 1;
                this.gameLoop.spawnWave(1);
                break;
                
            case 'campaign':
                this.currentLevel = 1;
                this.gameLoop.loadLevel(1);
                break;
                
            case 'sandbox':
                // Sandbox mode - spawn some test entities
                for (let i = 0; i < 5; i++) {
                    const x = Math.random() * this.canvas.width;
                    const y = Math.random() * this.canvas.height;
                    this.engine.createEnemy(x, y, 0);
                }
                // Add some obstacles
                this.engine.generateObstacles(10);
                break;
                
            case 'multiplayer':
                this.uiManager.showNotification('Multiplayer coming soon!', 'info');
                // TODO: Implement multiplayer
                break;
        }
    }

    /**
     * Pause the game
     */
    pause() {
        if (!this.running || this.paused) return;
        
        this.paused = true;
        this.engine.pauseGame();
        this.uiManager.showPauseMenu();
    }

    /**
     * Resume the game
     */
    resume() {
        if (!this.running || !this.paused) return;
        
        this.paused = false;
        this.engine.resumeGame();
        this.uiManager.hidePauseMenu();
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        if (this.paused) {
            this.resume();
        } else {
            this.pause();
        }
    }

    /**
     * Restart the game
     */
    restart() {
        this.uiManager.hideGameOver();
        this.uiManager.hidePauseMenu();
        
        if (this.mode) {
            this.start(this.mode);
        }
    }

    /**
     * Quit to main menu
     */
    quit() {
        this.running = false;
        this.paused = false;
        this.mode = null;
        
        // Stop game loop
        this.gameLoop.stop();
        
        // Clear entities
        if (this.engine) {
            this.engine.clearEntities();
        }
        
        // Reset input
        this.inputHandler.reset();
        
        // Hide all UI and show main menu
        this.uiManager.hideGameUI();
        this.uiManager.hidePauseMenu();
        this.uiManager.hideGameOver();
        this.uiManager.showMainMenu();
    }

    /**
     * Handle game over
     */
    gameOver() {
        this.running = false;
        
        // Stop game loop
        this.gameLoop.stop();
        
        // Show game over screen
        this.uiManager.showGameOver(this.stats.score, {
            wave: this.currentWave,
            enemiesDefeated: this.stats.enemiesDefeated
        });
    }

    /**
     * Show settings menu
     */
    showSettings() {
        this.uiManager.showNotification('Settings menu coming soon!', 'info');
        // TODO: Implement settings menu
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.running = false;
        
        if (this.gameLoop) {
            this.gameLoop.stop();
        }
        
        if (this.wasmLoader) {
            this.wasmLoader.cleanup();
        }
        
        this.uiManager.clearNotifications();
    }
}

// Create and export global game instance
const gameInstance = new Game();

// Expose to window for HTML onclick handlers
if (typeof window !== 'undefined') {
    window.Game = gameInstance;
}

export default gameInstance;