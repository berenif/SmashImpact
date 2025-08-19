// Unified Game System with WebAssembly Acceleration
// High-performance version using WebAssembly for physics and collision detection

(function(window) {
  'use strict';

  // Import WebAssembly adapter
  const script = document.createElement('script');
  script.type = 'module';
  script.textContent = `
    import { WasmGameAdapter } from './wasm-game-wrapper.js';
    window.WasmGameAdapter = WasmGameAdapter;
  `;
  document.head.appendChild(script);

  // Game Configuration (same as original)
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
    MAX_WOLVES: 5,
    WOLF_SPAWN_INTERVAL: 10000,
    
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

  // Enhanced Unified Game Class with WebAssembly
  class UnifiedGameWasm {
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
      this.wasmAdapter = null; // WebAssembly adapter
      this.useWasm = false; // Flag to indicate if WASM is available
      
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
      
      // Performance monitoring
      this.performance = {
        showStats: false,
        updateTime: 0,
        renderTime: 0,
        wasmTime: 0,
        jsTime: 0
      };
      
      // Initialize systems
      this.init();
    }
    
    async init() {
      // Set canvas size
      this.resizeCanvas();
      
      // Initialize player
      this.initPlayer();
      
      // Initialize WebAssembly adapter
      await this.initWasm();
      
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
    
    async initWasm() {
      try {
        // Wait a bit for the module to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (window.WasmGameAdapter) {
          console.log('Initializing WebAssembly acceleration...');
          this.wasmAdapter = new window.WasmGameAdapter(this);
          this.useWasm = await this.wasmAdapter.initialize();
          
          if (this.useWasm) {
            console.log('✓ WebAssembly acceleration enabled');
            this.showNotification('WebAssembly Acceleration Active', '#00ff00');
          } else {
            console.log('⚠ WebAssembly not available, using JavaScript fallback');
            this.showNotification('Running in JavaScript mode', '#ffff00');
          }
        } else {
          console.log('WebAssembly adapter not found, using JavaScript implementation');
          this.useWasm = false;
        }
      } catch (error) {
        console.error('Failed to initialize WebAssembly:', error);
        this.useWasm = false;
      }
    }
    
    showNotification(message, color = '#ffffff') {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: ${color};
        padding: 10px 20px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 10000;
        animation: fadeIn 0.3s ease-in;
      `;
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }
    
    initPlayer() {
      this.player = {
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: 0,
        vy: 0,
        radius: CONFIG.PLAYER_RADIUS,
        speed: CONFIG.PLAYER_SPEED,
        health: 100,
        maxHealth: 100,
        energy: 100,
        maxEnergy: 100,
        color: '#00ff00',
        trail: [],
        invulnerable: false,
        boosting: false,
        boostCooldown: 0,
        lastBoostParticle: 0
      };
    }
    
    setupEventListeners() {
      // Keyboard events
      window.addEventListener('keydown', (e) => {
        this.input.keys[e.key.toLowerCase()] = true;
        
        // Toggle performance stats with P key
        if (e.key.toLowerCase() === 'p') {
          this.performance.showStats = !this.performance.showStats;
        }
        
        // Toggle WebAssembly with W key
        if (e.key.toLowerCase() === 'q' && this.wasmAdapter) {
          this.useWasm = !this.useWasm;
          this.showNotification(
            this.useWasm ? 'WebAssembly Enabled' : 'WebAssembly Disabled',
            this.useWasm ? '#00ff00' : '#ff0000'
          );
        }
      });
      
      window.addEventListener('keyup', (e) => {
        this.input.keys[e.key.toLowerCase()] = false;
        
        if (e.key === 'Escape') {
          this.togglePause();
        }
        
        if (e.key.toLowerCase() === 'r' && this.state === 'gameOver') {
          this.restart();
        }
      });
      
      // Mouse events
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.input.mouse.x = e.clientX - rect.left;
        this.input.mouse.y = e.clientY - rect.top;
      });
      
      this.canvas.addEventListener('mousedown', () => {
        this.input.mouse.pressed = true;
      });
      
      this.canvas.addEventListener('mouseup', () => {
        this.input.mouse.pressed = false;
      });
      
      // Window resize
      window.addEventListener('resize', () => {
        this.resizeCanvas();
        if (this.wasmAdapter && this.useWasm) {
          this.wasmAdapter.wasmEngine.setWorldBounds(this.canvas.width, this.canvas.height);
        }
      });
    }
    
    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
    
    update(deltaTime) {
      if (this.state !== 'playing') return;
      
      const startTime = performance.now();
      
      this.deltaTime = deltaTime;
      this.frameCount++;
      
      // Use WebAssembly engine if available
      if (this.useWasm && this.wasmAdapter) {
        const wasmStartTime = performance.now();
        
        // Update timers (still handled in JS)
        this.updateTimers(deltaTime);
        
        // Let WASM handle physics and collisions
        const wasmHandled = this.wasmAdapter.update(deltaTime);
        
        this.performance.wasmTime = performance.now() - wasmStartTime;
        
        if (!wasmHandled) {
          // Fallback to JavaScript implementation
          this.updateJavaScript(deltaTime);
        }
        
        // Update visual effects (still in JS)
        if (this.vfx) {
          this.vfx.update(deltaTime);
        }
        
        // Spawn entities (still in JS)
        this.spawnEntities(deltaTime);
        
        // Check wave completion
        this.checkWaveCompletion();
      } else {
        // Full JavaScript implementation
        this.updateJavaScript(deltaTime);
      }
      
      this.performance.updateTime = performance.now() - startTime;
    }
    
    updateJavaScript(deltaTime) {
      const startTime = performance.now();
      
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
      
      this.performance.jsTime = performance.now() - startTime;
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
            const pushForce = (enemy.radius + obstacle.radius - dist);
            enemy.x += Math.cos(pushAngle) * pushForce;
            enemy.y += Math.sin(pushAngle) * pushForce;
          }
        }
        
        // Remove if dead
        if (enemy.health <= 0) {
          this.enemies.splice(i, 1);
          this.score += CONFIG.SCORE_PER_KILL;
          
          // Create death effect
          if (this.vfx) {
            this.vfx.createExplosion(enemy.x, enemy.y, enemy.color);
          }
        }
      }
    }
    
    updateWolves(deltaTime) {
      // Update wolves with pack AI
      for (const wolf of this.wolves) {
        if (this.wolfAI && this.player) {
          // Use wolf AI system if available
          this.wolfAI.updateWolf(wolf, this.player, this.wolves, deltaTime);
        } else {
          // Simple fallback AI
          if (this.player) {
            const dx = this.player.x - wolf.x;
            const dy = this.player.y - wolf.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < CONFIG.WOLF_ALERT_RADIUS) {
              wolf.vx = (dx / dist) * CONFIG.WOLF_SPEED;
              wolf.vy = (dy / dist) * CONFIG.WOLF_SPEED;
            }
          }
          
          wolf.x += wolf.vx * deltaTime / 16;
          wolf.y += wolf.vy * deltaTime / 16;
        }
      }
    }
    
    updateProjectiles(deltaTime) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const projectile = this.projectiles[i];
        
        // Update position
        projectile.x += projectile.vx * deltaTime / 16;
        projectile.y += projectile.vy * deltaTime / 16;
        
        // Remove if out of bounds
        if (projectile.x < 0 || projectile.x > this.canvas.width ||
            projectile.y < 0 || projectile.y > this.canvas.height) {
          this.projectiles.splice(i, 1);
        }
      }
    }
    
    updatePowerUps(deltaTime) {
      // Power-ups pulse animation
      for (let i = this.powerUps.length - 1; i >= 0; i--) {
        const powerUp = this.powerUps[i];
        powerUp.pulse = Math.sin(performance.now() / 200) * 0.2 + 1;
        
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
    
    // ... (rest of the methods remain the same as original)
    
    render() {
      const startTime = performance.now();
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
      
      // Render performance stats if enabled
      if (this.performance.showStats) {
        this.renderPerformanceStats();
      }
      
      // Render pause overlay
      if (this.state === 'paused') {
        this.renderPauseOverlay();
      }
      
      // Render game over overlay
      if (this.state === 'gameOver') {
        this.renderGameOverOverlay();
      }
      
      this.performance.renderTime = performance.now() - startTime;
    }
    
    renderPerformanceStats() {
      const ctx = this.ctx;
      const metrics = this.wasmAdapter && this.useWasm ? 
        this.wasmAdapter.getPerformanceMetrics() : null;
      
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 100, 250, 200);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px monospace';
      
      let y = 120;
      const lineHeight = 18;
      
      ctx.fillText(`Mode: ${this.useWasm ? 'WebAssembly' : 'JavaScript'}`, 20, y);
      y += lineHeight;
      
      ctx.fillText(`FPS: ${(1000 / (this.performance.updateTime + this.performance.renderTime)).toFixed(0)}`, 20, y);
      y += lineHeight;
      
      ctx.fillText(`Update: ${this.performance.updateTime.toFixed(2)}ms`, 20, y);
      y += lineHeight;
      
      ctx.fillText(`Render: ${this.performance.renderTime.toFixed(2)}ms`, 20, y);
      y += lineHeight;
      
      if (metrics) {
        ctx.fillText(`Physics: ${metrics.physicsTime.toFixed(2)}ms`, 20, y);
        y += lineHeight;
        
        ctx.fillText(`Collision: ${metrics.collisionTime.toFixed(2)}ms`, 20, y);
        y += lineHeight;
        
        ctx.fillText(`Checks: ${metrics.collisionChecks}`, 20, y);
        y += lineHeight;
        
        ctx.fillText(`Entities: ${metrics.activeEntities}`, 20, y);
        y += lineHeight;
      } else {
        ctx.fillText(`WASM Time: ${this.performance.wasmTime.toFixed(2)}ms`, 20, y);
        y += lineHeight;
        
        ctx.fillText(`JS Time: ${this.performance.jsTime.toFixed(2)}ms`, 20, y);
        y += lineHeight;
      }
      
      ctx.fillStyle = '#ffff00';
      ctx.fillText('Press Q to toggle WASM', 20, y + lineHeight);
      
      ctx.restore();
    }
    
    // Include all other render methods from original...
    renderObstacles() {
      const ctx = this.ctx;
      
      for (const obstacle of this.obstacles) {
        ctx.save();
        ctx.fillStyle = obstacle.color;
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
        ctx.globalAlpha = 0.7;
        
        // Pulsing effect
        const scale = powerUp.pulse || 1;
        ctx.translate(powerUp.x, powerUp.y);
        ctx.scale(scale, scale);
        
        // Draw star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
          const x = Math.cos(angle) * CONFIG.POWERUP_RADIUS;
          const y = Math.sin(angle) * CONFIG.POWERUP_RADIUS;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          const innerAngle = angle + Math.PI / 5;
          const innerX = Math.cos(innerAngle) * (CONFIG.POWERUP_RADIUS * 0.5);
          const innerY = Math.sin(innerAngle) * (CONFIG.POWERUP_RADIUS * 0.5);
          ctx.lineTo(innerX, innerY);
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
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        if (enemy.health < enemy.maxHealth) {
          const barWidth = enemy.radius * 2;
          const barHeight = 4;
          const healthPercent = enemy.health / enemy.maxHealth;
          
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth, barHeight);
          
          ctx.fillStyle = 'rgba(255, 0, 0, 1)';
          ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.radius - 10, barWidth * healthPercent, barHeight);
        }
        
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
      
      // Invulnerability flashing
      if (this.player.invulnerable) {
        ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 100) * 0.5;
      }
      
      ctx.fillStyle = this.player.color;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw direction indicator
      const angle = Math.atan2(this.player.vy, this.player.vx);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y);
      ctx.lineTo(
        this.player.x + Math.cos(angle) * this.player.radius * 1.5,
        this.player.y + Math.sin(angle) * this.player.radius * 1.5
      );
      ctx.stroke();
      
      // Draw health bar
      const barWidth = 40;
      const healthPercent = this.player.health / this.player.maxHealth;
      const healthBarY = this.player.y + this.player.radius + 10;
      
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(this.player.x - barWidth / 2, healthBarY, barWidth, 4);
      
      ctx.fillStyle = healthPercent > 0.3 ? 'rgba(0, 255, 0, 1)' : 'rgba(255, 0, 0, 1)';
      ctx.fillRect(this.player.x - barWidth / 2, healthBarY, barWidth * healthPercent, 4);
      
      // Draw energy bar
      const energyPercent = this.player.energy / this.player.maxEnergy;
      const energyBarY = healthBarY + 6;
      
      ctx.fillStyle = 'rgba(0, 100, 255, 0.5)';
      ctx.fillRect(this.player.x - barWidth / 2, energyBarY, barWidth, 3);
      
      ctx.fillStyle = 'rgba(0, 150, 255, 1)';
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
      
      // Lives
      ctx.fillText(`Lives: ${this.lives}`, 20, 70);
      
      // Wave
      ctx.fillText(`Wave: ${this.waveNumber}`, this.canvas.width - 150, 40);
      
      // Controls hint
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('WASD/Arrows: Move | Space: Boost | ESC: Pause | P: Stats', 20, this.canvas.height - 20);
      
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
      
      ctx.font = '24px Arial';
      ctx.fillText(`Wave Reached: ${this.waveNumber}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
      
      ctx.fillStyle = '#00ff00';
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
    
    // Include all other methods from original...
    generateObstacles() {
      this.obstacles = [];
      const numObstacles = Math.min(CONFIG.MAX_OBSTACLES, 3 + this.waveNumber);
      
      for (let i = 0; i < numObstacles; i++) {
        const radius = CONFIG.OBSTACLE_MIN_RADIUS + 
          Math.random() * (CONFIG.OBSTACLE_MAX_RADIUS - CONFIG.OBSTACLE_MIN_RADIUS);
        
        this.obstacles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: radius,
          color: '#666666'
        });
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
        type: 'basic',
        active: true
      });
    }
    
    spawnWolf() {
      const edge = Math.floor(Math.random() * 4);
      let x, y;
      
      switch(edge) {
        case 0: x = Math.random() * this.canvas.width; y = -CONFIG.WOLF_RADIUS; break;
        case 1: x = this.canvas.width + CONFIG.WOLF_RADIUS; y = Math.random() * this.canvas.height; break;
        case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + CONFIG.WOLF_RADIUS; break;
        case 3: x = -CONFIG.WOLF_RADIUS; y = Math.random() * this.canvas.height; break;
      }
      
      const wolf = {
        x, y,
        vx: 0, vy: 0,
        radius: CONFIG.WOLF_RADIUS,
        speed: CONFIG.WOLF_SPEED,
        health: CONFIG.WOLF_HEALTH,
        maxHealth: CONFIG.WOLF_HEALTH,
        damage: CONFIG.WOLF_DAMAGE,
        color: '#8B4513',
        type: 'wolf',
        alertRadius: CONFIG.WOLF_ALERT_RADIUS,
        attackRadius: CONFIG.WOLF_ATTACK_RADIUS,
        attackCooldown: 0,
        active: true
      };
      
      this.wolves.push(wolf);
      this.enemies.push(wolf); // Also add to enemies array for unified processing
    }
    
    spawnPowerUp() {
      const types = ['health', 'energy', 'speed', 'shield', 'damage'];
      const colors = {
        health: '#00ff00',
        energy: '#0099ff',
        speed: '#ffff00',
        shield: '#ff00ff',
        damage: '#ff6600'
      };
      
      const type = types[Math.floor(Math.random() * types.length)];
      
      this.powerUps.push({
        x: Math.random() * (this.canvas.width - 100) + 50,
        y: Math.random() * (this.canvas.height - 100) + 50,
        type: type,
        color: colors[type],
        pulse: 1
      });
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
    
    handleBoost() {
      if (this.player.boostCooldown <= 0 && this.player.energy >= 20) {
        this.player.boosting = true;
        this.player.boostCooldown = CONFIG.PLAYER_BOOST_COOLDOWN;
        this.player.energy -= 20;
        
        // Apply boost velocity
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (speed > 0) {
          this.player.vx = (this.player.vx / speed) * CONFIG.PLAYER_BOOST_SPEED;
          this.player.vy = (this.player.vy / speed) * CONFIG.PLAYER_BOOST_SPEED;
        }
        
        setTimeout(() => {
          this.player.boosting = false;
        }, CONFIG.PLAYER_BOOST_DURATION);
      }
    }
    
    checkWaveCompletion() {
      if (this.enemies.length === 0 && this.timers.waveTransition <= 0) {
        this.waveNumber++;
        this.timers.waveTransition = CONFIG.WAVE_TRANSITION_TIME;
        
        // Bonus score for completing wave
        this.score += 500 * this.waveNumber;
        
        // Generate new obstacles
        this.generateObstacles();
        
        // Show wave complete message
        if (this.vfx) {
          // Could add wave complete effect
        }
      }
    }
    
    playerDeath() {
      this.lives--;
      
      if (this.lives <= 0) {
        this.state = 'gameOver';
      } else {
        // Respawn player
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.health = this.player.maxHealth;
        this.player.energy = this.player.maxEnergy;
        this.timers.invulnerability = CONFIG.INVULNERABILITY_DURATION;
      }
      
      // Death effect
      if (this.vfx) {
        this.vfx.createExplosion(this.player.x, this.player.y, this.player.color);
      }
    }
    
    togglePause() {
      if (this.state === 'playing') {
        this.state = 'paused';
      } else if (this.state === 'paused') {
        this.state = 'playing';
      }
    }
    
    restart() {
      // Reset game state
      this.state = 'playing';
      this.score = 0;
      this.lives = CONFIG.INITIAL_LIVES;
      this.waveNumber = 1;
      this.enemies = [];
      this.wolves = [];
      this.powerUps = [];
      this.projectiles = [];
      
      // Reset player
      this.initPlayer();
      
      // Reset timers
      for (const key in this.timers) {
        this.timers[key] = 0;
      }
      
      // Generate new obstacles
      this.generateObstacles();
      
      // Reinitialize WASM if needed
      if (this.wasmAdapter) {
        this.wasmAdapter.destroy();
        this.initWasm();
      }
    }
    
    // Clean up
    destroy() {
      if (this.wasmAdapter) {
        this.wasmAdapter.destroy();
      }
    }
  }

  // Add CSS for animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);

  // Export the enhanced game class
  window.UnifiedGameWasm = UnifiedGameWasm;

})(window);