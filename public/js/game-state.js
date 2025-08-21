/**
 * Game State Module
 * Manages all game state and statistics
 */

export class GameState {
    constructor() {
        this.canvas = null;
        this.engine = null;
        this.running = false;
        this.paused = false;
        this.initialized = false;
        this.mode = 'survival';
        this.score = 0;
        this.wave = 1;
        this.level = 1;
        this.player = null;
        
        // Performance statistics
        this.stats = {
            fps: 0,
            frames: 0,
            lastTime: 0,
            fpsTime: 0,
            wasmTime: 0,
            entities: 0
        };
        
        // Game settings
        this.settings = {
            soundEnabled: true,
            musicEnabled: true,
            soundVolume: 0.7,
            musicVolume: 0.5,
            difficulty: 'normal',
            graphics: 'high'
        };
    }
    
    /**
     * Reset game state for new game
     */
    reset() {
        this.running = false;
        this.paused = false;
        this.score = 0;
        this.wave = 1;
        this.level = 1;
        this.player = null;
        
        // Reset stats
        this.stats.fps = 0;
        this.stats.frames = 0;
        this.stats.lastTime = 0;
        this.stats.fpsTime = 0;
        this.stats.wasmTime = 0;
        this.stats.entities = 0;
    }
    
    /**
     * Increment score
     * @param {number} points - Points to add
     */
    addScore(points) {
        this.score += points;
    }
    
    /**
     * Set player reference
     * @param {Object} player - Player object
     */
    setPlayer(player) {
        this.player = player;
    }
    
    /**
     * Get player state from engine
     * @returns {Object} Player state
     */
    getPlayerState() {
        if (this.engine) {
            return this.engine.getPlayerState();
        }
        return this.player;
    }
    
    /**
     * Increment wave number
     */
    nextWave() {
        this.wave++;
    }
    
    /**
     * Increment level number
     */
    nextLevel() {
        this.level++;
    }
    
    /**
     * Check if game is ready to start
     * @returns {boolean}
     */
    isReady() {
        return this.initialized && this.engine !== null;
    }
    
    /**
     * Update settings
     * @param {Object} newSettings - New settings to apply
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('gameSettings', JSON.stringify(this.settings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('gameSettings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.warn('Failed to load settings:', e);
        }
    }
    
    /**
     * Get current game mode
     * @returns {string}
     */
    getMode() {
        return this.mode;
    }
    
    /**
     * Set game mode
     * @param {string} mode - Game mode
     */
    setMode(mode) {
        this.mode = mode;
    }
    
    /**
     * Export state for saving
     * @returns {Object} Serializable state
     */
    exportState() {
        return {
            mode: this.mode,
            score: this.score,
            wave: this.wave,
            level: this.level,
            settings: this.settings
        };
    }
    
    /**
     * Import saved state
     * @param {Object} savedState - Previously saved state
     */
    importState(savedState) {
        if (savedState.mode) this.mode = savedState.mode;
        if (savedState.score) this.score = savedState.score;
        if (savedState.wave) this.wave = savedState.wave;
        if (savedState.level) this.level = savedState.level;
        if (savedState.settings) this.settings = { ...this.settings, ...savedState.settings };
    }
}