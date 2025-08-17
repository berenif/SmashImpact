// Hero system for co-op arena survival
// Runner: Fast dodge, smoke beacon, short stun
// Anchor: Slower, frontal shield cone, grappling line

export const HERO_TYPES = {
  RUNNER: 'runner',
  ANCHOR: 'anchor'
};

export const HERO_STATS = {
  [HERO_TYPES.RUNNER]: {
    maxHealth: 100,
    moveSpeed: 320,
    dodgeSpeed: 600,
    dodgeCooldown: 2000,
    dodgeDuration: 200,
    stunDuration: 1000,
    stunCooldown: 5000,
    smokeRadius: 120,
    smokeDuration: 3000,
    smokeCooldown: 8000,
    reviveSpeed: 1.5, // 50% faster revive
    color: '#00ff88',
    radius: 18
  },
  [HERO_TYPES.ANCHOR]: {
    maxHealth: 150,
    moveSpeed: 200,
    shieldAngle: Math.PI / 3, // 60 degree cone
    shieldDamageReduction: 0.75,
    grappleRange: 200,
    grappleSpeed: 800,
    grappleCooldown: 4000,
    shieldRegenDelay: 3000,
    shieldRegenRate: 10, // per second
    reviveProtection: true, // Can block while reviving
    color: '#4488ff',
    radius: 22
  }
};

export class Hero {
  constructor(type, x, y, playerId) {
    this.type = type;
    this.playerId = playerId;
    this.stats = { ...HERO_STATS[type] };
    
    // Position and movement
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0; // Facing direction
    this.moveAngle = 0; // Movement direction
    
    // Health and status
    this.health = this.stats.maxHealth;
    this.isDowned = false;
    this.reviveProgress = 0;
    this.isReviving = false;
    
    // Abilities
    this.abilities = {
      primary: { cooldown: 0, active: false, duration: 0 },
      secondary: { cooldown: 0, active: false, duration: 0 },
      utility: { cooldown: 0, active: false, duration: 0 }
    };
    
    // Runner specific
    if (type === HERO_TYPES.RUNNER) {
      this.isDodging = false;
      this.dodgeDirection = { x: 0, y: 0 };
      this.smokeBeacons = [];
      this.stunTarget = null;
    }
    
    // Anchor specific
    if (type === HERO_TYPES.ANCHOR) {
      this.shieldActive = false;
      this.shieldHealth = 50;
      this.grappleTarget = null;
      this.grappleLine = null;
    }
    
    // Co-op mechanics
    this.tethered = false;
    this.tetherPartner = null;
    this.backToBack = false;
    this.rallyHealing = false;
  }
  
  update(dt, input, enemies, partner) {
    // Update cooldowns
    for (const ability of Object.values(this.abilities)) {
      if (ability.cooldown > 0) {
        ability.cooldown -= dt * 1000;
      }
      if (ability.active && ability.duration > 0) {
        ability.duration -= dt * 1000;
        if (ability.duration <= 0) {
          ability.active = false;
        }
      }
    }
    
    // Handle downed state
    if (this.isDowned) {
      this.handleDownedState(dt, partner);
      return;
    }
    
    // Type-specific updates
    if (this.type === HERO_TYPES.RUNNER) {
      this.updateRunner(dt, input, enemies);
    } else if (this.type === HERO_TYPES.ANCHOR) {
      this.updateAnchor(dt, input, enemies);
    }
    
    // Movement
    this.updateMovement(dt, input);
    
    // Co-op mechanics
    this.updateCoopMechanics(dt, partner);
  }
  
  updateRunner(dt, input, enemies) {
    // Dodge ability (primary)
    if (input.ability1 && this.abilities.primary.cooldown <= 0 && !this.isDodging) {
      this.startDodge(input.moveX, input.moveY);
    }
    
    // Update dodge
    if (this.isDodging) {
      const dodgeSpeed = this.stats.dodgeSpeed * dt;
      this.x += this.dodgeDirection.x * dodgeSpeed;
      this.y += this.dodgeDirection.y * dodgeSpeed;
      
      this.abilities.primary.duration -= dt * 1000;
      if (this.abilities.primary.duration <= 0) {
        this.isDodging = false;
      }
    }
    
    // Smoke beacon (secondary)
    if (input.ability2 && this.abilities.secondary.cooldown <= 0) {
      this.deploySmokeBeacon();
    }
    
    // Update smoke beacons
    this.smokeBeacons = this.smokeBeacons.filter(beacon => {
      beacon.duration -= dt * 1000;
      return beacon.duration > 0;
    });
    
    // Stun ability (utility)
    if (input.ability3 && this.abilities.utility.cooldown <= 0) {
      this.performStun(enemies);
    }
  }
  
  updateAnchor(dt, input, enemies) {
    // Shield toggle (primary)
    if (input.ability1) {
      this.shieldActive = true;
    } else {
      this.shieldActive = false;
      // Regenerate shield when not active
      if (this.shieldHealth < 50) {
        this.shieldHealth += this.stats.shieldRegenRate * dt;
        this.shieldHealth = Math.min(50, this.shieldHealth);
      }
    }
    
    // Grapple line (secondary)
    if (input.ability2 && this.abilities.secondary.cooldown <= 0) {
      this.fireGrapple(input.aimX, input.aimY, enemies);
    }
    
    // Update grapple
    if (this.grappleLine) {
      this.updateGrapple(dt);
    }
  }
  
  updateMovement(dt, input) {
    if (this.isDodging) return; // No control during dodge
    
    // Calculate base speed
    let speed = this.stats.moveSpeed;
    
    // Apply modifiers
    if (this.type === HERO_TYPES.ANCHOR && this.shieldActive) {
      speed *= 0.5; // Half speed with shield up
    }
    
    // Apply input
    const moveX = input.moveX || 0;
    const moveY = input.moveY || 0;
    const moveMag = Math.sqrt(moveX * moveX + moveY * moveY);
    
    if (moveMag > 0) {
      this.vx = (moveX / moveMag) * speed;
      this.vy = (moveY / moveMag) * speed;
      this.moveAngle = Math.atan2(moveY, moveX);
    } else {
      this.vx *= 0.9; // Friction
      this.vy *= 0.9;
    }
    
    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    
    // Update facing angle based on aim
    if (input.aimX !== undefined && input.aimY !== undefined) {
      this.angle = Math.atan2(input.aimY, input.aimX);
    }
  }
  
  updateCoopMechanics(dt, partner) {
    if (!partner) return;
    
    // Check back-to-back buff
    const dist = Math.hypot(this.x - partner.x, this.y - partner.y);
    const angleDiff = Math.abs(this.angle - partner.angle + Math.PI) % (Math.PI * 2);
    
    this.backToBack = dist < 50 && angleDiff < Math.PI / 4;
    
    // Rally healing
    if (this.rallyHealing && dist < 60) {
      this.health += 10 * dt; // 10 HP per second
      this.health = Math.min(this.health, this.stats.maxHealth);
    }
  }
  
  startDodge(dirX, dirY) {
    const mag = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    this.dodgeDirection = { x: dirX / mag, y: dirY / mag };
    this.isDodging = true;
    this.abilities.primary.cooldown = this.stats.dodgeCooldown;
    this.abilities.primary.duration = this.stats.dodgeDuration;
    this.abilities.primary.active = true;
  }
  
  deploySmokeBeacon() {
    this.smokeBeacons.push({
      x: this.x,
      y: this.y,
      radius: this.stats.smokeRadius,
      duration: this.stats.smokeDuration
    });
    this.abilities.secondary.cooldown = this.stats.smokeCooldown;
  }
  
  performStun(enemies) {
    // Find nearest enemy in front
    const stunRange = 60;
    let nearestEnemy = null;
    let nearestDist = stunRange;
    
    for (const enemy of enemies) {
      const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (dist < nearestDist) {
        const angleToEnemy = Math.atan2(enemy.y - this.y, enemy.x - this.x);
        const angleDiff = Math.abs(angleToEnemy - this.angle);
        if (angleDiff < Math.PI / 4) { // 45 degree cone
          nearestEnemy = enemy;
          nearestDist = dist;
        }
      }
    }
    
    if (nearestEnemy) {
      nearestEnemy.stunned = true;
      nearestEnemy.stunnedUntil = Date.now() + this.stats.stunDuration;
      this.abilities.utility.cooldown = this.stats.stunCooldown;
    }
  }
  
  fireGrapple(aimX, aimY, enemies) {
    // Create grapple projectile
    this.grappleLine = {
      startX: this.x,
      startY: this.y,
      endX: this.x + aimX * this.stats.grappleRange,
      endY: this.y + aimY * this.stats.grappleRange,
      progress: 0,
      speed: this.stats.grappleSpeed,
      hooked: null
    };
    this.abilities.secondary.cooldown = this.stats.grappleCooldown;
  }
  
  updateGrapple(dt) {
    if (!this.grappleLine) return;
    
    this.grappleLine.progress += this.grappleLine.speed * dt / this.stats.grappleRange;
    
    if (this.grappleLine.progress >= 1) {
      // Retract or pull
      if (this.grappleLine.hooked) {
        // Pull enemy towards anchor
        const pullForce = 200 * dt;
        const dx = this.x - this.grappleLine.hooked.x;
        const dy = this.y - this.grappleLine.hooked.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          this.grappleLine.hooked.x += (dx / dist) * pullForce;
          this.grappleLine.hooked.y += (dy / dist) * pullForce;
        }
      }
      this.grappleLine = null;
    }
  }
  
  takeDamage(amount, source) {
    // Check shield protection for Anchor
    if (this.type === HERO_TYPES.ANCHOR && this.shieldActive) {
      const angleToSource = Math.atan2(source.y - this.y, source.x - this.x);
      const angleDiff = Math.abs(angleToSource - this.angle);
      
      if (angleDiff < this.stats.shieldAngle / 2) {
        // Hit shield
        const shieldDamage = amount * (1 - this.stats.shieldDamageReduction);
        this.shieldHealth -= shieldDamage;
        
        if (this.shieldHealth <= 0) {
          // Shield broken
          this.shieldActive = false;
          this.health += this.shieldHealth; // Overflow damage
          this.shieldHealth = 0;
        }
        return;
      }
    }
    
    // Check smoke protection for Runner
    if (this.type === HERO_TYPES.RUNNER) {
      for (const beacon of this.smokeBeacons) {
        const dist = Math.hypot(this.x - beacon.x, this.y - beacon.y);
        if (dist < beacon.radius) {
          amount *= 0.5; // 50% damage reduction in smoke
          break;
        }
      }
    }
    
    // Apply damage
    this.health -= amount;
    
    if (this.health <= 0) {
      this.health = 0;
      this.isDowned = true;
      this.reviveProgress = 0;
    }
  }
  
  handleDownedState(dt, partner) {
    if (!partner || partner.isDowned) return;
    
    const dist = Math.hypot(this.x - partner.x, this.y - partner.y);
    if (dist < 40 && partner.isReviving) {
      // Being revived
      const reviveSpeed = partner.type === HERO_TYPES.RUNNER ? 
        this.stats.reviveSpeed : 1.0;
      
      this.reviveProgress += dt * reviveSpeed * 50; // 2 seconds base
      
      if (this.reviveProgress >= 100) {
        this.isDowned = false;
        this.health = this.stats.maxHealth * 0.3; // Revive with 30% health
        this.reviveProgress = 0;
      }
    } else if (this.reviveProgress > 0) {
      // Decay progress slowly if not being revived
      this.reviveProgress -= dt * 10;
      this.reviveProgress = Math.max(0, this.reviveProgress);
    }
  }
  
  draw(ctx, camera) {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    
    // Draw smoke beacons for Runner
    if (this.type === HERO_TYPES.RUNNER) {
      for (const beacon of this.smokeBeacons) {
        ctx.save();
        ctx.globalAlpha = 0.3 * (beacon.duration / this.stats.smokeDuration);
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(beacon.x - camera.x, beacon.y - camera.y, beacon.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Draw grapple line for Anchor
    if (this.type === HERO_TYPES.ANCHOR && this.grappleLine) {
      ctx.strokeStyle = '#ffaa00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.grappleLine.startX - camera.x, this.grappleLine.startY - camera.y);
      const currentX = this.grappleLine.startX + 
        (this.grappleLine.endX - this.grappleLine.startX) * this.grappleLine.progress;
      const currentY = this.grappleLine.startY + 
        (this.grappleLine.endY - this.grappleLine.startY) * this.grappleLine.progress;
      ctx.lineTo(currentX - camera.x, currentY - camera.y);
      ctx.stroke();
    }
    
    // Draw shield for Anchor
    if (this.type === HERO_TYPES.ANCHOR && this.shieldActive && this.shieldHealth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.2 * (this.shieldHealth / 50);
      ctx.fillStyle = '#4488ff';
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.stats.radius + 10, 
        this.angle - this.stats.shieldAngle/2, 
        this.angle + this.stats.shieldAngle/2);
      ctx.lineTo(screenX, screenY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    
    // Draw hero
    ctx.save();
    
    if (this.isDowned) {
      ctx.globalAlpha = 0.5;
    } else if (this.isDodging) {
      ctx.globalAlpha = 0.7;
    }
    
    // Body
    ctx.fillStyle = this.stats.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.stats.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
      screenX + Math.cos(this.angle) * this.stats.radius,
      screenY + Math.sin(this.angle) * this.stats.radius
    );
    ctx.stroke();
    
    // Health bar
    if (this.health < this.stats.maxHealth) {
      const barWidth = 40;
      const barHeight = 4;
      const barY = screenY - this.stats.radius - 10;
      
      ctx.fillStyle = '#333333';
      ctx.fillRect(screenX - barWidth/2, barY, barWidth, barHeight);
      
      ctx.fillStyle = this.isDowned ? '#ff4444' : '#44ff44';
      ctx.fillRect(screenX - barWidth/2, barY, 
        barWidth * (this.health / this.stats.maxHealth), barHeight);
    }
    
    // Revive progress
    if (this.isDowned && this.reviveProgress > 0) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, this.stats.radius + 5, 
        -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * this.reviveProgress / 100));
      ctx.stroke();
    }
    
    ctx.restore();
  }
}