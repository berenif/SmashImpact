/**
 * WASM Module Fix
 * This provides a proper wrapper for the game_engine.js module
 * to fix import object errors
 */

// Import the Emscripten-generated module
async function createFixedGameEngine() {
    console.log('Initializing fixed WASM game engine...');
    
    try {
        // Import the Emscripten module factory
        const moduleFactory = (await import('./game_engine.js')).default;
        
        console.log('Module factory loaded, creating instance...');
        
        // Create the module instance
        // The Emscripten module handles all the import object setup internally
        const wasmModule = await moduleFactory({
            // Optional configuration
            print: (text) => console.log('[WASM]:', text),
            printErr: (text) => console.error('[WASM Error]:', text),
            
            // Locate the WASM file
            locateFile: (path) => {
                if (path.endsWith('.wasm')) {
                    return 'public/game_engine.wasm';
                }
                return path;
            },
            
            // Handle initialization
            onRuntimeInitialized: () => {
                console.log('✅ WASM runtime initialized');
            }
        });
        
        console.log('✅ WASM module created successfully');
        
        // The module should already have the GameEngine class bound
        if (!wasmModule.GameEngine) {
            console.warn('GameEngine class not found in module, creating wrapper...');
            
            // WASM module exists but GameEngine might not be exposed
            throw new Error('GameEngine class not found in WASM module. Please ensure the WASM module is properly compiled with the GameEngine bindings.');
        }
        
        // Return the module with the GameEngine class
        return wasmModule;
        
    } catch (error) {
        console.error('Failed to create fixed WASM engine:', error);
        console.error('Error details:', error.message, error.stack);
        
        // WASM module is required
        throw new Error('WASM module not loaded. Please ensure WebAssembly is supported and the module is properly initialized.');
    }
}

// WASM is required - no fallback implementation
// This function now throws an error if called
function createFallbackGameEngine() {
    throw new Error('WASM is required. Fallback implementation has been removed. Please ensure WebAssembly is supported and the WASM module is properly loaded.');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createFixedGameEngine;
} else if (typeof window !== 'undefined') {
    // Make available globally only in browser environment
    window.createFixedGameEngine = createFixedGameEngine;
}