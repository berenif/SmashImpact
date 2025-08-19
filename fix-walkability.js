// Script to fix map walkability by switching from blocks to walls
// Run this script to patch the isometric-game.js file

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'isometric-game.js');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// 1. Reduce tile depth for walls instead of blocks
content = content.replace(/TILE_DEPTH: 24,.*\/\/ Significant depth for 3D blocks/g, 
                         'TILE_DEPTH: 8,      // Reduced depth for walls instead of blocks');

// 2. Reduce voxel height
content = content.replace(/VOXEL_HEIGHT: 20,.*\/\/ Much higher for 3D blocks/g,
                         'VOXEL_HEIGHT: 8,    // Lower height for walls');

// 3. Reduce shadow opacity
content = content.replace(/SHADOW_OPACITY: 0\.35,.*\/\/ Stronger shadows for depth/g,
                         'SHADOW_OPACITY: 0.25, // Softer shadows for walls');

// 4. Fix the drawZeldaTile function to only draw height for walls
content = content.replace(/const tileHeight = CONFIG\.TILE_DEPTH; \/\/ Much taller 3D blocks/g,
                         'const tileHeight = type === TILE_TYPES.WALL ? CONFIG.TILE_DEPTH * 2 : 0; // Only walls have height');

// 5. Reduce shadow offset for non-wall tiles
content = content.replace(/ctx\.translate\(6, 10\); \/\/ Larger shadow offset/g,
                         'ctx.translate(4, 6); // Smaller shadow offset');

// 6. Fix the addDecorations function to reduce wall placement
// Remove the excessive wall generation at edges
const decorationsPattern = /\/\/ Add walls at edges for dungeon[\s\S]*?\/\/ Add walls to top and bottom edges[\s\S]*?\}\s*\}/;
content = content.replace(decorationsPattern, `// Add walls only at map boundaries
            // Only add walls at the very edges
            for (let y = 0; y < this.height; y++) {
                if (y === 0 || y === this.height - 1) {
                    for (let x = 0; x < this.width; x++) {
                        if (this.grid[y] && this.grid[y][x]) {
                            this.grid[y][x].type = TILE_TYPES.WALL;
                            this.grid[y][x].walkable = false;
                        }
                    }
                }
            }
            
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1) {
                    for (let y = 1; y < this.height - 1; y++) {
                        if (this.grid[y] && this.grid[y][x]) {
                            this.grid[y][x].type = TILE_TYPES.WALL;
                            this.grid[y][x].walkable = false;
                        }
                    }
                }
            }`);

// Write the updated content back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully fixed map walkability issues:');
console.log('  - Reduced tile depth from 24 to 8');
console.log('  - Reduced voxel height from 20 to 8');
console.log('  - Made only walls have 3D height');
console.log('  - Reduced shadow effects');
console.log('  - Changed wall generation to only place walls at map boundaries');
console.log('');
console.log('The map should now be much more walkable with walls instead of blocks!');