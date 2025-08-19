// Unified Game System for SmashImpact
// Combines all game features into a single, cohesive system

(function(window) {
  'use strict';

  // Game Configuration
  const CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    
    // Player settings
    PLAYER_RADIUS: 20,
    PLAYER_SPEED: 5,
    PLAYER_MAX_SPEED: 10,
    PLAYER_ACCELERATION: 0.5,
    PLAYER_FRICTION: 0.9,
    PLAYER_BOOST_SPEED: 15,
    PLAYER_BOOST_DURATION: 200,
    PLAYER_BOOST_COOLDOWN: 1000,
    
    // Enemy settings
    ENEMY_RADIUS: 15,
    ENEMY_SPEED: 2,
    ENEMY_SPAWN_RATE: 3000,
    MAX_ENEMIES: 10,
    
    // Wolf settings
    WOLF_RADIUS: 18,
    WOLF_SPEED: 3,
    WOLF_HEALTH: 75,
    WOLF_DAMAGE: 15,
    WOLF_ALERT_RADIUS: 150,
    WOLF_ATTACK_RADIUS: 30,
    WOLF_ATTACK_COOLDOWN: 1000,
    MAX_WOLVES: 20, // Increased for wave system
    WOLF_SPAWN_INTERVAL: 10000,
    WOLF_WAVE_SPAWN_DELAY: 500, // Delay between wolf spawns in a wave
    
    // Power-up settings
    POWERUP_RADIUS: 15,
    POWERUP_SPAWN_RATE: 5000,
    MAX_POWERUPS: 5,
    POWERUP_DURATION: 5000,
    
    // Obstacle settings
    OBSTACLE_MIN_RADIUS: 20,
    OBSTACLE_MAX_RADIUS: 50,
    MAX_OBSTACLES: 10,
    
    // Game settings
    INITIAL_LIVES: 3,
    INVULNERABILITY_DURATION: 2000,
    SCORE_PER_KILL: 100,
    SCORE_PER_POWERUP: 50,
    WAVE_TRANSITION_TIME: 3000,
    
    // Visual settings
    PARTICLE_LIFETIME: 60,
    MAX_PARTICLES: 500,
    SCREEN_SHAKE_DURATION: 300,
    TRAIL_LENGTH: 10
  };

  // Unified Game Class
  class UnifiedGame {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      
      if (!this.ctx) {
        throw new Error('Failed to get 2D context from canvas');
      }
      
      // Core game state
      this.state = 'menu'; // menu, playing, paused, gameOver
      this.score = 0;
      this.lives = CONFIG.INITIAL_LIVES;
      this.waveNumber = 1;
      this.wolfWaveNumber = 1; // Separate wave counter for wolves
      this.wolvesSpawnedThisWave = 0;
      this.wolvesRequiredThisWave = 1; // Start with 1 wolf
      this.isWolfWaveActive = false;
      this.frameCount = 0;
      this.lastTime = performance.now();
      this.deltaTime = 0;
      
      // Game entities
      this.player = null;
      this.enemies = [];
      this.wolves = [];
      this.obstacles = [];
      this.powerUps = [];
      this.projectiles = [];
      
      // Systems
      this.vfx = null;
      this.multiplayer = null;
      this.wolfAI = null;
      this.input = {
        keys: {},
        mouse: { x: 0, y: 0, pressed: false },
        joystick: null,
        buttons: {}
      };
      
      // Timers
      this.timers = {
        enemySpawn: 0,
        wolfSpawn: 0,
        powerUpSpawn: 0,
        waveTransition: 0,
        invulnerability: 0
      };
      
      // Initialize systems
      this.init();
    }
    
    init() {
      // Set canvas size
      this.resizeCanvas();
      
      // Initialize player
      this.initPlayer();
      
      // Initialize visual effects
      if (window.VisualEffectsManager) {
        this.vfx = new window.VisualEffectsManager(this.ctx, this.canvas);
      }
      
      // Initialize multiplayer
      if (window.MultiplayerManager) {
        this.multiplayer = new window.MultiplayerManager(this);
      }
      
      // Initialize wolf AI
      if (window.WolfAI) {
        this.wolfAI = new window.WolfAI.PackCoordinator();
      }
      
      // Generate initial obstacles
      this.generateObstacles();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start game loop
      this.state = 'playing';
      this.gameLoop();
    }
    
    initPlayer() {
      this.player = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: CONFIG.PLAYER_RADIUS,
        speed: CONFIG.PLAYER_SPEED,
        color: '#00ff00',
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        boosting: false,
        boostCooldown: 0,
        lastBoostParticle: 0,
        invulnerable: false,
        powerUps: [],
        trail: []
      };
    }
    
    generateObstacles() {
      this.obstacles = [];
      const numObstacles = Math.min(CONFIG.MAX_OBSTACLES, 5 + this.waveNumber);
      
      for (let i = 0; i < numObstacles; i++) {
        let obstacle;
        let attempts = 0;
        
        do {
          obstacle = {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            radius: CONFIG.OBSTACLE_MIN_RADIUS + Math.random() * (CONFIG.OBSTACLE_MAX_RADIUS - CONFIG.OBSTACLE_MIN_RADIUS),
            color: '#444444'
          };
          attempts++;
        } while (this.checkObstacleOverlap(obstacle) && attempts < 100);
        
        if (attempts < 100) {
          this.obstacles.push(obstacle);
        }
      }
    }
    
    checkObstacleOverlap(newObstacle) {
      // Check overlap with player spawn area
      const dx = newObstacle.x - this.canvas.width / 2;
      const dy = newObstacle.y - this.canvas.height / 2;
      if (Math.sqrt(dx * dx + dy * dy) < newObstacle.radius + CONFIG.PLAYER_RADIUS + 50) {
        return true;
      }
      
      // Check overlap with other obstacles
      for (const obstacle of this.obstacles) {
        const dx = newObstacle.x - obstacle.x;
        const dy = newObstacle.y - obstacle.y;
        if (Math.sqrt(dx * dx + dy * dy) < newObstacle.radius + obstacle.radius + 20) {
          return true;
        }
      }
      
      return false;
    }
    
    setupEventListeners() {
      // Keyboard input
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      window.addEventListener('keyup', (e) => this.handleKeyUp(e));
      
      // Mouse input
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
      
      // Touch input
      this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
      this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
      this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
      
      // Window resize
      window.addEventListener('resize', () => this.resizeCanvas());
      
      // Prevent context menu on right click
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleKeyDown(e) {
      this.input.keys[e.key.toLowerCase()] = true;
      
      // Special keys
      switch(e.key.toLowerCase()) {
        case 'escape':
          this.togglePause();
          break;
        case 'r':
          if (this.state === 'gameOver') {
            this.restart();
          }
          break;
        case 'm':
          this.toggleMute();
          break;
        case '1':
          if (this.state === 'playing') {
            this.spawnWolf();
          }
          break;
        case '2':
          if (this.state === 'playing') {
            this.clearWolves();
          }
          break;
        case '3':
          if (this.state === 'playing') {
            this.nextWave();
          }
          break;
        case '4':
          if (this.state === 'playing') {
            this.giveShield();
          }
          break;
        case '5':
          if (this.state === 'playing') {
            this.spawnPowerUp();
          }
          break;
        case '0':
          this.restart();
          break;
      }
    }
    
    handleKeyUp(e) {
      this.input.keys[e.key.toLowerCase()] = false;
    }
    
    handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouse.x = e.clientX - rect.left;
      this.input.mouse.y = e.clientY - rect.top;
    }
    
    handleMouseDown(e) {
      this.input.mouse.pressed = true;
      if (e.button === 0) { // Left click
        this.handleShoot();
      } else if (e.button === 2) { // Right click
        this.handleBoost();
      }
    }
    
    handleMouseUp(e) {
      this.input.mouse.pressed = false;
    }
    
    handleTouchStart(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.input.mouse.x = touch.clientX - rect.left;
        this.input.mouse.y = touch.clientY - rect.top;
        this.input.mouse.pressed = true;
      }
    }
    
    handleTouchMove(e) {
      e.preventDefault();
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.input.mouse.x = touch.clientX - rect.left;
        this.input.mouse.y = touch.clientY - rect.top;
      }
    }
    
    handleTouchEnd(e) {
      e.preventDefault();
      this.input.mouse.pressed = false;
    }
    
    handleShoot() {
      if (this.state !== 'playing' || !this.player) return;
      
      // Create projectile
      const angle = Math.atan2(
        this.input.mouse.y - this.player.y,
        this.input.mouse.x - this.player.x
      );
      
      this.projectiles.push({
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        radius: 5,
        damage: 25,
        color: '#ffff00',
        owner: 'player',
        lifetime: 1000
      });
      
      // Visual effect
      if (this.vfx) {
        this.vfx.createImpactEffect(this.player.x, this.player.y, '#ffff00');
      }
    }
    
    handleBoost() {
      if (this.state !== 'playing' || !this.player) return;
      if (this.player.boostCooldown > 0 || this.player.energy < 20) return;
      
      this.player.boosting = true;
      this.player.energy -= 20;
      this.player.boostCooldown = CONFIG.PLAYER_BOOST_COOLDOWN;
      
      // Apply boost velocity
      const angle = Math.atan2(this.player.vy, this.player.vx);
      this.player.vx = Math.cos(angle) * CONFIG.PLAYER_BOOST_SPEED;
      this.player.vy = Math.sin(angle) * CONFIG.PLAYER_BOOST_SPEED;
      
      // Visual effect
      if (this.vfx) {
        this.vfx.shakeScreen(5, CONFIG.SCREEN_SHAKE_DURATION);
      }
      
      setTimeout(() => {
        this.player.boosting = false;
      }, CONFIG.PLAYER_BOOST_DURATION);
    }
    
    handleAction(action, pressed) {
      switch(action) {
        case 'boost':
          if (pressed) this.handleBoost();
          break;
        case 'shoot':
          if (pressed) this.handleShoot();
          break;
        case 'pause':
          if (pressed) this.togglePause();
          break;
      }
    }
    
    togglePause() {
      if (this.state === 'playing') {
        this.state = 'paused';
      } else if (this.state === 'paused') {
        this.state = 'playing';
      }
    }
    
    toggleMute() {
      // Placeholder for sound system
      console.log('Sound toggled');
    }
    
    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
    
    update(deltaTime) {
      if (this.state !== 'playing') return;
      
      this.deltaTime = deltaTime;
      this.frameCount++;
      
      // Update timers
      this.updateTimers(deltaTime);
      
      // Update player
      this.updatePlayer(deltaTime);
      
      // Update enemies
      this.updateEnemies(deltaTime);
      
      // Update wolves
      this.updateWolves(deltaTime);
      
      // Update projectiles
      this.updateProjectiles(deltaTime);
      
      // Update power-ups
      this.updatePowerUps(deltaTime);
      
      // Update visual effects
      if (this.vfx) {
        this.vfx.update(deltaTime);
      }
      
      // Check collisions
      this.checkCollisions();
      
      // Spawn entities
      this.spawnEntities(deltaTime);
      
      // Update multiplayer
      if (this.multiplayer && this.multiplayer.isConnected()) {
        this.multiplayer.broadcastPlayerState();
      }
      
      // Check wave completion
      this.checkWaveCompletion();
    }
    
    updateTimers(deltaTime) {
      // Update all timers
      for (const key in this.timers) {
        if (this.timers[key] > 0) {
          this.timers[key] -= deltaTime;
        }
      }
      
      // Player timers
      if (this.player) {
        if (this.player.boostCooldown > 0) {
          this.player.boostCooldown -= deltaTime;
        }
        
        // Energy regeneration
        if (this.player.energy < this.player.maxEnergy) {
          this.player.energy = Math.min(
            this.player.maxEnergy,
            this.player.energy + 0.1 * deltaTime / 16
          );
        }
        
        // Invulnerability
        if (this.timers.invulnerability > 0) {
          this.player.invulnerable = true;
        } else {
          this.player.invulnerable = false;
        }
      }
    }
    
    updatePlayer(deltaTime) {
      if (!this.player) return;
      
      // Handle input
      let dx = 0, dy = 0;
      
      // Keyboard input
      if (this.input.keys['w'] || this.input.keys['arrowup']) dy -= 1;
      if (this.input.keys['s'] || this.input.keys['arrowdown']) dy += 1;
      if (this.input.keys['a'] || this.input.keys['arrowleft']) dx -= 1;
      if (this.input.keys['d'] || this.input.keys['arrowright']) dx += 1;
      
      // Joystick input
      if (this.input.joystick) {
        const joystickInput = this.input.joystick.getInput();
        dx += joystickInput.x;
        dy += joystickInput.y;
      }
      
      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        dx /= mag;
        dy /= mag;
      }
      
      // Apply acceleration
      if (!this.player.boosting) {
        this.player.vx += dx * CONFIG.PLAYER_ACCELERATION;
        this.player.vy += dy * CONFIG.PLAYER_ACCELERATION;
        
        // Limit speed
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (speed > CONFIG.PLAYER_MAX_SPEED) {
          this.player.vx = (this.player.vx / speed) * CONFIG.PLAYER_MAX_SPEED;
          this.player.vy = (this.player.vy / speed) * CONFIG.PLAYER_MAX_SPEED;
        }
      }
      
      // Apply friction
      this.player.vx *= CONFIG.PLAYER_FRICTION;
      this.player.vy *= CONFIG.PLAYER_FRICTION;
      
      // Update position
      this.player.x += this.player.vx * deltaTime / 16;
      this.player.y += this.player.vy * deltaTime / 16;
      
      // Keep player in bounds
      this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
      this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
      
      // Update trail
      if (this.player.boosting) {
        this.player.trail.push({ x: this.player.x, y: this.player.y });
        if (this.player.trail.length > CONFIG.TRAIL_LENGTH) {
          this.player.trail.shift();
        }
        
        // Create boost particles
        const now = performance.now();
        if (now - this.player.lastBoostParticle > 30) {
          if (this.vfx) {
            this.vfx.createBoostTrail(
              this.player.x,
              this.player.y,
              this.player.color,
              { x: this.player.vx, y: this.player.vy }
            );
          }
          this.player.lastBoostParticle = now;
        }
      } else {
        this.player.trail = [];
      }
      
      // Handle boost button
      if (this.input.keys[' '] || (this.input.buttons.boost && this.input.buttons.boost.isPressed())) {
        this.handleBoost();
      }
    }
    
    updateEnemies(deltaTime) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        
        // Skip wolves (handled separately)
        if (enemy.type === 'wolf') continue;
        
        // Simple AI: move towards player
        if (this.player) {
          const dx = this.player.x - enemy.x;
          const dy = this.player.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            enemy.vx = (dx / dist) * enemy.speed;
            enemy.vy = (dy / dist) * enemy.speed;
          }
        }
        
        // Update position
        enemy.x += enemy.vx * deltaTime / 16;
        enemy.y += enemy.vy * deltaTime / 16;
        
        // Check obstacle collision
        for (const obstacle of this.obstacles) {
          const dx = enemy.x - obstacle.x;
          const dy = enemy.y - obstacle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < enemy.radius + obstacle.radius) {
            // Push enemy away
            const pushAngle = Math.atan2(dy, dx);
            const pushForce = (enemy.radius + obstacle.radius - dist) * 0.5;
            enemy.x += Math.cos(pushAngle) * pushForce;
            enemy.y += Math.sin(pushAngle) * pushForce;
            enemy.vx *= 0.5;
            enemy.vy *= 0.5;
          }
        }
        
        // Remove dead enemies
        if (enemy.health <= 0) {
          this.enemies.splice(i, 1);
          this.score += CONFIG.SCORE_PER_KILL;
          
          // Death effect
          if (this.vfx) {
            this.vfx.createExplosion(enemy.x, enemy.y, {
              particleCount: 20,
              particleColor: enemy.color
            });
          }
        }
      }
    }
    
    updateWolves(deltaTime) {
      // Update wolf AI if available
      if (this.wolfAI && this.player) {
        for (const wolf of this.wolves) {
          // Use advanced AI if available
          const behavior = this.wolfAI.updateWolf(wolf, this.player, this.wolves, deltaTime);
          
          if (behavior) {
            wolf.vx = behavior.velocity.x;
            wolf.vy = behavior.velocity.y;
            wolf.state = behavior.state;
          } else {
            // Fallback to simple AI
            this.updateWolfSimple(wolf, deltaTime);
          }
          
          // Update position
          wolf.x += wolf.vx * deltaTime / 16;
          wolf.y += wolf.vy * deltaTime / 16;
          
          // Check obstacle collision
          for (const obstacle of this.obstacles) {
            const dx = wolf.x - obstacle.x;
            const dy = wolf.y - obstacle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < wolf.radius + obstacle.radius) {
              const pushAngle = Math.atan2(dy, dx);
              const pushForce = (wolf.radius + obstacle.radius - dist) * 0.5;
              wolf.x += Math.cos(pushAngle) * pushForce;
              wolf.y += Math.sin(pushAngle) * pushForce;
              wolf.vx *= 0.8;
              wolf.vy *= 0.8;
            }
          }
        }
      } else {
        // Fallback to simple AI for all wolves
        for (const wolf of this.wolves) {
          this.updateWolfSimple(wolf, deltaTime);
        }
      }
      
      // Remove dead wolves
      for (let i = this.wolves.length - 1; i >= 0; i--) {
        const wolf = this.wolves[i];
        if (wolf.health <= 0) {
          this.wolves.splice(i, 1);
          const enemyIndex = this.enemies.indexOf(wolf);
          if (enemyIndex > -1) {
            this.enemies.splice(enemyIndex, 1);
          }
          this.score += CONFIG.SCORE_PER_KILL * 2; // Wolves give more points
          
          // Death effect
          if (this.vfx) {
            this.vfx.createExplosion(wolf.x, wolf.y, {
              particleCount: 30,
              particleColor: '#8B4513'
            });
          }
        }
      }
    }
    
    updateWolfSimple(wolf, deltaTime) {
      if (!this.player) return;
      
      const dx = this.player.x - wolf.x;
      const dy = this.player.y - wolf.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // State machine
      switch(wolf.state) {
        case 'idle':
          if (dist < CONFIG.WOLF_ALERT_RADIUS) {
            wolf.state = 'hunting';
          }
          break;
          
        case 'hunting':
          if (dist > CONFIG.WOLF_ALERT_RADIUS * 2) {
            wolf.state = 'idle';
          } else if (dist < CONFIG.WOLF_ATTACK_RADIUS) {
            wolf.state = 'attacking';
          } else {
            // Move towards player
            wolf.vx = (dx / dist) * wolf.speed;
            wolf.vy = (dy / dist) * wolf.speed;
          }
          break;
          
        case 'attacking':
          if (dist > CONFIG.WOLF_ATTACK_RADIUS) {
            wolf.state = 'hunting';
          } else {
            // Attack player
            const now = Date.now();
            if (now - wolf.lastAttack > CONFIG.WOLF_ATTACK_COOLDOWN) {
              this.wolfAttack(wolf);
              wolf.lastAttack = now;
            }
            
            // Circle around player
            const angle = Math.atan2(dy, dx) + Math.PI / 2;
            wolf.vx = Math.cos(angle) * wolf.speed * 0.5;
            wolf.vy = Math.sin(angle) * wolf.speed * 0.5;
          }
          break;
      }
      
      // Update position
      wolf.x += wolf.vx * deltaTime / 16;
      wolf.y += wolf.vy * deltaTime / 16;
    }
    
    wolfAttack(wolf) {
      if (!this.player || this.player.invulnerable) return;
      
      const dx = this.player.x - wolf.x;
      const dy = this.player.y - wolf.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < CONFIG.WOLF_ATTACK_RADIUS) {
        this.player.health -= CONFIG.WOLF_DAMAGE;
        this.timers.invulnerability = CONFIG.INVULNERABILITY_DURATION;
        
        // Knockback
        this.player.vx += (dx / dist) * 10;
        this.player.vy += (dy / dist) * 10;
        
        // Visual effect
        if (this.vfx) {
          this.vfx.createImpactEffect(this.player.x, this.player.y, '#ff0000');
          this.vfx.shakeScreen(10, 200);
        }
        
        // Check if player died
        if (this.player.health <= 0) {
          this.playerDeath();
        }
      }
    }
    
    updateProjectiles(deltaTime) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        
        // Update position
        projectile.x += projectile.vx * deltaTime / 16;
        projectile.y += projectile.vy * deltaTime / 16;
        
        // Update lifetime
        projectile.lifetime -= deltaTime;
        
        // Remove if expired or out of bounds
        if (projectile.lifetime <= 0 ||
            projectile.x < 0 || projectile.x > this.canvas.width ||
            projectile.y < 0 || projectile.y > this.canvas.height) {
          this.projectiles.splice(i, 1);
        }
      }
    }
    
    updatePowerUps(deltaTime) {
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const powerUp = this.powerUps[i];
        
        // Floating animation
        powerUp.floatOffset = (powerUp.floatOffset || 0) + deltaTime * 0.003;
        powerUp.displayY = powerUp.y + Math.sin(powerUp.floatOffset) * 5;
        
        // Check if collected
        if (this.player) {
          const dx = this.player.x - powerUp.x;
          const dy = this.player.y - powerUp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < this.player.radius + CONFIG.POWERUP_RADIUS) {
            this.collectPowerUp(powerUp);
            this.powerUps.splice(i, 1);
          }
        }
      }
    }
    
    collectPowerUp(powerUp) {
      this.score += CONFIG.SCORE_PER_POWERUP;
      
      switch(powerUp.type) {
        case 'health':
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 25);
          break;
        case 'energy':
          this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 50);
          break;
        case 'speed':
          this.player.speed *= 1.5;
          setTimeout(() => { this.player.speed /= 1.5; }, CONFIG.POWERUP_DURATION);
          break;
        case 'shield':
          this.timers.invulnerability = CONFIG.POWERUP_DURATION;
          break;
        case 'damage':
          // Increase projectile damage temporarily
          break;
      }
      
      // Visual effect
      if (this.vfx) {
        this.vfx.createPowerUpEffect(powerUp.x, powerUp.y, powerUp.type);
      }
    }
    
    checkCollisions() {
      if (!this.player) return;
      
      // Player-Enemy collisions
      for (const enemy of this.enemies) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.player.radius + enemy.radius) {
          if (!this.player.invulnerable) {
            this.player.health -= 10;
            this.timers.invulnerability = CONFIG.INVULNERABILITY_DURATION;
            
            // Knockback
            this.player.vx += (dx / dist) * 5;
            this.player.vy += (dy / dist) * 5;
            
            // Visual effect
            if (this.vfx) {
              this.vfx.createImpactEffect(this.player.x, this.player.y, '#ff0000');
            }
            
            if (this.player.health <= 0) {
              this.playerDeath();
            }
          }
        }
      }
      
      // Projectile-Enemy collisions
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        
        for (const enemy of this.enemies) {
          const dx = projectile.x - enemy.x;
          const dy = projectile.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < projectile.radius + enemy.radius) {
            enemy.health -= projectile.damage;
            this.projectiles.splice(i, 1);
            
            // Visual effect
            if (this.vfx) {
              this.vfx.createImpactEffect(enemy.x, enemy.y, projectile.color);
            }
            break;
          }
        }
      }
      
      // Player-Obstacle collisions
      for (const obstacle of this.obstacles) {
        const dx = this.player.x - obstacle.x;
        const dy = this.player.y - obstacle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.player.radius + obstacle.radius) {
          // Push player away
          const pushAngle = Math.atan2(dy, dx);
          const pushForce = (this.player.radius + obstacle.radius - dist);
          this.player.x += Math.cos(pushAngle) * pushForce;
          this.player.y += Math.sin(pushAngle) * pushForce;
          
          // Dampen velocity
          this.player.vx *= 0.5;
          this.player.vy *= 0.5;
        }
      }
    }
    
    spawnEntities(deltaTime) {
      // Spawn enemies
      this.timers.enemySpawn += deltaTime;
      if (this.timers.enemySpawn > CONFIG.ENEMY_SPAWN_RATE) {
        this.timers.enemySpawn = 0;
        if (this.enemies.length < CONFIG.MAX_ENEMIES) {
          this.spawnEnemy();
        }
      }
      
      // Spawn wolves
      this.timers.wolfSpawn += deltaTime;
      if (this.timers.wolfSpawn > CONFIG.WOLF_SPAWN_INTERVAL) {
        this.timers.wolfSpawn = 0;
        if (this.wolves.length < CONFIG.MAX_WOLVES) {
          this.spawnWolf();
        }
      }
      
      // Spawn power-ups
      this.timers.powerUpSpawn += deltaTime;
      if (this.timers.powerUpSpawn > CONFIG.POWERUP_SPAWN_RATE) {
        this.timers.powerUpSpawn = 0;
        if (this.powerUps.length < CONFIG.MAX_POWERUPS) {
          this.spawnPowerUp();
        }
      }
    }
    
    spawnEnemy() {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      
      switch(edge) {
        case 0: // Top
          x = Math.random() * this.canvas.width;
          y = -CONFIG.ENEMY_RADIUS;
          break;
        case 1: // Right
          x = this.canvas.width + CONFIG.ENEMY_RADIUS;
          y = Math.random() * this.canvas.height;
          break;
        case 2: // Bottom
          x = Math.random() * this.canvas.width;
          y = this.canvas.height + CONFIG.ENEMY_RADIUS;
          break;
        case 3: // Left
          x = -CONFIG.ENEMY_RADIUS;
          y = Math.random() * this.canvas.height;
          break;
      }
      
      this.enemies.push({
        x, y,
        vx: 0, vy: 0,
        radius: CONFIG.ENEMY_RADIUS,
        speed: CONFIG.ENEMY_SPEED + this.waveNumber * 0.2,
        health: 50 + this.waveNumber * 10,
        maxHealth: 50 + this.waveNumber * 10,
        color: '#ff0000',
        type: 'basic'
      });
    }
    
    calculateWolvesForWave(waveNumber) {
      // Wave 1: 1 wolf
      // Wave 2: 3 wolves
      // Wave 3+: multiply by 2 each wave
      if (waveNumber === 1) return 1;
      if (waveNumber === 2) return 3;
      
      // For wave 3 and beyond, start with 3 and multiply by 2 for each wave after 2
      let wolves = 3;
      for (let i = 2; i < waveNumber; i++) {
        wolves *= 2;
      }
      return Math.min(wolves, CONFIG.MAX_WOLVES); // Cap at max wolves
    }
    
    startWolfWave() {
      this.wolfWaveNumber++;
      this.wolvesRequiredThisWave = this.calculateWolvesForWave(this.wolfWaveNumber);
      this.wolvesSpawnedThisWave = 0;
      this.isWolfWaveActive = true;
      
      // Show wave notification
      if (this.vfx) {
        this.vfx.createScreenFlash('#ff0000', 0.3);
      }
      
      console.log(`🐺 Wolf Wave ${this.wolfWaveNumber} Started! Spawning ${this.wolvesRequiredThisWave} wolves`);
      
      // Spawn wolves with delay between each
      for (let i = 0; i < this.wolvesRequiredThisWave; i++) {
        setTimeout(() => {
          if (this.state === 'playing') {
            this.spawnWolf();
          }
        }, i * CONFIG.WOLF_WAVE_SPAWN_DELAY);
      }
    }
    
    spawnWolf() {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      
      switch(edge) {
        case 0: // Top
          x = Math.random() * this.canvas.width;
          y = -CONFIG.WOLF_RADIUS;
          break;
        case 1: // Right
          x = this.canvas.width + CONFIG.WOLF_RADIUS;
          y = Math.random() * this.canvas.height;
          break;
        case 2: // Bottom
          x = Math.random() * this.canvas.width;
          y = this.canvas.height + CONFIG.WOLF_RADIUS;
          break;
        case 3: // Left
          x = -CONFIG.WOLF_RADIUS;
          y = Math.random() * this.canvas.height;
          break;
      }
      
      const wolf = {
        x, y,
        vx: 0, vy: 0,
        radius: CONFIG.WOLF_RADIUS,
        speed: CONFIG.WOLF_SPEED,
        health: CONFIG.WOLF_HEALTH,
        maxHealth: CONFIG.WOLF_HEALTH,
        color: '#8B4513',
        type: 'wolf',
        state: 'idle',
        lastAttack: 0
      };
      
      this.wolves.push(wolf);
      this.enemies.push(wolf);
    }
    
    spawnPowerUp() {
      const types = ['health', 'energy', 'speed', 'shield', 'damage'];
      const colors = {
        health: '#ff00ff',
        energy: '#00ffff',
        speed: '#00ff00',
        shield: '#0088ff',
        damage: '#ff8800'
      };
      
      const type = types[Math.floor(Math.random() * types.length)];
      
      this.powerUps.push({
        x: Math.random() * (this.canvas.width - 100) + 50,
        y: Math.random() * (this.canvas.height - 100) + 50,
        type: type,
        color: colors[type],
        floatOffset: 0
      });
    }
    
    clearWolves() {
      for (const wolf of this.wolves) {
        const index = this.enemies.indexOf(wolf);
        if (index > -1) {
          this.enemies.splice(index, 1);
        }
      }
      this.wolves = [];
    }
    
      nextWave() {
    this.waveNumber++;
    this.enemies = [];
    this.wolves = [];
    this.generateObstacles();
    this.timers.waveTransition = CONFIG.WAVE_TRANSITION_TIME;
    
    // Spawn initial enemies for the wave
    const baseEnemyCount = 3;
    const enemiesPerWave = 2;
    const totalEnemies = Math.min(baseEnemyCount + (this.waveNumber - 1) * enemiesPerWave, CONFIG.MAX_ENEMIES);
    
    // Spawn enemies after transition
    setTimeout(() => {
      for (let i = 0; i < totalEnemies; i++) {
        this.spawnEnemy();
      }
      
      // Spawn wolves starting from wave 3
      if (this.waveNumber >= 3) {
        const wolfCount = Math.min(Math.floor((this.waveNumber - 2) / 2), CONFIG.MAX_WOLVES);
        for (let i = 0; i < wolfCount; i++) {
          this.spawnWolf();
        }
      }
    }, CONFIG.WAVE_TRANSITION_TIME);
    
    // Visual effect
    if (this.vfx) {
      this.vfx.shakeScreen(15, 500);
    }
  }
    
    giveShield() {
      if (this.player) {
        this.timers.invulnerability = CONFIG.POWERUP_DURATION;
      }
    }
    
    checkWaveCompletion() {
      if (this.enemies.length === 0 && this.wolves.length === 0 && this.timers.waveTransition <= 0) {
        this.nextWave();
      }
    }
    
    playerDeath() {
      this.lives--;
      
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        // Respawn player
        this.initPlayer();
        this.timers.invulnerability = CONFIG.INVULNERABILITY_DURATION * 2;
        
        // Clear nearby enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const enemy = this.enemies[i];
          const dx = this.player.x - enemy.x;
          const dy = this.player.y - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 200) {
            this.enemies.splice(i, 1);
            const wolfIndex = this.wolves.indexOf(enemy);
            if (wolfIndex > -1) {
              this.wolves.splice(wolfIndex, 1);
            }
          }
        }
        
        // Visual effect
        if (this.vfx) {
          this.vfx.createExplosion(this.player.x, this.player.y, {
            particleCount: 50,
            maxRadius: 200
          });
          this.vfx.shakeScreen(20, 1000);
        }
      }
    }
    
    gameOver() {
      this.state = 'gameOver';
      
      // Save high score
      const highScore = localStorage.getItem('smashimpact_highscore') || 0;
      if (this.score > highScore) {
        localStorage.setItem('smashimpact_highscore', this.score);
      }
    }
    
    restart() {
      this.state = 'playing';
      this.score = 0;
      this.lives = CONFIG.INITIAL_LIVES;
      this.waveNumber = 1;
      this.enemies = [];
      this.wolves = [];
      this.projectiles = [];
      this.powerUps = [];
      this.obstacles = [];
      
      // Reset timers
      for (const key in this.timers) {
        this.timers[key] = 0;
      }
      
      // Reset player
      this.initPlayer();
      
      // Generate new level
      this.generateObstacles();
      
      // Clear visual effects
      if (this.vfx) {
        this.vfx.clear();
      }
    }
    
    render() {
      const ctx = this.ctx;
      
      // Clear canvas
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Render game entities
      this.renderObstacles();
      this.renderPowerUps();
      this.renderProjectiles();
      this.renderEnemies();
      this.renderPlayer();
      
      // Render visual effects
      if (this.vfx) {
        this.vfx.render();
      }
      
      // Render UI
      this.renderUI();
      
      // Render pause overlay
      if (this.state === 'paused') {
        this.renderPauseOverlay();
      }
      
      // Render game over overlay
      if (this.state === 'gameOver') {
        this.renderGameOverOverlay();
      }
    }
    
    renderObstacles() {
      const ctx = this.ctx;
      
      for (const obstacle of this.obstacles) {
        ctx.save();
        ctx.fillStyle = obstacle.color;
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    renderPowerUps() {
      const ctx = this.ctx;
      
      for (const powerUp of this.powerUps) {
        ctx.save();
        ctx.fillStyle = powerUp.color;
        ctx.shadowColor = powerUp.color;
        ctx.shadowBlur = 20;
        ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.005) * 0.2;
        
        // Draw star shape
        const x = powerUp.x;
        const y = powerUp.displayY || powerUp.y;
        const radius = CONFIG.POWERUP_RADIUS;
        
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI * i) / 5;
          const r = i % 2 === 0 ? radius : radius / 2;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    
    renderProjectiles() {
      const ctx = this.ctx;
      
      for (const projectile of this.projectiles) {
        ctx.save();
        ctx.fillStyle = projectile.color;
        ctx.shadowColor = projectile.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    renderEnemies() {
      const ctx = this.ctx;
      
      for (const enemy of this.enemies) {
        ctx.save();
        
        // Draw enemy
        ctx.fillStyle = enemy.color;
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        const healthPercent = enemy.health / enemy.maxHealth;
        const barWidth = enemy.radius * 2;
        const barHeight = 4;
        const barY = enemy.y - enemy.radius - 10;
        
        ctx.fillStyle = '#333333';
        ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);
        
        ctx.fillStyle = enemy.type === 'wolf' ? '#8B4513' : '#ff0000';
        ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
        
        ctx.restore();
      }
    }
    
    renderPlayer() {
      if (!this.player) return;
      
      const ctx = this.ctx;
      
      // Draw trail
      if (this.player.trail.length > 0) {
        ctx.save();
        ctx.strokeStyle = this.player.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        for (let i = 0; i < this.player.trail.length; i++) {
          const point = this.player.trail[i];
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
        ctx.restore();
      }
      
      // Draw player
      ctx.save();
      
      // Invulnerability effect
      if (this.player.invulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.3;
      }
      
      ctx.fillStyle = this.player.color;
      ctx.shadowColor = this.player.color;
      ctx.shadowBlur = this.player.boosting ? 20 : 10;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw health bar
      const healthPercent = this.player.health / this.player.maxHealth;
      const barWidth = this.player.radius * 2.5;
      const barHeight = 5;
      const barY = this.player.y - this.player.radius - 15;
      
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#333333';
      ctx.fillRect(this.player.x - barWidth / 2, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(this.player.x - barWidth / 2, barY, barWidth * healthPercent, barHeight);
      
      // Draw energy bar
      const energyPercent = this.player.energy / this.player.maxEnergy;
      const energyBarY = barY - 7;
      
      ctx.fillStyle = '#333333';
      ctx.fillRect(this.player.x - barWidth / 2, energyBarY, barWidth, 3);
      
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(this.player.x - barWidth / 2, energyBarY, barWidth * energyPercent, 3);
      
      ctx.restore();
    }
    
    renderUI() {
      const ctx = this.ctx;
      
      // Score
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`Score: ${this.score}`, 20, 40);
      
      // Wave
      ctx.font = '20px Arial';
      ctx.fillText(`Wave: ${this.waveNumber}`, 20, 70);
      
      // Lives
      ctx.fillText(`Lives: ${this.lives}`, 20, 100);
      
      // Enemy count
      ctx.font = '16px Arial';
      ctx.fillText(`Enemies: ${this.enemies.length}`, 20, 130);
      ctx.fillText(`Wolves: ${this.wolves.length}`, 20, 150);
      
      // Boost cooldown
      if (this.player && this.player.boostCooldown > 0) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText(`Boost: ${Math.ceil(this.player.boostCooldown / 1000)}s`, 20, 180);
      }
      
      // Wave transition
      if (this.timers.waveTransition > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Wave ${this.waveNumber}`, this.canvas.width / 2, this.canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Get Ready!', this.canvas.width / 2, this.canvas.height / 2 + 50);
        ctx.restore();
      }
      
      ctx.restore();
    }
    
    renderPauseOverlay() {
      const ctx = this.ctx;
      
      // Darken background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Pause text
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '24px Arial';
      ctx.fillText('Press ESC to Resume', this.canvas.width / 2, this.canvas.height / 2 + 50);
      ctx.restore();
    }
    
    renderGameOverOverlay() {
      const ctx = this.ctx;
      
      // Darken background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Game over text
      ctx.save();
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 64px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 50);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '32px Arial';
      ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
      ctx.fillText(`Wave Reached: ${this.waveNumber}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
      
      const highScore = localStorage.getItem('smashimpact_highscore') || 0;
      if (this.score >= highScore) {
        ctx.fillStyle = '#ffff00';
        ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 100);
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.fillText('Press R to Restart', this.canvas.width / 2, this.canvas.height / 2 + 150);
      ctx.restore();
    }
    
    gameLoop() {
      const now = performance.now();
      const deltaTime = now - this.lastTime;
      this.lastTime = now;
      
      this.update(deltaTime);
      this.render();
      
      requestAnimationFrame(() => this.gameLoop());
    }
    
    // Public API
    setJoystick(joystick) {
      this.input.joystick = joystick;
    }
    
    setButton(name, button) {
      this.input.buttons[name] = button;
    }
    
    connectMultiplayer(serverUrl) {
      if (this.multiplayer) {
        this.multiplayer.connect(serverUrl);
      }
    }
    
    disconnectMultiplayer() {
      if (this.multiplayer) {
        this.multiplayer.disconnect();
      }
    }
    
    getState() {
      return {
        state: this.state,
        score: this.score,
        lives: this.lives,
        wave: this.waveNumber,
        player: this.player,
        enemies: this.enemies.length,
        wolves: this.wolves.length
      };
    }
  }
  
  // Expose to global scope
  window.UnifiedGame = UnifiedGame;
  
})(window);