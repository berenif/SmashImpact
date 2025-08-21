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
            
            // Import the Emscripten module factory
            const moduleFactory = (await import('/public/game_engine.js')).default;
            this.updateLoading(30, 'Initializing WASM...');
            
            // Create the module instance with proper configuration
            this.module = await moduleFactory({
                // Optional configuration
                print: (text) => console.log('[WASM]:', text),
                printErr: (text) => console.error('[WASM Error]:', text),
                
                // Locate the WASM file
                locateFile: (path) => {
                    if (path.endsWith('.wasm')) {
                        return '/public/game_engine.wasm';
                    }
                    return path;
                },
                
                // Handle initialization
                onRuntimeInitialized: () => {
                    console.log('✅ WASM runtime initialized');
                }
            });
            
            this.updateLoading(50, 'Creating game engine...');
            
            // Check if GameEngine class is available
            if (!this.module.GameEngine) {
                throw new Error('GameEngine class not found in WASM module');
            }
            
            // Create game engine instance
            this.engine = new this.module.GameEngine(1920, 1080);
            this.updateLoading(70, 'Setting up renderer...');
            
            // Note: generateObstacles might not exist, check first
            if (typeof this.engine.generateObstacles === 'function') {
                this.engine.generateObstacles(20);
            } else if (typeof this.engine.createObstacle === 'function') {
                // Create obstacles manually if generateObstacles doesn't exist
                for (let i = 0; i < 20; i++) {
                    const x = Math.random() * 1920;
                    const y = Math.random() * 1080;
                    const radius = 20 + Math.random() * 30;
                    this.engine.createObstacle(x, y, radius);
                }
            }
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