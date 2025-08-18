// Isometric Wave-Based Game Engine for Smash Impact
(function() {
    'use strict';

    // Import balance configuration
    const loadBalanceConfig = async () => {
        try {
            const module = await import('./src/testing/balance-config.js');
            return module.BalanceConfig;
        } catch (e) {
            console.warn('Could not load balance config, using defaults');
            return null;
        }
    };

    // Game configuration
    const CONFIG = {
        TILE_WIDTH: 64,
        TILE_HEIGHT: 32,
        GRID_WIDTH: 30,
        GRID_HEIGHT: 20,
        PLAYER_SPEED: 5,
        FPS: 60,
        DEBUG: false
    };

    // Game state
    let canvas, ctx;
    let BalanceConfig = null;
    let gameState = {
        players: new Map(),
        enemies: [],
        projectiles: [],
        effects: [],
        obstacles: [],
        powerUps: [],
        camera: { x: 0, y: 0, zoom: 1 },
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
            state: 'preparing' // 'preparing', 'active', 'complete'
        },
        score: 0,
        currency: 0,
        paused: false,
        gameOver: false,
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
        constructor(id, x = 15, y = 10) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.health = 100;
            this.maxHealth = 100;
            this.shield = 0;
            this.maxShield = 50;
            this.color = this.generateColor(id);
            this.radius = 0.4;
            this.angle = 0;
            this.score = 0;
            this.currency = 0;
            this.isLocal = false;
            this.lastShoot = 0;
            this.shootCooldown = 250; // ms
            this.damage = 10;
            this.speed = CONFIG.PLAYER_SPEED;
            this.abilities = {
                dash: { cooldown: 3000, lastUsed: 0 },
                shield: { cooldown: 10000, lastUsed: 0 },
                blast: { cooldown: 5000, lastUsed: 0 }
            };
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
            if (window.VisualEffects) {
                const iso = cartesianToIsometric(this.x, this.y);
                window.VisualEffects.createImpact(iso.x, iso.y, {
                    color: '#ef4444',
                    particleCount: 15,
                    spread: 180
                });
            }
            
            return this.health <= 0;
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

            // Draw shield if active
            if (this.shield > 0) {
                ctx.strokeStyle = `rgba(59, 130, 246, ${this.shield / this.maxShield})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -10, 25, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw player body
            ctx.fillStyle = this.color;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(0, -10, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

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
            if (this.id) {
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`Player`, 0, -45);
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
                this.id,
                this.damage,
                'player'
            );
        }

        useAbility(type) {
            const ability = this.abilities[type];
            if (!ability) return false;
            
            const now = Date.now();
            if (now - ability.lastUsed < ability.cooldown) return false;
            
            ability.lastUsed = now;
            
            switch(type) {
                case 'dash':
                    // Dash in movement direction
                    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                    if (speed > 0) {
                        this.x += (this.vx / speed) * 3;
                        this.y += (this.vy / speed) * 3;
                    }
                    break;
                    
                case 'shield':
                    // Restore shield
                    this.shield = this.maxShield;
                    break;
                    
                case 'blast':
                    // Area damage around player
                    gameState.enemies.forEach(enemy => {
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < 5) {
                            enemy.takeDamage(30);
                            // Knockback
                            enemy.vx = (dx / dist) * 10;
                            enemy.vy = (dy / dist) * 10;
                        }
                    });
                    
                    // Visual effect
                    if (window.VisualEffects) {
                        const iso = cartesianToIsometric(this.x, this.y);
                        window.VisualEffects.createExplosion(iso.x, iso.y, {
                            color: this.color,
                            particleCount: 50,
                            force: 15,
                            shakeIntensity: 10
                        });
                    }
                    break;
            }
            
            return true;
        }
    }

    // Enemy base class
    class Enemy {
        constructor(type, x, y) {
            const config = BalanceConfig?.enemies?.[type] || this.getDefaultConfig(type);
            
            this.type = type;
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.health = config.health;
            this.maxHealth = config.health;
            this.speed = (config.speed || 200) / 100; // Convert to grid units
            this.damage = config.damage || 10;
            this.attackRate = config.attackRate || 1;
            this.score = config.score || 10;
            this.radius = 0.35;
            this.color = this.getEnemyColor(type);
            this.lastAttack = 0;
            this.target = null;
            this.state = 'idle'; // 'idle', 'moving', 'attacking', 'stunned'
            this.stunTimer = 0;
            
            // Type-specific properties
            this.setupTypeSpecific(config);
        }

        getDefaultConfig(type) {
            const defaults = {
                brawler: { health: 30, speed: 200, damage: 15, attackRate: 1.5, score: 10 },
                archer: { health: 20, speed: 180, damage: 10, attackRate: 0.8, score: 15, range: 350, projectileSpeed: 400 },
                stalker: { health: 25, speed: 280, damage: 20, attackRate: 2, score: 20 },
                bulwark: { health: 60, speed: 150, damage: 25, attackRate: 0.8, score: 25 },
                skirmisher: { health: 35, speed: 250, damage: 12, attackRate: 1.5, score: 20 },
                saboteur: { health: 30, speed: 200, damage: 8, attackRate: 1, score: 25 }
            };
            return defaults[type] || defaults.brawler;
        }

        getEnemyColor(type) {
            const colors = {
                brawler: '#ef4444',
                archer: '#f59e0b',
                stalker: '#8b5cf6',
                bulwark: '#6b7280',
                skirmisher: '#22d3ee',
                saboteur: '#10b981'
            };
            return colors[type] || '#ef4444';
        }

        setupTypeSpecific(config) {
            switch(this.type) {
                case 'archer':
                    this.range = (config.range || 350) / 50; // Convert to grid units
                    this.projectileSpeed = (config.projectileSpeed || 400) / 100;
                    break;
                    
                case 'stalker':
                    this.invisible = false;
                    this.invisDuration = config.invisDuration || 3;
                    this.lastInvis = 0;
                    break;
                    
                case 'bulwark':
                    this.shield = config.shieldHealth || 40;
                    this.maxShield = config.shieldHealth || 40;
                    break;
                    
                case 'skirmisher':
                    this.dashCooldown = (config.dashCooldown || 2) * 1000;
                    this.lastDash = 0;
                    this.comboHits = 0;
                    break;
                    
                case 'saboteur':
                    this.mines = [];
                    this.maxMines = config.maxMines || 3;
                    this.lastMine = 0;
                    break;
            }
        }

        update(deltaTime) {
            // Update stun
            if (this.stunTimer > 0) {
                this.stunTimer -= deltaTime;
                this.state = 'stunned';
                return;
            }

            // Find nearest player as target
            if (!this.target || this.target.health <= 0) {
                this.findTarget();
            }

            if (!this.target) {
                this.state = 'idle';
                return;
            }

            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Type-specific behavior
            this.updateTypeSpecific(deltaTime, dist, dx, dy);

            // Basic movement towards target
            if (this.state === 'moving') {
                const moveSpeed = this.speed * deltaTime;
                
                if (dist > this.getAttackRange()) {
                    this.vx = (dx / dist) * moveSpeed;
                    this.vy = (dy / dist) * moveSpeed;
                } else {
                    this.vx *= 0.9;
                    this.vy *= 0.9;
                    this.tryAttack();
                }
            }

            // Apply velocity
            this.x += this.vx;
            this.y += this.vy;

            // Keep in bounds
            this.x = Math.max(0, Math.min(CONFIG.GRID_WIDTH, this.x));
            this.y = Math.max(0, Math.min(CONFIG.GRID_HEIGHT, this.y));

            // Friction
            this.vx *= 0.95;
            this.vy *= 0.95;
        }

        updateTypeSpecific(deltaTime, dist, dx, dy) {
            const now = Date.now();
            
            switch(this.type) {
                case 'archer':
                    // Keep distance and shoot
                    if (dist < 3) {
                        // Too close, back away
                        this.vx = -(dx / dist) * this.speed * deltaTime;
                        this.vy = -(dy / dist) * this.speed * deltaTime;
                    } else if (dist < this.range) {
                        // In range, stop and shoot
                        this.state = 'attacking';
                        this.tryShoot();
                    } else {
                        this.state = 'moving';
                    }
                    break;
                    
                case 'stalker':
                    // Go invisible when approaching
                    if (dist > 3 && dist < 8 && now - this.lastInvis > 5000) {
                        this.invisible = true;
                        this.lastInvis = now;
                        setTimeout(() => { this.invisible = false; }, this.invisDuration * 1000);
                    }
                    this.state = dist > 1 ? 'moving' : 'attacking';
                    break;
                    
                case 'skirmisher':
                    // Dash towards target
                    if (dist > 2 && dist < 5 && now - this.lastDash > this.dashCooldown) {
                        this.x += (dx / dist) * 3;
                        this.y += (dy / dist) * 3;
                        this.lastDash = now;
                    }
                    this.state = dist > 1 ? 'moving' : 'attacking';
                    break;
                    
                case 'saboteur':
                    // Place mines
                    if (this.mines.length < this.maxMines && now - this.lastMine > 3000) {
                        this.placeMine();
                        this.lastMine = now;
                    }
                    this.state = dist > 4 ? 'moving' : 'idle';
                    break;
                    
                default:
                    this.state = dist > 1 ? 'moving' : 'attacking';
            }
        }

        findTarget() {
            let nearestDist = Infinity;
            let nearest = null;
            
            gameState.players.forEach(player => {
                if (player.health <= 0) return;
                
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = player;
                }
            });
            
            this.target = nearest;
        }

        getAttackRange() {
            switch(this.type) {
                case 'archer': return this.range || 7;
                case 'saboteur': return 4;
                default: return 1.5;
            }
        }

        tryAttack() {
            const now = Date.now();
            const cooldown = 1000 / this.attackRate;
            
            if (now - this.lastAttack < cooldown) return;
            
            this.lastAttack = now;
            
            if (this.type === 'archer') {
                this.tryShoot();
            } else {
                // Melee attack
                if (this.target) {
                    const dx = this.target.x - this.x;
                    const dy = this.target.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 1.5) {
                        this.target.takeDamage(this.damage);
                        
                        // Knockback for bulwark
                        if (this.type === 'bulwark') {
                            this.target.vx = (dx / dist) * 5;
                            this.target.vy = (dy / dist) * 5;
                        }
                        
                        // Combo for skirmisher
                        if (this.type === 'skirmisher') {
                            this.comboHits++;
                            if (this.comboHits >= 3) {
                                this.target.takeDamage(18); // Bonus combo damage
                                this.comboHits = 0;
                            }
                        }
                    }
                }
            }
        }

        tryShoot() {
            if (!this.target) return;
            
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist === 0 || dist > this.range) return;
            
            const projectile = new Projectile(
                this.x, this.y,
                (dx / dist) * this.projectileSpeed,
                (dy / dist) * this.projectileSpeed,
                this.color,
                this.id,
                this.damage,
                'enemy'
            );
            
            gameState.projectiles.push(projectile);
        }

        placeMine() {
            if (this.type !== 'saboteur') return;
            
            const mine = {
                x: this.x,
                y: this.y,
                radius: 1.2,
                damage: 25,
                armed: false,
                owner: this
            };
            
            // Arm after 1 second
            setTimeout(() => { mine.armed = true; }, 1000);
            
            this.mines.push(mine);
            gameState.obstacles.push(mine);
        }

        takeDamage(amount) {
            // Shield for bulwark
            if (this.type === 'bulwark' && this.shield > 0) {
                const shieldDamage = Math.min(this.shield, amount);
                this.shield -= shieldDamage;
                amount -= shieldDamage;
            }
            
            this.health -= amount;
            
            // Stun on heavy damage
            if (amount > 20) {
                this.stunTimer = 0.5;
            }
            
            if (this.health <= 0) {
                this.onDeath();
                return true;
            }
            
            return false;
        }

        onDeath() {
            // Award score and currency
            gameState.score += this.score;
            gameState.currency += Math.floor(this.score / 2);
            
            // Visual effect
            if (window.VisualEffects) {
                const iso = cartesianToIsometric(this.x, this.y);
                window.VisualEffects.createExplosion(iso.x, iso.y, {
                    color: this.color,
                    particleCount: 30,
                    force: 10
                });
            }
            
            // Clean up mines for saboteur
            if (this.type === 'saboteur' && this.mines) {
                this.mines.forEach(mine => {
                    const idx = gameState.obstacles.indexOf(mine);
                    if (idx >= 0) gameState.obstacles.splice(idx, 1);
                });
            }
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);

            // Invisibility for stalker
            if (this.type === 'stalker' && this.invisible) {
                ctx.globalAlpha = 0.3;
            }

            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 8, 15, 8, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw shield for bulwark
            if (this.type === 'bulwark' && this.shield > 0) {
                ctx.strokeStyle = `rgba(107, 114, 128, ${this.shield / this.maxShield})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, -8, 20, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Draw enemy body
            ctx.fillStyle = this.color;
            ctx.strokeStyle = this.state === 'stunned' ? 'yellow' : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 2;
            
            // Different shapes for different enemy types
            ctx.beginPath();
            switch(this.type) {
                case 'bulwark':
                    // Square for tank
                    ctx.rect(-12, -20, 24, 24);
                    break;
                case 'archer':
                    // Diamond for ranged
                    ctx.moveTo(0, -25);
                    ctx.lineTo(12, -10);
                    ctx.lineTo(0, 5);
                    ctx.lineTo(-12, -10);
                    ctx.closePath();
                    break;
                default:
                    // Circle for others
                    ctx.arc(0, -10, 12, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();

            // Draw health bar
            const barWidth = 30;
            const barHeight = 3;
            const barY = -30;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);

            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#ef4444' : '#991b1b';
            ctx.fillRect(-barWidth/2, barY, barWidth * healthPercent, barHeight);

            // Draw type indicator
            ctx.fillStyle = 'white';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.type[0].toUpperCase(), 0, -5);

            ctx.restore();
        }
    }

    // Projectile class
    class Projectile {
        constructor(x, y, vx, vy, color, ownerId, damage, team) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.color = color;
            this.ownerId = ownerId;
            this.damage = damage;
            this.team = team; // 'player' or 'enemy'
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
            
            // Check collisions
            if (this.team === 'player') {
                // Check enemy collisions
                for (let enemy of gameState.enemies) {
                    if (this.checkCollision(enemy)) {
                        enemy.takeDamage(this.damage);
                        return false;
                    }
                }
            } else {
                // Check player collisions
                for (let [id, player] of gameState.players) {
                    if (this.checkCollision(player)) {
                        player.takeDamage(this.damage);
                        return false;
                    }
                }
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
    }

    // Wave management
    class WaveManager {
        constructor() {
            this.waveConfigs = this.getWaveConfigurations();
            this.currentWave = 0;
            this.enemiesSpawned = 0;
            this.spawnTimer = 0;
            this.spawnDelay = 1000; // ms between spawns
            this.lastSpawn = 0;
        }

        getWaveConfigurations() {
            if (BalanceConfig?.waves?.compositions) {
                return BalanceConfig.waves.compositions;
            }
            
            // Default wave configurations
            return [
                { enemies: ['brawler', 'brawler', 'archer'], objectives: [], duration: 60 },
                { enemies: ['brawler', 'archer', 'archer', 'stalker'], objectives: [], duration: 90 },
                { enemies: ['bulwark', 'archer', 'skirmisher', 'stalker', 'archer'], objectives: [], duration: 120 },
                { enemies: ['bulwark', 'saboteur', 'skirmisher', 'stalker', 'archer', 'brawler'], objectives: [], duration: 150 },
                { enemies: ['bulwark', 'bulwark', 'saboteur', 'skirmisher', 'stalker', 'archer', 'archer'], objectives: [], duration: 180 }
            ];
        }

        startWave(waveNumber) {
            this.currentWave = waveNumber;
            this.enemiesSpawned = 0;
            this.lastSpawn = Date.now();
            
            gameState.wave.current = waveNumber;
            gameState.wave.enemies = this.getWaveEnemies(waveNumber);
            gameState.wave.spawned = 0;
            gameState.wave.completed = false;
            gameState.wave.state = 'active';
            
            console.log(`Starting Wave ${waveNumber} with ${gameState.wave.enemies.length} enemies`);
        }

        getWaveEnemies(waveNumber) {
            const waveIndex = Math.min(waveNumber - 1, this.waveConfigs.length - 1);
            const waveConfig = this.waveConfigs[waveIndex];
            
            // Apply scaling for waves beyond configured ones
            let enemies = [...waveConfig.enemies];
            
            if (waveNumber > this.waveConfigs.length) {
                const extraWaves = waveNumber - this.waveConfigs.length;
                const additionalEnemies = Math.floor(extraWaves * 2);
                
                for (let i = 0; i < additionalEnemies; i++) {
                    const types = ['brawler', 'archer', 'stalker', 'skirmisher'];
                    enemies.push(types[Math.floor(Math.random() * types.length)]);
                }
            }
            
            // Apply health scaling
            const healthMultiplier = Math.pow(BalanceConfig?.waves?.scaling?.healthScaling || 1.1, waveNumber - 1);
            
            return enemies.map(type => ({ type, healthMultiplier }));
        }

        update(deltaTime) {
            if (gameState.wave.state !== 'active') return;
            
            const now = Date.now();
            
            // Spawn enemies gradually
            if (gameState.wave.spawned < gameState.wave.enemies.length && 
                now - this.lastSpawn > this.spawnDelay) {
                
                this.spawnNextEnemy();
                this.lastSpawn = now;
            }
            
            // Check wave completion
            if (gameState.wave.spawned >= gameState.wave.enemies.length && 
                gameState.enemies.length === 0) {
                
                this.completeWave();
            }
        }

        spawnNextEnemy() {
            if (gameState.wave.spawned >= gameState.wave.enemies.length) return;
            
            const enemyConfig = gameState.wave.enemies[gameState.wave.spawned];
            
            // Find spawn position (edges of map)
            let x, y;
            const edge = Math.floor(Math.random() * 4);
            switch(edge) {
                case 0: // Top
                    x = Math.random() * CONFIG.GRID_WIDTH;
                    y = 0;
                    break;
                case 1: // Right
                    x = CONFIG.GRID_WIDTH;
                    y = Math.random() * CONFIG.GRID_HEIGHT;
                    break;
                case 2: // Bottom
                    x = Math.random() * CONFIG.GRID_WIDTH;
                    y = CONFIG.GRID_HEIGHT;
                    break;
                case 3: // Left
                    x = 0;
                    y = Math.random() * CONFIG.GRID_HEIGHT;
                    break;
            }
            
            const enemy = new Enemy(enemyConfig.type, x, y);
            enemy.health *= enemyConfig.healthMultiplier;
            enemy.maxHealth *= enemyConfig.healthMultiplier;
            
            gameState.enemies.push(enemy);
            gameState.wave.spawned++;
            
            // Spawn effect
            if (window.VisualEffects) {
                const iso = cartesianToIsometric(x, y);
                window.VisualEffects.createSpawnEffect(iso.x, iso.y, {
                    color: enemy.color
                });
            }
        }

        completeWave() {
            gameState.wave.state = 'complete';
            gameState.wave.completed = true;
            
            // Award wave completion bonus
            const waveBonus = 50 * gameState.wave.current;
            gameState.currency += waveBonus;
            gameState.score += waveBonus;
            
            console.log(`Wave ${gameState.wave.current} completed! Bonus: ${waveBonus}`);
            
            // Start preparation for next wave
            setTimeout(() => {
                this.startPreparation();
            }, 2000);
        }

        startPreparation() {
            gameState.wave.state = 'preparing';
            gameState.wave.timer = BalanceConfig?.waves?.preparationTime || 10;
            
            const prepInterval = setInterval(() => {
                gameState.wave.timer--;
                
                if (gameState.wave.timer <= 0) {
                    clearInterval(prepInterval);
                    this.startWave(gameState.wave.current + 1);
                }
            }, 1000);
        }
    }

    // Initialize game
    let waveManager = null;

    async function init() {
        // Load balance config
        BalanceConfig = await loadBalanceConfig();
        
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
        gameState.localPlayer = new Player(playerId, 15, 10);
        gameState.localPlayer.isLocal = true;
        gameState.players.set(playerId, gameState.localPlayer);
        
        // Initialize wave manager
        waveManager = new WaveManager();
        
        // Generate level
        generateLevel();
        
        // Setup input handlers
        setupInputHandlers();
        
        // Setup multiplayer if available
        if (typeof window.MultiplayerManager !== 'undefined') {
            setupMultiplayer();
        }
        
        // Start first wave after delay
        setTimeout(() => {
            waveManager.startWave(1);
        }, 3000);
        
        // Start game loop
        requestAnimationFrame(gameLoop);
    }

    function generateLevel() {
        // Clear existing level
        gameState.obstacles = [];
        gameState.powerUps = [];
        
        // Generate some obstacles for cover
        const numObstacles = 8 + Math.floor(Math.random() * 5);
        for (let i = 0; i < numObstacles; i++) {
            gameState.obstacles.push({
                x: 5 + Math.random() * (CONFIG.GRID_WIDTH - 10),
                y: 5 + Math.random() * (CONFIG.GRID_HEIGHT - 10),
                radius: 0.5 + Math.random() * 1,
                color: '#4a5568',
                solid: true
            });
        }
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Center camera on grid
        gameState.camera.x = canvas.width / 2 - (CONFIG.GRID_WIDTH * CONFIG.TILE_WIDTH) / 4;
        gameState.camera.y = 100;
    }

    function setupInputHandlers() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            gameState.input.keys[e.key.toLowerCase()] = true;
            
            // Abilities
            if (e.key === 'q') gameState.localPlayer?.useAbility('dash');
            if (e.key === 'e') gameState.localPlayer?.useAbility('shield');
            if (e.key === 'r') gameState.localPlayer?.useAbility('blast');
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
        if (!gameState.localPlayer || gameState.localPlayer.health <= 0) return;
        
        // Convert screen coordinates to world coordinates
        const worldX = screenX - gameState.camera.x;
        const worldY = screenY - gameState.camera.y;
        
        // Convert to cartesian grid coordinates
        const target = isometricToCartesian(worldX, worldY);
        
        const projectile = gameState.localPlayer.shoot(target.x, target.y);
        if (projectile) {
            gameState.projectiles.push(projectile);
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
        
        // Update wave manager
        if (waveManager) {
            waveManager.update(deltaTime);
        }
        
        // Update players
        gameState.players.forEach(player => {
            player.update(deltaTime);
            
            // Check if player died
            if (player.health <= 0 && player.isLocal) {
                gameState.gameOver = true;
                console.log('Game Over! Final Score:', gameState.score);
            }
        });
        
        // Update enemies
        gameState.enemies = gameState.enemies.filter(enemy => {
            enemy.update(deltaTime);
            return enemy.health > 0;
        });
        
        // Update projectiles
        gameState.projectiles = gameState.projectiles.filter(projectile => {
            return projectile.update(deltaTime);
        });
        
        // Check obstacle collisions
        gameState.players.forEach(player => {
            gameState.obstacles.forEach(obstacle => {
                if (!obstacle.solid) return;
                
                const dx = player.x - obstacle.x;
                const dy = player.y - obstacle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < player.radius + obstacle.radius) {
                    // Push player away
                    const pushAngle = Math.atan2(dy, dx);
                    const pushForce = (player.radius + obstacle.radius - dist);
                    player.x += Math.cos(pushAngle) * pushForce;
                    player.y += Math.sin(pushAngle) * pushForce;
                    player.vx *= 0.5;
                    player.vy *= 0.5;
                }
            });
        });
        
        // Update visual effects
        if (window.VisualEffects) {
            window.VisualEffects.update(deltaTime);
        }
    }

    function drawGrid() {
        ctx.strokeStyle = 'rgba(100, 100, 200, 0.1)';
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

    function drawObstacles() {
        gameState.obstacles.forEach(obstacle => {
            const iso = cartesianToIsometric(obstacle.x, obstacle.y);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            // Draw shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.ellipse(0, 5, obstacle.radius * 30, obstacle.radius * 15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw obstacle
            ctx.fillStyle = obstacle.armed ? '#ef4444' : (obstacle.color || '#4a5568');
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            if (obstacle.armed !== undefined) {
                // Mine
                ctx.rect(-10, -15, 20, 20);
            } else {
                // Rock/cover
                ctx.arc(0, -10, obstacle.radius * 25, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        });
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
        
        // Draw obstacles
        drawObstacles();
        
        // Sort entities by Y position for proper depth
        const entities = [
            ...Array.from(gameState.players.values()),
            ...gameState.enemies
        ].sort((a, b) => a.y - b.y);
        
        // Draw entities
        entities.forEach(entity => {
            entity.draw(ctx);
        });
        
        // Draw projectiles
        gameState.projectiles.forEach(projectile => {
            projectile.draw(ctx);
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
        
        // Game state UI
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'left';
        
        // Score and currency
        ctx.fillText(`Score: ${gameState.score}`, 10, 30);
        ctx.fillText(`Currency: ${gameState.currency}`, 10, 50);
        
        // Wave info
        if (gameState.wave.state === 'preparing') {
            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Next Wave in ${gameState.wave.timer}...`, canvas.width / 2, 100);
        } else if (gameState.wave.state === 'active') {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Wave ${gameState.wave.current}`, 10, 80);
            ctx.font = '14px sans-serif';
            ctx.fillText(`Enemies: ${gameState.enemies.length}/${gameState.wave.enemies.length}`, 10, 100);
        }
        
        // Player health/shield
        if (gameState.localPlayer) {
            const player = gameState.localPlayer;
            
            // Health bar
            const barWidth = 200;
            const barHeight = 20;
            const barX = 10;
            const barY = canvas.height - 60;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = player.health > 30 ? '#10b981' : '#ef4444';
            ctx.fillRect(barX, barY, barWidth * (player.health / player.maxHealth), barHeight);
            
            // Shield bar
            if (player.shield > 0) {
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(barX, barY - 5, barWidth * (player.shield / player.maxShield), 3);
            }
            
            // Health text
            ctx.fillStyle = 'white';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.ceil(player.health)}/${player.maxHealth}`, barX + barWidth / 2, barY + 14);
            
            // Ability cooldowns
            ctx.textAlign = 'left';
            ctx.font = '12px sans-serif';
            let abilityY = barY - 30;
            
            for (let [name, ability] of Object.entries(player.abilities)) {
                const now = Date.now();
                const cooldownRemaining = Math.max(0, ability.cooldown - (now - ability.lastUsed));
                const ready = cooldownRemaining === 0;
                
                ctx.fillStyle = ready ? '#10b981' : '#6b7280';
                const key = name === 'dash' ? 'Q' : name === 'shield' ? 'E' : 'R';
                const text = ready ? `[${key}] ${name}` : `[${key}] ${name} (${Math.ceil(cooldownRemaining / 1000)}s)`;
                ctx.fillText(text, barX, abilityY);
                abilityY -= 20;
            }
        }
        
        // Game over screen
        if (gameState.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 48px sans-serif';
            ctx.textAlign = 'center';
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
        // Calculate delta time
        gameState.deltaTime = (currentTime - gameState.lastTime) / 1000;
        gameState.lastTime = currentTime;
        
        // Limit delta time to prevent large jumps
        gameState.deltaTime = Math.min(gameState.deltaTime, 0.1);
        
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
        isometricToCartesian,
        waveManager
    };
})();