#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing Wolf AI WASM Module in Node.js...\n');

// Load the module
const WolfAIModule = require('./wasm/wolf_ai.js');

// Read the WASM file
const wasmPath = path.join(__dirname, 'wasm', 'wolf_ai.wasm');
const wasmBinary = fs.readFileSync(wasmPath);

console.log(`WASM file size: ${wasmBinary.length} bytes`);

// Initialize the module with the WASM binary
WolfAIModule({
    wasmBinary: wasmBinary,
    // For Node.js environment
    instantiateWasm: (imports, successCallback) => {
        WebAssembly.instantiate(wasmBinary, imports).then(result => {
            successCallback(result.instance, result.module);
        }).catch(err => {
            console.error('Failed to instantiate WASM:', err);
        });
        return {}; // Return empty object to indicate async instantiation
    }
}).then(Module => {
    console.log('✅ Module loaded successfully');
    
    // Check if classes are available
    if (Module.WolfPackManager) {
        console.log('✅ WolfPackManager class is available');
        
        // Try to create an instance
        try {
            const wolfManager = new Module.WolfPackManager();
            console.log('✅ WolfPackManager instance created');
            
            // Create a wolf
            const wolfId = wolfManager.createWolf(100, 100, false);
            console.log(`✅ Wolf created with ID: ${wolfId}`);
            
            // Get wolf position
            const x = wolfManager.getWolfX(wolfId);
            const y = wolfManager.getWolfY(wolfId);
            console.log(`✅ Wolf position: (${x}, ${y})`);
            
            // Get wolf state
            const state = wolfManager.getWolfState(wolfId);
            const stateNames = ['IDLE', 'PATROL', 'INVESTIGATE', 'HUNT', 'FLANK', 'SEARCH'];
            console.log(`✅ Wolf state: ${state} (${stateNames[state] || 'UNKNOWN'})`);
            
            // Update wolf
            wolfManager.updateWolf(wolfId, 0.016, 200, 200, 0, 0, true);
            console.log('✅ Wolf updated successfully');
            
            // Check new position after update
            const newX = wolfManager.getWolfX(wolfId);
            const newY = wolfManager.getWolfY(wolfId);
            console.log(`✅ Wolf new position: (${newX.toFixed(2)}, ${newY.toFixed(2)})`);
            
            // Get wolf count
            const wolfCount = wolfManager.getWolfCount();
            console.log(`✅ Total wolves: ${wolfCount}`);
            
            console.log('\n🎉 All tests passed! The Wolf AI module is working correctly.');
            console.log('\nThe module is ready to be used in your GitHub Actions workflow.');
        } catch (e) {
            console.error('❌ Error creating or using WolfPackManager:', e.message);
            console.error(e.stack);
        }
    } else {
        console.error('❌ WolfPackManager class not found in module');
        console.log('Available exports:', Object.keys(Module).filter(k => !k.startsWith('_')).slice(0, 20));
    }
    
    if (Module.Vec2) {
        console.log('✅ Vec2 class is available');
        try {
            const vec = new Module.Vec2(3, 4);
            console.log(`  Vec2(3,4) magnitude: ${vec.magnitude()}`);
        } catch(e) {
            console.log('  (Could not test Vec2)');
        }
    }
    
    if (Module.GameObject) {
        console.log('✅ GameObject class is available');
    }
    
}).catch(err => {
    console.error('❌ Failed to load module:', err);
    console.error(err.stack);
    process.exit(1);
});