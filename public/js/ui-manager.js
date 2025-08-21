/**
 * UI Manager Module
 * Handles all UI updates and interactions
 */

export class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = this.cacheElements();
    }
    
    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        return {
            // Loading screen
            loadingScreen: document.getElementById('loadingScreen'),
            loadingBar: document.getElementById('loadingBar'),
            loadingText: document.querySelector('.loading-text'),
            
            // Main menu
            mainMenu: document.getElementById('mainMenu'),
            
            // Game UI
            gameUI: document.getElementById('gameUI'),
            healthBar: document.getElementById('healthBar'),
            energyBar: document.getElementById('energyBar'),
            waveNum: document.getElementById('waveNum'),
            enemyCount: document.getElementById('enemyCount'),
            score: document.getElementById('score'),
            
            // Pause menu
            pauseMenu: document.getElementById('pauseMenu'),
            
            // Performance stats
            performanceStats: document.getElementById('performanceStats'),
            fps: document.getElementById('fps'),
            ms: document.getElementById('ms'),
            wasmMs: document.getElementById('wasmMs'),
            entities: document.getElementById('entities'),
            
            // Mobile controls
            mobileControls: document.getElementById('mobileControls')
        };
    }
    
    /**
     * Update loading progress
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} text - Loading text to display
     */
    updateLoading(progress, text) {
        if (this.elements.loadingBar) {
            this.elements.loadingBar.style.width = progress + '%';
        }
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoading() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 500);
        }
    }
    
    /**
     * Show main menu
     */
    showMainMenu() {
        if (this.elements.mainMenu) {
            this.elements.mainMenu.style.display = 'flex';
        }
    }
    
    /**
     * Hide main menu
     */
    hideMainMenu() {
        if (this.elements.mainMenu) {
            this.elements.mainMenu.style.display = 'none';
        }
    }
    
    /**
     * Show game UI
     */
    showGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'block';
        }
    }
    
    /**
     * Hide game UI
     */
    hideGameUI() {
        if (this.elements.gameUI) {
            this.elements.gameUI.style.display = 'none';
        }
    }
    
    /**
     * Toggle pause menu
     * @param {boolean} show - Whether to show or hide
     */
    togglePauseMenu(show) {
        if (this.elements.pauseMenu) {
            this.elements.pauseMenu.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * Hide pause menu
     */
    hidePauseMenu() {
        this.togglePauseMenu(false);
    }
    
    /**
     * Show performance stats
     */
    showPerformanceStats() {
        if (this.elements.performanceStats) {
            this.elements.performanceStats.style.display = 'block';
        }
    }
    
    /**
     * Hide performance stats
     */
    hidePerformanceStats() {
        if (this.elements.performanceStats) {
            this.elements.performanceStats.style.display = 'none';
        }
    }
    
    /**
     * Show mobile controls
     */
    showMobileControls() {
        if (this.elements.mobileControls) {
            this.elements.mobileControls.style.display = 'block';
        }
    }
    
    /**
     * Hide mobile controls
     */
    hideMobileControls() {
        if (this.elements.mobileControls) {
            this.elements.mobileControls.style.display = 'none';
        }
    }
    
    /**
     * Update HUD elements
     * @param {Object} state - Game state
     */
    updateHUD(state) {
        const player = state.getPlayerState();
        
        if (player) {
            // Update health bar
            if (this.elements.healthBar) {
                const healthPercent = Math.max(0, Math.min(100, player.health));
                this.elements.healthBar.style.width = healthPercent + '%';
            }
            
            // Update energy bar
            if (this.elements.energyBar) {
                const energyPercent = Math.max(0, Math.min(100, player.energy));
                this.elements.energyBar.style.width = energyPercent + '%';
            }
        }
        
        // Update score
        if (this.elements.score) {
            this.elements.score.textContent = state.score || 0;
        }
    }
    
    /**
     * Update performance statistics
     * @param {Object} stats - Performance statistics
     */
    updateStats(stats) {
        if (this.elements.fps) {
            this.elements.fps.textContent = stats.fps || 0;
        }
        
        if (this.elements.ms) {
            const ms = stats.fps > 0 ? (1000 / stats.fps).toFixed(1) : '0';
            this.elements.ms.textContent = ms;
        }
        
        if (this.elements.wasmMs) {
            this.elements.wasmMs.textContent = (stats.wasmTime || 0).toFixed(1);
        }
        
        if (this.elements.entities) {
            this.elements.entities.textContent = stats.entities || 0;
        }
    }
    
    /**
     * Show notification message
     * @param {string} message - Message to display
     * @param {string} type - Message type (info, success, warning, error)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            border-radius: 10px;
            font-size: 20px;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
    }
    
    /**
     * Update wave/level display
     * @param {string|number} value - Value to display
     */
    updateWaveDisplay(value) {
        if (this.elements.waveNum) {
            this.elements.waveNum.textContent = value;
        }
    }
    
    /**
     * Update enemy count display
     * @param {number} count - Enemy count
     */
    updateEnemyCount(count) {
        if (this.elements.enemyCount) {
            this.elements.enemyCount.textContent = count;
        }
    }
    
    /**
     * Create settings panel
     * @returns {HTMLElement} Settings panel element
     */
    createSettingsPanel() {
        const panel = document.createElement('div');
        panel.id = 'settingsPanel';
        panel.className = 'settings-panel';
        panel.innerHTML = `
            <h2>Settings</h2>
            <div class="settings-content">
                <div class="setting-group">
                    <label>Sound</label>
                    <input type="checkbox" id="soundEnabled" checked>
                </div>
                <div class="setting-group">
                    <label>Music</label>
                    <input type="checkbox" id="musicEnabled" checked>
                </div>
                <div class="setting-group">
                    <label>Sound Volume</label>
                    <input type="range" id="soundVolume" min="0" max="100" value="70">
                </div>
                <div class="setting-group">
                    <label>Music Volume</label>
                    <input type="range" id="musicVolume" min="0" max="100" value="50">
                </div>
                <div class="setting-group">
                    <label>Difficulty</label>
                    <select id="difficulty">
                        <option value="easy">Easy</option>
                        <option value="normal" selected>Normal</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Graphics</label>
                    <select id="graphics">
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high" selected>High</option>
                    </select>
                </div>
            </div>
            <div class="settings-buttons">
                <button onclick="Game.saveSettings()">Save</button>
                <button onclick="Game.closeSettings()">Close</button>
            </div>
        `;
        
        return panel;
    }
}