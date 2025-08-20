// Wolf AI Integration Module
// This file integrates the Wolf AI system into the isometric game

(function(window) {
    'use strict';
    
    // Store references
    let gameState = null;
    let wolfPackCoordinator = null;
    let wolves = [];
    let wolfIdCounter = 0;
    
    // Initialize Wolf AI Integration
    function initWolfIntegration(game) {
        if (!window.WolfAI) {
            console.warn('Wolf AI system not loaded');
            return false;
        }
        
        gameState = game;
        wolfPackCoordinator = new window.WolfAI.PackCoordinator();
        
        // Add wolves array to game state
        if (!gameState.wolves) {
            gameState.wolves = [];
        }
        
        // Hook into wave manager
        if (gameState.waveManager) {
            const originalStartWave = gameState.waveManager.startWave;
            gameState.waveManager.startWave = function(waveNumber) {
                originalStartWave.call(this, waveNumber);
                spawnWolvesForWave(waveNumber);
            };
        }
        
        // Hook into update loop
        const originalUpdate = window.updateGame || function() {};
        window.updateGame = function(deltaTime) {
            originalUpdate(deltaTime);
            updateWolves(deltaTime);
        };
        
        console.log('Wolf AI integration initialized');
        return true;
    }
    
    // Spawn wolves for a specific wave
    function spawnWolvesForWave(waveNumber) {
        // Start spawning wolves from wave 3
        if (waveNumber < 3) return;
        
        const wolfCount = Math.min(
            2 + Math.floor((waveNumber - 3) / 2),
            window.WolfAI.WOLF_CONFIG.MAX_PACK_SIZE
        );
        
        const spawnPoints = getWolfSpawnPoints(wolfCount);
        const pack = [];
        
        for (let i = 0; i < wolfCount; i++) {
            const wolf = createWolf(
                spawnPoints[i].x,
                spawnPoints[i].y,
                waveNumber
            );
            wolves.push(wolf);
            pack.push(wolf);
            
            // Add to game enemies for collision/targeting
            if (gameState.enemies) {
                gameState.enemies.push(wolf);
            }
        }
        
        // Create pack
        if (pack && pack.length > 0) {
            wolfPackCoordinator.createPack(pack);
        }
        
        console.log(`Spawned ${wolfCount} wolves for wave ${waveNumber}`);
    }
    
    // Create a single wolf
    function createWolf(x, y, waveNumber) {
        const wolf = new window.WolfAI.Wolf(
            x, y,
            `wolf_${wolfIdCounter++}`,
            {
                gridWidth: gameState.CONFIG ? gameState.CONFIG.GRID_WIDTH : 25,
                gridHeight: gameState.CONFIG ? gameState.CONFIG.GRID_HEIGHT : 25,
                obstacles: gameState.obstacles || [],
                particles: gameState.particles || [],
                playSound: playWolfSound
            }
        );
        
        // Scale wolf stats based on wave
        const scaling = Math.pow(1.15, waveNumber - 3);
        wolf.health *= scaling;
        wolf.maxHealth = wolf.health;
        wolf.damage *= Math.pow(1.1, waveNumber - 3);
        
        // Override draw method to use game's isometric conversion
        const originalDraw = wolf.draw.bind(wolf);
        wolf.draw = function(ctx) {
            if (window.cartesianToIsometric) {
                originalDraw(ctx, window.cartesianToIsometric);
            }
        };
        
        // Add wolf-specific properties for game integration
        wolf.type = 'wolf';
        wolf.score = 25 + waveNumber * 5;
        wolf.radius = 0.4;
        
        return wolf;
    }
    
    // Get spawn points for wolves
    function getWolfSpawnPoints(count) {
        const points = [];
        const gridWidth = gameState.CONFIG ? gameState.CONFIG.GRID_WIDTH : 25;
        const gridHeight = gameState.CONFIG ? gameState.CONFIG.GRID_HEIGHT : 25;
        
        // Spawn wolves in corners and edges for ambush positions
        const corners = [
            { x: 2, y: 2 },
            { x: gridWidth - 2, y: 2 },
            { x: 2, y: gridHeight - 2 },
            { x: gridWidth - 2, y: gridHeight - 2 }
        ];
        
        // Shuffle corners
        for (let i = corners.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [corners[i], corners[j]] = [corners[j], corners[i]];
        }
        
        // Use corners first, then random edge positions
        for (let i = 0; i < count; i++) {
            if (i < corners.length) {
                points.push(corners[i]);
            } else {
                // Random edge position
                const edge = Math.floor(Math.random() * 4);
                let x, y;
                
                switch(edge) {
                    case 0: // Top
                        x = 2 + Math.random() * (gridWidth - 4);
                        y = 1;
                        break;
                    case 1: // Right
                        x = gridWidth - 1;
                        y = 2 + Math.random() * (gridHeight - 4);
                        break;
                    case 2: // Bottom
                        x = 2 + Math.random() * (gridWidth - 4);
                        y = gridHeight - 1;
                        break;
                    case 3: // Left
                        x = 1;
                        y = 2 + Math.random() * (gridHeight - 4);
                        break;
                }
                
                points.push({ x, y });
            }
        }
        
        return points;
    }
    
    // Update all wolves
    function updateWolves(deltaTime) {
        if (!wolves || wolves.length === 0) return;
        
        const players = gameState.players ? Array.from(gameState.players.values()) : [];
        const obstacles = gameState.obstacles || [];
        
        // Update wolves
        for (let i = wolves.length - 1; i >= 0; i--) {
            const wolf = wolves[i];
            
            if (wolf.state === window.WolfAI.WolfState.DEAD) {
                // Remove dead wolf
                wolves.splice(i, 1);
                
                // Remove from game enemies
                const enemyIndex = gameState.enemies.indexOf(wolf);
                if (enemyIndex > -1) {
                    gameState.enemies.splice(enemyIndex, 1);
                }
                
                // Add score
                if (gameState.score !== undefined) {
                    gameState.score += wolf.score;
                }
                if (gameState.currency !== undefined) {
                    gameState.currency += Math.floor(wolf.score / 2);
                }
                
                continue;
            }
            
            wolf.update(deltaTime, wolves, players, obstacles);
        }
        
        // Update pack coordination
        if (wolfPackCoordinator) {
            wolfPackCoordinator.packs.forEach((pack, packId) => {
                wolfPackCoordinator.updatePack(packId);
                
                // Coordinate attacks on nearby players
                if (pack.members && members.length > 0 && !pack.target) {
                    const alpha = pack.alpha;
                    if (alpha && alpha.target) {
                        wolfPackCoordinator.coordinateAttack(pack, alpha.target);
                    }
                }
            });
        }
    }
    
    // Play wolf sounds
    function playWolfSound(soundType) {
        // This would integrate with the game's audio system
        // For now, just log it
        console.log(`Wolf sound: ${soundType}`);
        
        // If the game has an audio system, use it
        if (gameState && gameState.playSound) {
            gameState.playSound(soundType);
        }
    }
    
    // Draw all wolves
    function drawWolves(ctx) {
        if (!wolves) return;
        
        wolves.forEach(wolf => {
            if (wolf.state !== window.WolfAI.WolfState.DEAD) {
                wolf.draw(ctx);
            }
        });
    }
    
    // Handle wolf damage (called when player attacks wolf)
    function damageWolf(wolf, amount) {
        if (!wolf || wolf.state === window.WolfAI.WolfState.DEAD) return false;
        
        const killed = wolf.takeDamage(amount);
        
        if (killed) {
            // Create death particles
            if (gameState && gameState.particles) {
                for (let i = 0; i < 20; i++) {
                    gameState.particles.push({
                        x: wolf.x,
                        y: wolf.y,
                        z: 0.5,
                        vx: (Math.random() - 0.5) * 5,
                        vy: (Math.random() - 0.5) * 5,
                        vz: Math.random() * 4,
                        color: '#4a5568',
                        size: 5,
                        life: 1,
                        decay: 0.02,
                        glow: true,
                        update: function(dt) {
                            this.x += this.vx * dt * 60;
                            this.y += this.vy * dt * 60;
                            this.z += this.vz * dt * 60;
                            this.vz -= 0.1 * dt * 60;
                            if (this.z < 0) {
                                this.z = 0;
                                this.vz *= -0.5;
                            }
                            this.life -= this.decay * dt * 60;
                            return this.life > 0;
                        },
                        draw: function(ctx) {
                            if (!window.cartesianToIsometric) return;
                            const iso = window.cartesianToIsometric(this.x, this.y, this.z);
                            ctx.save();
                            ctx.globalAlpha = this.life;
                            ctx.translate(iso.x, iso.y);
                            if (this.glow) {
                                ctx.shadowColor = this.color;
                                ctx.shadowBlur = 10;
                            }
                            ctx.fillStyle = this.color;
                            ctx.beginPath();
                            ctx.arc(0, 0, this.size * this.life, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    });
                }
            }
        }
        
        return killed;
    }
    
    // Export integration functions
    window.WolfIntegration = {
        init: initWolfIntegration,
        spawnWolvesForWave: spawnWolvesForWave,
        updateWolves: updateWolves,
        drawWolves: drawWolves,
        damageWolf: damageWolf,
        getWolves: () => wolves,
        getPackCoordinator: () => wolfPackCoordinator
    };
    
})(window);