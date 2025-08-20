// Unified Movement Configuration for SmashImpact
// This file ensures consistent movement physics across all game modes

export const MovementConfig = {
  // Player movement constants
  PLAYER: {
    RADIUS: 20,
    BASE_SPEED: 5,
    MAX_SPEED: 10,
    BOOST_SPEED: 15,
    ACCELERATION: 0.5,
    FRICTION: 0.9,
    BOOST_DURATION: 200,
    BOOST_COOLDOWN: 1000,
    BOOST_ENERGY_COST: 20
  },
  
  // Enemy movement constants
  ENEMY: {
    RADIUS: 15,
    BASE_SPEED: 2,
    MAX_SPEED: 4,
    ACCELERATION: 0.3,
    FRICTION: 0.85
  },
  
  // Wolf movement constants
  WOLF: {
    RADIUS: 18,
    BASE_SPEED: 3,
    MAX_SPEED: 6,
    ACCELERATION: 0.4,
    FRICTION: 0.88,
    ALERT_RADIUS: 150,
    ATTACK_RADIUS: 30,
    PACK_COHESION: 0.3,
    TARGET_WEIGHT: 0.7
  },
  
  // Physics constants
  PHYSICS: {
    DIAGONAL_NORMALIZATION: true,
    COLLISION_DAMPING: 0.8,
    COLLISION_ELASTICITY: 0.5,
    BOUNDARY_BOUNCE: true,
    FPS_BASELINE: 60,
    DELTATIME_CAP: 33.33 // Cap at 30 FPS minimum
  },
  
  // Helper functions for consistent movement calculations
  normalizeVector(dx, dy) {
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    if (this.PHYSICS.DIAGONAL_NORMALIZATION && dx !== 0 && dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      return { x: dx / mag, y: dy / mag };
    }
    return { x: dx, y: dy };
  },
  
  applyAcceleration(velocity, direction, acceleration, deltaTime) {
    const dt = Math.min(deltaTime / 1000, this.PHYSICS.DELTATIME_CAP / 1000);
    const accel = acceleration * dt * this.PHYSICS.FPS_BASELINE;
    return {
      x: velocity.x + direction.x * accel,
      y: velocity.y + direction.y * accel
    };
  },
  
  applyFriction(velocity, friction, deltaTime) {
    const dt = Math.min(deltaTime, this.PHYSICS.DELTATIME_CAP);
    const frictionFactor = Math.pow(friction, dt / (1000 / this.PHYSICS.FPS_BASELINE));
    return {
      x: velocity.x * frictionFactor,
      y: velocity.y * frictionFactor
    };
  },
  
  limitSpeed(velocity, maxSpeed) {
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > maxSpeed) {
      return {
        x: (velocity.x / speed) * maxSpeed,
        y: (velocity.y / speed) * maxSpeed
      };
    }
    return velocity;
  },
  
  updatePosition(position, velocity, deltaTime) {
    const dt = Math.min(deltaTime / 1000, this.PHYSICS.DELTATIME_CAP / 1000);
    return {
      x: position.x + velocity.x * dt * this.PHYSICS.FPS_BASELINE,
      y: position.y + velocity.y * dt * this.PHYSICS.FPS_BASELINE
    };
  },
  
  resolveCollision(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < entity1.radius + entity2.radius && dist > 0) {
      const overlap = entity1.radius + entity2.radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Separate entities
      const separation = {
        x: nx * overlap * 0.5,
        y: ny * overlap * 0.5
      };
      
      // Calculate relative velocity
      const relVx = entity1.vx - (entity2.vx || 0);
      const relVy = entity1.vy - (entity2.vy || 0);
      const dotProduct = relVx * nx + relVy * ny;
      
      // Apply collision response
      const impulse = 2 * dotProduct / (entity1.mass || 1 + entity2.mass || 1);
      const velocityChange = {
        x: -impulse * nx * this.PHYSICS.COLLISION_ELASTICITY,
        y: -impulse * ny * this.PHYSICS.COLLISION_ELASTICITY
      };
      
      return {
        separation,
        velocityChange,
        damping: this.PHYSICS.COLLISION_DAMPING
      };
    }
    
    return null;
  }
};

// For CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MovementConfig;
}
