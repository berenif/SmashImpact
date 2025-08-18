// Isometric Wave-Based Game Engine for Smash Impact - Improved Version
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
        CAMERA_SMOOTHING: 0.1,
        ZOOM_DEFAULT: 1.5,
        ZOOM_MOBILE: 1.2,
        VOXEL_HEIGHT: 20
    };

    // Device detection
    const isMobile = () => {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (navigator.msMaxTouchPoints > 0) ||
               (window.innerWidth <= 768);
    };

    // Game state
    let canvas, ctx;
    let visualEffects = null;
    let gameState = {
        players: new Map(),
        enemies: [],
        projectiles: [],
        effects: [],
        obstacles: [],
        powerUps: [],
        camera: { 
            x: 0, 
            y: 0, 
            targetX: 0,
            targetY: 0,
            zoom: isMobile() ? CONFIG.ZOOM_MOBILE : CONFIG.ZOOM_DEFAULT 
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
        paused: false,
        gameOver: false,
        lastTime: 0,
        deltaTime: 0,
        fps: 0,
        fpsCounter: 0,
        fpsTime: 0,
        deviceType: isMobile() ? 'mobile' : 'desktop'
    };

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

    // Draw voxel-like cube
    function drawVoxelCube(ctx, x, y, z, width, height, depth, color) {
        const iso = cartesianToIsometric(x, y, z + depth);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = width * CONFIG.TILE_WIDTH / 2;
        const h = height * CONFIG.TILE_HEIGHT / 2;
        const d = depth * CONFIG.VOXEL_HEIGHT;
        
        // Top face (lighter)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        ctx.fill();
        
        // Right face (darker)
        ctx.fillStyle = shadeColor(color, -20);
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Left face (darkest)
        ctx.fillStyle = shadeColor(color, -40);
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Edges
        ctx.strokeStyle = shadeColor(color, -60);
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Top edges
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        // Vertical edges
        ctx.moveTo(0, -d + h);
        ctx.lineTo(0, h);
        ctx.moveTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.moveTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
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

    // Player class
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
            this.color = '#6366f1';
            this.radius = 0.4;
            this.angle = 0;
            this.score = 0;
            this.currency = 0;
            this.isLocal = false;
            this.lastShoot = 0;
            this.shootCooldown = 250;
            this.damage = 10;
            this.speed = CONFIG.PLAYER_SPEED;
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

            // Regenerate shield slowly
            if (this.shield < this.maxShield) {
                this.shield = Math.min(this.maxShield, this.shield + 0.1 * deltaTime);
            }
        }

        takeDamage(amount) {
            // Shield absorbs damage first
            if (this.shield > 0) {
                const shieldDamage = Math.min(this.shield, amount);
                this.shield -= shieldDamage;
                amount -= shieldDamage;
            }
            
            // Remaining damage goes to health
            this.health = Math.max(0, this.health - amount);
            
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
            // Draw as voxel character
            drawVoxelCube(ctx, this.x - 0.3, this.y - 0.3, 0, 0.6, 0.6, 0.8, this.color);
            
            const iso = cartesianToIsometric(this.x, this.y, 0.8);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Draw health bar
            const barWidth = 40;
            const barHeight = 4;
            const barY = -35;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);

            ctx.fillStyle = this.health > 30 ? '#10b981' : '#ef4444';
            ctx.fillRect(-barWidth/2, barY, barWidth * (this.health / this.maxHealth), barHeight);

            // Draw shield bar if has shield
            if (this.shield > 0) {
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(-barWidth/2, barY - 5, barWidth * (this.shield / this.maxShield), 2);
            }

            // Draw player name
            if (this.id && this.isLocal) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 3;
                ctx.fillText('You', 0, -45);
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
                this.damage,
                'player'
            );
        }
    }

    // Enemy class
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
                brawler: '#ef4444',
                archer: '#f59e0b',
                stalker: '#8b5cf6',
                bulwark: '#6b7280'
            };
            return colors[type] || '#ef4444';
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
            if (this.health <= 0) {
                gameState.score += this.score;
                gameState.currency += Math.floor(this.score / 2);
                
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
            // Draw as voxel enemy
            const size = this.type === 'bulwark' ? 0.5 : 0.4;
            const height = this.type === 'bulwark' ? 0.7 : 0.6;
            drawVoxelCube(ctx, this.x - size/2, this.y - size/2, 0, size, size, height, this.color);
            
            const iso = cartesianToIsometric(this.x, this.y, height);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Draw health bar
            const barWidth = 30;
            const barHeight = 3;
            const barY = -30;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);

            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#ef4444' : '#991b1b';
            ctx.fillRect(-barWidth/2, barY, barWidth * healthPercent, barHeight);

            ctx.restore();
        }
    }

    // Projectile class
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
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
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
                if (hit) return false;
            }
            
            return true;
        }

        checkCollision(entity) {
            const dx = entity.x - this.x;
            const dy = entity.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < (entity.radius + this.radius);
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y, this.z);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Obstacle class for voxel-like blocks
    class Obstacle {
        constructor(x, y, width, height) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = '#4a5568';
            this.z = 0;
            this.depth = 0.5 + Math.random() * 0.5;
        }

        draw(ctx) {
            drawVoxelCube(ctx, this.x, this.y, this.z, this.width, this.height, this.depth, this.color);
        }

        checkCollision(entity) {
            return entity.x >= this.x && entity.x <= this.x + this.width &&
                   entity.y >= this.y && entity.y <= this.y + this.height;
        }
    }

    // Wave Manager
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
            gameState.score += 50 * gameState.wave.current;
            
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
        ctx.imageSmoothingEnabled = false; // For crisp pixel art look
        
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
        gameState.obstacles = [];
        
        // Create square and rectangular obstacles
        for (let i = 0; i < 12; i++) {
            const isSquare = Math.random() > 0.5;
            const width = isSquare ? 1 : 1 + Math.random();
            const height = isSquare ? 1 : 1 + Math.random();
            
            gameState.obstacles.push(new Obstacle(
                3 + Math.random() * (CONFIG.GRID_WIDTH - 6 - width),
                3 + Math.random() * (CONFIG.GRID_HEIGHT - 6 - height),
                width,
                height
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
        
        const worldX = (screenX - gameState.camera.x) / gameState.camera.zoom;
        const worldY = (screenY - gameState.camera.y) / gameState.camera.zoom;
        const target = isometricToCartesian(worldX, worldY);
        
        const projectile = gameState.localPlayer.shoot(target.x, target.y);
        if (projectile) {
            gameState.projectiles.push(projectile);
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
        
        // Obstacle collisions
        gameState.players.forEach(player => {
            gameState.obstacles.forEach(obstacle => {
                if (obstacle.checkCollision(player)) {
                    // Simple push back
                    const centerX = obstacle.x + obstacle.width / 2;
                    const centerY = obstacle.y + obstacle.height / 2;
                    const dx = player.x - centerX;
                    const dy = player.y - centerY;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 0) {
                        player.x = centerX + (dx / dist) * (obstacle.width / 2 + player.radius + 0.1);
                        player.y = centerY + (dy / dist) * (obstacle.height / 2 + player.radius + 0.1);
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
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(100, 100, 200, 0.15)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= CONFIG.GRID_WIDTH; x++) {
            for (let y = 0; y <= CONFIG.GRID_HEIGHT; y++) {
                const iso = cartesianToIsometric(x, y, 0);
                
                if (x < CONFIG.GRID_WIDTH) {
                    const nextIso = cartesianToIsometric(x + 1, y, 0);
                    ctx.beginPath();
                    ctx.moveTo(iso.x, iso.y);
                    ctx.lineTo(nextIso.x, nextIso.y);
                    ctx.stroke();
                }
                
                if (y < CONFIG.GRID_HEIGHT) {
                    const nextIso = cartesianToIsometric(x, y + 1, 0);
                    ctx.beginPath();
                    ctx.moveTo(iso.x, iso.y);
                    ctx.lineTo(nextIso.x, nextIso.y);
                    ctx.stroke();
                }
            }
        }
    }

    function render() {
        // Clear with gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0a0e27');
        gradient.addColorStop(1, '#1a1f3a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(gameState.camera.x, gameState.camera.y);
        ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
        
        drawGrid();
        
        // Draw obstacles
        gameState.obstacles.forEach(obstacle => {
            obstacle.draw(ctx);
        });
        
        // Sort entities by Y position for proper depth
        const entities = [
            ...Array.from(gameState.players.values()),
            ...gameState.enemies
        ].sort((a, b) => (a.y + a.x) - (b.y + b.x));
        
        entities.forEach(entity => {
            entity.draw(ctx);
        });
        
        gameState.projectiles.forEach(projectile => {
            projectile.draw(ctx);
        });
        
        // Draw visual effects
        if (visualEffects && visualEffects.render) {
            visualEffects.render(ctx);
        }
        
        ctx.restore();
        
        drawUI();
    }

    function drawUI() {
        // FPS counter
        const fpsElement = document.getElementById('fpsCounter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${Math.round(gameState.fps)}`;
        }
        
        // Game state UI
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 3;
        
        ctx.fillText(`Score: ${gameState.score}`, 10, 30);
        ctx.fillText(`Currency: ${gameState.currency}`, 10, 50);
        
        // Wave info
        if (gameState.wave.state === 'preparing') {
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Wave ${gameState.wave.current + 1} Starting in ${gameState.wave.timer}...`, canvas.width / 2, 100);
        } else if (gameState.wave.state === 'active') {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Wave ${gameState.wave.current}`, 10, 80);
            ctx.font = '14px sans-serif';
            ctx.fillText(`Enemies: ${gameState.enemies.length}/${gameState.wave.enemies.length}`, 10, 100);
        }
        
        // Player health bar (larger, at bottom)
        if (gameState.localPlayer) {
            const player = gameState.localPlayer;
            const barWidth = 250;
            const barHeight = 25;
            const barX = (canvas.width - barWidth) / 2;
            const barY = canvas.height - 80;
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX - 5, barY - 5, barWidth + 10, barHeight + 10);
            
            // Health bar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            gradient.addColorStop(0, player.health > 30 ? '#10b981' : '#ef4444');
            gradient.addColorStop(1, player.health > 30 ? '#059669' : '#dc2626');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);
            
            // Shield bar
            if (player.shield > 0) {
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(barX, barY - 5, barWidth * (player.shield / player.maxShield), 3);
            }
            
            // Health text
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(player.health)} / ${player.maxHealth}`, barX + barWidth / 2, barY + 17);
        }
        
        // Device indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Mode: ${gameState.deviceType}`, canvas.width - 10, canvas.height - 10);
        
        // Game over screen
        if (gameState.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 5;
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.fillStyle = 'white';
            ctx.font = '24px sans-serif';
            ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2);
            ctx.fillText(`Waves Completed: ${gameState.wave.current - 1}`, canvas.width / 2, canvas.height / 2 + 30);
            
            ctx.font = '16px sans-serif';
            ctx.fillText('Refresh to play again', canvas.width / 2, canvas.height / 2 + 80);
        }
    }

    function gameLoop(currentTime) {
        gameState.deltaTime = Math.min((currentTime - gameState.lastTime) / 1000, 0.1);
        gameState.lastTime = currentTime;
        
        if (currentTime % 1000 < gameState.deltaTime * 1000) {
            gameState.fps = Math.round(1 / gameState.deltaTime);
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