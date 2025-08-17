// Powerup System
// Handles spawning, collection, and effects of powerups

import { POWERUP_TYPES, POWERUP_EFFECTS } from './levels.js';

export class Powerup {
  constructor(type, x, y, spawnTime = 0) {
    this.id = `powerup_${Date.now()}_${Math.random()}`;
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = 20;
    this.collected = false;
    this.spawnTime = spawnTime;
    this.spawned = spawnTime === 0;
    this.effect = POWERUP_EFFECTS[type];
    
    // Visual properties
    this.glowRadius = 30;
    this.glowIntensity = 0;
    this.bobOffset = 0;
    this.rotationAngle = 0;
    this.particleTimer = 0;
  }
  
  update(dt, currentTime) {
    // Check if should spawn
    if (!this.spawned && currentTime >= this.spawnTime) {
      this.spawned = true;
    }
    
    if (!this.spawned || this.collected) return;
    
    // Visual effects
    this.glowIntensity = Math.sin(currentTime * 0.003) * 0.3 + 0.7;
    this.bobOffset = Math.sin(currentTime * 0.002) * 5;
    this.rotationAngle += dt * 2;
    this.particleTimer += dt;
  }
  
  checkCollection(player) {
    if (!this.spawned || this.collected) return false;
    
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < this.radius + player.radius) {
      this.collected = true;
      return true;
    }
    return false;
  }
  
  draw(ctx, camera) {
    if (!this.spawned || this.collected) return;
    
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y + this.bobOffset;
    
    // Glow effect
    ctx.save();
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, this.glowRadius);
    gradient.addColorStop(0, this.getColor() + '88');
    gradient.addColorStop(1, this.getColor() + '00');
    ctx.fillStyle = gradient;
    ctx.globalAlpha = this.glowIntensity;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Main powerup
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.rotationAngle);
    
    // Draw powerup icon based on type
    this.drawIcon(ctx);
    
    ctx.restore();
    
    // Particle effects
    if (this.particleTimer > 0.1) {
      this.drawParticle(ctx, screenX, screenY);
      this.particleTimer = 0;
    }
  }
  
  drawIcon(ctx) {
    const size = this.radius;
    
    switch (this.type) {
      case POWERUP_TYPES.HEALTH:
        // Red cross
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(-size * 0.3, -size, size * 0.6, size * 2);
        ctx.fillRect(-size, -size * 0.3, size * 2, size * 0.6);
        break;
        
      case POWERUP_TYPES.SPEED:
        // Lightning bolt
        ctx.strokeStyle = '#ffff44';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-size * 0.5, -size);
        ctx.lineTo(0, 0);
        ctx.lineTo(-size * 0.2, 0);
        ctx.lineTo(size * 0.5, size);
        ctx.lineTo(0, 0);
        ctx.lineTo(size * 0.2, 0);
        ctx.stroke();
        break;
        
      case POWERUP_TYPES.DAMAGE:
        // Sword
        ctx.fillStyle = '#ff8844';
        ctx.fillRect(-size * 0.15, -size, size * 0.3, size * 1.5);
        ctx.fillRect(-size * 0.5, -size * 0.3, size, size * 0.3);
        break;
        
      case POWERUP_TYPES.SHIELD:
        // Shield shape
        ctx.fillStyle = '#4488ff';
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.8, -size * 0.5);
        ctx.lineTo(size * 0.8, size * 0.5);
        ctx.lineTo(0, size);
        ctx.lineTo(-size * 0.8, size * 0.5);
        ctx.lineTo(-size * 0.8, -size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
        
      case POWERUP_TYPES.COMBO:
        // Star
        ctx.fillStyle = '#ffaa00';
        this.drawStar(ctx, 0, 0, 5, size, size * 0.5);
        break;
        
      case POWERUP_TYPES.REVIVE:
        // Angel wings
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-size * 0.5, 0, size * 0.6, -Math.PI * 0.3, Math.PI * 0.3);
        ctx.arc(size * 0.5, 0, size * 0.6, Math.PI * 0.7, Math.PI * 1.3);
        ctx.fill();
        break;
        
      case POWERUP_TYPES.DOUBLE_POINTS:
        // x2 text
        ctx.fillStyle = '#44ff44';
        ctx.font = `bold ${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('x2', 0, 0);
        break;
        
      case POWERUP_TYPES.INVINCIBILITY:
        // Rainbow circle
        const gradient = ctx.createLinearGradient(-size, 0, size, 0);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.33, '#00ff00');
        gradient.addColorStop(0.66, '#0000ff');
        gradient.addColorStop(1, '#ff00ff');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        break;
        
      case POWERUP_TYPES.RAPID_FIRE:
        // Triple arrows
        ctx.strokeStyle = '#ff44ff';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.moveTo(i * size * 0.3, size * 0.5);
          ctx.lineTo(i * size * 0.3, -size * 0.5);
          ctx.lineTo(i * size * 0.3 - 5, -size * 0.3);
          ctx.moveTo(i * size * 0.3, -size * 0.5);
          ctx.lineTo(i * size * 0.3 + 5, -size * 0.3);
          ctx.stroke();
        }
        break;
        
      case POWERUP_TYPES.FREEZE:
        // Snowflake
        ctx.strokeStyle = '#88ddff';
        ctx.lineWidth = 3;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * size, Math.sin(angle) * size);
          ctx.stroke();
          
          // Small branches
          const branchX = Math.cos(angle) * size * 0.6;
          const branchY = Math.sin(angle) * size * 0.6;
          ctx.beginPath();
          ctx.moveTo(branchX - Math.cos(angle + Math.PI/2) * size * 0.2, 
                     branchY - Math.sin(angle + Math.PI/2) * size * 0.2);
          ctx.lineTo(branchX + Math.cos(angle + Math.PI/2) * size * 0.2, 
                     branchY + Math.sin(angle + Math.PI/2) * size * 0.2);
          ctx.stroke();
        }
        break;
        
      default:
        // Generic orb
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    }
  }
  
  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;
      
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
  
  drawParticle(ctx, x, y) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = this.getColor();
    
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 20 + 10;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = Math.random() * 3 + 1;
      
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  getColor() {
    const colors = {
      [POWERUP_TYPES.HEALTH]: '#ff4444',
      [POWERUP_TYPES.SPEED]: '#ffff44',
      [POWERUP_TYPES.DAMAGE]: '#ff8844',
      [POWERUP_TYPES.SHIELD]: '#4488ff',
      [POWERUP_TYPES.COMBO]: '#ffaa00',
      [POWERUP_TYPES.REVIVE]: '#ffffff',
      [POWERUP_TYPES.DOUBLE_POINTS]: '#44ff44',
      [POWERUP_TYPES.INVINCIBILITY]: '#ff00ff',
      [POWERUP_TYPES.RAPID_FIRE]: '#ff44ff',
      [POWERUP_TYPES.FREEZE]: '#88ddff'
    };
    return colors[this.type] || '#ffffff';
  }
}

export class PowerupManager {
  constructor() {
    this.powerups = [];
    this.activeEffects = new Map(); // playerId -> effects array
  }
  
  spawnPowerup(type, x, y, spawnTime = 0) {
    const powerup = new Powerup(type, x, y, spawnTime);
    this.powerups.push(powerup);
    return powerup;
  }
  
  update(dt, currentTime, players) {
    // Update all powerups
    for (const powerup of this.powerups) {
      powerup.update(dt, currentTime);
      
      // Check collection by any player
      if (powerup.spawned && !powerup.collected) {
        for (const player of players) {
          if (powerup.checkCollection(player)) {
            this.applyPowerup(powerup, player);
            break;
          }
        }
      }
    }
    
    // Remove collected powerups
    this.powerups = this.powerups.filter(p => !p.collected);
    
    // Update active effects
    for (const [playerId, effects] of this.activeEffects) {
      for (let i = effects.length - 1; i >= 0; i--) {
        const effect = effects[i];
        effect.remaining -= dt * 1000;
        
        if (effect.remaining <= 0) {
          this.removeEffect(playerId, effect);
          effects.splice(i, 1);
        }
      }
      
      if (effects.length === 0) {
        this.activeEffects.delete(playerId);
      }
    }
  }
  
  applyPowerup(powerup, player) {
    const effect = powerup.effect;
    
    if (effect.instant) {
      // Apply instant effects
      switch (powerup.type) {
        case POWERUP_TYPES.HEALTH:
          player.health = Math.min(player.health + effect.value, player.stats.maxHealth);
          break;
          
        case POWERUP_TYPES.COMBO:
          // Increase combo meter (would need game state access)
          if (player.comboMeter !== undefined) {
            player.comboMeter = Math.min(player.comboMeter + effect.value, 1);
          }
          break;
          
        case POWERUP_TYPES.REVIVE:
          // Add revive token
          if (player.reviveTokens !== undefined) {
            player.reviveTokens++;
          }
          break;
          
        case POWERUP_TYPES.FREEZE:
          // Freeze all enemies (would need enemy list access)
          this.freezeAllEnemies(effect.value);
          break;
      }
    } else {
      // Add timed effect
      this.addEffect(player.playerId, {
        type: powerup.type,
        effect: effect,
        remaining: effect.duration,
        startTime: Date.now()
      });
      
      // Apply immediate changes for timed effects
      this.applyTimedEffect(player, powerup.type, effect, true);
    }
    
    // Visual/audio feedback
    this.onPowerupCollected(powerup, player);
  }
  
  addEffect(playerId, effect) {
    if (!this.activeEffects.has(playerId)) {
      this.activeEffects.set(playerId, []);
    }
    
    const effects = this.activeEffects.get(playerId);
    
    // Check if same type effect exists
    const existingIndex = effects.findIndex(e => e.type === effect.type);
    if (existingIndex >= 0) {
      // Refresh duration
      effects[existingIndex].remaining = effect.remaining;
    } else {
      effects.push(effect);
    }
  }
  
  removeEffect(playerId, effect) {
    // This would need access to the player to remove the effect
    // For now, just log it
    console.log(`Effect ${effect.type} expired for player ${playerId}`);
  }
  
  applyTimedEffect(player, type, effect, apply) {
    const multiplier = apply ? effect.multiplier || 1 : 1 / (effect.multiplier || 1);
    
    switch (type) {
      case POWERUP_TYPES.SPEED:
        player.stats.moveSpeed *= multiplier;
        break;
        
      case POWERUP_TYPES.DAMAGE:
        if (player.stats.attackDamage !== undefined) {
          player.stats.attackDamage *= multiplier;
        }
        break;
        
      case POWERUP_TYPES.SHIELD:
        if (apply) {
          player.tempShield = effect.value;
        } else {
          player.tempShield = 0;
        }
        break;
        
      case POWERUP_TYPES.DOUBLE_POINTS:
        player.pointMultiplier = apply ? 2 : 1;
        break;
        
      case POWERUP_TYPES.INVINCIBILITY:
        player.invincible = apply;
        break;
        
      case POWERUP_TYPES.RAPID_FIRE:
        // Reduce all ability cooldowns
        for (const ability of Object.values(player.abilities || {})) {
          if (ability.cooldown !== undefined) {
            ability.cooldown *= apply ? 0.5 : 2;
          }
        }
        break;
    }
  }
  
  freezeAllEnemies(duration) {
    // This would need to be implemented with access to enemy list
    // Emit an event or call a method on enemy manager
    console.log(`Freezing all enemies for ${duration}ms`);
  }
  
  onPowerupCollected(powerup, player) {
    // Visual effect at collection point
    // Sound effect
    // UI notification
    console.log(`Player ${player.playerId} collected ${powerup.type}`);
  }
  
  getActiveEffects(playerId) {
    return this.activeEffects.get(playerId) || [];
  }
  
  hasEffect(playerId, type) {
    const effects = this.activeEffects.get(playerId);
    return effects && effects.some(e => e.type === type);
  }
  
  draw(ctx, camera) {
    // Draw all powerups
    for (const powerup of this.powerups) {
      powerup.draw(ctx, camera);
    }
    
    // Draw effect indicators on players would be done elsewhere
  }
  
  clear() {
    this.powerups = [];
    this.activeEffects.clear();
  }
  
  // Load powerups from level data
  loadFromWave(waveData, currentTime) {
    if (!waveData.powerups) return;
    
    for (const powerupData of waveData.powerups) {
      this.spawnPowerup(
        powerupData.type,
        powerupData.x,
        powerupData.y,
        currentTime + powerupData.spawnTime
      );
    }
  }
}

// Export singleton instance
export const powerupManager = new PowerupManager();