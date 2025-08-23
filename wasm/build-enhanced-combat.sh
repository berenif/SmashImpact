#!/bin/bash

# Build script for Enhanced Combat Engine WASM module

set -e

echo "Building Enhanced Combat Engine WASM module..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if emscripten is available
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}Error: emcc not found. Please install Emscripten.${NC}"
    exit 1
fi

# Navigate to wasm directory
cd "$(dirname "$0")"

# Create build directory if it doesn't exist
mkdir -p build

echo -e "${YELLOW}Compiling enhanced_combat_engine.cpp...${NC}"

# Compile the enhanced combat engine
emcc enhanced_combat_engine.cpp \
    -o ../public/enhanced_combat_engine.js \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s EXPORT_NAME='EnhancedCombatModule' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s INITIAL_MEMORY=67108864 \
    -s MAXIMUM_MEMORY=536870912 \
    -s USE_ES6_IMPORT_META=1 \
    -s SINGLE_FILE=0 \
    -s ENVIRONMENT='web' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s EXPORTED_FUNCTIONS='["_malloc","_free"]' \
    -s NO_EXIT_RUNTIME=1 \
    -s ASSERTIONS=1 \
    -s SAFE_HEAP=0 \
    -s STACK_OVERFLOW_CHECK=1 \
    -s DEMANGLE_SUPPORT=1 \
    -lembind \
    -std=c++17 \
    -O2 \
    -fno-exceptions \
    -fno-rtti \
    -Wall \
    -Wextra

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Enhanced Combat Engine WASM module built successfully!${NC}"
    echo -e "${GREEN}  Output: ../public/enhanced_combat_engine.js${NC}"
    echo -e "${GREEN}  WASM: ../public/enhanced_combat_engine.wasm${NC}"
    
    # Get file sizes
    JS_SIZE=$(ls -lh ../public/enhanced_combat_engine.js | awk '{print $5}')
    WASM_SIZE=$(ls -lh ../public/enhanced_combat_engine.wasm | awk '{print $5}')
    
    echo -e "${GREEN}  JS Size: $JS_SIZE${NC}"
    echo -e "${GREEN}  WASM Size: $WASM_SIZE${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating compatibility wrapper...${NC}"

# Create a wrapper that provides both WASM and JS fallback
cat > ../public/enhanced_combat_wrapper.js << 'EOF'
// Enhanced Combat Engine Wrapper
// Provides WASM implementation with JS fallback

class EnhancedCombatGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.wasmEngine = null;
        this.isWASM = false;
        this.animationId = null;
        this.isPaused = false;
        
        // Input state
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        
        // Mobile controls reference
        this.mobileControls = null;
    }
    
    async init() {
        try {
            // Try to load WASM module
            if (typeof EnhancedCombatModule !== 'undefined') {
                const Module = await EnhancedCombatModule();
                this.wasmEngine = new Module.EnhancedCombatEngine();
                this.wasmEngine.init(this.canvas.width, this.canvas.height);
                this.isWASM = true;
                console.log('Enhanced Combat Engine: Using WASM implementation');
            } else {
                throw new Error('WASM module not available');
            }
        } catch (error) {
            console.warn('Failed to load WASM module:', error);
            console.log('Enhanced Combat Engine: Falling back to JavaScript implementation');
            // Fallback will be handled by existing enhanced-combat-game.js
            this.isWASM = false;
            throw error; // Let the caller handle the fallback
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start game loop
        this.gameLoop();
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        
        // Window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    handleKeyDown(e) {
        this.keys[e.keyCode] = true;
        
        if (this.wasmEngine) {
            this.wasmEngine.handleKeyDown(e.keyCode);
        }
    }
    
    handleKeyUp(e) {
        this.keys[e.keyCode] = false;
        
        if (this.wasmEngine) {
            this.wasmEngine.handleKeyUp(e.keyCode);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        if (this.wasmEngine) {
            this.wasmEngine.handleMouseMove(this.mouse.x, this.mouse.y);
        }
    }
    
    handleMouseDown(e) {
        if (e.button === 0) { // Left click
            this.handleAttack();
        }
    }
    
    handleAttack() {
        if (this.wasmEngine) {
            this.wasmEngine.playerAttack();
        }
    }
    
    handleShield() {
        // Called by mobile controls or keyboard
        if (this.wasmEngine) {
            // Shield is handled by key events (Alt key)
            this.wasmEngine.handleKeyDown(18); // Alt key code
        }
    }
    
    handleRoll() {
        // Called by mobile controls or keyboard
        if (this.wasmEngine) {
            this.wasmEngine.playerRoll();
        }
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.wasmEngine) {
            this.wasmEngine.setCanvasSize(this.canvas.width, this.canvas.height);
        }
    }
    
    gameLoop() {
        if (this.isPaused) return;
        
        // Update game state
        if (this.wasmEngine) {
            this.wasmEngine.update();
            
            // Get game state for rendering
            const gameState = this.wasmEngine.getGameState();
            
            // Render the game
            this.render(gameState);
        }
        
        // Continue loop
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    render(gameState) {
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        if (gameState.camera) {
            this.ctx.save();
            this.ctx.translate(-gameState.camera.x, -gameState.camera.y);
            
            // Draw world boundaries
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(0, 0, 
                this.canvas.width * 3, this.canvas.height * 3);
            
            // Draw grid
            this.drawGrid();
            
            // Draw particles
            if (gameState.particles) {
                for (let i = 0; i < gameState.particles.length; i++) {
                    const particle = gameState.particles[i];
                    if (particle) {
                        this.ctx.fillStyle = particle.color || '#fff';
                        this.ctx.beginPath();
                        this.ctx.arc(particle.x, particle.y, 
                            particle.size || 2, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
            
            // Draw enemies
            if (gameState.enemies) {
                for (let i = 0; i < gameState.enemies.length; i++) {
                    const enemy = gameState.enemies[i];
                    if (enemy) {
                        // Enemy body
                        this.ctx.fillStyle = enemy.stunned ? '#666' : '#ff4444';
                        this.ctx.beginPath();
                        this.ctx.arc(enemy.x, enemy.y, 18, 0, Math.PI * 2);
                        this.ctx.fill();
                        
                        // Enemy health bar
                        if (enemy.health < enemy.maxHealth) {
                            this.ctx.fillStyle = '#000';
                            this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 40, 4);
                            this.ctx.fillStyle = '#0f0';
                            this.ctx.fillRect(enemy.x - 20, enemy.y - 30, 
                                40 * (enemy.health / enemy.maxHealth), 4);
                        }
                    }
                }
            }
            
            // Draw player
            if (gameState.player) {
                const player = gameState.player;
                
                // Shield effect
                if (player.shielding) {
                    this.ctx.strokeStyle = '#00ffff';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(player.x, player.y, 35, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
                
                // Roll effect
                if (player.rolling) {
                    this.ctx.fillStyle = 'rgba(100, 200, 255, 0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(player.x, player.y, 30, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                
                // Player body
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, 25, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Direction indicator
                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(player.x, player.y);
                this.ctx.lineTo(
                    player.x + Math.cos(player.facing) * 30,
                    player.y + Math.sin(player.facing) * 30
                );
                this.ctx.stroke();
                
                // Attack animation
                if (player.attacking) {
                    this.ctx.strokeStyle = '#ffff00';
                    this.ctx.lineWidth = 3;
                    this.ctx.beginPath();
                    this.ctx.arc(player.x, player.y, 60, 
                        player.facing - Math.PI/6, 
                        player.facing + Math.PI/6);
                    this.ctx.stroke();
                }
            }
            
            this.ctx.restore();
        }
        
        // Draw HUD
        this.drawHUD(gameState);
    }
    
    drawGrid() {
        const gridSize = 50;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.canvas.width * 3; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height * 3);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.canvas.height * 3; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width * 3, y);
            this.ctx.stroke();
        }
    }
    
    drawHUD(gameState) {
        if (!gameState.player) return;
        
        const player = gameState.player;
        
        // Health bar
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(20, 20, 200, 30);
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(22, 22, 196 * (player.health / player.maxHealth), 26);
        
        // Energy bar
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(20, 60, 200, 20);
        this.ctx.fillStyle = '#00f';
        this.ctx.fillRect(22, 62, 196 * (player.energy / player.maxEnergy), 16);
        
        // Score
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText('Score: ' + (gameState.score || 0), 20, 110);
        
        // WASM indicator
        this.ctx.fillStyle = this.isWASM ? '#0f0' : '#ff0';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(this.isWASM ? 'WASM' : 'JS', this.canvas.width - 50, 20);
    }
    
    pause() {
        this.isPaused = true;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    resume() {
        this.isPaused = false;
        this.gameLoop();
    }
}

// Export for use in game.html
window.EnhancedCombatGame = EnhancedCombatGame;
EOF

echo -e "${GREEN}✓ Wrapper created successfully!${NC}"
echo -e "${GREEN}Build complete!${NC}"