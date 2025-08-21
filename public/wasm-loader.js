/**
 * WASM Loader Module
 * Handles WebAssembly module initialization and management
 */

export class WASMLoader {
    constructor() {
        this.module = null;
        this.engine = null;
        this.initialized = false;
    }

    /**
     * Initialize the WASM module
     * @param {Object} config - Configuration options
     * @returns {Promise<void>}
     */
    async initialize(config = {}) {
        try {
            console.log('🚀 Initializing WASM module...');
            
            // Dynamic import of the WASM module
            const { default: GameEngineModule } = await import('./game_engine.js');
            
            // Configure module options
            const moduleConfig = {
                print: config.print || ((text) => console.log('[WASM]:', text)),
                printErr: config.printErr || ((text) => console.error('[WASM Error]:', text)),
                locateFile: config.locateFile || ((path) => {
                    if (path.endsWith('.wasm')) {
                        return './game_engine.wasm';
                    }
                    return path;
                }),
                onRuntimeInitialized: () => {
                    console.log('✅ WASM runtime initialized');
                    if (config.onRuntimeInitialized) {
                        config.onRuntimeInitialized();
                    }
                }
            };
            
            // Initialize the module
            this.module = await GameEngineModule(moduleConfig);
            
            // Create the game engine instance
            const width = config.width || window.innerWidth;
            const height = config.height || window.innerHeight;
            this.engine = new this.module.GameEngine(width, height);
            
            // Initialize the engine
            this.engine.init();
            
            this.initialized = true;
            console.log('✅ WASM module loaded successfully!');
            
            return this.engine;
            
        } catch (error) {
            console.error('❌ Failed to initialize WASM module:', error);
            throw error;
        }
    }
    
    /**
     * Get the game engine instance
     * @returns {Object} The game engine instance
     */
    getEngine() {
        if (!this.initialized) {
            throw new Error('WASM module not initialized. Call initialize() first.');
        }
        return this.engine;
    }
    
    /**
     * Get the WASM module
     * @returns {Object} The WASM module
     */
    getModule() {
        if (!this.initialized) {
            throw new Error('WASM module not initialized. Call initialize() first.');
        }
        return this.module;
    }
    
    /**
     * Check if the module is initialized
     * @returns {boolean}
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * Cleanup and destroy the engine
     */
    cleanup() {
        if (this.engine && this.engine.cleanup) {
            this.engine.cleanup();
        }
        this.engine = null;
        this.module = null;
        this.initialized = false;
    }
}

// Export singleton instance
export const wasmLoader = new WASMLoader();