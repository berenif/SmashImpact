/**
 * Fixed WASM Game Engine Loader
 * Handles proper initialization of the WebAssembly module
 */

async function loadGameEngine() {
    try {
        console.log('Loading WASM Game Engine...');
        
        // Create the module configuration with proper imports
        const moduleConfig = {
            // Provide the locateFile function to help find the WASM file
            locateFile: (path, scriptDirectory) => {
                if (path.endsWith('.wasm')) {
                    return './public/game_engine.wasm';
                }
                return scriptDirectory + path;
            },
            
            // Pre-run initialization
            preRun: [],
            postRun: [],
            
            // Handle print output
            print: (text) => console.log(text),
            printErr: (text) => console.error(text),
            
            // Handle abort
            onAbort: (what) => {
                console.error('WASM Module aborted:', what);
            },
            
            // Provide the WebAssembly memory if needed
            wasmMemory: new WebAssembly.Memory({
                initial: 256,
                maximum: 2048
            })
        };
        
        // Import the module factory
        const createModule = (await import('./game_engine.js')).default;
        
        // Add proper locateFile function to the config
        moduleConfig.locateFile = (path) => {
            if (path.endsWith('.wasm')) {
                return './game_engine.wasm';
            }
            return path;
        };
        
        // Create the module instance with our configuration
        const wasmModule = await createModule(moduleConfig);
        
        console.log('✅ WASM Module loaded successfully');
        
        // Return the initialized module
        return wasmModule;
        
    } catch (error) {
        console.error('Failed to load WASM module:', error);
        throw error;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadGameEngine };
} else if (typeof window !== 'undefined') {
    // Also make available globally
    window.loadGameEngine = loadGameEngine;
}