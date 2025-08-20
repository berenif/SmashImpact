/**
 * Modern WebAssembly Game Engine Wrapper
 * Uses async/await patterns and modern JavaScript features
 * Implements error boundaries and graceful fallbacks
 */

class WasmGameEngineModern {
    constructor() {
        this.module = null;
        this.engine = null;
        this.initialized = false;
        this.initPromise = null;
        this.errorHandlers = new Map();
        this.performanceMonitor = null;
        this.buildInfo = null;
        
        // Feature detection
        this.features = {
            simd: this.detectSIMD(),
            threading: this.detectThreading(),
            bigInt: typeof BigInt !== 'undefined'
        };
        
        // Configuration
        this.config = {
            memoryLimit: 256 * 1024 * 1024, // 256MB
            enableProfiling: false,
            enableThreading: false,
            retryAttempts: 3,
            retryDelay: 1000
        };
    }
    
    /**
     * Initialize the WebAssembly module with retry logic
     */
    async initialize(worldWidth = 800, worldHeight = 600, config = {}) {
        // Merge configuration
        this.config = { ...this.config, ...config };
        
        // Return existing promise if already initializing
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this._initializeWithRetry(worldWidth, worldHeight);
        return this.initPromise;
    }
    
    async _initializeWithRetry(worldWidth, worldHeight) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                console.log(`🚀 Initializing WASM Game Engine (attempt ${attempt}/${this.config.retryAttempts})...`);
                
                // Load build info
                await this.loadBuildInfo();
                
                // Check feature compatibility
                this.checkCompatibility();
                
                // Load WASM module
                await this.loadModule();
                
                // Create game engine instance
                this.createEngine(worldWidth, worldHeight);
                
                // Setup error boundaries
                this.setupErrorBoundaries();
                
                // Initialize performance monitoring
                if (this.config.enableProfiling) {
                    this.initializePerformanceMonitoring();
                }
                
                this.initialized = true;
                console.log('✅ WASM Game Engine initialized successfully!');
                console.log('📊 Features:', this.features);
                console.log('ℹ️ Build info:', this.buildInfo);
                
                return true;
                
            } catch (error) {
                lastError = error;
                console.error(`❌ Initialization attempt ${attempt} failed:`, error);
                
                if (attempt < this.config.retryAttempts) {
                    await this.delay(this.config.retryDelay * attempt);
                }
            }
        }
        
        // All attempts failed
        throw new Error(`Failed to initialize WASM after ${this.config.retryAttempts} attempts: ${lastError?.message}`);
    }
    
    /**
     * Load build information
     */
    async loadBuildInfo() {
        try {
            const response = await fetch('/public/build-info.json');
            if (response.ok) {
                this.buildInfo = await response.json();
            }
        } catch (error) {
            console.warn('Could not load build info:', error);
        }
    }
    
    /**
     * Load the WebAssembly module
     */
    async loadModule() {
        const moduleConfig = {
            locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                    return '/public/game_engine.wasm';
                }
                return path;
            },
            onRuntimeInitialized: () => {
                console.log('✅ WASM runtime initialized');
            },
            print: (text) => {
                console.log('WASM:', text);
            },
            printErr: (text) => {
                console.error('WASM Error:', text);
            },
            // Memory configuration
            INITIAL_MEMORY: 16 * 1024 * 1024, // 16MB
            ALLOW_MEMORY_GROWTH: true,
            MAXIMUM_MEMORY: this.config.memoryLimit
        };
        
        // Enable threading if supported and requested
        if (this.features.threading && this.config.enableThreading) {
            moduleConfig.USE_PTHREADS = 1;
            moduleConfig.PTHREAD_POOL_SIZE = 4;
        }
        
        // Load the module
        if (typeof GameEngineModule === 'undefined') {
            throw new Error('GameEngineModule not found. Make sure game_engine.js is loaded.');
        }
        
        this.module = await GameEngineModule(moduleConfig);
        
        if (!this.module) {
            throw new Error('Failed to load WebAssembly module');
        }
    }
    
    /**
     * Create the game engine instance
     */
    createEngine(worldWidth, worldHeight) {
        if (!this.module || !this.module.GameEngine) {
            throw new Error('GameEngine class not found in module');
        }
        
        this.engine = new this.module.GameEngine(worldWidth, worldHeight);
        
        if (!this.engine) {
            throw new Error('Failed to create GameEngine instance');
        }
    }
    
    /**
     * Setup error boundaries for graceful error handling
     */
    setupErrorBoundaries() {
        // Wrap all engine methods with error handling
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.engine));
        
        for (const method of methods) {
            if (typeof this.engine[method] === 'function' && method !== 'constructor') {
                const originalMethod = this.engine[method].bind(this.engine);
                
                this.engine[method] = (...args) => {
                    try {
                        return originalMethod(...args);
                    } catch (error) {
                        this.handleError(method, error);
                        return this.getDefaultReturnValue(method);
                    }
                };
            }
        }
    }
    
    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        this.performanceMonitor = {
            frameCount: 0,
            totalTime: 0,
            metrics: new Map(),
            
            startFrame: () => {
                this.performanceMonitor.frameStart = performance.now();
            },
            
            endFrame: () => {
                const frameTime = performance.now() - this.performanceMonitor.frameStart;
                this.performanceMonitor.totalTime += frameTime;
                this.performanceMonitor.frameCount++;
                
                // Update metrics every 60 frames
                if (this.performanceMonitor.frameCount % 60 === 0) {
                    const avgFrameTime = this.performanceMonitor.totalTime / 60;
                    this.performanceMonitor.metrics.set('avgFrameTime', avgFrameTime);
                    this.performanceMonitor.metrics.set('fps', 1000 / avgFrameTime);
                    this.performanceMonitor.totalTime = 0;
                }
            },
            
            getMetrics: () => {
                return Object.fromEntries(this.performanceMonitor.metrics);
            }
        };
    }
    
    // ============= Public API =============
    
    /**
     * Create a player entity
     */
    async createPlayer(x, y) {
        this.ensureInitialized();
        return await this.executeAsync(() => this.engine.createPlayer(x, y));
    }
    
    /**
     * Create an enemy entity
     */
    async createEnemy(x, y) {
        this.ensureInitialized();
        return await this.executeAsync(() => this.engine.createEnemy(x, y));
    }
    
    /**
     * Create a wolf entity
     */
    async createWolf(x, y, isAlpha = false) {
        this.ensureInitialized();
        return await this.executeAsync(() => this.engine.createWolf(x, y, isAlpha));
    }
    
    /**
     * Create a projectile
     */
    async createProjectile(x, y, dirX, dirY, damage, ownerId) {
        this.ensureInitialized();
        return await this.executeAsync(() => 
            this.engine.createProjectile(x, y, dirX, dirY, damage, ownerId)
        );
    }
    
    /**
     * Update player input
     */
    updatePlayerInput(dx, dy, aimX = 0, aimY = 0) {
        if (!this.initialized) return;
        
        try {
            this.engine.updatePlayerInput(dx, dy, aimX, aimY);
        } catch (error) {
            this.handleError('updatePlayerInput', error);
        }
    }
    
    /**
     * Main update loop
     */
    update(deltaTime) {
        if (!this.initialized) return;
        
        try {
            if (this.config.enableProfiling) {
                this.performanceMonitor.startFrame();
            }
            
            this.engine.update(deltaTime);
            
            if (this.config.enableProfiling) {
                this.performanceMonitor.endFrame();
            }
        } catch (error) {
            this.handleError('update', error);
        }
    }
    
    /**
     * Get all entity positions
     */
    getEntityPositions() {
        if (!this.initialized) return [];
        
        try {
            const positions = this.engine.getEntityPositions();
            return this.convertToJSArray(positions);
        } catch (error) {
            this.handleError('getEntityPositions', error);
            return [];
        }
    }
    
    /**
     * Get player state
     */
    getPlayerState() {
        if (!this.initialized) return null;
        
        try {
            return this.engine.getPlayerState();
        } catch (error) {
            this.handleError('getPlayerState', error);
            return null;
        }
    }
    
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        if (!this.initialized) return {};
        
        try {
            const wasmMetrics = this.engine.getPerformanceMetrics();
            const jsMetrics = this.config.enableProfiling 
                ? this.performanceMonitor.getMetrics() 
                : {};
            
            return { ...wasmMetrics, ...jsMetrics };
        } catch (error) {
            this.handleError('getPerformanceMetrics', error);
            return {};
        }
    }
    
    /**
     * Start the game
     */
    async startGame() {
        this.ensureInitialized();
        return await this.executeAsync(() => this.engine.startGame());
    }
    
    /**
     * Pause the game
     */
    pauseGame() {
        if (!this.initialized) return;
        
        try {
            this.engine.pauseGame();
        } catch (error) {
            this.handleError('pauseGame', error);
        }
    }
    
    /**
     * Resume the game
     */
    resumeGame() {
        if (!this.initialized) return;
        
        try {
            this.engine.resumeGame();
        } catch (error) {
            this.handleError('resumeGame', error);
        }
    }
    
    /**
     * Clean up and destroy the engine
     */
    async destroy() {
        if (!this.initialized) return;
        
        try {
            if (this.engine) {
                this.engine.delete();
                this.engine = null;
            }
            
            this.module = null;
            this.initialized = false;
            this.initPromise = null;
            
            console.log('🧹 WASM Game Engine destroyed');
        } catch (error) {
            console.error('Error destroying engine:', error);
        }
    }
    
    // ============= Helper Methods =============
    
    /**
     * Ensure the engine is initialized
     */
    ensureInitialized() {
        if (!this.initialized) {
            throw new Error('WASM Game Engine not initialized. Call initialize() first.');
        }
    }
    
    /**
     * Execute a function asynchronously with error handling
     */
    async executeAsync(fn) {
        return new Promise((resolve, reject) => {
            try {
                const result = fn();
                resolve(result);
            } catch (error) {
                this.handleError(fn.name || 'unknown', error);
                reject(error);
            }
        });
    }
    
    /**
     * Convert Emscripten value to JavaScript array
     */
    convertToJSArray(emVal) {
        if (!emVal) return [];
        
        try {
            // Handle different types of Emscripten values
            if (typeof emVal === 'object' && emVal.constructor.name === 'val') {
                return emVal.as ? emVal.as(Array) : Array.from(emVal);
            }
            return Array.from(emVal);
        } catch (error) {
            console.error('Error converting to JS array:', error);
            return [];
        }
    }
    
    /**
     * Handle errors with registered handlers
     */
    handleError(method, error) {
        console.error(`Error in ${method}:`, error);
        
        // Call registered error handler if exists
        const handler = this.errorHandlers.get(method);
        if (handler) {
            handler(error);
        }
        
        // Call global error handler
        const globalHandler = this.errorHandlers.get('*');
        if (globalHandler) {
            globalHandler(method, error);
        }
    }
    
    /**
     * Register an error handler for a specific method
     */
    onError(method, handler) {
        this.errorHandlers.set(method, handler);
    }
    
    /**
     * Get default return value for a method
     */
    getDefaultReturnValue(method) {
        const defaults = {
            getEntityPositions: [],
            getPlayerState: null,
            getPerformanceMetrics: {},
            createPlayer: -1,
            createEnemy: -1,
            createWolf: -1,
            createProjectile: -1
        };
        
        return defaults[method] !== undefined ? defaults[method] : null;
    }
    
    /**
     * Check browser compatibility
     */
    checkCompatibility() {
        if (!window.WebAssembly) {
            throw new Error('WebAssembly is not supported in this browser');
        }
        
        if (this.config.enableThreading && !this.features.threading) {
            console.warn('Threading requested but not available. Falling back to single-threaded mode.');
            this.config.enableThreading = false;
        }
    }
    
    /**
     * Detect SIMD support
     */
    detectSIMD() {
        try {
            // Check for WASM SIMD support
            return WebAssembly.validate(new Uint8Array([
                0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
                0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
                0x41, 0x00, 0xfd, 0x0f, 0x26, 0x0b
            ]));
        } catch {
            return false;
        }
    }
    
    /**
     * Detect threading support (SharedArrayBuffer)
     */
    detectThreading() {
        return typeof SharedArrayBuffer !== 'undefined' && 
               typeof Atomics !== 'undefined';
    }
    
    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
export { WasmGameEngineModern };

// Also attach to window for backward compatibility
if (typeof window !== 'undefined') {
    window.WasmGameEngineModern = WasmGameEngineModern;
}