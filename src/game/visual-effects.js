// Visual Effects System for Smash Impact
(function() {
  // Prevent redeclaration if already defined
  if (typeof window.VisualEffects !== 'undefined') {
    console.warn('VisualEffects already defined, skipping redeclaration');
    return;
  }
  
  class VisualEffects {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.particles = [];
    this.screenShake = {
      active: false,
      intensity: 0,
      duration: 0,
      startTime: 0,
      offsetX: 0,
      offsetY: 0
    };
    this.trails = [];
    this.explosions = [];
    this.damageNumbers = [];
    this.powerUpEffects = [];
    this.maxParticles = 500;
    this.lastFrameTime = performance.now();
  }

  // Particle System
  createParticle(x, y, options = {}) {
    const defaults = {
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: Math.random() * 3 + 1,
      color: '#ffffff',
      lifetime: 1000,
      gravity: 0,
      friction: 0.98,
      opacity: 1,
      fadeRate: 0.02,
      glowing: false,
      shape: 'circle' // circle, square, star
    };
    
    const particle = {
      x,
      y,
      ...defaults,
      ...options,
      createdAt: performance.now(),
      initialOpacity: options.opacity || 1
    };
    
    if (this.particles.length < this.maxParticles) {
      this.particles.push(particle);
    }
    
    return particle;
  }

  // Create explosion effect
  createExplosion(x, y, options = {}) {
    const {
      particleCount = 30,
      color = '#ff6b6b',
      secondaryColor = '#ffd93d',
      radius = 50,
      force = 8,
      lifetime = 800,
      shakeIntensity = 5
    } = options;

    // Add to explosions array for ring effect
    this.explosions.push({
      x,
      y,
      radius: 0,
      maxRadius: radius * 2,
      opacity: 1,
      color,
      createdAt: performance.now(),
      lifetime: 300
    });

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const velocity = force * (0.5 + Math.random() * 0.5);
      const particleColor = Math.random() > 0.5 ? color : secondaryColor;
      
      this.createParticle(x, y, {
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 4 + 2,
        color: particleColor,
        lifetime,
        gravity: 0.1,
        friction: 0.96,
        glowing: true,
        fadeRate: 0.03
      });
    }

    // Screen shake
    if (shakeIntensity > 0) {
      this.shakeScreen(shakeIntensity, 200);
    }
  }

  // Create impact effect for attacks
  createImpact(x, y, options = {}) {
    const {
      color = '#22d3ee',
      particleCount = 20,
      spread = 60
    } = options;

    // Create directional particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.random() - 0.5) * spread * (Math.PI / 180);
      const velocity = 5 + Math.random() * 5;
      
      this.createParticle(x, y, {
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 3 + 1,
        color,
        lifetime: 600,
        gravity: 0.2,
        friction: 0.95,
        glowing: true
      });
    }

    // Small screen shake
    this.shakeScreen(3, 100);
  }

  // Create boost trail effect
  createBoostTrail(x, y, color = '#6366f1', direction = { x: 0, y: 0 }) {
    // Add to trails
    this.trails.push({
      points: [{ x, y, opacity: 1 }],
      color,
      maxLength: 10,
      createdAt: performance.now()
    });

    // Create trailing particles
    for (let i = 0; i < 3; i++) {
      this.createParticle(x, y, {
        vx: -direction.x * 2 + (Math.random() - 0.5) * 2,
        vy: -direction.y * 2 + (Math.random() - 0.5) * 2,
        size: Math.random() * 2 + 1,
        color,
        lifetime: 400,
        fadeRate: 0.05,
        glowing: true
      });
    }
  }

  // Update trail positions
  updateTrail(trailIndex, x, y) {
    if (this.trails[trailIndex]) {
      const trail = this.trails[trailIndex];
      trail.points.unshift({ x, y, opacity: 1 });
      
      // Limit trail length
      if (trail.points && trail.points && trail.points && trail.points.length > trail.maxLength) {
        trail.points.pop();
      }
      
      // Fade trail points
      trail.points.forEach((point, i) => {
        point.opacity = 1 - (i / trail.maxLength);
      });
    }
  }

  // Create damage number popup
  createDamageNumber(x, y, damage, options = {}) {
    const {
      color = '#ff4444',
      fontSize = 24,
      isCritical = false
    } = options;

    this.damageNumbers.push({
      x,
      y,
      damage,
      color: isCritical ? '#ffaa00' : color,
      fontSize: isCritical ? fontSize * 1.5 : fontSize,
      vy: -3,
      opacity: 1,
      createdAt: performance.now(),
      lifetime: 1000,
      isCritical
    });
  }

  // Create power-up collection effect
  createPowerUpEffect(x, y, type = 'default') {
    const colors = {
      speed: '#00ff00',
      damage: '#ff0000',
      shield: '#0099ff',
      health: '#ff69b4',
      default: '#ffff00'
    };

    const color = colors[type] || colors.default;

    // Create spiral effect
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const delay = i * 20;
      
      setTimeout(() => {
        this.createParticle(x, y, {
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          size: 3,
          color,
          lifetime: 800,
          gravity: -0.1,
          friction: 0.98,
          glowing: true,
          shape: 'star'
        });
      }, delay);
    }

    // Add to power-up effects for special rendering
    this.powerUpEffects.push({
      x,
      y,
      type,
      radius: 0,
      maxRadius: 40,
      opacity: 1,
      color,
      createdAt: performance.now(),
      lifetime: 500
    });
  }

  // Screen shake effect
  shakeScreen(intensity = 5, duration = 200) {
    this.screenShake = {
      active: true,
      intensity,
      duration,
      startTime: performance.now(),
      offsetX: 0,
      offsetY: 0
    };
  }

  // Update screen shake
  updateScreenShake() {
    if (!this.screenShake.active) return;

    const elapsed = performance.now() - this.screenShake.startTime;
    
    if (elapsed >= this.screenShake.duration) {
      this.screenShake.active = false;
      this.screenShake.offsetX = 0;
      this.screenShake.offsetY = 0;
      return;
    }

    // Calculate shake intensity with decay
    const progress = elapsed / this.screenShake.duration;
    const currentIntensity = this.screenShake.intensity * (1 - progress);
    
    // Random shake offset
    this.screenShake.offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    this.screenShake.offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
  }

  // Update all particles
  updateParticles(deltaTime) {
    const now = performance.now();
    
    // Update particles
    this.particles = this.particles.filter(particle => {
      const age = now - particle.createdAt;
      
      if (age >= particle.lifetime) {
        return false;
      }
      
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Apply physics
      particle.vy += particle.gravity;
      particle.vx *= particle.friction;
      particle.vy *= particle.friction;
      
      // Update opacity
      particle.opacity = particle.initialOpacity * (1 - age / particle.lifetime);
      particle.opacity -= particle.fadeRate;
      
      return particle.opacity > 0;
    });

    // Update explosions
    this.explosions = this.explosions.filter(explosion => {
      const age = now - explosion.createdAt;
      
      if (age >= explosion.lifetime) {
        return false;
      }
      
      explosion.radius = (explosion.maxRadius * age) / explosion.lifetime;
      explosion.opacity = 1 - age / explosion.lifetime;
      
      return true;
    });

    // Update damage numbers
    this.damageNumbers = this.damageNumbers.filter(dmg => {
      const age = now - dmg.createdAt;
      
      if (age >= dmg.lifetime) {
        return false;
      }
      
      dmg.y += dmg.vy;
      dmg.vy *= 0.95;
      dmg.opacity = 1 - age / dmg.lifetime;
      
      return true;
    });

    // Update power-up effects
    this.powerUpEffects = this.powerUpEffects.filter(effect => {
      const age = now - effect.createdAt;
      
      if (age >= effect.lifetime) {
        return false;
      }
      
      effect.radius = (effect.maxRadius * age) / effect.lifetime;
      effect.opacity = 1 - age / effect.lifetime;
      
      return true;
    });

    // Update trails
    this.trails = this.trails.filter(trail => {
      return trail.points && points && points && points.length > 0;
    });
  }

  // Render all effects
  render() {
    const ctx = this.ctx;
    
    // Save context state
    ctx.save();
    
    // Apply screen shake
    if (this.screenShake.active) {
      ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
    }
    
    // Render trails
    this.trails.forEach(trail => {
      if (trail.points && trail.points && trail.points && trail.points.length < 2) return;
      
      ctx.strokeStyle = trail.color;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < trail.points && trail.points && trail.points && trail.points.length - 1; i++) {
        const p1 = trail.points[i];
        const p2 = trail.points[i + 1];
        
        ctx.globalAlpha = p1.opacity * 0.5;
        ctx.lineWidth = (trail.maxLength - i) * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    });
    
    // Render explosion rings
    this.explosions.forEach(explosion => {
      ctx.globalAlpha = explosion.opacity * 0.6;
      ctx.strokeStyle = explosion.color;
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner ring
      ctx.globalAlpha = explosion.opacity * 0.3;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    });
    
    // Render particles
    this.particles.forEach(particle => {
      ctx.globalAlpha = particle.opacity;
      
      if (particle.glowing) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
      }
      
      ctx.fillStyle = particle.color;
      
      if (particle.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (particle.shape === 'square') {
        ctx.fillRect(
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
      } else if (particle.shape === 'star') {
        this.drawStar(ctx, particle.x, particle.y, particle.size);
      }
      
      ctx.shadowBlur = 0;
    });
    
    // Render power-up effects
    this.powerUpEffects.forEach(effect => {
      ctx.globalAlpha = effect.opacity;
      ctx.strokeStyle = effect.color;
      
      // Rotating rings
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate((performance.now() / 1000) * Math.PI);
      
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 2 - i * 0.5;
        ctx.globalAlpha = effect.opacity * (1 - i * 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, effect.radius + i * 10, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      ctx.restore();
    });
    
    // Render damage numbers
    this.damageNumbers.forEach(dmg => {
      ctx.globalAlpha = dmg.opacity;
      ctx.fillStyle = dmg.color;
      ctx.font = `bold ${dmg.fontSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (dmg.isCritical) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText(dmg.damage, dmg.x, dmg.y);
      }
      
      ctx.fillText(dmg.damage, dmg.x, dmg.y);
    });
    
    // Restore context state
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Helper function to draw a star
  drawStar(ctx, x, y, size) {
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size / 2;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  // Update method to be called each frame
  update(deltaTime) {
    this.updateParticles(deltaTime);
    this.updateScreenShake();
  }

  // Clear all effects
  clear() {
    this.particles = [];
    this.trails = [];
    this.explosions = [];
    this.damageNumbers = [];
    this.powerUpEffects = [];
    this.screenShake.active = false;
  }

  // Get current screen shake offset
  getScreenShakeOffset() {
    return {
      x: this.screenShake.offsetX,
      y: this.screenShake.offsetY
    };
  }
}

  // Export for use in game
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisualEffects;
  } else {
    window.VisualEffects = VisualEffects;
  }
})();