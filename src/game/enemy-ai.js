// Enemy AI system with utility scoring
// Implements smart squad tactics without melting the browser

export const ENEMY_TYPES = {
  BRAWLER: 'brawler',    // Tank, draws attention
  STALKER: 'stalker',    // Flanker, strikes from behind
  ARCHER: 'archer',      // Ranged, maintains angles
  BULWARK: 'bulwark',    // Shield bearer, advances
  SKIRMISHER: 'skirmisher', // Hit and run
  SABOTEUR: 'saboteur'   // Trap layer
};

export const ENEMY_STATS = {
  [ENEMY_TYPES.BRAWLER]: {
    health: 80,
    moveSpeed: 150,
    attackDamage: 15,
    attackRange: 30,
    attackCooldown: 1000,
    radius: 20,
    color: '#ff6666',
    threatLevel: 3 // Visual threat to draw attention
  },
  [ENEMY_TYPES.STALKER]: {
    health: 40,
    moveSpeed: 250,
    attackDamage: 20,
    attackRange: 25,
    attackCooldown: 800,
    radius: 15,
    color: '#cc44cc',
    shimmerTime: 400, // Telegraph before strike
    preferBackArc: true
  },
  [ENEMY_TYPES.ARCHER]: {
    health: 50,
    moveSpeed: 180,
    attackDamage: 10,
    attackRange: 200,
    attackCooldown: 1500,
    projectileSpeed: 400,
    radius: 16,
    color: '#66ccff',
    preferDiagonal: true
  },
  [ENEMY_TYPES.BULWARK]: {
    health: 120,
    moveSpeed: 100,
    attackDamage: 10,
    attackRange: 35,
    attackCooldown: 1200,
    shieldHealth: 60,
    shieldAngle: Math.PI / 2,
    radius: 22,
    color: '#888888',
    rotateSpeed: 1.5 // Slow shield rotation
  },
  [ENEMY_TYPES.SKIRMISHER]: {
    health: 60,
    moveSpeed: 220,
    attackDamage: 12,
    attackRange: 40,
    attackCooldown: 600,
    kiteDistance: 150,
    radius: 17,
    color: '#ffaa44'
  },
  [ENEMY_TYPES.SABOTEUR]: {
    health: 50,
    moveSpeed: 160,
    mineDeployRange: 100,
    mineCooldown: 3000,
    mineBlinkRate: 500, // Visual telegraph
    radius: 16,
    color: '#aa6633'
  }
};

// Utility AI scoring weights
const UTILITY_WEIGHTS = {
  flank: {
    wantBackArc: 0.4,
    pathSafety: 0.3,
    timeSinceSeen: 0.3
  },
  focus: {
    lowHPTarget: 0.5,
    angleAdvantage: 0.2,
    nearbyAllies: 0.3
  },
  recover: {
    lowHealth: 0.5,
    coverNearby: 0.3,
    outnumbered: 0.2
  },
  advance: {
    targetDistance: 0.4,
    allySupport: 0.3,
    healthRatio: 0.3
  }
};

export class Enemy {
  constructor(type, x, y, squadId) {
    this.type = type;
    this.squadId = squadId;
    this.stats = { ...ENEMY_STATS[type] };
    
    // Position and movement
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.targetX = x;
    this.targetY = y;
    
    // Combat
    this.health = this.stats.health;
    this.attackCooldown = 0;
    this.currentTarget = null;
    this.isAttacking = false;
    
    // AI state
    this.currentAction = 'idle';
    this.utilityScores = {};
    this.lastUtilityUpdate = 0;
    this.utilityUpdateRate = 100 + Math.random() * 100; // 5-10 Hz with noise
    
    // Type specific
    this.initTypeSpecific();
    
    // Status effects
    this.stunned = false;
    this.stunnedUntil = 0;
    this.slowed = false;
    this.slowAmount = 1.0;
    
    // Blackboard reference (shared with squad)
    this.blackboard = null;
  }
  
  initTypeSpecific() {
    switch (this.type) {
      case ENEMY_TYPES.STALKER:
        this.isShimmering = false;
        this.shimmerStart = 0;
        this.lastSeenTime = 0;
        break;
        
      case ENEMY_TYPES.ARCHER:
        this.projectiles = [];
        break;
        
      case ENEMY_TYPES.BULWARK:
        this.shieldHealth = this.stats.shieldHealth;
        this.shieldAngle = 0;
        this.shieldTargetAngle = 0;
        break;
        
      case ENEMY_TYPES.SKIRMISHER:
        this.isKiting = false;
        this.lastHitTime = 0;
        break;
        
      case ENEMY_TYPES.SABOTEUR:
        this.mines = [];
        this.mineCooldown = 0;
        break;
    }
  }
  
  update(dt, players, enemies, currentTime) {
    // Check status effects
    if (this.stunned && currentTime < this.stunnedUntil) {
      return;
    } else if (this.stunned) {
      this.stunned = false;
    }
    
    // Update utility scores periodically
    if (currentTime - this.lastUtilityUpdate > this.utilityUpdateRate) {
      this.updateUtilityScores(players, enemies, currentTime);
      this.lastUtilityUpdate = currentTime;
    }
    
    // Execute current action
    this.executeAction(dt, players, enemies, currentTime);
    
    // Update movement
    this.updateMovement(dt);
    
    // Update combat
    this.updateCombat(dt, players, currentTime);
    
    // Type specific updates
    this.updateTypeSpecific(dt, players, currentTime);
  }
  
  updateUtilityScores(players, enemies, currentTime) {
    // Reset scores
    this.utilityScores = {};
    
    // Find nearest player
    let nearestPlayer = null;
    let nearestDist = Infinity;
    
    for (const player of players) {
      if (player.isDowned) continue;
      const dist = Math.hypot(player.x - this.x, player.y - this.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }
    
    if (!nearestPlayer) return;
    
    // Calculate flank score
    if (this.type === ENEMY_TYPES.STALKER) {
      const angleToPlayer = Math.atan2(nearestPlayer.y - this.y, nearestPlayer.x - this.x);
      const playerFacingAway = Math.abs(angleToPlayer - nearestPlayer.angle) > Math.PI * 0.75;
      const pathClear = this.checkPathClear(nearestPlayer.x, nearestPlayer.y, enemies);
      const timeSince = (currentTime - this.lastSeenTime) / 1000;
      
      this.utilityScores.flank = 
        playerFacingAway * UTILITY_WEIGHTS.flank.wantBackArc +
        pathClear * UTILITY_WEIGHTS.flank.pathSafety +
        Math.min(timeSince / 5, 1) * UTILITY_WEIGHTS.flank.timeSinceSeen;
    }
    
    // Calculate focus score
    const targetHealthRatio = nearestPlayer.health / nearestPlayer.stats.maxHealth;
    const angleAdvantage = this.calculateAngleAdvantage(nearestPlayer);
    const nearbyAllies = this.countNearbyAllies(enemies, 100);
    
    this.utilityScores.focus = 
      (1 - targetHealthRatio) * UTILITY_WEIGHTS.focus.lowHPTarget +
      angleAdvantage * UTILITY_WEIGHTS.focus.angleAdvantage +
      Math.min(nearbyAllies / 3, 1) * UTILITY_WEIGHTS.focus.nearbyAllies;
    
    // Calculate recover score
    const healthRatio = this.health / this.stats.health;
    const hasCover = this.findNearestCover() !== null;
    const outnumbered = players.length > nearbyAllies;
    
    this.utilityScores.recover = 
      (1 - healthRatio) * UTILITY_WEIGHTS.recover.lowHealth +
      hasCover * UTILITY_WEIGHTS.recover.coverNearby +
      outnumbered * UTILITY_WEIGHTS.recover.outnumbered;
    
    // Calculate advance score
    const distanceRatio = Math.min(nearestDist / 300, 1);
    const allySupport = nearbyAllies > 0;
    
    this.utilityScores.advance = 
      (1 - distanceRatio) * UTILITY_WEIGHTS.advance.targetDistance +
      allySupport * UTILITY_WEIGHTS.advance.allySupport +
      healthRatio * UTILITY_WEIGHTS.advance.healthRatio;
    
    // Add noise to prevent perfect synchronization
    for (const key in this.utilityScores) {
      this.utilityScores[key] += Math.random() * 0.1;
    }
    
    // Select highest scoring action
    let bestAction = 'idle';
    let bestScore = -1;
    
    for (const [action, score] of Object.entries(this.utilityScores)) {
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }
    
    this.currentAction = bestAction;
    this.currentTarget = nearestPlayer;
  }
  
  executeAction(dt, players, enemies, currentTime) {
    if (!this.currentTarget) return;
    
    switch (this.currentAction) {
      case 'flank':
        this.executeFlank(dt, this.currentTarget, currentTime);
        break;
        
      case 'focus':
        this.executeFocus(dt, this.currentTarget);
        break;
        
      case 'recover':
        this.executeRecover(dt, enemies);
        break;
        
      case 'advance':
        this.executeAdvance(dt, this.currentTarget);
        break;
        
      default:
        this.executeIdle(dt);
    }
  }
  
  executeFlank(dt, target, currentTime) {
    // Try to get behind target
    const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
    const behindAngle = target.angle + Math.PI;
    
    // Circle around to get behind
    const circleRadius = 80;
    this.targetX = target.x + Math.cos(behindAngle) * circleRadius;
    this.targetY = target.y + Math.sin(behindAngle) * circleRadius;
    
    // Start shimmering when close
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    if (dist < 60 && !this.isShimmering) {
      this.isShimmering = true;
      this.shimmerStart = currentTime;
    }
  }
  
  executeFocus(dt, target) {
    // Direct approach to target
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    
    if (dist > this.stats.attackRange) {
      this.targetX = target.x;
      this.targetY = target.y;
    } else {
      // In range, stop and attack
      this.targetX = this.x;
      this.targetY = this.y;
    }
  }
  
  executeRecover(dt, enemies) {
    // Find cover or allies to retreat to
    const cover = this.findNearestCover();
    if (cover) {
      this.targetX = cover.x;
      this.targetY = cover.y;
    } else {
      // Retreat towards nearest ally
      let nearestAlly = null;
      let nearestDist = Infinity;
      
      for (const enemy of enemies) {
        if (enemy === this) continue;
        const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestAlly = enemy;
        }
      }
      
      if (nearestAlly) {
        this.targetX = nearestAlly.x;
        this.targetY = nearestAlly.y;
      }
    }
  }
  
  executeAdvance(dt, target) {
    // Move towards target with caution
    const dist = Math.hypot(target.x - this.x, target.y - this.y);
    const approachDist = this.stats.attackRange * 0.8;
    
    if (dist > approachDist) {
      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      this.targetX = target.x - Math.cos(angle) * approachDist;
      this.targetY = target.y - Math.sin(angle) * approachDist;
    }
  }
  
  executeIdle(dt) {
    // Wander slightly
    if (Math.hypot(this.targetX - this.x, this.targetY - this.y) < 10) {
      this.targetX = this.x + (Math.random() - 0.5) * 50;
      this.targetY = this.y + (Math.random() - 0.5) * 50;
    }
  }
  
  updateMovement(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 5) {
      const speed = this.stats.moveSpeed * this.slowAmount;
      this.vx = (dx / dist) * speed;
      this.vy = (dy / dist) * speed;
      this.angle = Math.atan2(dy, dx);
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }
    
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
  
  updateCombat(dt, players, currentTime) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt * 1000;
    }
    
    if (!this.currentTarget || this.currentTarget.isDowned) return;
    
    const dist = Math.hypot(this.currentTarget.x - this.x, this.currentTarget.y - this.y);
    
    if (dist <= this.stats.attackRange && this.attackCooldown <= 0) {
      this.performAttack(this.currentTarget, currentTime);
      this.attackCooldown = this.stats.attackCooldown;
    }
  }
  
  updateTypeSpecific(dt, players, currentTime) {
    switch (this.type) {
      case ENEMY_TYPES.STALKER:
        // Check shimmer telegraph
        if (this.isShimmering && currentTime - this.shimmerStart > this.stats.shimmerTime) {
          this.isShimmering = false;
          // Perform backstab if still behind target
          if (this.currentTarget) {
            const angleToTarget = Math.atan2(this.currentTarget.y - this.y, 
              this.currentTarget.x - this.x);
            const angleDiff = Math.abs(angleToTarget - this.currentTarget.angle);
            if (angleDiff > Math.PI * 0.75) {
              this.performAttack(this.currentTarget, currentTime);
              this.attackCooldown = this.stats.attackCooldown;
            }
          }
        }
        break;
        
      case ENEMY_TYPES.ARCHER:
        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
          proj.x += proj.vx * dt;
          proj.y += proj.vy * dt;
          proj.lifetime -= dt;
          
          // Check collision with players
          for (const player of players) {
            const dist = Math.hypot(player.x - proj.x, player.y - proj.y);
            if (dist < player.stats.radius) {
              player.takeDamage(this.stats.attackDamage, this);
              return false;
            }
          }
          
          return proj.lifetime > 0;
        });
        break;
        
      case ENEMY_TYPES.BULWARK:
        // Rotate shield slowly
        if (this.shieldTargetAngle !== this.shieldAngle) {
          const angleDiff = this.shieldTargetAngle - this.shieldAngle;
          const rotateAmount = this.stats.rotateSpeed * dt;
          
          if (Math.abs(angleDiff) < rotateAmount) {
            this.shieldAngle = this.shieldTargetAngle;
          } else {
            this.shieldAngle += Math.sign(angleDiff) * rotateAmount;
          }
        }
        break;
        
      case ENEMY_TYPES.SABOTEUR:
        // Update mine cooldown
        if (this.mineCooldown > 0) {
          this.mineCooldown -= dt * 1000;
        }
        
        // Deploy mines in escape routes
        if (this.mineCooldown <= 0 && this.currentAction === 'focus') {
          this.deployMine();
          this.mineCooldown = this.stats.mineCooldown;
        }
        
        // Update mines
        this.mines = this.mines.filter(mine => {
          mine.blinkTimer += dt * 1000;
          
          // Check trigger
          for (const player of players) {
            const dist = Math.hypot(player.x - mine.x, player.y - mine.y);
            if (dist < mine.triggerRadius) {
              // Explode mine
              player.takeDamage(15, this);
              player.slowed = true;
              player.slowAmount = 0.5;
              setTimeout(() => { player.slowed = false; player.slowAmount = 1.0; }, 2000);
              return false;
            }
          }
          
          return mine.lifetime > 0;
        });
        break;
    }
  }
  
  performAttack(target, currentTime) {
    if (this.type === ENEMY_TYPES.ARCHER) {
      // Fire projectile
      const angle = Math.atan2(target.y - this.y, target.x - this.x);
      this.projectiles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * this.stats.projectileSpeed,
        vy: Math.sin(angle) * this.stats.projectileSpeed,
        lifetime: 2
      });
    } else {
      // Melee attack
      target.takeDamage(this.stats.attackDamage, this);
    }
    
    this.isAttacking = true;
    setTimeout(() => { this.isAttacking = false; }, 200);
  }
  
  deployMine() {
    this.mines.push({
      x: this.x,
      y: this.y,
      triggerRadius: 30,
      blinkTimer: 0,
      lifetime: 30
    });
  }
  
  takeDamage(amount) {
    this.health -= amount;
    
    if (this.type === ENEMY_TYPES.BULWARK && this.shieldHealth > 0) {
      const shieldDamage = Math.min(amount, this.shieldHealth);
      this.shieldHealth -= shieldDamage;
      this.health += shieldDamage; // Restore health that was blocked
    }
    
    return this.health <= 0;
  }
  
  // Helper methods
  checkPathClear(targetX, targetY, enemies) {
    // Simple line of sight check
    const steps = 10;
    const dx = (targetX - this.x) / steps;
    const dy = (targetY - this.y) / steps;
    
    for (let i = 1; i < steps; i++) {
      const checkX = this.x + dx * i;
      const checkY = this.y + dy * i;
      
      for (const enemy of enemies) {
        if (enemy === this) continue;
        const dist = Math.hypot(enemy.x - checkX, enemy.y - checkY);
        if (dist < 30) return false;
      }
    }
    
    return true;
  }
  
  calculateAngleAdvantage(target) {
    const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
    const targetFacing = target.angle;
    const angleDiff = Math.abs(angleToTarget - targetFacing);
    
    // Better advantage when target is not facing us
    return Math.min(angleDiff / Math.PI, 1);
  }
  
  countNearbyAllies(enemies, range) {
    let count = 0;
    for (const enemy of enemies) {
      if (enemy === this) continue;
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < range) count++;
    }
    return count;
  }
  
  findNearestCover() {
    // Simplified - would check actual cover positions in full implementation
    return null;
  }
  
  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    // Draw type-specific elements
    if (this.type === ENEMY_TYPES.STALKER && this.isShimmering) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
      ctx.strokeStyle = '#ff00ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.stats.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    if (this.type === ENEMY_TYPES.ARCHER) {
      // Draw projectiles
      ctx.fillStyle = '#00ffff';
      for (const proj of this.projectiles) {
        ctx.beginPath();
        ctx.arc(proj.x - camera.x, proj.y - camera.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    if (this.type === ENEMY_TYPES.BULWARK && this.shieldHealth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#666666';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.stats.radius + 8,
        this.shieldAngle - this.stats.shieldAngle/2,
        this.shieldAngle + this.stats.shieldAngle/2);
      ctx.lineTo(screenX, screenY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    if (this.type === ENEMY_TYPES.SABOTEUR) {
      // Draw mines
      for (const mine of this.mines) {
        ctx.save();
        const blink = Math.sin(mine.blinkTimer / this.stats.mineBlinkRate) > 0;
        ctx.fillStyle = blink ? '#ff0000' : '#880000';
        ctx.beginPath();
        ctx.arc(mine.x - camera.x, mine.y - camera.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Draw enemy body
    ctx.save();
    
    if (this.stunned) {
      ctx.globalAlpha = 0.5;
    }
    
    ctx.fillStyle = this.stats.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.stats.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
      screenX + Math.cos(this.angle) * this.stats.radius * 0.8,
      screenY + Math.sin(this.angle) * this.stats.radius * 0.8
    );
    ctx.stroke();
    
    // Health bar
    if (this.health < this.stats.health) {
      const barWidth = 30;
      const barHeight = 3;
      const barY = screenY - this.stats.radius - 8;
      
      ctx.fillStyle = '#333333';
      ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(screenX - barWidth/2, barY,
        barWidth * (this.health / this.stats.health), barHeight);
    }
    
    // Attack indicator
    if (this.isAttacking) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.stats.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}