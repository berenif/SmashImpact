#!/bin/bash

# Build script for Wolf AI WASM module
echo "Building Wolf AI WASM Module..."

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "Error: Emscripten (emcc) is not installed or not in PATH"
    echo "Please install Emscripten: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Create public directory if it doesn't exist
mkdir -p public

# Compile the Wolf AI module
echo "Compiling wolf_ai_wasm.cpp..."
emcc wolf_ai_wasm.cpp \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="WolfAIModule" \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web' \
    --bind \
    -o public/wolf_ai.js

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✅ Compilation successful!"
    echo "Generated files:"
    ls -lh public/wolf_ai.js public/wolf_ai.wasm 2>/dev/null
    
    # Generate usage example
    cat > public/wolf_ai_example.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Wolf AI WASM Test</title>
    <style>
        body { font-family: Arial; padding: 20px; background: #1a1a1a; color: #fff; }
        canvas { border: 2px solid #444; background: #000; }
        .info { margin: 10px 0; }
        .state { padding: 5px 10px; border-radius: 5px; display: inline-block; }
        .state-0 { background: #666; } /* IDLE */
        .state-1 { background: #4444ff; } /* PATROL */
        .state-2 { background: #ffaa00; } /* INVESTIGATE */
        .state-3 { background: #ff0000; } /* HUNT */
        .state-4 { background: #ff6600; } /* FLANK */
        .state-5 { background: #ff8800; } /* SEARCH */
    </style>
</head>
<body>
    <h1>Wolf AI WASM Module Test</h1>
    <canvas id="canvas" width="800" height="600"></canvas>
    <div class="info">
        <div>Wolf State: <span id="state" class="state state-0">IDLE</span></div>
        <div>Alert Level: <span id="alert">0</span></div>
        <div>Position: <span id="pos">0, 0</span></div>
        <div>Click to move player • Fast movement triggers wolf hearing</div>
    </div>
    
    <script type="module">
        import WolfAIModule from './wolf_ai.js';
        
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        let wolfManager;
        let wolfId;
        let player = { x: 400, y: 300, vx: 0, vy: 0 };
        let lastPlayerPos = { x: 400, y: 300 };
        
        // State names
        const stateNames = ['IDLE', 'PATROL', 'INVESTIGATE', 'HUNT', 'FLANK', 'SEARCH'];
        
        // Initialize WASM module
        WolfAIModule().then(module => {
            wolfManager = new module.WolfPackManager();
            wolfId = wolfManager.createWolf(100, 100, false);
            console.log('Wolf AI initialized!');
            animate();
        });
        
        // Mouse controls
        canvas.addEventListener('click', (e) => {
            const rect = canvas.getBoundingClientRect();
            player.x = e.clientX - rect.left;
            player.y = e.clientY - rect.top;
        });
        
        function animate() {
            // Update player velocity
            player.vx = player.x - lastPlayerPos.x;
            player.vy = player.y - lastPlayerPos.y;
            lastPlayerPos = { x: player.x, y: player.y };
            
            // Check if player is visible (simple distance check)
            const wolfX = wolfManager.getWolfX(wolfId);
            const wolfY = wolfManager.getWolfY(wolfId);
            const dist = Math.sqrt((player.x - wolfX) ** 2 + (player.y - wolfY) ** 2);
            const playerVisible = dist < 400;
            
            // Update wolf AI
            wolfManager.updateWolf(wolfId, 0.016, player.x, player.y, player.vx, player.vy, playerVisible);
            
            // Clear canvas
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw wolf
            const state = wolfManager.getWolfState(wolfId);
            const alertLevel = wolfManager.getWolfAlertLevel(wolfId);
            const rotation = wolfManager.getWolfRotation(wolfId);
            
            ctx.save();
            ctx.translate(wolfX, wolfY);
            ctx.rotate(rotation);
            
            // Wolf body
            const colors = ['#666', '#44f', '#fa0', '#f00', '#f60', '#f80'];
            ctx.fillStyle = colors[state];
            ctx.beginPath();
            ctx.moveTo(-15, -10);
            ctx.lineTo(15, 0);
            ctx.lineTo(-15, 10);
            ctx.closePath();
            ctx.fill();
            
            // Vision cone when hunting/searching
            if (state >= 2) {
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
                ctx.fillStyle = 'rgba(255, 255, 0, 0.05)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 400, -Math.PI/6, Math.PI/6);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            
            ctx.restore();
            
            // Alert indicator
            if (alertLevel > 0) {
                ctx.fillStyle = alertLevel === 2 ? '#f00' : '#ff0';
                ctx.font = '20px Arial';
                ctx.fillText(alertLevel === 2 ? '!' : '?', wolfX - 5, wolfY - 20);
            }
            
            // Draw player
            ctx.fillStyle = '#0f0';
            ctx.beginPath();
            ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Update UI
            document.getElementById('state').className = 'state state-' + state;
            document.getElementById('state').textContent = stateNames[state];
            document.getElementById('alert').textContent = alertLevel.toFixed(1);
            document.getElementById('pos').textContent = `${wolfX.toFixed(0)}, ${wolfY.toFixed(0)}`;
            
            requestAnimationFrame(animate);
        }
    </script>
</body>
</html>
EOF
    
    echo ""
    echo "📝 Test page created: public/wolf_ai_example.html"
    echo ""
    echo "To test the module:"
    echo "1. Start a local server: python3 -m http.server 8000"
    echo "2. Open: http://localhost:8000/public/wolf_ai_example.html"
    
else
    echo "❌ Compilation failed!"
    exit 1
fi