// Isometric Wave-Based Game Engine for Smash Impact - Beautiful Edition
(function() {
    'use strict';

    // Game configuration
    const CONFIG = {
        TILE_WIDTH: 80,
        TILE_HEIGHT: 40,
        GRID_WIDTH: 25,
        GRID_HEIGHT: 25,
        PLAYER_SPEED: 5,
        FPS: 60,
        DEBUG: false,
        CAMERA_SMOOTHING: 0.12,
        ZOOM_DEFAULT: 1.6,
        ZOOM_MOBILE: 1.3,
        VOXEL_HEIGHT: 24,
        AMBIENT_LIGHT: 0.4,
        SHADOW_OPACITY: 0.3
    };

    // Color palette for consistent aesthetics
    const COLORS = {
        ground: ['#2d3748', '#4a5568', '#718096'],
        grass: ['#065f46', '#047857', '#059669'],
        stone: ['#4b5563', '#6b7280', '#9ca3af'],
        wood: ['#92400e', '#b45309', '#d97706'],
        player: '#6366f1',
        playerGlow: '#818cf8',
        enemyRed: '#ef4444',
        enemyOrange: '#f59e0b',
        enemyPurple: '#8b5cf6',
        enemyGray: '#6b7280',
        projectileGlow: '#fbbf24',
        healthGreen: '#10b981',
        healthRed: '#ef4444',
        shieldBlue: '#3b82f6',
        uiDark: 'rgba(15, 23, 42, 0.9)',
        uiLight: 'rgba(241, 245, 249, 0.95)'
    };

    // Device detection
    const isMobile = () => {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (window.innerWidth <= 768);
    };

    // Game state
    let canvas, ctx;
    let visualEffects = null;
    let animationTime = 0;
    let gameState = {
        players: new Map(),
        enemies: [],
        projectiles: [],
        effects: [],
        obstacles: [],
        groundTiles: [],
        decorations: [],
        particles: [],
        camera: { 
            x: 0, 
            y: 0, 
            targetX: 0,
            targetY: 0,
            zoom: isMobile() ? CONFIG.ZOOM_MOBILE : CONFIG.ZOOM_DEFAULT,
            shake: 0,
            shakeX: 0,
            shakeY: 0
        },
        input: {
            keys: {},
            mouse: { x: 0, y: 0, isDown: false },
            touch: { active: false, x: 0, y: 0 },
            joystick: { x: 0, y: 0, active: false }
        },
        localPlayer: null,
        wave: {
            current: 0,
            enemies: [],
            spawned: 0,
            completed: false,
            preparationTime: 10,
            timer: 0,
            state: 'preparing'
        },
        score: 0,
        currency: 0,
        combo: 0,
        maxCombo: 0,
        paused: false,
        gameOver: false,
        lastTime: 0,
        deltaTime: 0,
        fps: 0,
        fpsCounter: 0,
        fpsTime: 0,
        deviceType: isMobile() ? 'mobile' : 'desktop'
    };

    // Particle system
    class Particle {
        constructor(x, y, z, options = {}) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.vx = options.vx || (Math.random() - 0.5) * 2;
            this.vy = options.vy || (Math.random() - 0.5) * 2;
            this.vz = options.vz || Math.random() * 2;
            this.color = options.color || '#ffffff';
            this.size = options.size || 3;
            this.life = options.life || 1;
            this.decay = options.decay || 0.02;
            this.gravity = options.gravity || 0.1;
            this.glow = options.glow || false;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime * 60;
            this.y += this.vy * deltaTime * 60;
            this.z += this.vz * deltaTime * 60;
            this.vz -= this.gravity * deltaTime * 60;
            
            if (this.z < 0) {
                this.z = 0;
                this.vz *= -0.5;
            }
            
            this.life -= this.decay * deltaTime * 60;
            return this.life > 0;
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y, this.z);
            
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
    }

    // Isometric conversion functions
    function cartesianToIsometric(x, y, z = 0) {
        return {
            x: (x - y) * (CONFIG.TILE_WIDTH / 2),
            y: (x + y) * (CONFIG.TILE_HEIGHT / 2) - z * CONFIG.VOXEL_HEIGHT
        };
    }

    function isometricToCartesian(isoX, isoY) {
        return {
            x: (isoX / (CONFIG.TILE_WIDTH / 2) + isoY / (CONFIG.TILE_HEIGHT / 2)) / 2,
            y: (isoY / (CONFIG.TILE_HEIGHT / 2) - isoX / (CONFIG.TILE_WIDTH / 2)) / 2
        };
    }

    // Enhanced voxel cube with ambient occlusion
    function drawVoxelCube(ctx, x, y, z, width, height, depth, color, options = {}) {
        const iso = cartesianToIsometric(x, y, z + depth);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = width * CONFIG.TILE_WIDTH / 2;
        const h = height * CONFIG.TILE_HEIGHT / 2;
        const d = depth * CONFIG.VOXEL_HEIGHT;
        
        // Ground shadow - positioned at ground level
        if (!options.noShadow) {
            ctx.save();
            // Shadow at base of object, not floating
            const shadowIso = cartesianToIsometric(x + width/2, y + height/2, 0);
            ctx.translate(shadowIso.x - iso.x, shadowIso.y - iso.y + h);
            ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.SHADOW_OPACITY * 0.6})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 0.9, h * 0.5, 0, 0, Math.PI * 2);
            ctx.filter = 'blur(3px)';
            ctx.fill();
            ctx.restore();
        }
        
        // Ambient light calculation
        const ambientTop = CONFIG.AMBIENT_LIGHT;
        const ambientRight = CONFIG.AMBIENT_LIGHT * 0.8;
        const ambientLeft = CONFIG.AMBIENT_LIGHT * 0.6;
        
        // Top face with gradient
        const topGradient = ctx.createLinearGradient(-w, -d, w, -d + h);
        topGradient.addColorStop(0, shadeColor(color, 20 * ambientTop));
        topGradient.addColorStop(1, shadeColor(color, 0));
        
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        ctx.fill();
        
        // Right face with gradient
        const rightGradient = ctx.createLinearGradient(0, -d + h, w, h/2);
        rightGradient.addColorStop(0, shadeColor(color, -10 * ambientRight));
        rightGradient.addColorStop(1, shadeColor(color, -30 * ambientRight));
        
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Left face with gradient
        const leftGradient = ctx.createLinearGradient(0, -d + h, -w, h/2);
        leftGradient.addColorStop(0, shadeColor(color, -20 * ambientLeft));
        leftGradient.addColorStop(1, shadeColor(color, -40 * ambientLeft));
        
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Edges with anti-aliasing
        ctx.strokeStyle = shadeColor(color, -60);
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Top edges
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        ctx.stroke();
        
        // Vertical edges
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(0, h);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
        ctx.stroke();
        
        // Highlight edge for depth
        ctx.strokeStyle = shadeColor(color, 40);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w * 0.9, -d + h/2 - 2);
        ctx.lineTo(0, -d - 2);
        ctx.lineTo(w * 0.9, -d + h/2 - 2);
        ctx.stroke();
        
        ctx.restore();
    }

    function shadeColor(color, percent) {
        const num = parseInt(color.replace("#",""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + 
                     (G<255?G<1?0:G:255)*0x100 + 
                     (B<255?B<1?0:B:255)).toString(16).slice(1);
    }

    // Ground tile for visual variety
    function drawGroundTile(ctx, x, y, type = 'stone') {
        const iso = cartesianToIsometric(x, y, 0);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = CONFIG.TILE_WIDTH / 2;
        const h = CONFIG.TILE_HEIGHT / 2;
        
        // Base tile
        const colors = type === 'grass' ? COLORS.grass : COLORS.stone;
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, h/2);
        ctx.closePath();
        ctx.fill();
        
        // Subtle texture
        ctx.fillStyle = `rgba(0, 0, 0, ${0.05 + Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, h/2);
        ctx.closePath();
        ctx.fill();
        
        // Edge lines
        ctx.strokeStyle = shadeColor(baseColor, -20);
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        ctx.restore();
    }

    // Player class with enhanced visuals
    class Player {
        constructor(id, x = 12, y = 12) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.z = 0;
            this.vx = 0;
            this.vy = 0;
            this.health = 100;
            this.maxHealth = 100;
            this.shield = 0;
            this.maxShield = 50;
            this.color = COLORS.player;
            this.glowColor = COLORS.playerGlow;
            this.radius = 0.4;
            this.angle = 0;
            this.score = 0;
            this.currency = 0;
            this.isLocal = false;
            this.lastShoot = 0;
            this.shootCooldown = 250;
            this.damage = 10;
            this.speed = CONFIG.PLAYER_SPEED;
            this.bobOffset = 0;
            this.hitFlash = 0;
        }

        update(deltaTime) {
            // Apply velocity
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            // Keep player in bounds with margin
            this.x = Math.max(1, Math.min(CONFIG.GRID_WIDTH - 1, this.x));
            this.y = Math.max(1, Math.min(CONFIG.GRID_HEIGHT - 1, this.y));

            // Apply friction
            this.vx *= 0.9;
            this.vy *= 0.9;

            // Walking animation
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0.1) {
                this.bobOffset = Math.sin(animationTime * 0.01) * 2;
            } else {
                this.bobOffset *= 0.9;
            }

            // Regenerate shield slowly
            if (this.shield < this.maxShield) {
                this.shield = Math.min(this.maxShield, this.shield + 0.1 * deltaTime);
            }

            // Update hit flash
            if (this.hitFlash > 0) {
                this.hitFlash -= deltaTime * 3;
            }
        }

        takeDamage(amount) {
            // Shield absorbs damage first
            if (this.shield > 0) {
                const shieldDamage = Math.min(this.shield, amount);
                this.shield -= shieldDamage;
                amount -= shieldDamage;
                
                // Shield break effect
                if (this.shield <= 0) {
                    for (let i = 0; i < 10; i++) {
                        gameState.particles.push(new Particle(
                            this.x, this.y, 0.5,
                            {
                                color: COLORS.shieldBlue,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                vz: Math.random() * 3,
                                glow: true
                            }
                        ));
                    }
                }
            }
            
            // Remaining damage goes to health
            this.health = Math.max(0, this.health - amount);
            this.hitFlash = 1;
            
            // Screen shake
            gameState.camera.shake = 5;
            
            // Damage particles
            for (let i = 0; i < 5; i++) {
                gameState.particles.push(new Particle(
                    this.x, this.y, 0.5,
                    {
                        color: '#ff0000',
                        size: 2,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 2
                    }
                ));
            }
            
            // Create damage effect
            if (visualEffects && visualEffects.createImpact) {
                const iso = cartesianToIsometric(this.x, this.y, this.z);
                visualEffects.createImpact(iso.x, iso.y, {
                    color: '#ef4444',
                    particleCount: 15,
                    spread: 180
                });
            }
            
            return this.health <= 0;
        }

        draw(ctx) {
            // Draw player as enhanced voxel character
            const z = 0; // Keep at ground level, only bob the character parts
            const bobZ = this.bobOffset * 0.01;
            
            // Ground contact shadow
            const baseIso = cartesianToIsometric(this.x, this.y, 0);
            ctx.save();
            ctx.translate(baseIso.x, baseIso.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 25, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Glow effect when shielded
            if (this.shield > 0) {
                const iso = cartesianToIsometric(this.x, this.y, bobZ + 0.4);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.globalAlpha = this.shield / this.maxShield * 0.3;
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.shadowColor = COLORS.shieldBlue;
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(0, 0, 35, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Main body
            const bodyColor = this.hitFlash > 0 ? 
                shadeColor(this.color, this.hitFlash * 50) : this.color;
            
            drawVoxelCube(ctx, this.x - 0.3, this.y - 0.3, z + bobZ, 0.6, 0.6, 0.8, bodyColor, { noShadow: true });
            
            // Head
            drawVoxelCube(ctx, this.x - 0.2, this.y - 0.2, z + 0.8, 0.4, 0.4, 0.3, 
                         shadeColor(bodyColor, 10), { noShadow: true });
            
            const iso = cartesianToIsometric(this.x, this.y, z + 1.1);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Name tag with background
            if (this.isLocal) {
                ctx.fillStyle = COLORS.uiDark;
                ctx.fillRect(-25, -55, 50, 18);
                
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px "Segoe UI", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('YOU', 0, -42);
            }

            // Health bar with modern design
            const barWidth = 50;
            const barHeight = 5;
            const barY = -35;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-barWidth/2 - 2, barY - 2, barWidth + 4, barHeight + 4);

            // Health gradient
            const healthGradient = ctx.createLinearGradient(-barWidth/2, 0, barWidth/2, 0);
            const healthColor = this.health > 30 ? COLORS.healthGreen : COLORS.healthRed;
            healthGradient.addColorStop(0, shadeColor(healthColor, -20));
            healthGradient.addColorStop(1, healthColor);
            
            ctx.fillStyle = healthGradient;
            ctx.fillRect(-barWidth/2, barY, barWidth * (this.health / this.maxHealth), barHeight);

            // Shield bar
            if (this.shield > 0) {
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.fillRect(-barWidth/2, barY - 6, barWidth * (this.shield / this.maxShield), 2);
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
            
            // Muzzle flash
            gameState.particles.push(new Particle(
                this.x + (dx/dist) * 0.5, 
                this.y + (dy/dist) * 0.5, 
                0.5,
                {
                    color: COLORS.projectileGlow,
                    size: 8,
                    life: 0.3,
                    decay: 0.1,
                    glow: true,
                    gravity: 0
                }
            ));
            
            return new Projectile(
                this.x, this.y,
                (dx / dist) * 10,
                (dy / dist) * 10,
                this.glowColor,
                this.damage,
                'player'
            );
        }
    }

    // Enemy class with enhanced visuals
    class Enemy {
        constructor(type, x, y) {
            this.type = type;
            this.x = x;
            this.y = y;
            this.z = 0;
            this.vx = 0;
            this.vy = 0;
            this.health = this.getHealth(type);
            this.maxHealth = this.health;
            this.speed = this.getSpeed(type);
            this.damage = this.getDamage(type);
            this.score = this.getScore(type);
            this.radius = 0.35;
            this.color = this.getColor(type);
            this.lastAttack = 0;
            this.attackCooldown = 1000;
            this.target = null;
            this.bobOffset = 0;
            this.hitFlash = 0;
        }

        getHealth(type) {
            const health = { brawler: 30, archer: 20, stalker: 25, bulwark: 60 };
            return health[type] || 30;
        }

        getSpeed(type) {
            const speed = { brawler: 2, archer: 1.8, stalker: 2.8, bulwark: 1.5 };
            return speed[type] || 2;
        }

        getDamage(type) {
            const damage = { brawler: 15, archer: 10, stalker: 20, bulwark: 25 };
            return damage[type] || 10;
        }

        getScore(type) {
            const score = { brawler: 10, archer: 15, stalker: 20, bulwark: 25 };
            return score[type] || 10;
        }

        getColor(type) {
            const colors = {
                brawler: COLORS.enemyRed,
                archer: COLORS.enemyOrange,
                stalker: COLORS.enemyPurple,
                bulwark: COLORS.enemyGray
            };
            return colors[type] || COLORS.enemyRed;
        }

        update(deltaTime) {
            // Find nearest player
            if (!this.target || this.target.health <= 0) {
                let nearestDist = Infinity;
                gameState.players.forEach(player => {
                    if (player.health <= 0) return;
                    const dx = player.x - this.x;
                    const dy = player.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        this.target = player;
                    }
                });
            }

            if (this.target) {
                const dx = this.target.x - this.x;
                const dy = this.target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (this.type === 'archer' && dist < 7 && dist > 3) {
                    this.tryShoot(this.target);
                } else if (dist > 1.5) {
                    // Move towards player
                    this.vx = (dx / dist) * this.speed * deltaTime;
                    this.vy = (dy / dist) * this.speed * deltaTime;
                } else {
                    // Attack if close
                    this.tryAttack(this.target);
                }
            }

            this.x += this.vx;
            this.y += this.vy;
            
            // Keep in bounds with margin
            this.x = Math.max(0.5, Math.min(CONFIG.GRID_WIDTH - 0.5, this.x));
            this.y = Math.max(0.5, Math.min(CONFIG.GRID_HEIGHT - 0.5, this.y));
            
            this.vx *= 0.95;
            this.vy *= 0.95;
            
            // Walking animation
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0.1) {
                this.bobOffset = Math.sin(animationTime * 0.012 + this.x) * 1.5;
            } else {
                this.bobOffset *= 0.9;
            }
            
            // Update hit flash
            if (this.hitFlash > 0) {
                this.hitFlash -= deltaTime * 3;
            }
        }

        tryAttack(player) {
            const now = Date.now();
            if (now - this.lastAttack < this.attackCooldown) return;
            this.lastAttack = now;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1.5 && player && player.takeDamage) {
                player.takeDamage(this.damage);
                
                // Attack effect
                gameState.particles.push(new Particle(
                    player.x, player.y, 0.5,
                    {
                        color: this.color,
                        size: 10,
                        life: 0.3,
                        decay: 0.15,
                        gravity: 0
                    }
                ));
            }
        }

        tryShoot(player) {
            const now = Date.now();
            if (now - this.lastAttack < this.attackCooldown * 1.5) return;
            this.lastAttack = now;
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;
            
            const projectile = new Projectile(
                this.x, this.y,
                (dx / dist) * 4,
                (dy / dist) * 4,
                this.color,
                this.damage,
                'enemy'
            );
            gameState.projectiles.push(projectile);
        }

        takeDamage(amount) {
            this.health -= amount;
            this.hitFlash = 1;
            
            // Hit particles
            for (let i = 0; i < 3; i++) {
                gameState.particles.push(new Particle(
                    this.x, this.y, 0.5,
                    {
                        color: this.color,
                        size: 3,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        vz: Math.random() * 2
                    }
                ));
            }
            
            if (this.health <= 0) {
                // Death explosion
                for (let i = 0; i < 15; i++) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.5,
                        {
                            color: this.color,
                            size: 5,
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            vz: Math.random() * 4,
                            glow: true
                        }
                    ));
                }
                
                gameState.score += this.score;
                gameState.currency += Math.floor(this.score / 2);
                
                // Combo system
                gameState.combo++;
                if (gameState.combo > gameState.maxCombo) {
                    gameState.maxCombo = gameState.combo;
                }
                
                // Visual effect
                if (visualEffects && visualEffects.createExplosion) {
                    const iso = cartesianToIsometric(this.x, this.y, this.z);
                    visualEffects.createExplosion(iso.x, iso.y, {
                        color: this.color,
                        particleCount: 30,
                        force: 10
                    });
                }
                
                return true;
            }
            return false;
        }

        draw(ctx) {
            const z = 0; // Keep enemies grounded
            const bobZ = this.bobOffset * 0.01;
            
            // Ground contact shadow
            const baseIso = cartesianToIsometric(this.x, this.y, 0);
            ctx.save();
            ctx.translate(baseIso.x, baseIso.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Enemy specific shapes
            const size = this.type === 'bulwark' ? 0.5 : 0.4;
            const height = this.type === 'bulwark' ? 0.7 : 0.6;
            
            const bodyColor = this.hitFlash > 0 ? 
                shadeColor(this.color, this.hitFlash * 50) : this.color;
            
            // Different shapes for different enemy types
            if (this.type === 'bulwark') {
                // Tank - wider and taller
                drawVoxelCube(ctx, this.x - size/2, this.y - size/2, z + bobZ, size, size, height, bodyColor, { noShadow: true });
                // Armor plates
                drawVoxelCube(ctx, this.x - size/2 - 0.1, this.y - size/2, z + bobZ + 0.2, 0.1, size, 0.3, 
                             shadeColor(bodyColor, -20), { noShadow: true });
                drawVoxelCube(ctx, this.x + size/2, this.y - size/2, z + bobZ + 0.2, 0.1, size, 0.3, 
                             shadeColor(bodyColor, -20), { noShadow: true });
            } else if (this.type === 'archer') {
                // Archer - slimmer
                drawVoxelCube(ctx, this.x - 0.15, this.y - 0.15, z + bobZ, 0.3, 0.3, 0.6, bodyColor, { noShadow: true });
                // Bow
                const iso = cartesianToIsometric(this.x + 0.3, this.y, z + 0.3);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.strokeStyle = COLORS.wood[1];
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 8, -Math.PI/4, Math.PI/4);
                ctx.stroke();
                ctx.restore();
            } else {
                // Standard enemy
                drawVoxelCube(ctx, this.x - size/2, this.y - size/2, z + bobZ, size, size, height, bodyColor, { noShadow: true });
            }
            
            const iso = cartesianToIsometric(this.x, this.y, z + height);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Health bar
            const barWidth = 35;
            const barHeight = 3;
            const barY = -30;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(-barWidth/2 - 1, barY - 1, barWidth + 2, barHeight + 2);

            const healthPercent = this.health / this.maxHealth;
            const healthColor = healthPercent > 0.5 ? COLORS.enemyRed : '#991b1b';
            
            ctx.fillStyle = healthColor;
            ctx.fillRect(-barWidth/2, barY, barWidth * healthPercent, barHeight);

            ctx.restore();
        }
    }

    // Enhanced Projectile class
    class Projectile {
        constructor(x, y, vx, vy, color, damage, team) {
            this.x = x;
            this.y = y;
            this.z = 0.5;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.damage = damage;
            this.team = team;
            this.lifetime = 2000;
            this.createdAt = Date.now();
            this.radius = 0.15;
            this.trail = [];
            this.rotation = 0;
        }

        update(deltaTime) {
            // Store trail
            this.trail.push({ x: this.x, y: this.y, z: this.z });
            if (this.trail.length > 5) {
                this.trail.shift();
            }
            
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.rotation += 0.3;
            
            if (this.x < 0 || this.x > CONFIG.GRID_WIDTH || 
                this.y < 0 || this.y > CONFIG.GRID_HEIGHT) {
                return false;
            }
            
            if (Date.now() - this.createdAt > this.lifetime) {
                return false;
            }
            
            if (this.team === 'player') {
                for (let enemy of gameState.enemies) {
                    const dx = enemy.x - this.x;
                    const dy = enemy.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < enemy.radius + this.radius) {
                        if (enemy.takeDamage(this.damage)) {
                            const idx = gameState.enemies.indexOf(enemy);
                            if (idx >= 0) gameState.enemies.splice(idx, 1);
                        }
                        this.explode();
                        return false;
                    }
                }
            } else {
                let hit = false;
                gameState.players.forEach(player => {
                    if (!hit && this.checkCollision(player)) {
                        player.takeDamage(this.damage);
                        hit = true;
                    }
                });
                if (hit) {
                    this.explode();
                    return false;
                }
            }
            
            return true;
        }

        explode() {
            // Impact particles
            for (let i = 0; i < 5; i++) {
                gameState.particles.push(new Particle(
                    this.x, this.y, this.z,
                    {
                        color: this.color,
                        size: 3,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 2,
                        glow: true
                    }
                ));
            }
        }

        checkCollision(entity) {
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < (entity.radius + this.radius);
        }

        draw(ctx) {
            // Draw trail
            ctx.save();
            this.trail.forEach((point, index) => {
                const alpha = (index + 1) / this.trail.length * 0.5;
                const iso = cartesianToIsometric(point.x, point.y, point.z);
                
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.translate(iso.x, iso.y);
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.translate(-iso.x, -iso.y);
            });
            ctx.restore();
            
            // Main projectile
            const iso = cartesianToIsometric(this.x, this.y, this.z);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            ctx.rotate(this.rotation);
            
            // Glow effect
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            
            // Core
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer glow
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Enhanced Obstacle class
    class Obstacle {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.z = 0; // Firmly on ground
            // Taller walls for maze
            this.depth = width > 1.5 || height > 1.5 ? 
                1.5 + Math.random() * 0.5 : // Large obstacles are taller
                1.0 + Math.random() * 0.3;   // Small obstacles are shorter
            this.type = Math.random() > 0.5 ? 'stone' : 'wood';
            this.color = this.type === 'stone' ? 
                COLORS.stone[Math.floor(Math.random() * COLORS.stone.length)] :
                COLORS.wood[Math.floor(Math.random() * COLORS.wood.length)];
        }

        draw(ctx) {
            // Draw base connection to ground
            const baseIso = cartesianToIsometric(this.x, this.y, 0);
            ctx.save();
            ctx.translate(baseIso.x, baseIso.y);
            
            // Ground connection shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(
                this.width * CONFIG.TILE_WIDTH / 4, 
                this.height * CONFIG.TILE_HEIGHT / 4, 
                this.width * CONFIG.TILE_WIDTH / 2.5, 
                this.height * CONFIG.TILE_HEIGHT / 2.5, 
                0, 0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
            
            // Draw the voxel cube
            drawVoxelCube(ctx, this.x, this.y, this.z, this.width, this.height, this.depth, this.color);
            
            // Add details based on type
            if (this.type === 'stone' && this.width > 1) {
                // Cracks for larger stones
                const iso = cartesianToIsometric(this.x + this.width/2, this.y + this.height/2, this.depth/2);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-15, -8);
                ctx.lineTo(0, 0);
                ctx.lineTo(8, 12);
                ctx.stroke();
                ctx.restore();
            } else if (this.type === 'wood' && this.width > 1) {
                // Wood grain
                const iso = cartesianToIsometric(this.x + this.width/2, this.y + this.height/2, this.depth/2);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.lineWidth = 1;
                for (let i = -10; i <= 10; i += 5) {
                    ctx.beginPath();
                    ctx.moveTo(i, -15);
                    ctx.lineTo(i + 2, 15);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        checkCollision(entity) {
            return entity.x >= this.x - entity.radius && 
                   entity.x <= this.x + this.width + entity.radius &&
                   entity.y >= this.y - entity.radius && 
                   entity.y <= this.y + this.height + entity.radius;
        }
    }

    // Wave Manager remains similar but with enhanced spawn effects
    class WaveManager {
        constructor() {
            this.waveConfigs = [
                ['brawler', 'brawler', 'archer'],
                ['brawler', 'archer', 'archer', 'stalker'],
                ['bulwark', 'archer', 'stalker', 'stalker'],
                ['bulwark', 'brawler', 'archer', 'archer', 'stalker'],
                ['bulwark', 'bulwark', 'stalker', 'stalker', 'archer', 'archer']
            ];
            this.currentWave = 0;
            this.spawnDelay = 1000;
            this.lastSpawn = 0;
            this.prepInterval = null;
        }

        startWave(waveNumber) {
            this.currentWave = waveNumber;
            gameState.wave.current = waveNumber;
            const waveIndex = Math.min(waveNumber - 1, this.waveConfigs.length - 1);
            gameState.wave.enemies = [...this.waveConfigs[waveIndex]];
            
            if (waveNumber > this.waveConfigs.length) {
                const extra = waveNumber - this.waveConfigs.length;
                for (let i = 0; i < extra * 2; i++) {
                    const types = ['brawler', 'archer', 'stalker'];
                    gameState.wave.enemies.push(types[Math.floor(Math.random() * types.length)]);
                }
            }
            
            gameState.wave.spawned = 0;
            gameState.wave.state = 'active';
            gameState.combo = 0; // Reset combo
            this.lastSpawn = Date.now();
        }

        update() {
            if (gameState.wave.state !== 'active' || gameState.gameOver) return;
            
            const now = Date.now();
            
            if (gameState.wave.spawned < gameState.wave.enemies.length && 
                now - this.lastSpawn > this.spawnDelay) {
                this.spawnNextEnemy();
                this.lastSpawn = now;
            }
            
            if (gameState.wave.spawned >= gameState.wave.enemies.length && 
                gameState.enemies.length === 0) {
                this.completeWave();
            }
        }

        spawnNextEnemy() {
            if (gameState.wave.spawned >= gameState.wave.enemies.length) return;
            
            const type = gameState.wave.enemies[gameState.wave.spawned];
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: 
                    x = 2 + Math.random() * (CONFIG.GRID_WIDTH - 4);
                    y = 0.5;
                    break;
                case 1:
                    x = CONFIG.GRID_WIDTH - 0.5;
                    y = 2 + Math.random() * (CONFIG.GRID_HEIGHT - 4);
                    break;
                case 2:
                    x = 2 + Math.random() * (CONFIG.GRID_WIDTH - 4);
                    y = CONFIG.GRID_HEIGHT - 0.5;
                    break;
                case 3:
                    x = 0.5;
                    y = 2 + Math.random() * (CONFIG.GRID_HEIGHT - 4);
                    break;
            }
            
            const enemy = new Enemy(type, x, y);
            enemy.health *= Math.pow(1.1, this.currentWave - 1);
            enemy.maxHealth = enemy.health;
            
            gameState.enemies.push(enemy);
            gameState.wave.spawned++;
            
            // Spawn portal effect
            for (let i = 0; i < 20; i++) {
                gameState.particles.push(new Particle(
                    x, y, 0,
                    {
                        color: enemy.color,
                        size: 5,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 5,
                        glow: true,
                        life: 1.5
                    }
                ));
            }
            
            if (visualEffects && visualEffects.createExplosion) {
                const iso = cartesianToIsometric(x, y, 0);
                visualEffects.createExplosion(iso.x, iso.y, {
                    color: enemy.color,
                    particleCount: 20,
                    force: 5
                });
            }
        }

        completeWave() {
            gameState.wave.state = 'complete';
            const bonus = 50 * gameState.wave.current;
            gameState.score += bonus;
            gameState.currency += bonus;
            
            // Victory particles
            for (let i = 0; i < 30; i++) {
                const x = Math.random() * CONFIG.GRID_WIDTH;
                const y = Math.random() * CONFIG.GRID_HEIGHT;
                gameState.particles.push(new Particle(
                    x, y, 0,
                    {
                        color: ['#fbbf24', '#34d399', '#60a5fa'][Math.floor(Math.random() * 3)],
                        size: 8,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        vz: Math.random() * 8,
                        glow: true,
                        life: 2,
                        decay: 0.01
                    }
                ));
            }
            
            setTimeout(() => {
                this.startPreparation();
            }, 2000);
        }

        startPreparation() {
            if (gameState.gameOver) return;
            
            gameState.wave.state = 'preparing';
            gameState.wave.timer = 10;
            
            if (this.prepInterval) clearInterval(this.prepInterval);
            
            this.prepInterval = setInterval(() => {
                gameState.wave.timer--;
                
                if (gameState.wave.timer <= 0 || gameState.gameOver) {
                    clearInterval(this.prepInterval);
                    this.prepInterval = null;
                    if (!gameState.gameOver) {
                        this.startWave(this.currentWave + 1);
                    }
                }
            }, 1000);
        }
    }

    let waveManager = null;

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        
        // Initialize visual effects
        if (window.VisualEffects) {
            visualEffects = new window.VisualEffects(canvas, ctx);
        }
        
        // Detect device and adjust UI
        adaptInterface();
        
        resizeCanvas();
        window.addEventListener('resize', () => {
            resizeCanvas();
            adaptInterface();
        });
        
        // Initialize local player
        const playerId = Math.random().toString(36).substr(2, 9);
        gameState.localPlayer = new Player(playerId, CONFIG.GRID_WIDTH / 2, CONFIG.GRID_HEIGHT / 2);
        gameState.localPlayer.isLocal = true;
        gameState.players.set(playerId, gameState.localPlayer);
        
        waveManager = new WaveManager();
        generateLevel();
        setupInputHandlers();
        
        setTimeout(() => {
            waveManager.startWave(1);
        }, 2000);
        
        requestAnimationFrame(gameLoop);
    }

    function adaptInterface() {
        const mobileControls = document.querySelector('.mobile-controls');
        const desktopHints = document.querySelector('.desktop-controls');
        
        if (isMobile()) {
            gameState.deviceType = 'mobile';
            gameState.camera.zoom = CONFIG.ZOOM_MOBILE;
            if (mobileControls) mobileControls.style.display = 'block';
            if (desktopHints) desktopHints.style.display = 'none';
        } else {
            gameState.deviceType = 'desktop';
            gameState.camera.zoom = CONFIG.ZOOM_DEFAULT;
            if (mobileControls) mobileControls.style.display = 'none';
            if (desktopHints) desktopHints.style.display = 'block';
        }
    }

    function generateLevel() {
        // Generate ground tiles
        gameState.groundTiles = [];
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                gameState.groundTiles.push({
                    x, y,
                    type: Math.random() > 0.8 ? 'grass' : 'stone'
                });
            }
        }
        
        // Generate maze-like map with larger obstacles
        gameState.obstacles = [];
        
        // Create border walls
        // Top wall
        for (let x = 0; x < CONFIG.GRID_WIDTH; x += 2) {
            gameState.obstacles.push(new Obstacle(x, 0, 2, 1));
        }
        // Bottom wall
        for (let x = 0; x < CONFIG.GRID_WIDTH; x += 2) {
            gameState.obstacles.push(new Obstacle(x, CONFIG.GRID_HEIGHT - 1, 2, 1));
        }
        // Left wall
        for (let y = 1; y < CONFIG.GRID_HEIGHT - 1; y += 2) {
            gameState.obstacles.push(new Obstacle(0, y, 1, 2));
        }
        // Right wall
        for (let y = 1; y < CONFIG.GRID_HEIGHT - 1; y += 2) {
            gameState.obstacles.push(new Obstacle(CONFIG.GRID_WIDTH - 1, y, 1, 2));
        }
        
        // Create maze-like interior walls
        const mazeGrid = [];
        const cellSize = 4;
        const mazeCols = Math.floor((CONFIG.GRID_WIDTH - 2) / cellSize);
        const mazeRows = Math.floor((CONFIG.GRID_HEIGHT - 2) / cellSize);
        
        // Initialize maze grid
        for (let row = 0; row < mazeRows; row++) {
            mazeGrid[row] = [];
            for (let col = 0; col < mazeCols; col++) {
                mazeGrid[row][col] = {
                    visited: false,
                    walls: { top: true, right: true, bottom: true, left: true }
                };
            }
        }
        
        // Generate maze using recursive backtracking
        function carveMaze(row, col) {
            mazeGrid[row][col].visited = true;
            
            // Get unvisited neighbors in random order
            const neighbors = [];
            if (row > 0 && !mazeGrid[row - 1][col].visited) neighbors.push({ r: row - 1, c: col, dir: 'top' });
            if (col < mazeCols - 1 && !mazeGrid[row][col + 1].visited) neighbors.push({ r: row, c: col + 1, dir: 'right' });
            if (row < mazeRows - 1 && !mazeGrid[row + 1][col].visited) neighbors.push({ r: row + 1, c: col, dir: 'bottom' });
            if (col > 0 && !mazeGrid[row][col - 1].visited) neighbors.push({ r: row, c: col - 1, dir: 'left' });
            
            // Shuffle neighbors
            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }
            
            // Visit each neighbor
            for (const neighbor of neighbors) {
                if (!mazeGrid[neighbor.r][neighbor.c].visited) {
                    // Remove walls between current and neighbor
                    if (neighbor.dir === 'top') {
                        mazeGrid[row][col].walls.top = false;
                        mazeGrid[neighbor.r][neighbor.c].walls.bottom = false;
                    } else if (neighbor.dir === 'right') {
                        mazeGrid[row][col].walls.right = false;
                        mazeGrid[neighbor.r][neighbor.c].walls.left = false;
                    } else if (neighbor.dir === 'bottom') {
                        mazeGrid[row][col].walls.bottom = false;
                        mazeGrid[neighbor.r][neighbor.c].walls.top = false;
                    } else if (neighbor.dir === 'left') {
                        mazeGrid[row][col].walls.left = false;
                        mazeGrid[neighbor.r][neighbor.c].walls.right = false;
                    }
                    
                    carveMaze(neighbor.r, neighbor.c);
                }
            }
        }
        
        // Start maze generation from center
        carveMaze(Math.floor(mazeRows / 2), Math.floor(mazeCols / 2));
        
        // Convert maze to obstacles
        for (let row = 0; row < mazeRows; row++) {
            for (let col = 0; col < mazeCols; col++) {
                const x = 1 + col * cellSize;
                const y = 1 + row * cellSize;
                const cell = mazeGrid[row][col];
                
                // Create walls based on maze
                if (cell.walls.top && Math.random() > 0.2) {
                    gameState.obstacles.push(new Obstacle(x, y, cellSize, 0.8));
                }
                if (cell.walls.left && Math.random() > 0.2) {
                    gameState.obstacles.push(new Obstacle(x, y, 0.8, cellSize));
                }
                
                // Add some random obstacles for variety
                if (Math.random() > 0.85) {
                    const size = 1.5 + Math.random() * 1.5;
                    gameState.obstacles.push(new Obstacle(
                        x + Math.random() * (cellSize - size),
                        y + Math.random() * (cellSize - size),
                        size,
                        size
                    ));
                }
            }
        }
        
        // Add some large central obstacles
        for (let i = 0; i < 3; i++) {
            const size = 2 + Math.random() * 2;
            gameState.obstacles.push(new Obstacle(
                CONFIG.GRID_WIDTH / 2 - size / 2 + (Math.random() - 0.5) * 8,
                CONFIG.GRID_HEIGHT / 2 - size / 2 + (Math.random() - 0.5) * 8,
                size,
                size
            ));
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function updateCamera() {
        if (!gameState.localPlayer) return;
        
        // Calculate target camera position (follow player)
        const playerIso = cartesianToIsometric(gameState.localPlayer.x, gameState.localPlayer.y, 0);
        gameState.camera.targetX = canvas.width / 2 - playerIso.x * gameState.camera.zoom;
        gameState.camera.targetY = canvas.height / 2 - playerIso.y * gameState.camera.zoom;
        
        // Smooth camera movement
        gameState.camera.x += (gameState.camera.targetX - gameState.camera.x) * CONFIG.CAMERA_SMOOTHING;
        gameState.camera.y += (gameState.camera.targetY - gameState.camera.y) * CONFIG.CAMERA_SMOOTHING;
        
        // Camera shake
        if (gameState.camera.shake > 0) {
            gameState.camera.shakeX = (Math.random() - 0.5) * gameState.camera.shake;
            gameState.camera.shakeY = (Math.random() - 0.5) * gameState.camera.shake;
            gameState.camera.shake *= 0.9;
        } else {
            gameState.camera.shakeX = 0;
            gameState.camera.shakeY = 0;
        }
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
        canvas.addEventListener('mousedown', (e) => {
            handleShoot(e.clientX, e.clientY);
        });
        
        // Touch controls
        canvas.addEventListener('touchstart', (e) => {
            if (e.cancelable) e.preventDefault();
            const touch = e.touches[0];
            handleShoot(touch.clientX, touch.clientY);
        }, { passive: false });
        
        // Mobile joystick
        setupMobileControls();
    }

    function setupMobileControls() {
        const joystickBase = document.querySelector('.joystick-base');
        const joystickKnob = document.querySelector('.joystick-knob');
        
        if (!joystickBase || !joystickKnob) return;
        
        let active = false;
        let center = { x: 0, y: 0 };
        let identifier = null;
        
        function start(e) {
            if (e.cancelable) e.preventDefault();
            active = true;
            
            if (e.touches) {
                identifier = e.touches[0].identifier;
            }
            
            const rect = joystickBase.getBoundingClientRect();
            center.x = rect.left + rect.width / 2;
            center.y = rect.top + rect.height / 2;
            
            joystickBase.classList.add('active');
        }
        
        function move(e) {
            if (!active) return;
            
            let clientX, clientY;
            
            if (e.touches) {
                let touch = null;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === identifier) {
                        touch = e.touches[i];
                        break;
                    }
                }
                if (!touch) return;
                clientX = touch.clientX;
                clientY = touch.clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            
            const dx = clientX - center.x;
            const dy = clientY - center.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 50;
            
            let knobX = dx;
            let knobY = dy;
            
            if (dist > maxDist) {
                knobX = (dx / dist) * maxDist;
                knobY = (dy / dist) * maxDist;
            }
            
            joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
            gameState.input.joystick.x = knobX / maxDist;
            gameState.input.joystick.y = knobY / maxDist;
            gameState.input.joystick.active = true;
        }
        
        function end(e) {
            if (e && e.touches) {
                let found = false;
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === identifier) {
                        found = true;
                        break;
                    }
                }
                if (found) return;
            }
            
            active = false;
            identifier = null;
            joystickKnob.style.transform = 'translate(0, 0)';
            gameState.input.joystick.x = 0;
            gameState.input.joystick.y = 0;
            gameState.input.joystick.active = false;
            joystickBase.classList.remove('active');
        }
        
        joystickBase.addEventListener('mousedown', start);
        joystickBase.addEventListener('touchstart', start, { passive: false });
        
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: false });
        
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
        window.addEventListener('touchcancel', end);
    }

    function handleShoot(screenX, screenY) {
        if (!gameState.localPlayer || gameState.localPlayer.health <= 0) return;
        
        const worldX = (screenX - gameState.camera.x - gameState.camera.shakeX) / gameState.camera.zoom;
        const worldY = (screenY - gameState.camera.y - gameState.camera.shakeY) / gameState.camera.zoom;
        const target = isometricToCartesian(worldX, worldY);
        
        const projectile = gameState.localPlayer.shoot(target.x, target.y);
        if (projectile) {
            gameState.projectiles.push(projectile);
            // Small recoil shake
            gameState.camera.shake = 2;
        }
    }

    function handleInput() {
        if (!gameState.localPlayer || gameState.localPlayer.health <= 0) return;
        
        const player = gameState.localPlayer;
        const speed = player.speed;
        
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
        if (gameState.paused || gameState.gameOver) return;
        
        animationTime += deltaTime * 1000;
        
        handleInput();
        updateCamera();
        
        if (waveManager) {
            waveManager.update();
        }
        
        gameState.players.forEach(player => {
            player.update(deltaTime);
            if (player.health <= 0 && player === gameState.localPlayer) {
                gameState.gameOver = true;
            }
        });
        
        gameState.enemies = gameState.enemies.filter(enemy => {
            enemy.update(deltaTime);
            return enemy.health > 0;
        });
        
        gameState.projectiles = gameState.projectiles.filter(projectile => {
            return projectile.update(deltaTime);
        });
        
        // Update particles
        gameState.particles = gameState.particles.filter(particle => {
            return particle.update(deltaTime);
        });
        
        // Obstacle collisions
        gameState.players.forEach(player => {
            gameState.obstacles.forEach(obstacle => {
                if (obstacle.checkCollision(player)) {
                    // Push back
                    const centerX = obstacle.x + obstacle.width / 2;
                    const centerY = obstacle.y + obstacle.height / 2;
                    const dx = player.x - centerX;
                    const dy = player.y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 0) {
                        const pushDist = Math.max(obstacle.width, obstacle.height) / 2 + player.radius + 0.1;
                        player.x = centerX + (dx / dist) * pushDist;
                        player.y = centerY + (dy / dist) * pushDist;
                    }
                    
                    player.vx *= 0.5;
                    player.vy *= 0.5;
                }
            });
        });
        
        // Update visual effects
        if (visualEffects && visualEffects.update) {
            visualEffects.update(deltaTime);
        }
        
        // Decay combo
        if (gameState.combo > 0 && Date.now() % 1000 < 20) {
            gameState.combo = Math.max(0, gameState.combo - 1);
        }
    }

    function render() {
        // Beautiful gradient background
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width
        );
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(0.5, '#0f172a');
        gradient.addColorStop(1, '#020617');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(
            gameState.camera.x + gameState.camera.shakeX, 
            gameState.camera.y + gameState.camera.shakeY
        );
        ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
        
        // Draw ground tiles (skip for performance if needed)
        if (gameState.deviceType === 'desktop') {
            gameState.groundTiles.forEach(tile => {
                drawGroundTile(ctx, tile.x, tile.y, tile.type);
            });
        }
        
        // Draw obstacles
        gameState.obstacles.forEach(obstacle => {
            obstacle.draw(ctx);
        });
        
        // Sort entities by depth
        const entities = [
            ...Array.from(gameState.players.values()),
            ...gameState.enemies
        ].sort((a, b) => (a.y + a.x) - (b.y + b.x));
        
        entities.forEach(entity => {
            entity.draw(ctx);
        });
        
        // Draw projectiles
        gameState.projectiles.forEach(projectile => {
            projectile.draw(ctx);
        });
        
        // Draw particles
        gameState.particles.forEach(particle => {
            particle.draw(ctx);
        });
        
        // Draw visual effects
        if (visualEffects && visualEffects.render) {
            visualEffects.render(ctx);
        }
        
        ctx.restore();
        
        drawUI();
    }

    function drawUI() {
        // Modern UI design
        const padding = 20;
        
        // Top left - Score and Currency
        ctx.save();
        
        // Background panel
        const gradient = ctx.createLinearGradient(0, 0, 250, 0);
        gradient.addColorStop(0, COLORS.uiDark);
        gradient.addColorStop(1, 'rgba(15, 23, 42, 0.7)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 250, 120);
        
        // Score
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px "Segoe UI", sans-serif';
        ctx.fillText('SCORE', padding, 35);
        ctx.fillStyle = 'white';
        ctx.font = '32px "Segoe UI", sans-serif';
        ctx.fillText(gameState.score.toLocaleString(), padding, 70);
        
        // Currency
        ctx.fillStyle = '#34d399';
        ctx.font = '16px "Segoe UI", sans-serif';
        ctx.fillText(`💰 ${gameState.currency}`, padding, 100);
        
        // Combo indicator
        if (gameState.combo > 1) {
            ctx.save();
            ctx.translate(200, 60);
            ctx.rotate(-0.1);
            ctx.fillStyle = '#fbbf24';
            ctx.font = `bold ${20 + gameState.combo * 2}px "Segoe UI", sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.fillText(`${gameState.combo}x`, 0, 0);
            ctx.restore();
        }
        
        ctx.restore();
        
        // Wave info - Top center
        ctx.save();
        ctx.textAlign = 'center';
        
        if (gameState.wave.state === 'preparing') {
            // Wave countdown
            const boxWidth = 400;
            const boxHeight = 80;
            const boxX = (canvas.width - boxWidth) / 2;
            const boxY = 20;
            
            ctx.fillStyle = COLORS.uiDark;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 28px "Segoe UI", sans-serif';
            ctx.fillText(`WAVE ${gameState.wave.current + 1} INCOMING`, canvas.width / 2, boxY + 35);
            
            ctx.fillStyle = 'white';
            ctx.font = '48px "Segoe UI", sans-serif';
            ctx.fillText(gameState.wave.timer, canvas.width / 2, boxY + 70);
        } else if (gameState.wave.state === 'active') {
            // Wave progress
            const boxWidth = 300;
            const boxHeight = 60;
            const boxX = (canvas.width - boxWidth) / 2;
            const boxY = 20;
            
            ctx.fillStyle = COLORS.uiDark;
            ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px "Segoe UI", sans-serif';
            ctx.fillText(`WAVE ${gameState.wave.current}`, canvas.width / 2, boxY + 25);
            
            // Enemy counter
            ctx.fillStyle = '#ef4444';
            ctx.font = '16px "Segoe UI", sans-serif';
            ctx.fillText(`Enemies: ${gameState.enemies.length} / ${gameState.wave.enemies.length}`, 
                        canvas.width / 2, boxY + 45);
        }
        
        ctx.restore();
        
        // Player health - Bottom center
        if (gameState.localPlayer) {
            const player = gameState.localPlayer;
            const barWidth = 300;
            const barHeight = 30;
            const barX = (canvas.width - barWidth) / 2;
            const barY = canvas.height - 100;
            
            // Background
            ctx.fillStyle = COLORS.uiDark;
            ctx.fillRect(barX - 10, barY - 10, barWidth + 20, barHeight + 30);
            
            // Health bar background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // Health gradient
            const healthGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            const healthColor = player.health > 30 ? COLORS.healthGreen : COLORS.healthRed;
            healthGradient.addColorStop(0, shadeColor(healthColor, -20));
            healthGradient.addColorStop(0.5, healthColor);
            healthGradient.addColorStop(1, shadeColor(healthColor, -20));
            
            ctx.fillStyle = healthGradient;
            ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);
            
            // Shield bar
            if (player.shield > 0) {
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.fillRect(barX, barY - 5, barWidth * (player.shield / player.maxShield), 4);
            }
            
            // Health text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}`, 
                        barX + barWidth / 2, barY + 20);
        }
        
        // FPS counter (top right)
        const fpsElement = document.getElementById('fpsCounter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${Math.round(gameState.fps)}`;
            fpsElement.style.color = gameState.fps > 50 ? '#10b981' : '#ef4444';
        }
        
        // Game over screen
        if (gameState.gameOver) {
            // Dark overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Game over text
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 72px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
            ctx.fillText('GAME OVER', 0, -80);
            
            // Stats
            ctx.fillStyle = 'white';
            ctx.font = '28px "Segoe UI", sans-serif';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 5;
            ctx.fillText(`Final Score: ${gameState.score.toLocaleString()}`, 0, -20);
            ctx.fillText(`Waves Survived: ${gameState.wave.current}`, 0, 20);
            ctx.fillText(`Max Combo: ${gameState.maxCombo}x`, 0, 60);
            
            // Restart hint
            ctx.fillStyle = '#94a3b8';
            ctx.font = '18px "Segoe UI", sans-serif';
            ctx.fillText('Press F5 to play again', 0, 120);
            
            ctx.restore();
        }
    }

    function gameLoop(currentTime) {
        gameState.deltaTime = Math.min((currentTime - gameState.lastTime) / 1000, 0.1);
        gameState.lastTime = currentTime;
        
        // FPS calculation
        gameState.fpsCounter++;
        if (currentTime - gameState.fpsTime >= 1000) {
            gameState.fps = gameState.fpsCounter;
            gameState.fpsCounter = 0;
            gameState.fpsTime = currentTime;
        }
        
        update(gameState.deltaTime);
        render();
        requestAnimationFrame(gameLoop);
    }

    // Start the game
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Export for debugging
    window.IsometricGame = { gameState, CONFIG, waveManager };
})();