/**
 * WASM Initialization Module
 * Handles WebAssembly module loading and initialization for SmashImpact game
 */

class WASMInitializer {
    constructor() {
        this.wasmModule = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.statusCallbacks = [];
        this.performanceMetrics = {
            loadStartTime: 0,
            loadEndTime: 0,
            initStartTime: 0,
            initEndTime: 0
        };
    }

    /**
     * Register a callback for status updates
     */
    onStatusChange(callback) {
        this.statusCallbacks.push(callback);
    }

    /**
     * Emit status updates to all registered callbacks
     */
    emitStatus(status, message, details = {}) {
        const statusUpdate = {
            status,
            message,
            timestamp: Date.now(),
            ...details
        };
        
        this.statusCallbacks.forEach(callback => {
            try {
                callback(statusUpdate);
            } catch (error) {
                console.error('Error in status callback:', error);
            }
        });
    }

    /**
     * Check if WebAssembly is supported in the current environment
     */
    isWASMSupported() {
        try {
            if (typeof WebAssembly === 'object' &&
                typeof WebAssembly.instantiate === 'function') {
                const module = new WebAssembly.Module(
                    Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
                );
                if (module instanceof WebAssembly.Module) {
                    return new WebAssembly.Instance(module) instanceof WebAssembly.Instance;
                }
            }
        } catch (e) {
            console.warn('WebAssembly support check failed:', e);
        }
        return false;
    }

    /**
     * Load and initialize the WASM module
     */
    async initialize() {
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            this.performanceMetrics.loadStartTime = performance.now();
            this.emitStatus('checking', 'Checking WebAssembly support...');

            // Check WASM support
            if (!this.isWASMSupported()) {
                throw new Error('WebAssembly is not supported in this browser');
            }

            this.emitStatus('loading', 'Loading WASM module...');

            // Check if the game engine module loader exists
            if (typeof GameEngineModule === 'undefined') {
                // Try to load it dynamically
                await this.loadGameEngineModule();
            }

            // Initialize the WASM module
            this.performanceMetrics.initStartTime = performance.now();
            this.emitStatus('initializing', 'Initializing WASM module...');

            // Create the WASM module instance
            this.wasmModule = await this.createWASMInstance();

            this.performanceMetrics.initEndTime = performance.now();
            this.performanceMetrics.loadEndTime = performance.now();

            // Validate the module
            this.validateModule();

            this.isInitialized = true;
            
            const loadTime = this.performanceMetrics.loadEndTime - this.performanceMetrics.loadStartTime;
            const initTime = this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime;
            
            this.emitStatus('ready', 'WASM module ready', {
                loadTime: loadTime.toFixed(2),
                initTime: initTime.toFixed(2),
                totalTime: (loadTime).toFixed(2)
            });

            // Make module globally available
            window.wasmModule = this.wasmModule;
            
            return this.wasmModule;

        } catch (error) {
            this.emitStatus('error', `Failed to initialize WASM: ${error.message}`, {
                error: error.toString(),
                stack: error.stack
            });
            
            console.error('WASM initialization failed:', error);
            
            // WASM is required - throw error instead of returning null
            this.isInitialized = false;
            throw new Error(`WebAssembly initialization failed: ${error.message}`);
        }
    }

    /**
     * Load the game engine module script
     */
    async loadGameEngineModule() {
        return new Promise((resolve, reject) => {
            // Check if module already exists
            if (typeof GameEngineModule !== 'undefined') {
                resolve();
                return;
            }

            // Dynamically import the ES6 module
            import('./game_engine.js')
                .then(module => {
                    window.GameEngineModule = module.default;
                    resolve();
                })
                .catch(error => {
                    console.error('Failed to load game_engine.js:', error);
                    reject(new Error('Failed to load WASM module script'));
                });
        });
    }

    /**
     * Create the WASM module instance
     */
    async createWASMInstance() {
        if (typeof GameEngineModule !== 'function') {
            throw new Error('GameEngineModule is not available');
        }

        const moduleConfig = {
            locateFile: (path) => {
                // Ensure correct path for WASM file
                if (path.endsWith('.wasm')) {
                    return './game_engine.wasm';
                }
                return path;
            },
            onRuntimeInitialized: () => {
                console.log('WASM Runtime initialized');
            },
            print: (text) => {
                console.log('WASM:', text);
            },
            printErr: (text) => {
                console.error('WASM Error:', text);
            }
        };

        // Initialize the module
        const wasmInstance = await GameEngineModule(moduleConfig);
        
        return wasmInstance;
    }

    /**
     * Validate that the WASM module has the expected exports
     */
    validateModule() {
        if (!this.wasmModule) {
            throw new Error('WASM module is not loaded');
        }

        // Check for expected functions
        const requiredFunctions = [
            'GameEngine',
            'Vec2',
            'GameObject',
            'CollisionSystem'
        ];

        const missingFunctions = [];
        for (const funcName of requiredFunctions) {
            if (typeof this.wasmModule[funcName] === 'undefined') {
                missingFunctions.push(funcName);
            }
        }

        if (missingFunctions.length > 0) {
            console.warn('WASM module is missing some expected functions:', missingFunctions);
            // Don't throw error, just warn - the module might still be usable
        }

        console.log('WASM module validation complete');
    }

    /**
     * Get the WASM module if initialized
     */
    getModule() {
        if (!this.isInitialized) {
            console.warn('WASM module not initialized');
            return null;
        }
        return this.wasmModule;
    }

    /**
     * Check if WASM is ready to use
     */
    isReady() {
        return this.isInitialized && this.wasmModule !== null;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.isInitialized) {
            return null;
        }
        
        return {
            loadTime: this.performanceMetrics.loadEndTime - this.performanceMetrics.loadStartTime,
            initTime: this.performanceMetrics.initEndTime - this.performanceMetrics.initStartTime,
            totalTime: this.performanceMetrics.loadEndTime - this.performanceMetrics.loadStartTime
        };
    }

    /**
     * Create a game engine instance using WASM
     */
    createGameEngine(canvas) {
        if (!this.isReady()) {
            throw new Error('WASM module is not ready');
        }

        try {
            // Create WASM game engine instance
            const engine = new this.wasmModule.GameEngine(
                canvas.width,
                canvas.height
            );
            
            console.log('Created WASM GameEngine instance');
            return engine;
        } catch (error) {
            console.error('Failed to create WASM GameEngine:', error);
            throw error;
        }
    }

    /**
     * Cleanup and destroy the WASM module
     */
    destroy() {
        if (this.wasmModule) {
            // Clean up any WASM resources if needed
            this.wasmModule = null;
        }
        this.isInitialized = false;
        this.initPromise = null;
        this.statusCallbacks = [];
    }
}

// Create global instance
window.wasmInitializer = new WASMInitializer();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WASMInitializer;
}