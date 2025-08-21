// Global wrapper for WASM module to provide createGameEngine function
// This file makes the WASM module available globally for game.html

(function() {
    'use strict';
    
    // Create a global createGameEngine function that returns a promise
    window.createGameEngine = async function(config = {}) {
        try {
            console.log('Initializing WASM Game Engine...');
            
            // Import the ES6 module dynamically
            const GameEngineModule = (await import('./game_engine.js')).default;
            
            // Configure the module
            const moduleConfig = {
                print: (text) => console.log('[WASM]:', text),
                printErr: (text) => console.error('[WASM Error]:', text),
                locateFile: (path) => {
                    if (path.endsWith('.wasm')) {
                        return './game_engine.wasm';
                    }
                    return path;
                },
                ...config
            };
            
            // Create and return the module instance
            const wasmModule = await GameEngineModule(moduleConfig);
            
            console.log('✅ WASM Game Engine loaded successfully');
            
            // Return the module with additional helper methods if needed
            return {
                ...wasmModule,
                // Add any additional wrapper methods here
                isReady: true
            };
            
        } catch (error) {
            console.error('Failed to create WASM Game Engine:', error);
            // Return a fallback object so the game can still run without WASM
            return {
                isReady: false,
                error: error.message
            };
        }
    };
    
    console.log('WASM Global Wrapper loaded - createGameEngine function available');
})();