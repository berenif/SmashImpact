// Enhanced Combat Game System with Sword & Shield Mechanics
// Based on UnifiedGame but with new combat features

(function(window) {
  'use strict';

  // Enhanced Configuration
  const CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: window.innerWidth,
    CANVAS_HEIGHT: window.innerHeight,
    
    // World settings (3x larger than viewport)
    WORLD_SCALE: 3,  // Map is 3x larger than viewport
    WORLD_WIDTH: window.innerWidth * 3,
    WORLD_HEIGHT: window.innerHeight * 3,
    
    // Player settings
    PLAYER_RADIUS: 25,
    PLAYER_SPEED: 5,
    PLAYER_MAX_SPEED: 8,
    PLAYER_ACCELERATION: 0.5,
    PLAYER_FRICTION: 0.9,
    
    // Sword Attack settings
    SWORD_RANGE: 60,
    SWORD_ARC: Math.PI / 3, // 60 degree arc
    SWORD_DAMAGE: 30,
    SWORD_KNOCKBACK: 15,
    SWORD_COOLDOWN: 400,
    SWORD_ANIMATION_TIME: 200,
    
    // Shield settings
    SHIELD_DURATION: 2000,
    SHIELD_COOLDOWN: 500,
    PERFECT_PARRY_WINDOW: 150, // 150ms window for perfect parry
    SHIELD_DAMAGE_REDUCTION: 0.7, // Normal block reduces damage by 70%
    PERFECT_PARRY_DAMAGE_REDUCTION: 1.0, // Perfect parry negates all damage
    PERFECT_PARRY_STUN_DURATION: 1500, // Stun enemy on perfect parry
    PERFECT_PARRY_ENERGY_RESTORE: 30,
    
    // Roll settings
    ROLL_DISTANCE: 75,  // Reduced by half from 150
    ROLL_DURATION: 300,
    ROLL_COOLDOWN: 800,
    ROLL_INVULNERABILITY: true,  // Invincibility during roll
    ROLL_SPEED_MULTIPLIER: 2.5,
    ROLL_ENERGY_COST: 15,  // Energy required to perform a roll
    
    // Targeting settings
    MAX_TARGET_DISTANCE: 400,  // Maximum distance for auto-targeting
    TARGET_REVALIDATION_INTERVAL: 100,  // Re-check target validity every 100ms
    
    // Enemy settings
    ENEMY_RADIUS: 18,
    ENEMY_SPEED: 2,
    ENEMY_SPAWN_RATE: 2000,
    MAX_ENEMIES: 15,
    ENEMY_HEALTH: 50,
    ENEMY_DAMAGE: 15,
    
    // Game settings
    INITIAL_LIVES: 100,
    INITIAL_ENERGY: 100,
    ENERGY_REGEN_RATE: 0.2,
    INVULNERABILITY_DURATION: 1000,
    SCORE_PER_KILL: 100,
    SCORE_PER_PERFECT_PARRY: 50,
    
    // Visual settings
    PARTICLE_LIFETIME: 60,
    MAX_PARTICLES: 500,
    SCREEN_SHAKE_DURATION: 300
  };

  // Enhanced Combat Game Class
  class EnhancedCombatGame {
    constructor(canvas) {
      // Validate canvas parameter
      if (!canvas) {
        throw new Error('Canvas element is required but was not provided');
      }
      
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('Provided element is not a valid canvas element');
      }
      
      this.canvas = canvas;
      
      // Try to get 2D context with fallback options
      try {
        this.ctx = canvas.getContext('2d', { 
          alpha: false,  // Disable alpha for better performance
          desynchronized: true  // Hint for better performance
        });
      } catch (e) {
        // Fallback to basic context
        this.ctx = canvas.getContext('2d');
      }
      
      if (!this.ctx) {
        throw new Error('Failed to get 2D context from canvas. Your browser may not support HTML5 Canvas.');
      }
      
      // Core game state
      this.state = 'menu';
      this.score = 0;
      this.frameCount = 0;
      this.lastTime = performance.now();
      this.deltaTime = 0;
      
      // Camera system for larger world
      this.camera = {
        x: 0,
        y: 0,
        width: CONFIG.CANVAS_WIDTH,
        height: CONFIG.CANVAS_HEIGHT,
        smoothing: 0.1  // Camera smoothing factor
      };
      
      // World dimensions
      this.world = {
        width: CONFIG.WORLD_WIDTH,
        height: CONFIG.WORLD_HEIGHT
      };
      
      // Game entities
      this.player = null;
      this.enemies = [];
      this.particles = [];
      this.projectiles = [];
      
      // Visual effects
      this.vfx = null;
      this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
      
      // Input handling
      this.input = {
        keys: {},
        mouse: { x: 0, y: 0 },
        mouseAngle: 0,
        buffer: [],  // Input buffer for smoother combat
        bufferTimeout: 200  // Buffer inputs for 200ms
      };
      
      // Enemy targeting system
      this.targetedEnemy = null;
      this.targetLockEnabled = true;
      this.lastTargetRevalidation = 0;
      
      // Timers
      this.timers = {
        enemySpawn: 0,
        invulnerability: 0
      };
    }
    
    init() {
      // Set canvas size
      this.resizeCanvas();
      
      // Initialize player with sword and shield
      this.initPlayer();
      
      // Initialize camera position to center on player
      this.updateCamera();
      
      // Initialize visual effects if available
      if (window.VFXSystem) {
        this.vfx = new window.VFXSystem(this.ctx);
      } else if (window.VisualEffectsManager) {
        this.vfx = new window.VisualEffectsManager(this.ctx, this.canvas);
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start game
      this.state = 'playing';
      this.gameLoop();
    }
    
    initPlayer() {
      this.player = {
        // Position and physics (spawn in center of world)
        x: this.world.width / 2,
        y: this.world.height / 2,
        vx: 0,
        vy: 0,
        radius: CONFIG.PLAYER_RADIUS,
        speed: CONFIG.PLAYER_SPEED,
        facing: 0, // Angle player is facing
        
        // Combat stats
        health: CONFIG.INITIAL_LIVES,
        maxHealth: CONFIG.INITIAL_LIVES,
        energy: CONFIG.INITIAL_ENERGY,
        maxEnergy: CONFIG.INITIAL_ENERGY,
        
        // Sword properties
        swordActive: false,
        swordAngle: 0,
        swordCooldown: 0,
        swordAnimationTime: 0,
        lastAttackTime: 0,
        
        // Shield properties
        shielding: false,
        shieldStartTime: 0,
        shieldCooldown: 0,
        perfectParryWindow: false,
        lastPerfectParry: 0,
        shieldAngle: 0,
        
        // Roll properties
        rolling: false,
        rollDirection: { x: 0, y: 0 },
        rollCooldown: 0,
        rollStartTime: 0,
        rollEndTime: 0,
        
        // Status
        invulnerable: false,
        stunned: false,
        color: '#4a90e2',
        
        // Facing direction tracking
        movementDirection: 0,  // Direction based on movement
        lastMovementX: 0,
        lastMovementY: 0
      };
    }
    
    setupEventListeners() {
      // Keyboard events
      window.addEventListener('keydown', (e) => this.handleKeyDown(e));
      window.addEventListener('keyup', (e) => this.handleKeyUp(e));
      
      // Mouse events
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      
      // Window resize
      window.addEventListener('resize', () => this.resizeCanvas());
      
      // Prevent right click menu
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    handleKeyDown(e) {
      this.input.keys[e.key.toLowerCase()] = true;
      
      // Handle special keys
      switch(e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          if (!this.player.swordActive && this.player.swordCooldown <= 0 && !this.player.rolling) {
            this.performSwordAttack();
          } else {
            // Add to input buffer if action can't be performed now
            this.addToInputBuffer('attack');
          }
          break;
          
        case 'l':
          e.preventDefault();
          if (!this.player.shielding && this.player.shieldCooldown <= 0 && !this.player.rolling && !this.player.swordActive) {
            this.startShield();
          } else {
            // Add to input buffer if action can't be performed now
            this.addToInputBuffer('shield');
          }
          break;
          
        case 'm':
          e.preventDefault();
          if (!this.player.rolling && this.player.rollCooldown <= 0 && !this.player.shielding) {
            this.performRoll();
          } else {
            // Add to input buffer if action can't be performed now
            this.addToInputBuffer('roll');
          }
          break;
          
        case 'escape':
          this.togglePause();
          break;
          
        case 'r':
          if (this.state === 'gameOver') {
            this.restart();
          }
          break;
          
        case 'shift':
          // Switch to next enemy target
          e.preventDefault();
          this.switchTarget();
          break;
      }
    }
    
    handleKeyUp(e) {
      this.input.keys[e.key.toLowerCase()] = false;
      
      // Handle shield release
      if (e.key.toLowerCase() === 'l' && this.player.shielding) {
        this.endShield();
      }
    }
    
    handleMouseMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.input.mouse.x = e.clientX - rect.left;
      this.input.mouse.y = e.clientY - rect.top;
      
      // Calculate angle from player to mouse (using world coordinates)
      if (this.player && !this.targetLockEnabled) {
        // Convert mouse screen position to world position
        const worldMouse = this.screenToWorld(this.input.mouse.x, this.input.mouse.y);
        const dx = worldMouse.x - this.player.x;
        const dy = worldMouse.y - this.player.y;
        this.input.mouseAngle = Math.atan2(dy, dx);
        this.player.facing = this.input.mouseAngle;
      }
    }
    
    // Find closest enemy to player
    findClosestEnemy() {
      if (!this.player || this.enemies.length === 0) return null;
      
      let closestEnemy = null;
      let closestDistance = Infinity;
      
      for (const enemy of this.enemies) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only consider enemies within maximum targeting range
        if (distance < closestDistance && distance <= CONFIG.MAX_TARGET_DISTANCE) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }
      
      return closestEnemy;
    }
    
    // Switch to next enemy target
    switchTarget() {
      if (this.enemies.length === 0) {
        this.targetedEnemy = null;
        return;
      }
      
      // If no current target, get closest
      if (!this.targetedEnemy || !this.enemies.includes(this.targetedEnemy)) {
        this.targetedEnemy = this.findClosestEnemy();
        return;
      }
      
      // Find enemies within range
      const enemiesInRange = this.enemies.filter(enemy => {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= CONFIG.MAX_TARGET_DISTANCE;
      });
      
      if (enemiesInRange.length === 0) {
        this.targetedEnemy = null;
        return;
      }
      
      // Find next enemy in the filtered list
      const currentIndex = enemiesInRange.indexOf(this.targetedEnemy);
      if (currentIndex === -1) {
        // Current target is out of range, get closest
        this.targetedEnemy = this.findClosestEnemy();
      } else {
        // Switch to next enemy in range
        const nextIndex = (currentIndex + 1) % enemiesInRange.length;
        this.targetedEnemy = enemiesInRange[nextIndex];
      }
    }
    
    performSwordAttack() {
      if (this.player.energy < 10) {
        // Add to input buffer to retry when energy is available
        this.addToInputBuffer('attack');
        return;
      }
      
      this.player.swordActive = true;
      this.player.swordAngle = this.player.facing;  // Attack in facing direction
      this.player.swordCooldown = CONFIG.SWORD_COOLDOWN;
      this.player.swordAnimationTime = CONFIG.SWORD_ANIMATION_TIME;
      this.player.lastAttackTime = performance.now();
      this.player.energy -= 10;
      
      // Check for enemies in sword arc
      const hitEnemies = [];
      for (const enemy of this.enemies) {
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= CONFIG.SWORD_RANGE + enemy.radius) {
          // Check if enemy is within sword arc
          const angleToEnemy = Math.atan2(dy, dx);
          let angleDiff = Math.abs(angleToEnemy - this.player.swordAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          
          if (angleDiff <= CONFIG.SWORD_ARC / 2) {
            hitEnemies.push(enemy);
          }
        }
      }
      
      // Apply damage and knockback to hit enemies
      for (const enemy of hitEnemies) {
        enemy.health -= CONFIG.SWORD_DAMAGE;
        
        // Apply knockback
        const dx = enemy.x - this.player.x;
        const dy = enemy.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          enemy.vx = (dx / dist) * CONFIG.SWORD_KNOCKBACK;
          enemy.vy = (dy / dist) * CONFIG.SWORD_KNOCKBACK;
        }
        
        // Create hit effect
        this.createHitEffect(enemy.x, enemy.y, '#ff6b6b');
        
        // Check if enemy is killed
        if (enemy.health <= 0) {
          this.score += CONFIG.SCORE_PER_KILL;
          this.createDeathEffect(enemy.x, enemy.y);
        }
      }
      
      // Screen shake on hit
      if (hitEnemies.length > 0) {
        this.startScreenShake(5, 200);
      }
      
      // Create sword slash effect
      this.createSwordSlashEffect();
      
      // Update UI
      this.updateAbilityUI();
    }
    
    startShield() {
      this.player.shielding = true;
      this.player.shieldStartTime = performance.now();
      this.player.perfectParryWindow = true;
      this.player.shieldAngle = this.player.facing;  // Shield in facing direction
      
      // Visual feedback
      this.createShieldEffect();
      
      // Set perfect parry window timer
      setTimeout(() => {
        if (this.player.shielding) {
          this.player.perfectParryWindow = false;
        }
      }, CONFIG.PERFECT_PARRY_WINDOW);
      
      this.updateAbilityUI();
    }
    
    endShield() {
      if (!this.player.shielding) return;
      
      this.player.shielding = false;
      this.player.perfectParryWindow = false;
      this.player.shieldCooldown = CONFIG.SHIELD_COOLDOWN;
      
      this.updateAbilityUI();
    }
    
    performRoll() {
      // Check if player has enough energy
      if (this.player.energy < CONFIG.ROLL_ENERGY_COST) {
        console.log('Not enough energy to roll');
        // Add to input buffer to retry when energy is available
        this.addToInputBuffer('roll');
        return;
      }
      
      // Roll in the direction the player is facing
      let dx = Math.cos(this.player.facing);
      let dy = Math.sin(this.player.facing);
      
      // Pre-calculate roll endpoint and validate it's within bounds
      const endX = this.player.x + dx * CONFIG.ROLL_DISTANCE;
      const endY = this.player.y + dy * CONFIG.ROLL_DISTANCE;
      
      // Adjust roll vector if it would go out of world bounds
      if (endX < this.player.radius || endX > this.world.width - this.player.radius) {
        // Calculate maximum distance we can roll in X direction
        const maxDistX = dx > 0 ? 
          (this.world.width - this.player.radius - this.player.x) : 
          (this.player.x - this.player.radius);
        dx = dx * (maxDistX / CONFIG.ROLL_DISTANCE);
      }
      
      if (endY < this.player.radius || endY > this.world.height - this.player.radius) {
        // Calculate maximum distance we can roll in Y direction
        const maxDistY = dy > 0 ? 
          (this.world.height - this.player.radius - this.player.y) : 
          (this.player.y - this.player.radius);
        dy = dy * (maxDistY / CONFIG.ROLL_DISTANCE);
      }
      
      // Don't roll if we can't move at all
      const adjustedDist = Math.sqrt(dx * dx + dy * dy);
      if (adjustedDist < 0.1) {
        console.log('Cannot roll - too close to boundary');
        return;
      }
      
      this.player.rolling = true;
      this.player.rollDirection = { x: dx, y: dy };
      this.player.rollCooldown = CONFIG.ROLL_COOLDOWN;
      this.player.rollStartTime = performance.now();
      this.player.rollEndTime = this.player.rollStartTime + CONFIG.ROLL_DURATION;
      this.player.energy -= CONFIG.ROLL_ENERGY_COST;
      
      // Set invulnerability during roll (always on)
      this.player.invulnerable = true;
      
      // Create roll effect
      this.createRollEffect();
      
      this.updateAbilityUI();
    }
    
    addToInputBuffer(action) {
      const now = performance.now();
      // Add action to buffer with timestamp
      this.input.buffer.push({
        action: action,
        timestamp: now
      });
      
      // Keep buffer size reasonable
      if (this.input.buffer.length > 5) {
        this.input.buffer.shift();
      }
    }
    
    processInputBuffer() {
      if (this.input.buffer.length === 0) return;
      
      const now = performance.now();
      const validBuffer = [];
      
      for (const bufferedInput of this.input.buffer) {
        // Remove old buffered inputs
        if (now - bufferedInput.timestamp > this.input.bufferTimeout) {
          continue;
        }
        
        // Try to execute buffered action
        let executed = false;
        switch(bufferedInput.action) {
          case 'attack':
            if (!this.player.swordActive && this.player.swordCooldown <= 0 && !this.player.rolling) {
              this.performSwordAttack();
              executed = true;
            }
            break;
          case 'shield':
            if (!this.player.shielding && this.player.shieldCooldown <= 0 && !this.player.rolling && !this.player.swordActive) {
              this.startShield();
              executed = true;
            }
            break;
          case 'roll':
            if (!this.player.rolling && this.player.rollCooldown <= 0 && !this.player.shielding && this.player.energy >= CONFIG.ROLL_ENERGY_COST) {
              this.performRoll();
              executed = true;
            }
            break;
        }
        
        // Keep unexecuted actions in buffer
        if (!executed) {
          validBuffer.push(bufferedInput);
        }
      }
      
      this.input.buffer = validBuffer;
    }
    
    handlePerfectParry(enemy) {
      // Stun the enemy
      enemy.stunned = true;
      enemy.stunnedUntil = performance.now() + CONFIG.PERFECT_PARRY_STUN_DURATION;
      
      // Restore energy
      this.player.energy = Math.min(
        this.player.maxEnergy,
        this.player.energy + CONFIG.PERFECT_PARRY_ENERGY_RESTORE
      );
      
      // Knockback enemy
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        enemy.vx = (dx / dist) * 20;
        enemy.vy = (dy / dist) * 20;
      }
      
      // Visual effects
      this.createPerfectParryEffect();
      this.startScreenShake(8, 300);
      
      // Score bonus
      this.score += CONFIG.SCORE_PER_PERFECT_PARRY;
      
      this.player.lastPerfectParry = performance.now();
    }
    
    resizeCanvas() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      
      // Update camera dimensions
      this.camera.width = this.canvas.width;
      this.camera.height = this.canvas.height;
      
      // Update world dimensions
      this.world.width = this.canvas.width * CONFIG.WORLD_SCALE;
      this.world.height = this.canvas.height * CONFIG.WORLD_SCALE;
    }
    
    // Camera system
    updateCamera() {
      if (!this.player) return;
      
      // Target camera position (centered on player)
      const targetX = this.player.x - this.camera.width / 2;
      const targetY = this.player.y - this.camera.height / 2;
      
      // Smooth camera movement
      this.camera.x += (targetX - this.camera.x) * this.camera.smoothing;
      this.camera.y += (targetY - this.camera.y) * this.camera.smoothing;
      
      // Clamp camera to world boundaries
      this.camera.x = Math.max(0, Math.min(this.world.width - this.camera.width, this.camera.x));
      this.camera.y = Math.max(0, Math.min(this.world.height - this.camera.height, this.camera.y));
    }
    
    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
      return {
        x: worldX - this.camera.x,
        y: worldY - this.camera.y
      };
    }
    
    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
      return {
        x: screenX + this.camera.x,
        y: screenY + this.camera.y
      };
    }
    
    // Check if an object is visible on screen
    isOnScreen(x, y, radius = 0) {
      return x + radius >= this.camera.x && 
             x - radius <= this.camera.x + this.camera.width &&
             y + radius >= this.camera.y && 
             y - radius <= this.camera.y + this.camera.height;
    }
    
    togglePause() {
      if (this.state === 'playing') {
        this.state = 'paused';
        document.getElementById('pauseScreen').style.display = 'flex';
      } else if (this.state === 'paused') {
        this.state = 'playing';
        document.getElementById('pauseScreen').style.display = 'none';
      }
    }
    
    restart() {
      this.score = 0;
      this.enemies = [];
      this.particles = [];
      this.projectiles = [];
      this.initPlayer();
      this.state = 'playing';
    }
    
    update(deltaTime) {
      if (this.state !== 'playing') return;
      
      this.deltaTime = deltaTime;
      this.frameCount++;
      
      // Update timers
      this.updateTimers(deltaTime);
      
      // Update player
      this.updatePlayer(deltaTime);
      
      // Update camera to follow player
      this.updateCamera();
      
      // Update enemies
      this.updateEnemies(deltaTime);
      
      // Update particles
      this.updateParticles(deltaTime);
      
      // Update visual effects
      if (this.vfx) {
        this.vfx.update(deltaTime);
      }
      
      // Update screen shake
      this.updateScreenShake(deltaTime);
      
      // Check collisions
      this.checkCollisions();
      
      // Spawn enemies
      this.spawnEnemies(deltaTime);
      
      // Update UI
      this.updateUI();
    }
    
    updateTimers(deltaTime) {
      // Update all timers
      for (const key in this.timers) {
        if (this.timers[key] > 0) {
          this.timers[key] -= deltaTime;
        }
      }
      
      // Player cooldowns
      if (this.player.swordCooldown > 0) {
        this.player.swordCooldown -= deltaTime;
      }
      if (this.player.shieldCooldown > 0) {
        this.player.shieldCooldown -= deltaTime;
      }
      if (this.player.rollCooldown > 0) {
        this.player.rollCooldown -= deltaTime;
      }
      if (this.player.swordAnimationTime > 0) {
        this.player.swordAnimationTime -= deltaTime;
        if (this.player.swordAnimationTime <= 0) {
          this.player.swordActive = false;
        }
      }
      
      // Energy regeneration
      if (this.player.energy < this.player.maxEnergy && !this.player.rolling && !this.player.shielding) {
        this.player.energy = Math.min(
          this.player.maxEnergy,
          this.player.energy + CONFIG.ENERGY_REGEN_RATE * deltaTime / 16
        );
      }
      
      // Invulnerability
      if (this.timers.invulnerability > 0) {
        this.player.invulnerable = true;
      } else if (!this.player.rolling) {
        this.player.invulnerable = false;
      }
    }
    
    updatePlayer(deltaTime) {
      if (!this.player) return;
      
      // Process buffered inputs
      this.processInputBuffer();
      
      // Update enemy targeting
      if (this.targetLockEnabled) {
        const now = performance.now();
        
        // Auto-target closest enemy if none selected or current target is dead
        if (!this.targetedEnemy || !this.enemies.includes(this.targetedEnemy)) {
          this.targetedEnemy = this.findClosestEnemy();
          this.lastTargetRevalidation = now;
        }
        
        // Periodically re-validate target distance
        if (now - this.lastTargetRevalidation > CONFIG.TARGET_REVALIDATION_INTERVAL) {
          if (this.targetedEnemy) {
            const dx = this.targetedEnemy.x - this.player.x;
            const dy = this.targetedEnemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Drop target if it's too far away
            if (distance > CONFIG.MAX_TARGET_DISTANCE) {
              this.targetedEnemy = this.findClosestEnemy();
            }
          }
          this.lastTargetRevalidation = now;
        }
        
        // Update facing to look at targeted enemy
        if (this.targetedEnemy) {
          const dx = this.targetedEnemy.x - this.player.x;
          const dy = this.targetedEnemy.y - this.player.y;
          this.player.facing = Math.atan2(dy, dx);
        }
      }
      
      // Handle rolling
      if (this.player.rolling) {
        const now = performance.now();
        const rollProgress = (now - this.player.rollStartTime) / CONFIG.ROLL_DURATION;
        
        if (rollProgress < 1) {
          // Apply roll movement with proper distance calculation
          const rollSpeed = (CONFIG.ROLL_DISTANCE / CONFIG.ROLL_DURATION) * 1000;
          this.player.vx = this.player.rollDirection.x * rollSpeed;
          this.player.vy = this.player.rollDirection.y * rollSpeed;
          
          // Ensure invulnerability during roll
          this.player.invulnerable = true;
          
          // Create trail effect
          if (this.frameCount % 2 === 0) {
            this.createRollTrail();
          }
        } else {
          // End roll
          this.player.rolling = false;
          this.player.invulnerable = false;
          this.player.vx *= 0.5; // Reduce speed after roll
          this.player.vy *= 0.5;
        }
      } else if (!this.player.shielding) {
        // Normal movement (not while shielding or rolling)
        let dx = 0, dy = 0;
        
        // Check for joystick input first (mobile controls)
        if (this.input.joystick) {
          const joystickInput = this.input.joystick.getInput();
          dx = joystickInput.x;
          dy = joystickInput.y;
        }
        
        // Keyboard input - ZQSD controls (if no joystick input)
        if (dx === 0 && dy === 0) {
          if (this.input.keys['z'] || this.input.keys['arrowup']) dy -= 1;
          if (this.input.keys['s'] || this.input.keys['arrowdown']) dy += 1;
          if (this.input.keys['q'] || this.input.keys['arrowleft']) dx -= 1;
          if (this.input.keys['d'] || this.input.keys['arrowright']) dx += 1;
        }
        
        // Track movement direction for facing
        if (dx !== 0 || dy !== 0) {
          this.player.lastMovementX = dx;
          this.player.lastMovementY = dy;
          
          // Update facing based on movement if not targeting an enemy
          if (!this.targetLockEnabled || !this.targetedEnemy) {
            this.player.movementDirection = Math.atan2(dy, dx);
            this.player.facing = this.player.movementDirection;
          }
        }
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          const mag = Math.sqrt(dx * dx + dy * dy);
          dx /= mag;
          dy /= mag;
        }
        
        // Apply acceleration
        const dt = deltaTime / 1000;
        const acceleration = CONFIG.PLAYER_ACCELERATION * dt * 60;
        this.player.vx += dx * acceleration;
        this.player.vy += dy * acceleration;
        
        // Limit speed
        const speed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (speed > CONFIG.PLAYER_MAX_SPEED) {
          this.player.vx = (this.player.vx / speed) * CONFIG.PLAYER_MAX_SPEED;
          this.player.vy = (this.player.vy / speed) * CONFIG.PLAYER_MAX_SPEED;
        }
      } else {
        // Reduced movement while shielding
        this.player.vx *= 0.7;
        this.player.vy *= 0.7;
      }
      
      // Apply friction (if not rolling)
      if (!this.player.rolling) {
        this.player.vx *= CONFIG.PLAYER_FRICTION;
        this.player.vy *= CONFIG.PLAYER_FRICTION;
      }
      
      // Update position
      const dt = deltaTime / 1000;
      this.player.x += this.player.vx * dt * 60;
      this.player.y += this.player.vy * dt * 60;
      
      // Keep player in world bounds
      this.player.x = Math.max(this.player.radius, Math.min(this.world.width - this.player.radius, this.player.x));
      this.player.y = Math.max(this.player.radius, Math.min(this.world.height - this.player.radius, this.player.y));
    }
    
    updateEnemies(deltaTime) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        
        // Remove dead enemies
        if (enemy.health <= 0) {
          this.enemies.splice(i, 1);
          continue;
        }
        
        // Check if stunned
        if (enemy.stunned && enemy.stunnedUntil) {
          if (performance.now() < enemy.stunnedUntil) {
            // Enemy is still stunned
            enemy.vx *= 0.9;
            enemy.vy *= 0.9;
            
            // Visual effect for stunned enemy
            if (this.frameCount % 10 === 0) {
              this.createStunEffect(enemy.x, enemy.y);
            }
          } else {
            // Stun expired
            enemy.stunned = false;
            enemy.stunnedUntil = null;
          }
        } else {
          // AI: Move towards player
          if (this.player) {
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
              enemy.vx = (dx / dist) * CONFIG.ENEMY_SPEED;
              enemy.vy = (dy / dist) * CONFIG.ENEMY_SPEED;
            }
          }
        }
        
        // Apply knockback friction
        if (Math.abs(enemy.vx) > CONFIG.ENEMY_SPEED || Math.abs(enemy.vy) > CONFIG.ENEMY_SPEED) {
          enemy.vx *= 0.92;
          enemy.vy *= 0.92;
        }
        
        // Update position
        const dt = deltaTime / 1000;
        enemy.x += enemy.vx * dt * 60;
        enemy.y += enemy.vy * dt * 60;
        
        // Keep in world bounds
        enemy.x = Math.max(enemy.radius, Math.min(this.world.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(this.world.height - enemy.radius, enemy.y));
      }
    }
    
    updateParticles(deltaTime) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const particle = this.particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= deltaTime;
        particle.vy += particle.gravity || 0;
        particle.vx *= particle.friction || 0.98;
        particle.vy *= particle.friction || 0.98;
        
        if (particle.life <= 0) {
          this.particles.splice(i, 1);
        }
      }
    }
    
    updateScreenShake(deltaTime) {
      if (this.screenShake.duration > 0) {
        this.screenShake.duration -= deltaTime;
        this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
        this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
      } else {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }
    
    checkCollisions() {
      // Check enemy collisions with player
      for (const enemy of this.enemies) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.player.radius + enemy.radius) {
          // Check if player is invulnerable
          if (this.player.invulnerable) continue;
          
          // Check if player is shielding
          if (this.player.shielding) {
            // Calculate angle to enemy
            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = Math.abs(angleToEnemy - this.player.shieldAngle);
            if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
            
            // Check if enemy is in front of shield (180 degree arc)
            if (angleDiff <= Math.PI / 2) {
              // Blocked!
              if (this.player.perfectParryWindow) {
                // Perfect parry!
                this.handlePerfectParry(enemy);
              } else {
                // Normal block
                const reducedDamage = enemy.damage * (1 - CONFIG.SHIELD_DAMAGE_REDUCTION);
                this.player.health -= reducedDamage;
                
                // Small knockback
                this.player.vx += (dx / dist) * 3;
                this.player.vy += (dy / dist) * 3;
                
                // Visual effect
                this.createBlockEffect(this.player.x, this.player.y);
              }
            } else {
              // Hit from behind
              this.takeDamage(enemy.damage);
            }
          } else {
            // Take damage
            this.takeDamage(enemy.damage);
          }
          
          // Knockback enemy
          enemy.vx = -(dx / dist) * 5;
          enemy.vy = -(dy / dist) * 5;
        }
      }
    }
    
    takeDamage(damage) {
      this.player.health -= damage;
      this.timers.invulnerability = CONFIG.INVULNERABILITY_DURATION;
      
      // Visual feedback
      this.startScreenShake(10, 300);
      this.createDamageEffect(this.player.x, this.player.y);
      
      // Check game over
      if (this.player.health <= 0) {
        this.gameOver();
      }
    }
    
    spawnEnemies(deltaTime) {
      this.timers.enemySpawn -= deltaTime;
      
      if (this.timers.enemySpawn <= 0 && this.enemies.length < CONFIG.MAX_ENEMIES) {
        // Spawn enemy at random edge of the world
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch(side) {
          case 0: // Top
            x = Math.random() * this.world.width;
            y = CONFIG.ENEMY_RADIUS;
            break;
          case 1: // Right
            x = this.world.width - CONFIG.ENEMY_RADIUS;
            y = Math.random() * this.world.height;
            break;
          case 2: // Bottom
            x = Math.random() * this.world.width;
            y = this.world.height - CONFIG.ENEMY_RADIUS;
            break;
          case 3: // Left
            x = CONFIG.ENEMY_RADIUS;
            y = Math.random() * this.world.height;
            break;
        }
        
        this.enemies.push({
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          radius: CONFIG.ENEMY_RADIUS,
          health: CONFIG.ENEMY_HEALTH,
          damage: CONFIG.ENEMY_DAMAGE,
          color: '#ff4444',
          stunned: false,
          stunnedUntil: null
        });
        
        this.timers.enemySpawn = CONFIG.ENEMY_SPAWN_RATE;
      }
    }
    
    gameOver() {
      this.state = 'gameOver';
      // You can add game over screen logic here
      alert(`Game Over! Score: ${this.score}`);
      this.restart();
    }
    
    // Visual Effects
    createHitEffect(x, y, color) {
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * 5,
          vy: Math.sin(angle) * 5,
          radius: 3,
          color: color,
          life: 30,
          friction: 0.95
        });
      }
    }
    
    createDeathEffect(x, y) {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 4 + 2,
          color: '#ff0000',
          life: 40,
          friction: 0.93,
          gravity: 0.2
        });
      }
    }
    
    createSwordSlashEffect() {
      const startAngle = this.player.swordAngle - CONFIG.SWORD_ARC / 2;
      const endAngle = this.player.swordAngle + CONFIG.SWORD_ARC / 2;
      
      for (let i = 0; i < 15; i++) {
        const angle = startAngle + (endAngle - startAngle) * (i / 15);
        const dist = CONFIG.SWORD_RANGE * 0.8;
        this.particles.push({
          x: this.player.x + Math.cos(angle) * dist,
          y: this.player.y + Math.sin(angle) * dist,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2,
          radius: 4,
          color: '#ffffff',
          life: 20,
          friction: 0.9
        });
      }
    }
    
    createShieldEffect() {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        this.particles.push({
          x: this.player.x + Math.cos(angle) * (this.player.radius + 10),
          y: this.player.y + Math.sin(angle) * (this.player.radius + 10),
          vx: 0,
          vy: 0,
          radius: 3,
          color: this.player.perfectParryWindow ? '#ffd700' : '#4444ff',
          life: 30,
          friction: 1
        });
      }
    }
    
    createPerfectParryEffect() {
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        this.particles.push({
          x: this.player.x + Math.cos(angle) * this.player.radius,
          y: this.player.y + Math.sin(angle) * this.player.radius,
          vx: Math.cos(angle) * 8,
          vy: Math.sin(angle) * 8,
          radius: 5,
          color: '#ffd700',
          life: 40,
          friction: 0.92
        });
      }
    }
    
    createRollEffect() {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: this.player.x + (Math.random() - 0.5) * 20,
          y: this.player.y + (Math.random() - 0.5) * 20,
          vx: -this.player.rollDirection.x * 3,
          vy: -this.player.rollDirection.y * 3,
          radius: 3,
          color: '#88ccff',
          life: 25,
          friction: 0.95
        });
      }
    }
    
    createRollTrail() {
      this.particles.push({
        x: this.player.x,
        y: this.player.y,
        vx: 0,
        vy: 0,
        radius: this.player.radius * 0.8,
        color: 'rgba(136, 204, 255, 0.3)',
        life: 15,
        friction: 1
      });
    }
    
    createBlockEffect(x, y) {
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          radius: 2,
          color: '#4444ff',
          life: 20,
          friction: 0.95
        });
      }
    }
    
    createDamageEffect(x, y) {
      for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          radius: 3,
          color: '#ff0000',
          life: 25,
          friction: 0.94
        });
      }
    }
    
    createStunEffect(x, y) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x: x + Math.cos(angle) * 15,
        y: y + Math.sin(angle) * 15 - 20,
        vx: 0,
        vy: -0.5,
        radius: 2,
        color: '#ffff00',
        life: 30,
        friction: 1
      });
    }
    
    startScreenShake(intensity, duration) {
      this.screenShake.intensity = intensity;
      this.screenShake.duration = duration;
    }
    
    // UI Updates
    updateUI() {
      // Update health bar
      const healthBar = document.getElementById('healthBar');
      if (healthBar) {
        const healthPercent = Math.max(0, (this.player.health / this.player.maxHealth) * 100);
        healthBar.style.width = healthPercent + '%';
      }
      
      // Update energy bar
      const energyBar = document.getElementById('energyBar');
      if (energyBar) {
        const energyPercent = Math.max(0, (this.player.energy / this.player.maxEnergy) * 100);
        energyBar.style.width = energyPercent + '%';
      }
      
      // Update score
      const scoreDisplay = document.getElementById('scoreDisplay');
      if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${this.score}`;
      }
    }
    
    updateAbilityUI() {
      // Update attack ability
      const attackAbility = document.getElementById('attackAbility');
      if (attackAbility) {
        if (this.player.swordActive) {
          attackAbility.className = 'ability active';
        } else if (this.player.swordCooldown <= 0) {
          attackAbility.className = 'ability ready';
        } else {
          attackAbility.className = 'ability';
        }
      }
      
      // Update shield ability
      const shieldAbility = document.getElementById('shieldAbility');
      if (shieldAbility) {
        if (this.player.shielding) {
          shieldAbility.className = 'ability active';
        } else if (this.player.shieldCooldown <= 0) {
          shieldAbility.className = 'ability ready';
        } else {
          shieldAbility.className = 'ability';
        }
      }
      
      // Update roll ability
      const rollAbility = document.getElementById('rollAbility');
      if (rollAbility) {
        if (this.player.rolling) {
          rollAbility.className = 'ability active';
        } else if (this.player.rollCooldown <= 0) {
          rollAbility.className = 'ability ready';
        } else {
          rollAbility.className = 'ability';
        }
      }
    }
    
    // Rendering
    render() {
      // Clear canvas with solid background
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Apply screen shake
      this.ctx.save();
      this.ctx.translate(this.screenShake.x, this.screenShake.y);
      
      // Render grid background
      this.renderGrid();
      
      // Render particles (behind everything)
      this.renderParticles();
      
      // Render enemies
      this.renderEnemies();
      
      // Render player
      this.renderPlayer();
      
      // Render visual effects
      if (this.vfx && this.vfx.render) {
        this.vfx.render();
      }
      
      this.ctx.restore();
      
      // Render minimap (on top of everything)
      this.renderMinimap();
      
      // Render mobile controls (if available)
      if (this.mobileControls && this.mobileControls.render) {
        this.mobileControls.render(this.ctx);
      }
    }
    
    renderGrid() {
      const ctx = this.ctx;
      const gridSize = 50;
      
      // Calculate visible grid bounds
      const startX = Math.floor(this.camera.x / gridSize) * gridSize;
      const startY = Math.floor(this.camera.y / gridSize) * gridSize;
      const endX = Math.ceil((this.camera.x + this.camera.width) / gridSize) * gridSize;
      const endY = Math.ceil((this.camera.y + this.camera.height) / gridSize) * gridSize;
      
      ctx.strokeStyle = 'rgba(100, 100, 200, 0.1)';
      ctx.lineWidth = 1;
      
      // Draw vertical lines
      for (let x = startX; x <= endX; x += gridSize) {
        const screenX = x - this.camera.x;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, this.canvas.height);
        ctx.stroke();
      }
      
      // Draw horizontal lines
      for (let y = startY; y <= endY; y += gridSize) {
        const screenY = y - this.camera.y;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(this.canvas.width, screenY);
        ctx.stroke();
      }
      
      // Draw world boundaries
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(
        -this.camera.x,
        -this.camera.y,
        this.world.width,
        this.world.height
      );
    }
    
    renderMinimap() {
      const ctx = this.ctx;
      const minimapSize = 150;
      const minimapX = this.canvas.width - minimapSize - 20;
      const minimapY = 20;
      const scale = minimapSize / Math.max(this.world.width, this.world.height);
      
      // Minimap background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
      
      // Minimap border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
      
      // Draw world bounds on minimap
      const worldWidth = this.world.width * scale;
      const worldHeight = this.world.height * scale;
      ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(minimapX, minimapY, worldWidth, worldHeight);
      
      // Draw camera viewport on minimap
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(
        minimapX + this.camera.x * scale,
        minimapY + this.camera.y * scale,
        this.camera.width * scale,
        this.camera.height * scale
      );
      
      // Draw player on minimap
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(
        minimapX + this.player.x * scale,
        minimapY + this.player.y * scale,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
      
      // Draw enemies on minimap
      ctx.fillStyle = '#ff0000';
      for (const enemy of this.enemies) {
        ctx.beginPath();
        ctx.arc(
          minimapX + enemy.x * scale,
          minimapY + enemy.y * scale,
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    
    renderPlayer() {
      if (!this.player) return;
      
      const ctx = this.ctx;
      
      // Get screen coordinates for player
      const screenPos = this.worldToScreen(this.player.x, this.player.y);
      
      // Draw sword if active
      if (this.player.swordActive) {
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.player.swordAngle);
        
        // Sword blade
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.player.radius, -5, CONFIG.SWORD_RANGE, 10);
        
        // Sword tip
        ctx.beginPath();
        ctx.moveTo(this.player.radius + CONFIG.SWORD_RANGE, -5);
        ctx.lineTo(this.player.radius + CONFIG.SWORD_RANGE + 15, 0);
        ctx.lineTo(this.player.radius + CONFIG.SWORD_RANGE, 5);
        ctx.closePath();
        ctx.fill();
        
        // Sword glow
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.player.radius, -5, CONFIG.SWORD_RANGE, 10);
        
        ctx.restore();
      }
      
      // Draw shield if active
      if (this.player.shielding) {
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(this.player.shieldAngle);
        
        // Shield arc
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius + 15, -Math.PI/2, Math.PI/2);
        ctx.strokeStyle = this.player.perfectParryWindow ? '#ffd700' : '#4444ff';
        ctx.lineWidth = 5;
        ctx.shadowColor = this.player.perfectParryWindow ? '#ffd700' : '#4444ff';
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        // Shield decoration
        if (this.player.perfectParryWindow) {
          ctx.beginPath();
          ctx.arc(0, 0, this.player.radius + 20, -Math.PI/3, Math.PI/3);
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Draw player body
      ctx.save();
      
      // Player shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(screenPos.x, screenPos.y + 5, this.player.radius * 0.8, this.player.radius * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Player body
      if (this.player.invulnerable && this.frameCount % 10 < 5) {
        ctx.globalAlpha = 0.5;
      }
      
      ctx.fillStyle = this.player.rolling ? '#88ccff' : this.player.color;
      ctx.shadowColor = this.player.rolling ? '#88ccff' : this.player.color;
      ctx.shadowBlur = this.player.rolling ? 20 : 10;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Player direction indicator (enhanced)
      ctx.save();
      ctx.translate(screenPos.x, screenPos.y);
      ctx.rotate(this.player.facing);
      
      // Direction arrow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(this.player.radius * 0.5, 0);
      ctx.lineTo(this.player.radius * 0.9, -5);
      ctx.lineTo(this.player.radius * 0.9, 5);
      ctx.closePath();
      ctx.fill();
      
      // Direction line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(this.player.radius * 0.6, 0);
      ctx.stroke();
      
      ctx.restore();
      
      ctx.restore();
    }
    
    renderEnemies() {
      for (const enemy of this.enemies) {
        // Skip rendering enemies that are not on screen
        if (!this.isOnScreen(enemy.x, enemy.y, enemy.radius)) continue;
        
        const ctx = this.ctx;
        const screenPos = this.worldToScreen(enemy.x, enemy.y);
        
        // Draw targeting circle for targeted enemy
        if (enemy === this.targetedEnemy) {
          ctx.save();
          
          // Outer targeting circle
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, enemy.radius + 15, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner targeting circle (animated)
          const pulseScale = 1 + Math.sin(performance.now() * 0.005) * 0.1;
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(screenPos.x, screenPos.y, (enemy.radius + 10) * pulseScale, 0, Math.PI * 2);
          ctx.stroke();
          
          // Target indicator arrows
          ctx.fillStyle = '#ff0000';
          const arrowDist = enemy.radius + 25;
          for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + performance.now() * 0.001;
            const x = screenPos.x + Math.cos(angle) * arrowDist;
            const y = screenPos.y + Math.sin(angle) * arrowDist;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + Math.PI);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-5, -3);
            ctx.lineTo(-5, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          
          ctx.restore();
        }
        
        // Enemy shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenPos.x, screenPos.y + 3, enemy.radius * 0.8, enemy.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Enemy body
        ctx.fillStyle = enemy.stunned ? '#ffaa00' : enemy.color;
        ctx.shadowColor = enemy.stunned ? '#ffaa00' : enemy.color;
        ctx.shadowBlur = enemy.stunned ? 15 : 8;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Stun stars
        if (enemy.stunned) {
          ctx.fillStyle = '#ffff00';
          ctx.font = '20px Arial';
          ctx.fillText('💫', screenPos.x - 10, screenPos.y - enemy.radius - 5);
        }
        
        // Health bar
        if (enemy.health < CONFIG.ENEMY_HEALTH) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.fillRect(screenPos.x - 20, screenPos.y - enemy.radius - 15, 40, 4);
          
          ctx.fillStyle = '#ff0000';
          const healthPercent = enemy.health / CONFIG.ENEMY_HEALTH;
          ctx.fillRect(screenPos.x - 20, screenPos.y - enemy.radius - 15, 40 * healthPercent, 4);
        }
      }
    }
    
    renderParticles() {
      for (const particle of this.particles) {
        // Skip particles not on screen
        if (!this.isOnScreen(particle.x, particle.y, particle.radius)) continue;
        
        const screenPos = this.worldToScreen(particle.x, particle.y);
        this.ctx.globalAlpha = particle.life / 60;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.globalAlpha = 1;
    }
    
    // Game Loop
    gameLoop() {
      const now = performance.now();
      const deltaTime = now - this.lastTime;
      this.lastTime = now;
      
      this.update(deltaTime);
          this.render();
    
    requestAnimationFrame(() => this.gameLoop());
  }
  
  // Mobile control methods
  setJoystick(joystick) {
    this.input.joystick = joystick;
  }
  
  setButton(name, button) {
    if (!this.input.buttons) {
      this.input.buttons = {};
    }
    this.input.buttons[name] = button;
  }
  
  // Mobile control action handlers
  handleAttack() {
    if (!this.player.swordActive && this.player.swordCooldown <= 0 && !this.player.rolling) {
      this.performSwordAttack();
    } else {
      this.addToInputBuffer('attack');
    }
  }
  
  handleAttackRelease() {
    // Optional: handle attack button release if needed
  }
  
  handleBlock() {
    if (!this.player.shielding && this.player.shieldCooldown <= 0 && !this.player.rolling && !this.player.swordActive) {
      this.startShield();
    } else {
      this.addToInputBuffer('shield');
    }
  }
  
  handleBlockRelease() {
    if (this.player.shielding) {
      this.endShield();
    }
  }
  
  handleRoll() {
    if (!this.player.rolling && this.player.rollCooldown <= 0 && !this.player.shielding) {
      this.performRoll();
    } else {
      this.addToInputBuffer('roll');
    }
  }
  
  handleBoost() {
    // Optional: implement speed boost
    if (this.player.energy > 10) {
      this.player.speed = CONFIG.PLAYER_SPEED * 1.5;
      this.player.energy -= 0.5;
    }
  }
  
  handleShoot() {
    // Optional: implement ranged attack
    if (this.player.energy >= 20 && !this.player.rolling && !this.player.shielding) {
      // Create a projectile
      const angle = this.player.facing;
      this.projectiles.push({
        x: this.player.x + Math.cos(angle) * 30,
        y: this.player.y + Math.sin(angle) * 30,
        vx: Math.cos(angle) * 10,
        vy: Math.sin(angle) * 10,
        damage: 20,
        radius: 5,
        color: '#ffff00',
        lifetime: 60
      });
      this.player.energy -= 20;
      
      // Visual feedback
      if (this.vfx && this.vfx.createMuzzleFlash) {
        this.vfx.createMuzzleFlash(
          this.player.x + Math.cos(angle) * 30,
          this.player.y + Math.sin(angle) * 30,
          angle
        );
      }
    }
  }
}
  
  // Export to global scope
  window.EnhancedCombatGame = EnhancedCombatGame;
  window.CONFIG = CONFIG;
  
})(window);