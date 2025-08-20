/**
 * UI Manager Module
 * Handles menus, HUD, and UI interactions
 */

export class UIManager {
    constructor(game) {
        this.game = game;
        this.notifications = [];
        this.setupMenuHandlers();
    }

    /**
     * Setup menu button handlers
     */
    setupMenuHandlers() {
        // Main menu buttons are handled through onclick in HTML
        // This sets up additional UI elements
        
        // Pause menu handlers
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            // These will be called from the Game class
        }
    }

    /**
     * Show loading screen
     */
    showLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            loadingScreen.style.opacity = '1';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Show main menu
     */
    showMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        const gameUI = document.getElementById('gameUI');
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (mainMenu) mainMenu.style.display = 'flex';
        if (gameUI) gameUI.style.display = 'none';
        if (pauseMenu) pauseMenu.style.display = 'none';
    }

    /**
     * Hide main menu
     */
    hideMainMenu() {
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            mainMenu.style.display = 'none';
        }
    }

    /**
     * Show game UI
     */
    showGameUI() {
        const gameUI = document.getElementById('gameUI');
        const mobileControls = document.getElementById('mobileControls');
        
        if (gameUI) {
            gameUI.style.display = 'block';
        }
        
        // Show mobile controls if on mobile device
        if (mobileControls && this.isMobile()) {
            mobileControls.style.display = 'block';
        }
    }

    /**
     * Hide game UI
     */
    hideGameUI() {
        const gameUI = document.getElementById('gameUI');
        const mobileControls = document.getElementById('mobileControls');
        
        if (gameUI) gameUI.style.display = 'none';
        if (mobileControls) mobileControls.style.display = 'none';
    }

    /**
     * Show pause menu
     */
    showPauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'block';
        }
    }

    /**
     * Hide pause menu
     */
    hidePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (pauseMenu) {
            pauseMenu.style.display = 'none';
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px 40px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 2000;
            animation: fadeIn 0.3s ease;
            backdrop-filter: blur(10px);
            border: 2px solid ${this.getNotificationColor(type)};
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
        
        // Track notification
        this.notifications.push(notification);
    }

    /**
     * Get notification color based on type
     */
    getNotificationColor(type) {
        switch(type) {
            case 'success': return '#6ab04c';
            case 'error': return '#ee5a24';
            case 'warning': return '#f9ca24';
            case 'info': return '#4834d4';
            default: return '#ffffff';
        }
    }

    /**
     * Show game over screen
     */
    showGameOver(score, stats) {
        // Create game over overlay
        const overlay = document.createElement('div');
        overlay.id = 'gameOverOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1500;
            animation: fadeIn 0.5s ease;
        `;
        
        overlay.innerHTML = `
            <h1 style="font-size: 72px; color: #ee5a24; margin-bottom: 30px;">GAME OVER</h1>
            <div style="font-size: 36px; margin-bottom: 20px;">Score: ${score}</div>
            <div style="font-size: 24px; margin-bottom: 40px; opacity: 0.8;">
                ${stats ? `Wave: ${stats.wave} | Enemies Defeated: ${stats.enemiesDefeated}` : ''}
            </div>
            <div style="display: flex; gap: 20px;">
                <button class="btn" onclick="window.Game.restart()">Try Again</button>
                <button class="btn" onclick="window.Game.quit()">Main Menu</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }

    /**
     * Hide game over screen
     */
    hideGameOver() {
        const overlay = document.getElementById('gameOverOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(percent, text) {
        const loadingBar = document.getElementById('loadingBar');
        const loadingText = document.querySelector('.loading-text');
        
        if (loadingBar) {
            loadingBar.style.width = percent + '%';
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    /**
     * Check if mobile device
     */
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Clear all notifications
     */
    clearNotifications() {
        this.notifications.forEach(notification => {
            if (notification && notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
        this.notifications = [];
    }

    /**
     * Add CSS animations if not already present
     */
    static initializeAnimations() {
        if (document.getElementById('ui-animations')) return;
        
        const style = document.createElement('style');
        style.id = 'ui-animations';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            
            @keyframes fadeOut {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
        `;
        document.head.appendChild(style);
    }
}

export default UIManager;