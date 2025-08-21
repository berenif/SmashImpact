const fs = require('fs');
const path = require('path');

console.log('Checking game files...\n');

const requiredFiles = [
    'public/game.html',
    'public/game_engine.js',
    'public/game_engine.wasm',
    'public/enhanced-combat-game.js',
    'public/visual-effects.js',
    'public/mobile-controls.js',
    'public/wasm-targeting-button.js',
    'public/wasm-global-wrapper.js'
];

let allFilesExist = true;

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} (${stats.size} bytes)`);
    } else {
        console.log(`❌ ${file} - NOT FOUND`);
        allFilesExist = false;
    }
});

if (allFilesExist) {
    console.log('\n✅ All required files exist!');
    console.log('\nGame should be accessible at: http://localhost:8080/public/game.html');
} else {
    console.log('\n❌ Some files are missing!');
}