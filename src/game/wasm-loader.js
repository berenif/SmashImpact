/**
 * WASM Loader Module
 * Handles WebAssembly module initialization and loading
 */

export class WASMLoader {
    constructor() {
        this.module = null;
        this.engine = null;
    }

    /**
     * Update loading progress UI
     */
    updateLoading(percent, text) {
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
     * Initialize WASM module
     */
    async initialize() {
        try {
            this.updateLoading(10, 'Loading WASM module...');
            
            // Try to load the WASM module
            const module = await import('/public/game_engine.js');
            this.updateLoading(30, 'Initializing WASM...');
            
            // Initialize the WASM module properly
            const GameEngineModule = module.default;
            this.module = await GameEngineModule();
            this.updateLoading(50, 'Creating game engine...');
            
            // Create game engine instance
            this.engine = new this.module.GameEngine(1920, 1080);
            this.updateLoading(70, 'Setting up renderer...');
            
            // Generate initial obstacles
            this.engine.generateObstacles(20);
            this.updateLoading(90, 'Finalizing...');
            
            console.log('WASM module loaded successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize WASM:', error);
            
            // Show error to user
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <h2 style="color: #ff6b6b;">Failed to load game engine</h2>
                        <p style="margin-top: 20px;">${error.message}</p>
                        <button class="btn" onclick="location.reload()" style="margin-top: 20px;">
                            Retry
                        </button>
                    </div>
                `;
            }
            
            return false;
        }
    }

    /**
     * Get the game engine instance
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Get the WASM module
     */
    getModule() {
        return this.module;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.engine) {
            try {
                this.engine.clearEntities();
                this.engine = null;
            } catch (e) {
                console.error('Error cleaning up engine:', e);
            }
        }
        this.module = null;
    }
}

export default WASMLoader;