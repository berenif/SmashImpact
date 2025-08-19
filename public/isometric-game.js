// Isometric Game Engine for SmashImpact
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    GRID_WIDTH: 30,
    GRID_HEIGHT: 20,
    TILE_WIDTH: 64,
    TILE_HEIGHT: 32,
    PLAYER_SPEED: 5,
    ENEMY_SPEED: 2,
    MAX_HEALTH: 100,
    MAX_ENERGY: 100,
    ENERGY_REGEN_RATE: 0.5,
    HEALTH_REGEN_RATE: 0.1
  };

  // Game State
  class GameState {
    constructor() {
      this.player = null;
      this.enemies = [];
      this.obstacles = [];
      this.powerUps = [];
      this.projectiles = [];
      this.particles = [];
      this.score = 0;
      this.level = 1;
      this.isPaused = false;
      this.isGameOver = false;
      this.camera = { x: 0, y: 0 };
      this.map = [];
      this.wolves = [];
      this.wolfPackCoordinator = null;
      this.debugMode = false;
      this.deltaTime = 0;
      this.lastTime = performance.now();
    }

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = canvas.width;
      this.height = canvas.height;
      
      // Initialize player
      this.player = {
        x: CONFIG.GRID_WIDTH / 2,
        y: CONFIG.GRID_HEIGHT / 2,
        z: 0,
        vx: 0,
        vy: 0,
        health: CONFIG.MAX_HEALTH,
        maxHealth: CONFIG.MAX_HEALTH,
        energy: CONFIG.MAX_ENERGY,
        maxEnergy: CONFIG.MAX_ENERGY,
        speed: CONFIG.PLAYER_SPEED,
        radius: 20,
        color: '#00ff00',
        isMoving: false,
        direction: 'down',
        inventory: [],
        abilities: []
      };

      // Initialize map
      this.generateMap();
      
      // Initialize visual effects if available
      if (window.VisualEffectsManager) {
        this.vfx = new window.VisualEffectsManager(this.ctx, this.canvas);
      }
      
      // Start game loop
      this.gameLoop();
    }

    generateMap() {
      // Create a simple grid map
      this.map = [];
      for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        this.map[y] = [];
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
          // Create tile
          this.map[y][x] = {
            type: 'floor',
            walkable: true,
            x: x,
            y: y,
            z: 0
          };
          
          // Add random obstacles
          if (Math.random() < 0.1 && !(x === Math.floor(CONFIG.GRID_WIDTH/2) && y === Math.floor(CONFIG.GRID_HEIGHT/2))) {
            this.map[y][x].type = 'wall';
            this.map[y][x].walkable = false;
            this.obstacles.push({
              x: x,
              y: y,
              width: 1,
              height: 1,
              type: 'wall'
            });
          }
        }
      }
    }

    update(deltaTime) {
      if (this.isPaused || this.isGameOver) return;
      
      this.deltaTime = deltaTime || 16;
      
      // Update player
      if (this.player) {
        this.updatePlayer();
      }
      
      // Update enemies
      this.enemies.forEach(enemy => this.updateEnemy(enemy));
      
      // Update projectiles
      this.projectiles = this.projectiles.filter(projectile => {
        projectile.x += projectile.vx * this.deltaTime / 1000;
        projectile.y += projectile.vy * this.deltaTime / 1000;
        projectile.lifetime -= this.deltaTime;
        return projectile.lifetime > 0;
      });
      
      // Update particles
      if (this.vfx) {
        this.vfx.update(this.deltaTime);
      }
      
      // Update camera to follow player
      if (this.player) {
        const screenX = this.gridToScreen(this.player.x, this.player.y).x;
        const screenY = this.gridToScreen(this.player.x, this.player.y).y;
        this.camera.x = this.width / 2 - screenX;
        this.camera.y = this.height / 2 - screenY;
      }
      
      // Regenerate energy
      if (this.player && this.player.energy < this.player.maxEnergy) {
        this.player.energy = Math.min(
          this.player.maxEnergy,
          this.player.energy + CONFIG.ENERGY_REGEN_RATE * this.deltaTime / 1000
        );
      }
    }

    updatePlayer() {
      if (!this.player) return;
      
      // Apply velocity
      if (this.player.vx === undefined) this.player.vx = 0;
      const dt = this.deltaTime / 1000;
      const newX = this.player.x + this.player.vx * dt;
      if (this.player.vy === undefined) this.player.vy = 0;
      const newY = this.player.y + this.player.vy * dt;
      
      // Check collision with map boundaries
      if (newX >= 0 && newX < CONFIG.GRID_WIDTH && 
          newY >= 0 && newY < CONFIG.GRID_HEIGHT) {
        // Check collision with obstacles
        let canMove = true;
        for (const obstacle of this.obstacles) {
          if (this.checkCollision(
            { x: newX, y: newY, width: 0.5, height: 0.5 },
            obstacle
          )) {
            canMove = false;
            break;
          }
        }
        
        if (canMove) {
          this.player.x = newX;
          this.player.y = newY;
        }
      }
      
      // Apply friction
      const frictionFactor = Math.pow(0.9, this.deltaTime / 16.67);
      this.player.vx *= frictionFactor;
      this.player.vy *= frictionFactor;
      
      // Update moving state
      this.player.isMoving = Math.abs(this.player.vx) > 0.1 || Math.abs(this.player.vy) > 0.1;
    }

    updateEnemy(enemy) {
      if (!enemy || !this.player) return;
      
      // Simple AI: move towards player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 1) {
        enemy.vx = (dx / distance) * enemy.speed;
        enemy.vy = (dy / distance) * enemy.speed;
        
        enemy.x += enemy.vx * this.deltaTime / 1000;
        enemy.y += enemy.vy * this.deltaTime / 1000;
      }
    }

    render() {
      if (!this.ctx) return;
      
      const ctx = this.ctx;
      
      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, this.width, this.height);
      
      // Save context state
      ctx.save();
      
      // Apply camera transform
      ctx.translate(this.camera.x, this.camera.y);
      
      // Render map
      this.renderMap();
      
      // Render obstacles
      this.renderObstacles();
      
      // Render power-ups
      this.renderPowerUps();
      
      // Render enemies
      this.renderEnemies();
      
      // Render player
      this.renderPlayer();
      
      // Render projectiles
      this.renderProjectiles();
      
      // Restore context state
      ctx.restore();
      
      // Render visual effects (on top of everything)
      if (this.vfx) {
        this.vfx.render();
      }
      
      // Render UI
      this.renderUI();
    }

    renderMap() {
      const ctx = this.ctx;
      
      for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
        for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
          const tile = this.map[y][x];
          const screen = this.gridToScreen(x, y);
          
          // Draw tile
          ctx.save();
          ctx.translate(screen.x, screen.y);
          
          if (tile.type === 'floor') {
            // Draw floor tile
            ctx.fillStyle = '#2a2a3e';
            ctx.beginPath();
            ctx.moveTo(0, -CONFIG.TILE_HEIGHT / 2);
            ctx.lineTo(CONFIG.TILE_WIDTH / 2, 0);
            ctx.lineTo(0, CONFIG.TILE_HEIGHT / 2);
            ctx.lineTo(-CONFIG.TILE_WIDTH / 2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#3a3a4e';
            ctx.stroke();
          } else if (tile.type === 'wall') {
            // Draw wall
            ctx.fillStyle = '#4a4a5e';
            ctx.fillRect(-CONFIG.TILE_WIDTH / 2, -CONFIG.TILE_HEIGHT, CONFIG.TILE_WIDTH, CONFIG.TILE_HEIGHT);
          }
          
          ctx.restore();
        }
      }
    }

    renderObstacles() {
      const ctx = this.ctx;
      
      this.obstacles.forEach(obstacle => {
        const screen = this.gridToScreen(obstacle.x, obstacle.y);
        ctx.save();
        ctx.translate(screen.x, screen.y);
        ctx.fillStyle = '#5a5a6e';
        ctx.fillRect(
          -CONFIG.TILE_WIDTH / 2,
          -CONFIG.TILE_HEIGHT,
          CONFIG.TILE_WIDTH * obstacle.width,
          CONFIG.TILE_HEIGHT * obstacle.height
        );
        ctx.restore();
      });
    }

    renderPowerUps() {
      const ctx = this.ctx;
      
      this.powerUps.forEach(powerUp => {
        const screen = this.gridToScreen(powerUp.x, powerUp.y);
        ctx.save();
        ctx.translate(screen.x, screen.y);
        
        // Draw power-up
        ctx.fillStyle = powerUp.color || '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    }

    renderEnemies() {
      const ctx = this.ctx;
      
      this.enemies.forEach(enemy => {
        const screen = this.gridToScreen(enemy.x, enemy.y);
        ctx.save();
        ctx.translate(screen.x, screen.y);
        
        // Draw enemy
        ctx.fillStyle = enemy.color || '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius || 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw health bar
        if (enemy.health && enemy.maxHealth) {
          const healthPercent = enemy.health / enemy.maxHealth;
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(-20, -30, 40, 4);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(-20, -30, 40 * healthPercent, 4);
        }
        
        ctx.restore();
      });
    }

    renderPlayer() {
      if (!this.player) return;
      
      const ctx = this.ctx;
      const screen = this.gridToScreen(this.player.x, this.player.y);
      
      ctx.save();
      ctx.translate(screen.x, screen.y);
      
      // Draw player
      ctx.fillStyle = this.player.color;
      ctx.beginPath();
      ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw health bar
      const healthPercent = this.player.health / this.player.maxHealth;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-25, -35, 50, 5);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(-25, -35, 50 * healthPercent, 5);
      
      // Draw energy bar
      const energyPercent = this.player.energy / this.player.maxEnergy;
      ctx.fillStyle = '#0000ff';
      ctx.fillRect(-25, -28, 50, 3);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(-25, -28, 50 * energyPercent, 3);
      
      ctx.restore();
    }

    renderProjectiles() {
      const ctx = this.ctx;
      
      this.projectiles.forEach(projectile => {
        const screen = this.gridToScreen(projectile.x, projectile.y);
        ctx.save();
        ctx.translate(screen.x, screen.y);
        
        ctx.fillStyle = projectile.color || '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius || 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });
    }

    renderUI() {
      const ctx = this.ctx;
      
      // Draw score
      ctx.fillStyle = '#ffffff';
      ctx.font = '20px Arial';
      ctx.fillText(`Score: ${this.score}`, 10, 30);
      ctx.fillText(`Level: ${this.level}`, 10, 60);
      
      // Draw debug info if enabled
      if (this.debugMode) {
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${Math.round(1000 / this.deltaTime)}`, 10, 90);
        ctx.fillText(`Player: (${this.player?.x.toFixed(2)}, ${this.player?.y.toFixed(2)})`, 10, 105);
        ctx.fillText(`Enemies: ${this.enemies.length}`, 10, 120);
        ctx.fillText(`Wolves: ${this.wolves.length}`, 10, 135);
      }
      
      // Draw game over screen
      if (this.isGameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', this.width / 2, this.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${this.score}`, this.width / 2, this.height / 2 + 50);
        ctx.textAlign = 'left';
      }
    }

    gridToScreen(gridX, gridY) {
      // Convert grid coordinates to isometric screen coordinates
      const screenX = (gridX - gridY) * (CONFIG.TILE_WIDTH / 2);
      const screenY = (gridX + gridY) * (CONFIG.TILE_HEIGHT / 2);
      return { x: screenX, y: screenY };
    }

    screenToGrid(screenX, screenY) {
      // Convert screen coordinates to grid coordinates
      screenX -= this.camera.x;
      screenY -= this.camera.y;
      
      const gridX = (screenX / (CONFIG.TILE_WIDTH / 2) + screenY / (CONFIG.TILE_HEIGHT / 2)) / 2;
      const gridY = (screenY / (CONFIG.TILE_HEIGHT / 2) - screenX / (CONFIG.TILE_WIDTH / 2)) / 2;
      
      return { x: gridX, y: gridY };
    }

    checkCollision(a, b) {
      return a.x < b.x + b.width &&
             a.x + a.width > b.x &&
             a.y < b.y + b.height &&
             a.y + a.height > b.y;
    }

    gameLoop() {
      const now = performance.now();
      const deltaTime = now - this.lastTime;
      this.lastTime = now;
      
      this.update(deltaTime);
      this.render();
      
      requestAnimationFrame(() => this.gameLoop());
    }

    // Public methods for external control
    movePlayer(dx, dy) {
      if (this.player) {
        // Initialize velocity if undefined
        if (this.player.vx === undefined) this.player.vx = 0;
        if (this.player.vy === undefined) this.player.vy = 0;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          const mag = Math.sqrt(dx * dx + dy * dy);
          dx /= mag;
          dy /= mag;
        }
        
        // Apply movement with acceleration
        const acceleration = 2.0;
        this.player.vx += dx * this.player.speed * acceleration;
        this.player.vy += dy * this.player.speed * acceleration;
        
        // Limit maximum speed
        const maxSpeed = this.player.speed * 1.5;
        const currentSpeed = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
        if (currentSpeed > maxSpeed) {
          this.player.vx = (this.player.vx / currentSpeed) * maxSpeed;
          this.player.vy = (this.player.vy / currentSpeed) * maxSpeed;
        }
      }
    }

    spawnEnemy(x, y, type) {
      this.enemies.push({
        x: x || Math.random() * CONFIG.GRID_WIDTH,
        y: y || Math.random() * CONFIG.GRID_HEIGHT,
        vx: 0,
        vy: 0,
        health: 50,
        maxHealth: 50,
        speed: CONFIG.ENEMY_SPEED,
        radius: 15,
        color: '#ff0000',
        type: type || 'basic'
      });
    }

    spawnWolf(x, y) {
      const wolf = {
        x: x || Math.random() * CONFIG.GRID_WIDTH,
        y: y || Math.random() * CONFIG.GRID_HEIGHT,
        vx: 0,
        vy: 0,
        health: 75,
        maxHealth: 75,
        speed: 3,
        radius: 18,
        color: '#8B4513',
        type: 'wolf',
        state: 'idle',
        target: null,
        lastAttack: 0,
        attackCooldown: 1000
      };
      
      this.wolves.push(wolf);
      this.enemies.push(wolf);
      
      return wolf;
    }

    removeEnemy(enemy) {
      const index = this.enemies.indexOf(enemy);
      if (index > -1) {
        this.enemies.splice(index, 1);
      }
      
      const wolfIndex = this.wolves.indexOf(enemy);
      if (wolfIndex > -1) {
        this.wolves.splice(wolfIndex, 1);
      }
    }

    pause() {
      this.isPaused = true;
    }

    resume() {
      this.isPaused = false;
    }

    reset() {
      this.score = 0;
      this.level = 1;
      this.enemies = [];
      this.wolves = [];
      this.projectiles = [];
      this.powerUps = [];
      this.isGameOver = false;
      this.isPaused = false;
      
      if (this.player) {
        this.player.x = CONFIG.GRID_WIDTH / 2;
        this.player.y = CONFIG.GRID_HEIGHT / 2;
        this.player.health = this.player.maxHealth;
        this.player.energy = this.player.maxEnergy;
        this.player.vx = 0;
        this.player.vy = 0;
      }
      
      this.generateMap();
    }
  }

  // Create and expose the game instance
  const gameState = new GameState();
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('gameCanvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gameState.init(canvas);
      }
    });
  } else {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameState.init(canvas);
    }
  }

  // Handle window resize
  window.addEventListener('resize', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas && gameState.canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameState.width = canvas.width;
      gameState.height = canvas.height;
    }
  });

  // Handle keyboard input
  window.addEventListener('keydown', (e) => {
    if (!gameState.player) return;
    
    switch(e.key.toLowerCase()) {
      case 'w':
      case 'arrowup':
        gameState.movePlayer(0, -1);
        break;
      case 's':
      case 'arrowdown':
        gameState.movePlayer(0, 1);
        break;
      case 'a':
      case 'arrowleft':
        gameState.movePlayer(-1, 0);
        break;
      case 'd':
      case 'arrowright':
        gameState.movePlayer(1, 0);
        break;
      case ' ':
        if (gameState.isPaused) {
          gameState.resume();
        } else {
          gameState.pause();
        }
        break;
      case 'r':
        gameState.reset();
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (!gameState.player) return;
    
    switch(e.key.toLowerCase()) {
      case 'w':
      case 's':
      case 'arrowup':
      case 'arrowdown':
        gameState.player.vy = 0;
        break;
      case 'a':
      case 'd':
      case 'arrowleft':
      case 'arrowright':
        gameState.player.vx = 0;
        break;
    }
  });

  // Expose the game to the global scope
  window.IsometricGame = {
    gameState: gameState,
    CONFIG: CONFIG,
    spawnEnemy: (x, y, type) => gameState.spawnEnemy(x, y, type),
    spawnWolf: (x, y) => gameState.spawnWolf(x, y),
    removeEnemy: (enemy) => gameState.removeEnemy(enemy),
    movePlayer: (dx, dy) => gameState.movePlayer(dx, dy),
    pause: () => gameState.pause(),
    resume: () => gameState.resume(),
    reset: () => gameState.reset(),
    getPlayer: () => gameState.player,
    getEnemies: () => gameState.enemies,
    getWolves: () => gameState.wolves,
    getScore: () => gameState.score,
    setDebugMode: (enabled) => { gameState.debugMode = enabled; }
  };

})();