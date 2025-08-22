#!/usr/bin/env node

// Test script to verify Wolf AI WASM module exports
const fs = require('fs');
const path = require('path');

async function testWolfAIExports() {
    console.log('Testing Wolf AI WASM Module Exports...\n');
    
    try {
        // Load the WASM module
        const modulePath = path.join(__dirname, 'public', 'wolf_ai.js');
        if (!fs.existsSync(modulePath)) {
            console.error(`Error: Module not found at ${modulePath}`);
            process.exit(1);
        }
        
        const WolfAIModule = require(modulePath);
        const Module = await WolfAIModule();
        
        console.log('✅ Module loaded successfully\n');
        
        // Define expected exports
        const expectedExports = [
            'Vec2',
            'GameObject',
            'CollisionSystem',
            'WolfPackManager'
        ];
        
        // Check each export
        let allExportsFound = true;
        const missingExports = [];
        const foundExports = [];
        
        for (const exportName of expectedExports) {
            if (typeof Module[exportName] === 'function') {
                foundExports.push(exportName);
                console.log(`✅ ${exportName} - Found`);
                
                // Test instantiation
                try {
                    let instance;
                    switch(exportName) {
                        case 'Vec2':
                            instance = new Module.Vec2(10, 20);
                            console.log(`   Instance created: Vec2(${instance.x}, ${instance.y})`);
                            console.log(`   Magnitude: ${instance.magnitude()}`);
                            break;
                        case 'GameObject':
                            instance = new Module.GameObject();
                            console.log(`   Instance created: GameObject`);
                            console.log(`   Properties: id=${instance.id}, health=${instance.health}`);
                            break;
                        case 'CollisionSystem':
                            instance = new Module.CollisionSystem();
                            console.log(`   Instance created: CollisionSystem`);
                            break;
                        case 'WolfPackManager':
                            instance = new Module.WolfPackManager();
                            console.log(`   Instance created: WolfPackManager`);
                            const wolfId = instance.createWolf(100, 100, true);
                            console.log(`   Created wolf with ID: ${wolfId}`);
                            break;
                    }
                } catch (e) {
                    console.log(`   ⚠️ Error creating instance: ${e.message}`);
                }
            } else {
                missingExports.push(exportName);
                allExportsFound = false;
                console.log(`❌ ${exportName} - Missing`);
            }
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('Summary:');
        console.log(`Found exports: ${foundExports.length}/${expectedExports.length}`);
        console.log(`Found: [${foundExports.join(', ')}]`);
        
        if (missingExports.length > 0) {
            console.log(`Missing: [${missingExports.join(', ')}]`);
        }
        
        if (allExportsFound) {
            console.log('\n✅ All expected exports are present!');
            process.exit(0);
        } else {
            console.log('\n❌ Some exports are missing!');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('Error loading module:', error.message);
        process.exit(1);
    }
}

// Run the test
testWolfAIExports().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});