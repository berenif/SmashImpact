const fs = require('fs');
const path = require('path');

console.log('Verifying Wolf AI WASM Module...\n');

// Check if files exist
const jsFile = path.join(__dirname, 'public', 'wolf_ai.js');
const wasmFile = path.join(__dirname, 'public', 'wolf_ai.wasm');

if (fs.existsSync(jsFile)) {
    const jsStats = fs.statSync(jsFile);
    console.log(`✅ wolf_ai.js found (${(jsStats.size / 1024).toFixed(1)} KB)`);
} else {
    console.log('❌ wolf_ai.js not found');
}

if (fs.existsSync(wasmFile)) {
    const wasmStats = fs.statSync(wasmFile);
    console.log(`✅ wolf_ai.wasm found (${(wasmStats.size / 1024).toFixed(1)} KB)`);
} else {
    console.log('❌ wolf_ai.wasm not found');
}

// Read JS file and check for expected exports in the bindings
if (fs.existsSync(jsFile)) {
    const jsContent = fs.readFileSync(jsFile, 'utf8');
    
    console.log('\nChecking for export bindings in JS file:');
    
    const expectedExports = ['Vec2', 'GameObject', 'CollisionSystem', 'WolfPackManager'];
    
    for (const exportName of expectedExports) {
        // Check if the export name appears in the JS file (in binding definitions)
        if (jsContent.includes(`"${exportName}"`) || jsContent.includes(`'${exportName}'`)) {
            console.log(`✅ ${exportName} binding found in JS`);
        } else {
            console.log(`❌ ${exportName} binding not found in JS`);
        }
    }
}

console.log('\n📝 To test in browser, open: http://localhost:8080/test-wolf-ai-exports.html');
console.log('   (Make sure the HTTP server is running)');