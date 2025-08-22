#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Testing Wolf AI WASM Module...\n');

// Load the module
const WolfAIModule = require('./wasm/wolf_ai.js');

// Initialize the module with proper file location
WolfAIModule({
    locateFile: (filename) => {
        return path.join(__dirname, 'wasm', filename);
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
            console.log(`✅ Wolf state: ${state}`);
            
            // Update wolf
            wolfManager.updateWolf(wolfId, 0.016, 200, 200, 0, 0, true);
            console.log('✅ Wolf updated successfully');
            
            console.log('\n🎉 All tests passed! The Wolf AI module is working correctly.');
        } catch (e) {
            console.error('❌ Error creating or using WolfPackManager:', e.message);
        }
    } else {
        console.error('❌ WolfPackManager class not found in module');
        console.log('Available exports:', Object.keys(Module).filter(k => !k.startsWith('_')).slice(0, 10));
    }
    
    if (Module.Vec2) {
        console.log('✅ Vec2 class is available');
    }
    
    if (Module.GameObject) {
        console.log('✅ GameObject class is available');
    }
    
}).catch(err => {
    console.error('❌ Failed to load module:', err);
    process.exit(1);
});