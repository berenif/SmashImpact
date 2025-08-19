#!/bin/bash

# Build script for WebAssembly game engine
# This script compiles the C++ game engine to WebAssembly using Emscripten

echo "Building WebAssembly game engine..."

# Source Emscripten environment
source /workspace/emsdk/emsdk_env.sh

# Build flags for optimization and features
EMCC_FLAGS=(
    -O3                           # Maximum optimization
    -s WASM=1                     # Generate WebAssembly
    -s MODULARIZE=1              # Export as ES6 module
    -s EXPORT_ES6=1              # ES6 module format
    -s EXPORT_NAME="GameEngineModule"  # Module name
    -s ALLOW_MEMORY_GROWTH=1     # Allow dynamic memory growth
    -s INITIAL_MEMORY=16MB       # Initial memory allocation
    -s MAXIMUM_MEMORY=256MB      # Maximum memory limit
    -s ASSERTIONS=0              # Disable assertions in production
    -s SAFE_HEAP=0              # Disable heap safety checks
    -s STACK_OVERFLOW_CHECK=0    # Disable stack overflow checks
    -s DISABLE_EXCEPTION_CATCHING=0  # Enable exception handling
    -lembind                     # Enable embind for C++ bindings
    --no-entry                   # No main function needed
    -s ENVIRONMENT='web'         # Target web environment
    -s SINGLE_FILE=0            # Separate .wasm file
    -s FILESYSTEM=0             # No filesystem needed
    -s "EXPORTED_FUNCTIONS=['_malloc','_free']"  # Export memory functions
    -s "EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"  # Runtime methods
)

# Development build with debugging
if [ "$1" = "debug" ]; then
    echo "Building debug version..."
    EMCC_FLAGS=(
        -O0                      # No optimization
        -g                       # Debug symbols
        -s ASSERTIONS=2          # Enable all assertions
        -s SAFE_HEAP=1          # Enable heap safety checks
        -s STACK_OVERFLOW_CHECK=2  # Enable stack overflow checks
        -s DEMANGLE_SUPPORT=1    # Better error messages
        "${EMCC_FLAGS[@]}"
    )
fi

# Compile the C++ source to WebAssembly
emcc game_engine.cpp \
    "${EMCC_FLAGS[@]}" \
    -o ../public/game_engine.js

# Check if compilation was successful
if [ $? -eq 0 ]; then
    echo "✓ WebAssembly build successful!"
    echo "  Output files:"
    echo "    - ../public/game_engine.js"
    echo "    - ../public/game_engine.wasm"
    
    # Display file sizes
    echo ""
    echo "File sizes:"
    ls -lh ../public/game_engine.js ../public/game_engine.wasm 2>/dev/null | awk '{print "    " $9 ": " $5}'
else
    echo "✗ Build failed!"
    exit 1
fi

# Create a simple HTML test page if it doesn't exist
if [ ! -f "../public/wasm-test.html" ]; then
    echo "Creating test HTML page..."
    cat > ../public/wasm-test.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebAssembly Game Engine Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #1a1a1a;
            color: #fff;
        }
        #performance {
            background: #2a2a2a;
            padding: 10px;
            border-radius: 5px;
            margin-top: 20px;
        }
        .metric {
            margin: 5px 0;
        }
        button {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 5px;
            border-radius: 5px;
            cursor: pointer;
        }
        button:hover {
            background: #45a049;
        }
    </style>
</head>
<body>
    <h1>WebAssembly Game Engine Test</h1>
    <div>
        <button onclick="runBenchmark()">Run Benchmark</button>
        <button onclick="startStressTest()">Start Stress Test</button>
        <button onclick="stopTest()">Stop Test</button>
    </div>
    <div id="performance">
        <h3>Performance Metrics</h3>
        <div class="metric">Physics Time: <span id="physicsTime">-</span> ms</div>
        <div class="metric">Collision Time: <span id="collisionTime">-</span> ms</div>
        <div class="metric">Collision Checks: <span id="collisionChecks">-</span></div>
        <div class="metric">Active Entities: <span id="entityCount">-</span></div>
        <div class="metric">FPS: <span id="fps">-</span></div>
    </div>
    <div id="output"></div>

    <script type="module">
        import GameEngineModule from './game_engine.js';
        
        let engine = null;
        let testInterval = null;
        let lastTime = performance.now();
        let frameCount = 0;
        
        // Initialize the WebAssembly module
        GameEngineModule().then(Module => {
            window.Module = Module;
            console.log('WebAssembly module loaded successfully!');
            
            // Create game engine instance
            engine = new Module.GameEngine(1600, 1000);
            window.engine = engine;
            
            // Create player
            const playerId = engine.createPlayer(800, 500);
            console.log('Player created with ID:', playerId);
            
            // Create some initial enemies
            for (let i = 0; i < 5; i++) {
                engine.createEnemy(
                    Math.random() * 1600,
                    Math.random() * 1000,
                    2 + Math.random() * 3
                );
            }
            
            console.log('Engine initialized with test entities');
        }).catch(err => {
            console.error('Failed to load WebAssembly module:', err);
        });
        
        window.runBenchmark = function() {
            if (!engine) {
                alert('Engine not loaded yet!');
                return;
            }
            
            console.log('Running benchmark...');
            const output = document.getElementById('output');
            output.innerHTML = '<h3>Benchmark Results</h3>';
            
            // Test with different entity counts
            const entityCounts = [10, 50, 100, 200, 500];
            const results = [];
            
            for (const count of entityCounts) {
                // Clear existing entities
                const positions = engine.getEntityPositions();
                for (let i = 0; i < positions.length; i++) {
                    const entity = positions[i];
                    if (entity.type !== 0) { // Not player
                        engine.removeEntity(entity.id);
                    }
                }
                
                // Create test entities
                for (let i = 0; i < count; i++) {
                    engine.createEnemy(
                        Math.random() * 1600,
                        Math.random() * 1000,
                        2 + Math.random() * 3
                    );
                }
                
                // Run update loop and measure performance
                const startTime = performance.now();
                for (let frame = 0; frame < 100; frame++) {
                    engine.update(16.67); // 60 FPS
                }
                const endTime = performance.now();
                const avgTime = (endTime - startTime) / 100;
                
                const metrics = engine.getPerformanceMetrics();
                results.push({
                    entities: count,
                    avgFrameTime: avgTime.toFixed(2),
                    physicsTime: metrics.physicsTime.toFixed(2),
                    collisionTime: metrics.collisionTime.toFixed(2),
                    collisionChecks: metrics.collisionChecks
                });
                
                output.innerHTML += `
                    <div>
                        <strong>${count} entities:</strong> 
                        ${avgTime.toFixed(2)}ms avg, 
                        ${(1000/avgTime).toFixed(0)} FPS potential
                    </div>
                `;
            }
            
            console.table(results);
        };
        
        window.startStressTest = function() {
            if (!engine) {
                alert('Engine not loaded yet!');
                return;
            }
            
            if (testInterval) {
                clearInterval(testInterval);
            }
            
            console.log('Starting stress test...');
            
            // Add many entities
            for (let i = 0; i < 100; i++) {
                engine.createEnemy(
                    Math.random() * 1600,
                    Math.random() * 1000,
                    2 + Math.random() * 3
                );
            }
            
            // Start update loop
            testInterval = setInterval(() => {
                const deltaTime = 16.67; // 60 FPS target
                
                // Simulate player input
                const time = performance.now() / 1000;
                const dx = Math.sin(time) * 0.5;
                const dy = Math.cos(time) * 0.5;
                engine.updatePlayerInput(dx, dy, deltaTime);
                
                // Update engine
                engine.update(deltaTime);
                
                // Update metrics display
                const metrics = engine.getPerformanceMetrics();
                document.getElementById('physicsTime').textContent = metrics.physicsTime.toFixed(2);
                document.getElementById('collisionTime').textContent = metrics.collisionTime.toFixed(2);
                document.getElementById('collisionChecks').textContent = metrics.collisionChecks;
                document.getElementById('entityCount').textContent = metrics.activeEntities;
                
                // Calculate FPS
                frameCount++;
                const now = performance.now();
                if (now - lastTime > 1000) {
                    document.getElementById('fps').textContent = frameCount;
                    frameCount = 0;
                    lastTime = now;
                }
                
                // Randomly spawn new enemies
                if (Math.random() < 0.05 && metrics.activeEntities < 500) {
                    engine.createEnemy(
                        Math.random() * 1600,
                        Math.random() * 1000,
                        2 + Math.random() * 3
                    );
                }
            }, 16);
        };
        
        window.stopTest = function() {
            if (testInterval) {
                clearInterval(testInterval);
                testInterval = null;
                console.log('Test stopped');
            }
        };
    </script>
</body>
</html>
EOF
    echo "✓ Test page created at ../public/wasm-test.html"
fi

echo ""
echo "Build complete! Next steps:"
echo "  1. Open public/wasm-test.html in a browser to test the engine"
echo "  2. Integrate the engine into your main game using the JavaScript wrapper"
echo "  3. Run './build.sh debug' for a debug build with better error messages"