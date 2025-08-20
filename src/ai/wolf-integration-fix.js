// Wolf AI Integration Fix Module
// This module ensures proper integration between Wolf AI and the isometric game

(function(window) {
    'use strict';
    
    // Check if Wolf AI is loaded
    if (!window.WolfAI) {
        console.error('Wolf AI system not loaded. Please include wolf-ai.js before this script.');
        return;
    }
    
    // Store original cartesianToIsometric if it exists
    let originalCartesianToIsometric = window.cartesianToIsometric;
    
    // Ensure cartesianToIsometric is available globally for wolves
    window.cartesianToIsometric = function(x, y, z = 0) {
        if (originalCartesianToIsometric) {
            return originalCartesianToIsometric(x, y, z);
        }
        // Fallback implementation
        const TILE_WIDTH = 80;
        const TILE_HEIGHT = 40;
        const VOXEL_HEIGHT = 24;
        
        return {
            x: (x - y) * (TILE_WIDTH / 2),
            y: (x + y) * (TILE_HEIGHT / 2) - z * VOXEL_HEIGHT
        };
    };
    
    // Enhanced Wolf class with proper game integration
    const OriginalWolf = window.WolfAI.Wolf;
    
    window.WolfAI.Wolf = function(x, y, id, gameState) {
        // Call original constructor
        OriginalWolf.call(this, x, y, id, gameState);
        
        // Add additional properties for game integration
        this.type = 'wolf';
        this.radius = 0.4;
        this.color = '#4a5568';
        this.score = 50;
        
        // Override takeDamage to work with game's damage system
        const originalTakeDamage = this.takeDamage.bind(this);
        this.takeDamage = function(amount) {
            const wasDead = this.state === window.WolfAI.WolfState.DEAD;
            const result = originalTakeDamage(amount);
            
            // Create visual feedback
            if (!wasDead && this.gameState && this.gameState.particles) {
                // Hit particles
                for (let i = 0; i < 5; i++) {
                    const particle = {
                        x: this.x,
                        y: this.y,
                        z: 0.5,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 2,
                        color: '#ef4444',
                        size: 4,
                        life: 1,
                        decay: 0.05,
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
                    };
                    
                    if (this.gameState.particles.push) {
                        this.gameState.particles.push(particle);
                    }
                }
                
                // Death explosion
                if (this.state === window.WolfAI.WolfState.DEAD) {
                    for (let i = 0; i < 20; i++) {
                        const particle = {
                            x: this.x,
                            y: this.y,
                            z: 0.5,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            vz: Math.random() * 4,
                            color: this.color,
                            size: 5,
                            life: 1.5,
                            decay: 0.02,
                            glow: true,
                            update: function(dt) {
                                this.x += this.vx * dt * 60;
                                this.y += this.vy * dt * 60;
                                this.z += this.vz * dt * 60;
                                this.vz -= 0.15 * dt * 60;
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
                                    ctx.shadowBlur = 15;
                                }
                                ctx.fillStyle = this.color;
                                ctx.beginPath();
                                ctx.arc(0, 0, this.size * this.life, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.restore();
                            }
                        };
                        
                        if (this.gameState.particles.push) {
                            this.gameState.particles.push(particle);
                        }
                    }
                }
            }
            
            return result;
        };
        
        // Override draw method for isometric rendering
        this.draw = function(ctx) {
            if (this.state === window.WolfAI.WolfState.DEAD) return;
            
            const iso = window.cartesianToIsometric(this.x, this.y, this.z);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            // Shadow
            ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * (1 - this.z / 10)})`;
            ctx.beginPath();
            ctx.ellipse(0, 5, 25, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Body color (red flash when hit)
            const bodyColor = this.hitFlash > 0 ? '#ef4444' : this.color;
            
            // Wolf body shape
            ctx.fillStyle = bodyColor;
            ctx.save();
            ctx.rotate(this.facing);
            
            // Main body
            ctx.beginPath();
            ctx.ellipse(0, -10, 20, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Head
            ctx.beginPath();
            ctx.ellipse(15, -12, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Snout
            ctx.beginPath();
            ctx.ellipse(25, -10, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Ears
            ctx.beginPath();
            ctx.moveTo(10, -18);
            ctx.lineTo(8, -25);
            ctx.lineTo(12, -22);
            ctx.closePath();
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(18, -20);
            ctx.lineTo(16, -27);
            ctx.lineTo(20, -24);
            ctx.closePath();
            ctx.fill();
            
            // Tail with animation
            const tailWag = Math.sin(this.animationPhase * 10) * 0.2;
            ctx.save();
            ctx.rotate(tailWag);
            ctx.beginPath();
            ctx.ellipse(-20, -8, 15, 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Glowing eyes based on state
            if (this.eyeGlow > 0) {
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10 * this.eyeGlow;
                ctx.fillStyle = `rgba(255, 0, 0, ${this.eyeGlow})`;
                ctx.beginPath();
                ctx.arc(18, -15, 2, 0, Math.PI * 2);
                ctx.arc(22, -15, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else {
                // Normal eyes
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(18, -15, 1.5, 0, Math.PI * 2);
                ctx.arc(22, -15, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            
            // Health bar if damaged
            if (this.health < this.maxHealth) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-20, -35, 40, 4);
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = healthPercent > 0.3 ? '#10b981' : '#ef4444';
                ctx.fillRect(-20, -35, 40 * healthPercent, 4);
            }
            
            // Debug state indicator
            if (this.gameState && this.gameState.debugMode) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.state, 0, -45);
                
                if (this.role) {
                    ctx.fillStyle = '#fbbf24';
                    ctx.font = '9px Arial';
                    ctx.fillText(`[${this.role}]`, 0, -55);
                }
            }
            
            ctx.restore();
        };
    };
    
    // Inherit from original Wolf
    window.WolfAI.Wolf.prototype = Object.create(OriginalWolf.prototype);
    window.WolfAI.Wolf.prototype.constructor = window.WolfAI.Wolf;
    
    // Helper function to spawn wolf packs in the game
    window.spawnWolfPack = function(count, gameState) {
        if (!window.WolfAI || !gameState) {
            console.error('Cannot spawn wolves - Wolf AI or game state not available');
            return [];
        }
        
        const wolves = [];
        const pack = [];
        
        // Determine spawn positions
        const gridWidth = gameState.CONFIG?.GRID_WIDTH || 25;
        const gridHeight = gameState.CONFIG?.GRID_HEIGHT || 25;
        
        for (let i = 0; i < count; i++) {
            // Spawn on edges
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: // Top
                    x = 2 + Math.random() * (gridWidth - 4);
                    y = 1;
                    break;
                case 1: // Right
                    x = gridWidth - 2;
                    y = 2 + Math.random() * (gridHeight - 4);
                    break;
                case 2: // Bottom
                    x = 2 + Math.random() * (gridWidth - 4);
                    y = gridHeight - 2;
                    break;
                case 3: // Left
                    x = 2;
                    y = 2 + Math.random() * (gridHeight - 4);
                    break;
            }
            
            // Create wolf
            const wolfId = `wolf_${Date.now()}_${i}`;
            const wolf = new window.WolfAI.Wolf(x, y, wolfId, gameState);
            
            // Scale based on wave if available
            if (gameState.wave) {
                const waveScaling = Math.pow(1.1, gameState.wave.current - 1);
                wolf.health *= waveScaling;
                wolf.maxHealth = wolf.health;
                wolf.damage *= Math.pow(1.05, gameState.wave.current - 1);
                wolf.score = 50 + gameState.wave.current * 10;
            }
            
            wolves.push(wolf);
            pack.push(wolf);
            
            // Add to game arrays
            if (gameState.wolves) {
                gameState.wolves.push(wolf);
            }
            if (gameState.enemies) {
                gameState.enemies.push(wolf);
            }
        }
        
        // Create pack if coordinator exists
        if (gameState.wolfPackCoordinator && pack && pack.length > 0) {
            gameState.wolfPackCoordinator.createPack(pack);
        }
        
        console.log(`Spawned ${count} wolves`);
        return wolves;
    };
    
    // Helper function to update all wolves
    window.updateWolves = function(deltaTime, gameState) {
        if (!gameState || !gameState.wolves) return;
        
        const wolves = gameState.wolves;
        const players = gameState.players ? Array.from(gameState.players.values()) : [];
        const obstacles = gameState.obstacles || [];
        
        // Update each wolf
        for (let i = wolves.length - 1; i >= 0; i--) {
            const wolf = wolves[i];
            
            // Remove dead wolves
            if (wolf.state === window.WolfAI.WolfState.DEAD) {
                wolves.splice(i, 1);
                
                // Remove from enemies array
                const enemyIndex = gameState.enemies.indexOf(wolf);
                if (enemyIndex > -1) {
                    gameState.enemies.splice(enemyIndex, 1);
                }
                
                // Update score
                if (gameState.score !== undefined) {
                    gameState.score += wolf.score;
                }
                if (gameState.currency !== undefined) {
                    gameState.currency += Math.floor(wolf.score / 2);
                }
                
                continue;
            }
            
            // Update wolf AI
            wolf.update(deltaTime, wolves, players, obstacles);
        }
        
        // Update pack coordination
        if (gameState.wolfPackCoordinator) {
            gameState.wolfPackCoordinator.packs.forEach((pack, packId) => {
                gameState.wolfPackCoordinator.updatePack(packId);
                
                // Coordinate attacks
                if (pack.members && members.length > 0 && players && players.length > 0) {
                    const alpha = pack.alpha;
                    if (alpha && alpha.target && !pack.target) {
                        gameState.wolfPackCoordinator.coordinateAttack(pack, alpha.target);
                    }
                }
            });
        }
    };
    
    console.log('Wolf AI Integration Fix loaded successfully');
    
})(window);