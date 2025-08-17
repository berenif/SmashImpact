/**
 * Game Configuration
 * Central configuration for all game parameters
 * Can be hot-reloaded during development
 */

const GameConfig = {
  // Core game settings
  game: {
    targetFPS: 60,
    fixedTimeStep: 1000 / 60, // 16.67ms
    maxDeltaTime: 100, // Max frame time to prevent spiral of death
    
    modes: {
      survival: {
        waves: 10,
        timeLimitPerWave: 180, // seconds
        respawnTime: 3,
        maxDowns: 2
      },
      endless: {
        waveScaling: 1.15,
        difficultyIncrease: 0.1,
        checkpointInterval: 5 // Every 5 waves
      },
      tutorial: {
        guided: true,
        hints: true,
        respawnTime: 1
      }
    }
  },
  
  // Arena settings
  arena: {
    default: {
      width: 1600,
      height: 900,
      gridSize: 50
    },
    
    spawnZones: {
      players: [
        { x: 200, y: 450 },
        { x: 250, y: 450 }
      ],
      enemies: [
        { x: 1400, y: 200 },
        { x: 1400, y: 700 },
        { x: 800, y: 100 },
        { x: 800, y: 800 }
      ]
    },
    
    objectives: {
      capture: {
        radius: 80,
        captureTime: 5,
        contestedSlowdown: 0.5
      },
      defend: {
        radius: 100,
        duration: 30,
        healthPool: 500
      },
      extract: {
        radius: 60,
        channelTime: 10,
        interruptOnDamage: true
      }
    }
  },
  
  // Hero configurations
  heroes: {
    runner: {
      stats: {
        maxHealth: 100,
        healthRegen: 2, // per second
        moveSpeed: 320,
        radius: 18
      },
      
      abilities: {
        dodge: {
          cooldown: 2000,
          duration: 200,
          speed: 600,
          invulnerable: true,
          key: 'shift'
        },
        smokeBeacon: {
          cooldown: 8000,
          duration: 3000,
          radius: 120,
          visionBlock: true,
          damageReduction: 0.5,
          key: 'q'
        },
        stun: {
          cooldown: 5000,
          duration: 1000,
          range: 60,
          coneAngle: 45, // degrees
          key: 'e'
        }
      },
      
      visuals: {
        color: '#00ff88',
        trailEffect: true,
        dodgeGhost: true
      }
    },
    
    anchor: {
      stats: {
        maxHealth: 150,
        healthRegen: 3,
        moveSpeed: 200,
        radius: 22
      },
      
      abilities: {
        shield: {
          health: 50,
          angle: 60, // degrees
          damageReduction: 0.75,
          regenRate: 10, // per second when not active
          moveSpeedPenalty: 0.5,
          key: 'shift'
        },
        grapple: {
          cooldown: 4000,
          range: 200,
          speed: 800,
          pullForce: 300,
          stunOnHit: 500, // ms
          key: 'q'
        },
        fortify: {
          cooldown: 12000,
          duration: 3000,
          damageReduction: 0.5,
          knockbackImmune: true,
          key: 'e'
        }
      },
      
      visuals: {
        color: '#4488ff',
        shieldGlow: true,
        anchorEffect: true
      }
    }
  },
  
  // Enemy configurations
  enemies: {
    brawler: {
      stats: {
        health: 80,
        moveSpeed: 150,
        attackDamage: 15,
        attackRange: 30,
        attackCooldown: 1000,
        radius: 20
      },
      ai: {
        aggressionLevel: 0.8,
        preferFrontalAssault: true,
        threatLevel: 3 // Visual threat multiplier
      },
      visuals: {
        color: '#ff6666',
        size: 1.2
      }
    },
    
    stalker: {
      stats: {
        health: 40,
        moveSpeed: 250,
        attackDamage: 20,
        attackRange: 25,
        attackCooldown: 800,
        radius: 15
      },
      ai: {
        preferBackstab: true,
        shimmerTime: 400, // Telegraph duration
        flankRadius: 80,
        patience: 3 // Seconds to wait for opportunity
      },
      visuals: {
        color: '#cc44cc',
        transparency: 0.7
      }
    },
    
    archer: {
      stats: {
        health: 50,
        moveSpeed: 180,
        attackDamage: 10,
        attackRange: 200,
        attackCooldown: 1500,
        projectileSpeed: 400,
        radius: 16
      },
      ai: {
        preferDistance: 150,
        kiteRange: 100,
        predictiveAiming: 0.3 // 0-1 prediction factor
      },
      visuals: {
        color: '#66ccff',
        projectileTrail: true
      }
    },
    
    // ... other enemy types
  },
  
  // Squad configurations
  squads: {
    updateRate: 500, // 2 Hz
    
    tactics: {
      baitAndFlank: {
        composition: ['brawler', 'stalker', 'stalker'],
        formation: 'triangle',
        coordinationLevel: 0.7
      },
      shieldCrossfire: {
        composition: ['bulwark', 'archer', 'archer'],
        formation: 'line',
        coordinationLevel: 0.8
      },
      zoneAndPunish: {
        composition: ['saboteur', 'skirmisher', 'skirmisher'],
        formation: 'spread',
        coordinationLevel: 0.6
      }
    },
    
    director: {
      aggression: 0.5, // 0-1
      adaptiveMode: true,
      tacticChangeThreshold: 3, // Repetitions before change
      playerSeparationThreshold: 200,
      comboMeterThreshold: 0.7
    }
  },
  
  // Combat settings
  combat: {
    tagCooldown: 800,
    damageFlash: 100, // ms
    knockback: {
      force: 200,
      duration: 200
    },
    
    damageNumbers: {
      enabled: true,
      floatSpeed: 50,
      fadeTime: 1000
    },
    
    criticalHits: {
      enabled: true,
      chance: 0.1,
      multiplier: 1.5
    }
  },
  
  // Co-op mechanics
  coop: {
    revive: {
      time: 2000, // Base revive time
      decayRate: 10, // Progress decay per second
      healthOnRevive: 0.3, // 30% of max health
      invulnerabilityTime: 1000
    },
    
    tether: {
      maxLength: 300,
      pullForce: 400,
      breakThreshold: 500,
      visualThickness: 2
    },
    
    rally: {
      radius: 60,
      healRate: 10, // per second
      duration: 3000,
      cooldown: 15000
    },
    
    backToBack: {
      radius: 50,
      angleThreshold: 45, // degrees
      damageBonus: 1.2,
      defenseBonus: 1.3
    },
    
    comboMeter: {
      maxValue: 100,
      buildRate: 10, // per kill
      decayRate: 2, // per second
      overclockThreshold: 80,
      overclockDuration: 5000
    }
  },
  
  // Wave system
  waves: {
    startDelay: 3000,
    betweenWaveTime: 10000,
    
    scaling: {
      enemyCount: {
        base: 3,
        perWave: 2,
        perPlayer: 1.5
      },
      enemyHealth: {
        base: 1.0,
        perWave: 0.1,
        max: 2.0
      },
      enemyDamage: {
        base: 1.0,
        perWave: 0.05,
        max: 1.5
      }
    },
    
    rewards: {
      perKill: 10,
      waveComplete: 100,
      objectiveBonus: 50,
      noDownBonus: 200
    }
  },
  
  // Network settings
  network: {
    tickRate: 30, // Hz - server update rate
    sendRate: 15, // Hz - client send rate
    stateRate: 5, // Hz - full state sync
    interpolationDelay: 100, // ms
    extrapolationLimit: 200, // ms
    
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    heartbeatInterval: 5000,
    timeout: 10000,
    
    compression: {
      positions: true, // Use int16 for positions
      angles: true, // Use uint16 for angles
      health: true // Use uint8 for health percentage
    }
  },
  
  // Visual settings
  visuals: {
    particles: {
      enabled: true,
      maxParticles: 500,
      quality: 'medium' // low, medium, high
    },
    
    shadows: {
      enabled: true,
      quality: 'medium'
    },
    
    ui: {
      scale: 1.0,
      opacity: 0.9,
      animations: true
    },
    
    camera: {
      smoothing: 0.1,
      shakeIntensity: 1.0,
      zoomLimits: [0.5, 2.0]
    }
  },
  
  // Audio settings
  audio: {
    master: 1.0,
    sfx: 0.8,
    music: 0.6,
    voice: 1.0,
    
    spatial: {
      enabled: true,
      falloffDistance: 500,
      panningModel: 'HRTF'
    }
  },
  
  // Debug settings
  debug: {
    enabled: false,
    showFPS: true,
    showHitboxes: false,
    showPaths: false,
    showInfluenceMap: false,
    showNetworkStats: false,
    aiUpdateRate: 10, // Hz
    
    cheats: {
      godMode: false,
      infiniteAmmo: false,
      oneHitKill: false,
      speedMultiplier: 1.0
    },
    
    logging: {
      level: 'info', // error, warn, info, debug
      categories: ['game', 'network', 'ai', 'physics']
    }
  },
  
  // Performance settings
  performance: {
    targetFPS: 60,
    adaptiveQuality: true,
    
    culling: {
      enabled: true,
      distance: 2000,
      frustumMargin: 100
    },
    
    pooling: {
      enemies: 50,
      projectiles: 100,
      particles: 500,
      damageNumbers: 50
    },
    
    updateFrequencies: {
      ai: 10, // Hz
      physics: 60, // Hz
      particles: 30, // Hz
      ui: 30 // Hz
    }
  }
};

// Development mode overrides
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
  GameConfig.debug.enabled = true;
  GameConfig.debug.showFPS = true;
  GameConfig.debug.logging.level = 'debug';
}

// Helper functions for config access
export const getConfig = (path) => {
  const keys = path.split('.');
  let value = GameConfig;
  
  for (const key of keys) {
    value = value[key];
    if (value === undefined) {
      console.warn(`Config path not found: ${path}`);
      return null;
    }
  }
  
  return value;
};

export const setConfig = (path, newValue) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let target = GameConfig;
  
  for (const key of keys) {
    target = target[key];
    if (target === undefined) {
      console.error(`Cannot set config: ${path}`);
      return false;
    }
  }
  
  target[lastKey] = newValue;
  
  // Emit config change event
  if (typeof window !== 'undefined' && window.eventBus) {
    window.eventBus.emit('config.changed', { path, value: newValue });
  }
  
  return true;
};

// Config validation
export const validateConfig = () => {
  const errors = [];
  
  // Check required values
  if (GameConfig.game.targetFPS < 30 || GameConfig.game.targetFPS > 144) {
    errors.push('Invalid targetFPS');
  }
  
  if (GameConfig.network.tickRate > GameConfig.game.targetFPS) {
    errors.push('Network tickRate exceeds targetFPS');
  }
  
  // Add more validation as needed
  
  return errors;
};

export default GameConfig;