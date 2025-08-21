/**
 * Main Game Module
 * Entry point for the WASM game
 */

import { gameEngine } from '../game-engine-wrapper.js';
import { inputHandler } from '../input-handler.js';
import { renderer } from '../renderer.js';
import { GameState } from './game-state.js';
import { GameModes } from './game-modes.js';
import { MobileControls } from './mobile-controls.js';
import { UIManager } from './ui-manager.js';

class Game {
    constructor() {
        this.state = new GameState();
        this.modes = new GameModes(this);
        this.ui = new UIManager(this);
        this.mobileControls = null;
        this.animationId = null;
    }

    /**
     * Initialize the game
     */
    async initialize() {
        try {
            // Initialize canvas
            this.initCanvas();
            
            this.ui.updateLoading(10, 'Initializing modules...');
            
            // Initialize renderer
            renderer.initialize(this.state.canvas);
            
            this.ui.updateLoading(20, 'Setting up input handlers...');
            
            // Initialize input handler
            inputHandler.initialize(this.state.canvas);
            
            // Setup input callbacks
            this.setupInputCallbacks();
            
            this.ui.updateLoading(40, 'Loading WASM engine...');
            
            // Initialize game engine
            await gameEngine.initialize({
                width: this.state.canvas.width,
                height: this.state.canvas.height,
                onRuntimeInitialized: () => {
                    console.log('✅ WASM runtime initialized');
                }
            });
            
            this.state.engine = gameEngine;
            
            this.ui.updateLoading(80, 'Setting up mobile controls...');
            
            // Setup mobile controls if needed
            if (this.isMobile()) {
                this.mobileControls = new MobileControls(this);
                this.mobileControls.setup();
            }
            
            this.ui.updateLoading(100, 'Ready!');
            
            // Hide loading screen and show main menu
            setTimeout(() => {
                this.ui.hideLoading();
                this.ui.showMainMenu();
            }, 500);
            
            this.state.initialized = true;
            
        } catch (error) {
            console.error('Failed to initialize:', error);
            this.ui.updateLoading(0, 'Error: ' + error.message);
        }
    }

    /**
     * Initialize canvas
     */
    initCanvas() {
        this.state.canvas = document.getElementById('gameCanvas');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to window size
     */
    resizeCanvas() {
        this.state.canvas.width = window.innerWidth;
        this.state.canvas.height = window.innerHeight;
    }

    /**
     * Setup input callbacks
     */
    setupInputCallbacks() {
        // Pause on Escape
        inputHandler.on('keydown', ({ key }) => {
            if (key === 'escape' && this.state.running) {
                this.togglePause();
            }
        });
    }

    /**
     * Start the game
     * @param {string} mode - Game mode to start
     */
    start(mode) {
        if (!this.state.initialized) {
            console.error('Game not initialized');
            return;
        }
        
        this.state.mode = mode;
        this.state.running = true;
        this.state.paused = false;
        this.state.score = 0;
        this.state.wave = 1;
        
        this.ui.hideMainMenu();
        this.ui.showGameUI();
        
        if (this.isMobile()) {
            this.ui.showMobileControls();
        }
        
        // Show performance stats in debug mode
        if (window.location.hash === '#debug') {
            this.ui.showPerformanceStats();
        }
        
        this.initGame();
        this.startGameLoop();
    }

    /**
     * Initialize game based on mode
     */
    initGame() {
        if (!this.state.engine) {
            console.error('Game engine not available');
            return;
        }
        
        // Clear existing entities
        this.state.engine.clearEntities();
        
        // Initialize based on mode
        this.modes.initMode(this.state.mode);
    }

    /**
     * Start the game loop
     */
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (!this.state.running) {
                this.animationId = null;
                return;
            }
            
            // Calculate delta time
            const deltaTime = timestamp - this.state.stats.lastTime;
            this.state.stats.lastTime = timestamp;
            
            // Update performance stats
            this.updatePerformanceStats(timestamp);
            
            if (!this.state.paused) {
                // Update game
                const wasmStart = performance.now();
                this.update(deltaTime);
                this.state.stats.wasmTime = performance.now() - wasmStart;
                
                // Render
                this.render();
            }
            
            this.animationId = requestAnimationFrame(gameLoop);
        };
        
        this.animationId = requestAnimationFrame(gameLoop);
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats(timestamp) {
        this.state.stats.frames++;
        if (timestamp - this.state.stats.fpsTime >= 1000) {
            this.state.stats.fps = this.state.stats.frames;
            this.state.stats.frames = 0;
            this.state.stats.fpsTime = timestamp;
            this.ui.updateStats(this.state.stats);
        }
    }

    /**
     * Update game logic
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        if (!this.state.engine) return;
        
        // Handle input
        this.handleInput();
        
        // Update WASM engine
        this.state.engine.update(dt / 1000);
        
        // Get entity count
        const entities = this.state.engine.getAllEntities();
        this.state.stats.entities = entities.length;
        
        // Check mode-specific conditions
        this.modes.updateMode(this.state.mode, entities);
        
        // Update HUD
        this.ui.updateHUD(this.state);
    }

    /**
     * Handle input
     */
    handleInput() {
        if (!this.state.engine) return;
        
        // Get movement input
        const movement = inputHandler.getMovementInput();
        
        // Get aim direction
        const aim = inputHandler.getAimDirection(
            this.state.canvas.width / 2, 
            this.state.canvas.height / 2
        );
        
        // Update player input
        this.state.engine.updatePlayerInput(
            movement.x, 
            movement.y, 
            aim.x * 100, 
            aim.y * 100
        );
        
        // Handle actions
        if (inputHandler.isMouseDown()) {
            this.state.engine.playerShoot();
        }
        
        if (inputHandler.isKeyPressed(' ')) {
            this.state.engine.playerBoost();
        }
        
        if (inputHandler.isKeyPressed('q')) {
            this.state.engine.playerSpecialAbility();
        }
    }

    /**
     * Render the game
     */
    render() {
        const entities = this.state.engine.getAllEntities();
        const player = this.state.engine.getPlayerState();
        
        renderer.render({
            entities: entities,
            player: player,
            paused: this.state.paused,
            showMinimap: true
        });
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        this.state.paused = !this.state.paused;
        this.ui.togglePauseMenu(this.state.paused);
    }

    /**
     * Resume the game
     */
    resume() {
        this.state.paused = false;
        this.ui.hidePauseMenu();
    }

    /**
     * Restart the game
     */
    restart() {
        this.resume();
        this.initGame();
    }

    /**
     * Quit to main menu
     */
    quit() {
        this.state.running = false;
        this.state.paused = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.ui.hidePauseMenu();
        this.ui.hideGameUI();
        this.ui.hideMobileControls();
        this.ui.showMainMenu();
    }

    /**
     * Show settings
     */
    showSettings() {
        // TODO: Implement settings panel
        alert('Settings panel coming soon!');
    }

    /**
     * Check if running on mobile device
     * @returns {boolean}
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.state.engine) {
            this.state.engine.cleanup();
        }
        
        inputHandler.cleanup();
        renderer.cleanup();
        
        if (this.mobileControls) {
            this.mobileControls.cleanup();
        }
    }
}

// Create and export game instance
const game = new Game();

// Make game accessible globally for HTML event handlers
window.Game = {
    start: (mode) => game.start(mode),
    resume: () => game.resume(),
    restart: () => game.restart(),
    quit: () => game.quit(),
    showSettings: () => game.showSettings(),
    togglePause: () => game.togglePause()
};

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
    game.initialize();
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    game.cleanup();
});

export default game;