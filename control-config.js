/**
 * Control Configuration
 * Centralized settings for control feel across platforms
 */

export const ControlConfig = {
  // Movement speeds (units per second)
  movement: {
    baseSpeed: 4,        // Normal movement speed
    boostMultiplier: 2,  // Speed multiplier when boosting
    maxSpeed: 10,        // Maximum allowed speed
    acceleration: 0.2,   // How quickly speed changes (0-1, higher = more responsive)
  },
  
  // Joystick settings (mobile)
  joystick: {
    deadZone: 0.15,      // Dead zone radius (0-1)
    sensitivity: 1.0,    // Sensitivity multiplier
    maxDistance: 40,     // Maximum joystick travel in pixels
    visualFeedback: true, // Show visual feedback for input
  },
  
  // Keyboard settings (desktop)
  keyboard: {
    acceleration: 0.2,   // Smoothing for keyboard input (0-1)
    diagonalNormalize: true, // Normalize diagonal movement
    repeatDelay: 0,      // Delay before key repeat (ms)
  },
  
  // Network sync settings
  sync: {
    inputSmoothing: 0.2,     // Input smoothing for network play
    positionSmoothing: 0.3,  // Position smoothing for remote players
    velocitySmoothing: 0.3,  // Velocity smoothing
  },
  
  // Platform-specific adjustments
  platform: {
    mobile: {
      speedMultiplier: 1.0,  // Adjust speed for mobile
      sensitivityMultiplier: 1.1, // Slightly more sensitive on mobile
    },
    desktop: {
      speedMultiplier: 1.0,  // Desktop speed adjustment
      sensitivityMultiplier: 1.0, // Desktop sensitivity
    }
  },
  
  // Helper methods
  getSpeed(boost = false, platform = 'desktop') {
    const baseSpeed = this.movement.baseSpeed * this.platform[platform].speedMultiplier;
    return boost ? baseSpeed * this.movement.boostMultiplier : baseSpeed;
  },
  
  getSensitivity(platform = 'desktop') {
    return this.joystick.sensitivity * this.platform[platform].sensitivityMultiplier;
  },
  
  // Apply dead zone to a vector
  applyDeadZone(x, y, deadZone = this.joystick.deadZone) {
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude < deadZone) {
      return { x: 0, y: 0 };
    }
    
    // Remap to remove dead zone gap
    const adjustedMagnitude = (magnitude - deadZone) / (1 - deadZone);
    const normalizedX = x / magnitude;
    const normalizedY = y / magnitude;
    
    return {
      x: normalizedX * adjustedMagnitude,
      y: normalizedY * adjustedMagnitude
    };
  },
  
  // Smooth input changes
  smoothInput(current, target, smoothing = this.movement.acceleration) {
    return current * (1 - smoothing) + target * smoothing;
  }
};

// Make it available globally if needed
if (typeof window !== 'undefined') {
  window.ControlConfig = ControlConfig;
}

export default ControlConfig;