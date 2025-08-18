// Isometric Game Engine for Smash Impact
(function() {
    'use strict';

    // Game configuration
    const CONFIG = {
        TILE_WIDTH: 64,
        TILE_HEIGHT: 32,
        GRID_WIDTH: 20,
        GRID_HEIGHT: 20,
        PLAYER_SPEED: 5,
        FPS: 60,
        DEBUG: false
    };

    // Game state
    let canvas, ctx;
    let gameState = {
        players: new Map(),
        projectiles: [],
        effects: [],
        camera: { x: 0, y: 0, zoom: 1 },
        input: {
            keys: {},
            mouse: { x: 0, y: 0, isDown: false },
            touch: { active: false, x: 0, y: 0 },
            joystick: { x: 0, y: 0, active: false }
        },
        localPlayer: null,
        lastTime: 0,
        deltaTime: 0,
        fps: 0,
        fpsCounter: 0,
        fpsTime: 0
    };

    // Isometric conversion functions
    function cartesianToIsometric(x, y) {
        return {
            x: (x - y) * (CONFIG.TILE_WIDTH / 2),
            y: (x + y) * (CONFIG.TILE_HEIGHT / 2)
        };
    }

    function isometricToCartesian(isoX, isoY) {
        return {
            x: (isoX / (CONFIG.TILE_WIDTH / 2) + isoY / (CONFIG.TILE_HEIGHT / 2)) / 2,
            y: (isoY / (CONFIG.TILE_HEIGHT / 2) - isoX / (CONFIG.TILE_WIDTH / 2)) / 2
        };
    }

    // Player class
    class Player {
        constructor(id, x = 10, y = 10) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.health = 100;
            this.maxHealth = 100;
            this.color = this.generateColor(id);
            this.radius = 0.4;
            this.angle = 0;
            this.score = 0;
            this.isLocal = false;
            this.lastShoot = 0;
            this.shootCooldown = 250; // ms
        }

        generateColor(id) {
            const colors = ['#6366f1', '#22d3ee', '#10b981', '#f59e0b', '#ef4444', '#a855f7'];
            return colors[parseInt(id) % colors.length];
        }

        update(deltaTime) {
            // Apply velocity
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Keep player in bounds
            this.x = Math.max(0, Math.min(CONFIG.GRID_WIDTH, this.x));
            this.y = Math.max(0, Math.min(CONFIG.GRID_HEIGHT, this.y));

            // Apply friction
            this.vx *= 0.9;
            this.vy *= 0.9;
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 10, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw player body
            ctx.fillStyle = this.color;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(0, -10, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw health bar
            if (this.health < this.maxHealth) {
                const barWidth = 40;
                const barHeight = 4;
                const barY = -35;

                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);

                ctx.fillStyle = this.health > 30 ? '#10b981' : '#ef4444';
                ctx.fillRect(-barWidth/2, barY, barWidth * (this.health / this.maxHealth), barHeight);
            }

            // Draw player name
            if (this.id) {
                ctx.fillStyle = 'white';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Player ${this.id}`, 0, -40);
            }

            ctx.restore();
        }

        shoot(targetX, targetY) {
            const now = Date.now();
            if (now - this.lastShoot < this.shootCooldown) return null;
            
            this.lastShoot = now;
            
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist === 0) return null;
            
            return new Projectile(
                this.x, this.y,
                (dx / dist) * 10,
                (dy / dist) * 10,
                this.color,
                this.id
            );
        }
    }

    // Projectile class
    class Projectile {
        constructor(x, y, vx, vy, color, ownerId) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.ownerId = ownerId;
            this.lifetime = 2000; // ms
            this.createdAt = Date.now();
            this.radius = 0.15;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
            // Check bounds
            if (this.x < 0 || this.x > CONFIG.GRID_WIDTH || 
                this.y < 0 || this.y > CONFIG.GRID_HEIGHT) {
                return false;
            }
            
            // Check lifetime
            if (Date.now() - this.createdAt > this.lifetime) {
                return false;
            }
            
            return true;
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            // Draw projectile
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.arc(0, -5, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }

        checkCollision(player) {
            if (player.id === this.ownerId) return false;
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            return dist < (player.radius + this.radius);
        }
    }

    // Initialize canvas and context
    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        ctx = canvas.getContext('2d');
        
        // Set canvas size
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Initialize local player
        const playerId = Math.random().toString(36).substr(2, 9);
        gameState.localPlayer = new Player(playerId, 10, 10);
        gameState.localPlayer.isLocal = true;
        gameState.players.set(playerId, gameState.localPlayer);
        
        // Setup input handlers
        setupInputHandlers();
        
        // Setup multiplayer if available
        if (typeof window.MultiplayerManager !== 'undefined') {
            setupMultiplayer();
        }
        
        // Start game loop
        requestAnimationFrame(gameLoop);
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Center camera on grid
        gameState.camera.x = canvas.width / 2 - (CONFIG.GRID_WIDTH * CONFIG.TILE_WIDTH) / 4;
        gameState.camera.y = canvas.height / 2 - (CONFIG.GRID_HEIGHT * CONFIG.TILE_HEIGHT) / 2;
    }

    function setupInputHandlers() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            gameState.input.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            gameState.input.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse controls
        canvas.addEventListener('mousemove', (e) => {
            gameState.input.mouse.x = e.clientX;
            gameState.input.mouse.y = e.clientY;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            gameState.input.mouse.isDown = true;
            handleShoot(e.clientX, e.clientY);
        });
        
        canvas.addEventListener('mouseup', () => {
            gameState.input.mouse.isDown = false;
        });
        
        // Touch controls
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            gameState.input.touch.active = true;
            gameState.input.touch.x = touch.clientX;
            gameState.input.touch.y = touch.clientY;
            handleShoot(touch.clientX, touch.clientY);
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            gameState.input.touch.x = touch.clientX;
            gameState.input.touch.y = touch.clientY;
        });
        
        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            gameState.input.touch.active = false;
        });
        
        // Mobile joystick controls
        setupMobileControls();
    }

    function setupMobileControls() {
        const joystickBase = document.querySelector('.joystick-base');
        const joystickKnob = document.querySelector('.joystick-knob');
        
        if (!joystickBase || !joystickKnob) return;
        
        let joystickActive = false;
        let joystickCenter = { x: 0, y: 0 };
        
        function handleJoystickStart(e) {
            joystickActive = true;
            const rect = joystickBase.getBoundingClientRect();
            joystickCenter.x = rect.left + rect.width / 2;
            joystickCenter.y = rect.top + rect.height / 2;
        }
        
        function handleJoystickMove(e) {
            if (!joystickActive) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const dx = clientX - joystickCenter.x;
            const dy = clientY - joystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 40;
            
            let knobX = dx;
            let knobY = dy;
            
            if (distance > maxDistance) {
                knobX = (dx / distance) * maxDistance;
                knobY = (dy / distance) * maxDistance;
            }
            
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
            
            gameState.input.joystick.x = knobX / maxDistance;
            gameState.input.joystick.y = knobY / maxDistance;
            gameState.input.joystick.active = true;
        }
        
        function handleJoystickEnd() {
            joystickActive = false;
            joystickKnob.style.transform = 'translate(0, 0)';
            gameState.input.joystick.x = 0;
            gameState.input.joystick.y = 0;
            gameState.input.joystick.active = false;
        }
        
        joystickBase.addEventListener('mousedown', handleJoystickStart);
        joystickBase.addEventListener('touchstart', handleJoystickStart);
        
        window.addEventListener('mousemove', handleJoystickMove);
        window.addEventListener('touchmove', handleJoystickMove);
        
        window.addEventListener('mouseup', handleJoystickEnd);
        window.addEventListener('touchend', handleJoystickEnd);
    }

    function handleShoot(screenX, screenY) {
        if (!gameState.localPlayer) return;
        
        // Convert screen coordinates to world coordinates
        const worldX = screenX - gameState.camera.x;
        const worldY = screenY - gameState.camera.y;
        
        // Convert to cartesian grid coordinates
        const target = isometricToCartesian(worldX, worldY);
        
        const projectile = gameState.localPlayer.shoot(target.x, target.y);
        if (projectile) {
            gameState.projectiles.push(projectile);
            
            // Send to multiplayer if connected
            if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
                window.multiplayerManager.sendGameState({
                    type: 'shoot',
                    projectile: {
                        x: projectile.x,
                        y: projectile.y,
                        vx: projectile.vx,
                        vy: projectile.vy,
                        color: projectile.color,
                        ownerId: projectile.ownerId
                    }
                });
            }
        }
    }

    function setupMultiplayer() {
        if (!window.multiplayerManager) {
            window.multiplayerManager = new window.MultiplayerManager();
        }
        
        window.multiplayerManager.onPlayerJoin = (playerId) => {
            if (!gameState.players.has(playerId)) {
                const player = new Player(playerId);
                gameState.players.set(playerId, player);
            }
        };
        
        window.multiplayerManager.onPlayerLeave = (playerId) => {
            gameState.players.delete(playerId);
        };
        
        window.multiplayerManager.onGameStateUpdate = (data) => {
            if (data.type === 'position' && data.playerId !== gameState.localPlayer.id) {
                const player = gameState.players.get(data.playerId);
                if (player) {
                    player.x = data.x;
                    player.y = data.y;
                    player.vx = data.vx;
                    player.vy = data.vy;
                }
            } else if (data.type === 'shoot') {
                const projectile = new Projectile(
                    data.projectile.x,
                    data.projectile.y,
                    data.projectile.vx,
                    data.projectile.vy,
                    data.projectile.color,
                    data.projectile.ownerId
                );
                gameState.projectiles.push(projectile);
            }
        };
    }

    function handleInput() {
        if (!gameState.localPlayer) return;
        
        const player = gameState.localPlayer;
        const speed = CONFIG.PLAYER_SPEED;
        
        // Keyboard input
        if (gameState.input.keys['w'] || gameState.input.keys['arrowup']) {
            player.vy -= speed * 0.1;
        }
        if (gameState.input.keys['s'] || gameState.input.keys['arrowdown']) {
            player.vy += speed * 0.1;
        }
        if (gameState.input.keys['a'] || gameState.input.keys['arrowleft']) {
            player.vx -= speed * 0.1;
        }
        if (gameState.input.keys['d'] || gameState.input.keys['arrowright']) {
            player.vx += speed * 0.1;
        }
        
        // Joystick input
        if (gameState.input.joystick.active) {
            player.vx += gameState.input.joystick.x * speed * 0.1;
            player.vy += gameState.input.joystick.y * speed * 0.1;
        }
    }

    function update(deltaTime) {
        handleInput();
        
        // Update players
        gameState.players.forEach(player => {
            player.update(deltaTime);
        });
        
        // Update projectiles
        gameState.projectiles = gameState.projectiles.filter(projectile => {
            const alive = projectile.update(deltaTime);
            
            if (alive) {
                // Check collisions with players
                gameState.players.forEach(player => {
                    if (projectile.checkCollision(player)) {
                        player.health -= 10;
                        if (player.health <= 0) {
                            player.health = 0;
                            // Respawn after delay
                            setTimeout(() => {
                                player.health = player.maxHealth;
                                player.x = Math.random() * CONFIG.GRID_WIDTH;
                                player.y = Math.random() * CONFIG.GRID_HEIGHT;
                            }, 3000);
                        }
                        return false;
                    }
                });
            }
            
            return alive;
        });
        
        // Send position update to multiplayer
        if (window.multiplayerManager && window.multiplayerManager.isConnected()) {
            const player = gameState.localPlayer;
            window.multiplayerManager.sendGameState({
                type: 'position',
                playerId: player.id,
                x: player.x,
                y: player.y,
                vx: player.vx,
                vy: player.vy
            });
        }
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(100, 100, 200, 0.2)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
                const iso = cartesianToIsometric(x, y);
                
                if (x < CONFIG.GRID_WIDTH) {
                    const nextIso = cartesianToIsometric(x + 1, y);
                    ctx.beginPath();
                    ctx.moveTo(iso.x, iso.y);
                    ctx.lineTo(nextIso.x, nextIso.y);
                    ctx.stroke();
                }
                
                if (y < CONFIG.GRID_HEIGHT) {
                    const nextIso = cartesianToIsometric(x, y + 1);
                    ctx.beginPath();
                    ctx.moveTo(iso.x, iso.y);
                    ctx.lineTo(nextIso.x, nextIso.y);
                    ctx.stroke();
                }
            }
        }
    }

    function render() {
        // Clear canvas
        ctx.fillStyle = '#0a0e27';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Apply camera transform
        ctx.save();
        ctx.translate(gameState.camera.x, gameState.camera.y);
        ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
        
        // Draw grid
        drawGrid();
        
        // Draw projectiles
        gameState.projectiles.forEach(projectile => {
            projectile.draw(ctx);
        });
        
        // Draw players
        gameState.players.forEach(player => {
            player.draw(ctx);
        });
        
        // Draw effects
        if (window.VisualEffects) {
            window.VisualEffects.render(ctx);
        }
        
        ctx.restore();
        
        // Draw UI
        drawUI();
    }

    function drawUI() {
        // FPS counter
        const fpsElement = document.getElementById('fpsCounter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${Math.round(gameState.fps)}`;
        }
        
        // Score
        if (gameState.localPlayer) {
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.fillText(`Health: ${gameState.localPlayer.health}`, 10, 30);
            ctx.fillText(`Score: ${gameState.localPlayer.score}`, 10, 50);
        }
        
        // Player count
        ctx.fillText(`Players: ${gameState.players.size}`, 10, 70);
    }

    function gameLoop(currentTime) {
        // Calculate delta time
        gameState.deltaTime = (currentTime - gameState.lastTime) / 1000;
        gameState.lastTime = currentTime;
        
        // Calculate FPS
        gameState.fpsCounter++;
        if (currentTime - gameState.fpsTime >= 1000) {
            gameState.fps = gameState.fpsCounter;
            gameState.fpsCounter = 0;
            gameState.fpsTime = currentTime;
        }
        
        // Update and render
        update(gameState.deltaTime);
        render();
        
        // Continue loop
        requestAnimationFrame(gameLoop);
    }

    // Start the game when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export for debugging
    window.IsometricGame = {
        gameState,
        CONFIG,
        cartesianToIsometric,
        isometricToCartesian
    };
})();