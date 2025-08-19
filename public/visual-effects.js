// Visual Effects Manager for SmashImpact
class VisualEffectsManager {
  constructor(ctx, canvas) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.particles = [];
    this.explosions = [];
    this.trails = [];
    this.shockwaves = [];
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
    this.maxParticles = 500;
  }

  update(deltaTime) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx * deltaTime / 16;
      particle.y += particle.vy * deltaTime / 16;
      particle.life -= deltaTime / 16;
      particle.alpha = Math.max(0, particle.life / particle.maxLife);
      
      // Apply gravity if enabled
      if (particle.gravity) {
        particle.vy += particle.gravity * deltaTime / 16;
      }
      
      // Apply friction
      if (particle.friction) {
        particle.vx *= particle.friction;
        particle.vy *= particle.friction;
      }
      
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update explosions
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const explosion = this.explosions[i];
      explosion.radius += explosion.expandSpeed * deltaTime / 16;
      explosion.alpha -= explosion.fadeSpeed * deltaTime / 16;
      
      if (explosion.alpha <= 0) {
        this.explosions.splice(i, 1);
      }
    }

    // Update trails
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.alpha -= trail.fadeSpeed * deltaTime / 16;
      
      if (trail.alpha <= 0) {
        this.trails.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const wave = this.shockwaves[i];
      wave.radius += wave.speed * deltaTime / 16;
      wave.alpha -= wave.fadeSpeed * deltaTime / 16;
      
      if (wave.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.screenShake.duration > 0) {
      this.screenShake.duration -= deltaTime;
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
    } else {
      this.screenShake.x = 0;
      this.screenShake.y = 0;
      this.screenShake.intensity = 0;
    }
  }

  render() {
    const ctx = this.ctx;
    
    // Apply screen shake
    if (this.screenShake.intensity > 0) {
      ctx.save();
      ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    // Render trails (behind everything)
    for (const trail of this.trails) {
      ctx.save();
      ctx.globalAlpha = trail.alpha;
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = trail.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      for (let i = 0; i < trail.points.length - 1; i++) {
        const point = trail.points[i];
        const nextPoint = trail.points[i + 1];
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(nextPoint.x, nextPoint.y);
      }
      
      ctx.stroke();
      ctx.restore();
    }

    // Render particles
    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = particle.alpha;
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
        this.drawStar(ctx, particle.x, particle.y, particle.size, 5);
      }
      
      ctx.restore();
    }

    // Render explosions
    for (const explosion of this.explosions) {
      ctx.save();
      ctx.globalAlpha = explosion.alpha;
      
      // Create gradient
      const gradient = ctx.createRadialGradient(
        explosion.x, explosion.y, 0,
        explosion.x, explosion.y, explosion.radius
      );
      gradient.addColorStop(0, explosion.innerColor);
      gradient.addColorStop(0.4, explosion.middleColor);
      gradient.addColorStop(1, explosion.outerColor);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render shockwaves
    for (const wave of this.shockwaves) {
      ctx.save();
      ctx.globalAlpha = wave.alpha;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = wave.width;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Restore context if screen shake was applied
    if (this.screenShake.intensity > 0) {
      ctx.restore();
    }
  }

  createParticle(x, y, options = {}) {
    if (this.particles.length >= this.maxParticles) return;
    
    this.particles.push({
      x,
      y,
      vx: options.vx || (Math.random() - 0.5) * 4,
      vy: options.vy || (Math.random() - 0.5) * 4,
      size: options.size || Math.random() * 3 + 1,
      color: options.color || '#ffffff',
      alpha: options.alpha || 1,
      life: options.life || 60,
      maxLife: options.life || 60,
      shape: options.shape || 'circle',
      gravity: options.gravity || 0,
      friction: options.friction || 1
    });
  }

  createExplosion(x, y, options = {}) {
    this.explosions.push({
      x,
      y,
      radius: options.radius || 10,
      maxRadius: options.maxRadius || 100,
      expandSpeed: options.expandSpeed || 5,
      alpha: options.alpha || 1,
      fadeSpeed: options.fadeSpeed || 0.02,
      innerColor: options.innerColor || 'rgba(255, 255, 255, 0.8)',
      middleColor: options.middleColor || 'rgba(255, 200, 0, 0.5)',
      outerColor: options.outerColor || 'rgba(255, 0, 0, 0)'
    });

    // Create particles for the explosion
    const particleCount = options.particleCount || 20;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const speed = Math.random() * 5 + 3;
      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: options.particleColor || '#ff6600',
        life: 40,
        gravity: 0.2,
        friction: 0.98
      });
    }
  }

  createShockwave(x, y, options = {}) {
    this.shockwaves.push({
      x,
      y,
      radius: options.radius || 0,
      speed: options.speed || 10,
      alpha: options.alpha || 0.8,
      fadeSpeed: options.fadeSpeed || 0.02,
      color: options.color || 'rgba(255, 255, 255, 0.5)',
      width: options.width || 3
    });
  }

  createTrail(points, options = {}) {
    if (points.length < 2) return;
    
    this.trails.push({
      points: [...points],
      color: options.color || 'rgba(255, 255, 255, 0.5)',
      width: options.width || 2,
      alpha: options.alpha || 0.8,
      fadeSpeed: options.fadeSpeed || 0.05
    });
  }

  createBoostTrail(x, y, color, velocity) {
    // Create multiple particles for boost effect
    for (let i = 0; i < 3; i++) {
      this.createParticle(x, y, {
        vx: -velocity.x * 0.3 + (Math.random() - 0.5) * 2,
        vy: -velocity.y * 0.3 + (Math.random() - 0.5) * 2,
        color: color,
        size: Math.random() * 4 + 2,
        life: 30,
        alpha: 0.7,
        friction: 0.95
      });
    }
  }

  createImpactEffect(x, y, color) {
    // Create shockwave
    this.createShockwave(x, y, {
      speed: 8,
      color: color,
      fadeSpeed: 0.05
    });

    // Create particles
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15;
      const speed = Math.random() * 4 + 2;
      this.createParticle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 25,
        size: Math.random() * 3 + 1
      });
    }
  }

  createPowerUpEffect(x, y, type) {
    const colors = {
      speed: '#00ff00',
      shield: '#0088ff',
      damage: '#ff0000',
      health: '#ff00ff'
    };
    
    const color = colors[type] || '#ffffff';
    
    // Create spiral effect
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const radius = 30;
      this.createParticle(
        x + Math.cos(angle) * radius,
        y + Math.sin(angle) * radius,
        {
          vx: -Math.cos(angle) * 2,
          vy: -Math.sin(angle) * 2,
          color: color,
          life: 40,
          shape: 'star',
          size: 5
        }
      );
    }
  }

  shakeScreen(intensity, duration) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
  }

  drawStar(ctx, x, y, radius, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i) / points;
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
  }

  clear() {
    this.particles = [];
    this.explosions = [];
    this.trails = [];
    this.shockwaves = [];
    this.screenShake = { x: 0, y: 0, intensity: 0, duration: 0 };
  }

  getParticleCount() {
    return this.particles.length;
  }

  getEffectCount() {
    return this.particles.length + this.explosions.length + 
           this.trails.length + this.shockwaves.length;
  }
}

// Export for use in game
if (typeof window !== 'undefined') {
  window.VisualEffectsManager = VisualEffectsManager;
}