// Level System with 3 comprehensive levels showcasing all game features
// Each level introduces new mechanics and increases in difficulty

import { OBSTACLE_TYPES } from './obstacles.js';
import { ENEMY_TYPES } from './enemy-ai.js';
import { SQUAD_TACTICS } from './squad-director.js';

// Powerup types that can spawn in levels
export const POWERUP_TYPES = {
  HEALTH: 'health',
  SPEED: 'speed',
  DAMAGE: 'damage',
  SHIELD: 'shield',
  COMBO: 'combo',
  REVIVE: 'revive',
  DOUBLE_POINTS: 'double_points',
  INVINCIBILITY: 'invincibility',
  RAPID_FIRE: 'rapid_fire',
  FREEZE: 'freeze'
};

// Powerup effects and durations
export const POWERUP_EFFECTS = {
  [POWERUP_TYPES.HEALTH]: { instant: true, value: 30, duration: 0 },
  [POWERUP_TYPES.SPEED]: { instant: false, multiplier: 1.5, duration: 10000 },
  [POWERUP_TYPES.DAMAGE]: { instant: false, multiplier: 2, duration: 8000 },
  [POWERUP_TYPES.SHIELD]: { instant: false, value: 50, duration: 15000 },
  [POWERUP_TYPES.COMBO]: { instant: true, value: 0.5, duration: 0 }, // Fills combo meter by 50%
  [POWERUP_TYPES.REVIVE]: { instant: true, value: 1, duration: 0 }, // Instant revive token
  [POWERUP_TYPES.DOUBLE_POINTS]: { instant: false, multiplier: 2, duration: 20000 },
  [POWERUP_TYPES.INVINCIBILITY]: { instant: false, value: true, duration: 5000 },
  [POWERUP_TYPES.RAPID_FIRE]: { instant: false, multiplier: 0.5, duration: 12000 }, // Halves cooldowns
  [POWERUP_TYPES.FREEZE]: { instant: true, value: 3000, duration: 0 } // Freezes all enemies for 3 seconds
};

// Level 1: Tutorial Arena - Introduction to Core Mechanics
export const LEVEL_1 = {
  id: 'tutorial_arena',
  name: 'Tutorial Arena',
  description: 'Learn the basics of movement, combat, and teamwork',
  difficulty: 'easy',
  duration: 300000, // 5 minutes
  
  // Arena configuration
  arena: {
    width: 1600,
    height: 900,
    theme: 'training',
    ambientColor: '#1a1f3f'
  },
  
  // Starting positions for players
  playerSpawns: [
    { x: 200, y: 450, heroType: 'runner' },
    { x: 300, y: 450, heroType: 'anchor' }
  ],
  
  // Obstacle layout - Simple maze with teaching elements
  obstacles: [
    // Outer walls
    { type: OBSTACLE_TYPES.WALL, x: 50, y: 50, width: 20, height: 800 },
    { type: OBSTACLE_TYPES.WALL, x: 1530, y: 50, width: 20, height: 800 },
    { type: OBSTACLE_TYPES.WALL, x: 50, y: 50, width: 1500, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 50, y: 830, width: 1500, height: 20 },
    
    // Central training walls
    { type: OBSTACLE_TYPES.WALL, x: 500, y: 200, width: 20, height: 200 },
    { type: OBSTACLE_TYPES.WALL, x: 500, y: 500, width: 20, height: 200 },
    { type: OBSTACLE_TYPES.WALL, x: 1080, y: 200, width: 20, height: 200 },
    { type: OBSTACLE_TYPES.WALL, x: 1080, y: 500, width: 20, height: 200 },
    
    // Teaching obstacles
    { type: OBSTACLE_TYPES.HOLE, x: 700, y: 300, width: 60, height: 60, tutorial: 'Holes slow you down!' },
    { type: OBSTACLE_TYPES.HOLE, x: 840, y: 540, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.TRAP, x: 800, y: 450, width: 40, height: 40, tutorial: 'Traps stun you briefly!' },
    
    // Cover spots
    { type: OBSTACLE_TYPES.WALL, x: 300, y: 600, width: 100, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 1200, y: 300, width: 100, height: 20 }
  ],
  
  // Wave configuration
  waves: [
    {
      id: 1,
      name: 'Basic Combat',
      startDelay: 3000,
      objectives: ['Defeat all enemies', 'Learn to dodge'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER],
          spawnPoint: { x: 800, y: 200 },
          spawnDelay: 0
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.HEALTH, x: 800, y: 450, spawnTime: 5000 }
      ]
    },
    {
      id: 2,
      name: 'Flanking Tactics',
      startDelay: 2000,
      objectives: ['Watch your back', 'Use abilities'],
      squads: [
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 1200, y: 450 },
          spawnDelay: 0
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.SPEED, x: 400, y: 450, spawnTime: 3000 },
        { type: POWERUP_TYPES.SHIELD, x: 1200, y: 450, spawnTime: 8000 }
      ]
    },
    {
      id: 3,
      name: 'Ranged Threats',
      startDelay: 2000,
      objectives: ['Close the distance', 'Use cover'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 800, y: 700 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 400, y: 200 },
          spawnDelay: 5000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.DAMAGE, x: 800, y: 450, spawnTime: 0 },
        { type: POWERUP_TYPES.COMBO, x: 200, y: 700, spawnTime: 10000 }
      ]
    }
  ],
  
  // Victory conditions
  victory: {
    type: 'eliminate_all',
    bonus_objectives: [
      { id: 'no_downs', description: 'Complete without being downed', points: 500 },
      { id: 'speed_run', description: 'Complete in under 3 minutes', points: 300 },
      { id: 'combo_master', description: 'Maintain 50% combo for 30 seconds', points: 400 }
    ]
  }
};

// Level 2: Hazard Factory - Advanced Obstacles and Enemy Types
export const LEVEL_2 = {
  id: 'hazard_factory',
  name: 'Hazard Factory',
  description: 'Navigate dangerous terrain while fighting coordinated squads',
  difficulty: 'medium',
  duration: 420000, // 7 minutes
  
  arena: {
    width: 1800,
    height: 1000,
    theme: 'industrial',
    ambientColor: '#2a1a1a'
  },
  
  playerSpawns: [
    { x: 150, y: 500, heroType: 'runner' },
    { x: 250, y: 500, heroType: 'anchor' }
  ],
  
  // Complex obstacle layout with hazard zones
  obstacles: [
    // Outer boundaries
    { type: OBSTACLE_TYPES.WALL, x: 30, y: 30, width: 20, height: 940 },
    { type: OBSTACLE_TYPES.WALL, x: 1750, y: 30, width: 20, height: 940 },
    { type: OBSTACLE_TYPES.WALL, x: 30, y: 30, width: 1740, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 30, y: 950, width: 1740, height: 20 },
    
    // Industrial maze sections
    { type: OBSTACLE_TYPES.WALL, x: 400, y: 100, width: 20, height: 300 },
    { type: OBSTACLE_TYPES.WALL, x: 400, y: 600, width: 20, height: 300 },
    { type: OBSTACLE_TYPES.WALL, x: 600, y: 300, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 600, y: 680, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 900, y: 100, width: 20, height: 400 },
    { type: OBSTACLE_TYPES.WALL, x: 900, y: 500, width: 20, height: 400 },
    { type: OBSTACLE_TYPES.WALL, x: 1200, y: 200, width: 20, height: 250 },
    { type: OBSTACLE_TYPES.WALL, x: 1200, y: 550, width: 20, height: 250 },
    { type: OBSTACLE_TYPES.WALL, x: 1400, y: 100, width: 20, height: 350 },
    { type: OBSTACLE_TYPES.WALL, x: 1400, y: 550, width: 20, height: 350 },
    
    // Hazard zones
    // Spike field 1
    { type: OBSTACLE_TYPES.SPIKE, x: 500, y: 450, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 540, y: 450, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 580, y: 450, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 500, y: 490, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 540, y: 490, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 580, y: 490, width: 30, height: 30 },
    
    // Spike field 2
    { type: OBSTACLE_TYPES.SPIKE, x: 1000, y: 300, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1040, y: 300, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1080, y: 300, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1000, y: 670, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1040, y: 670, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1080, y: 670, width: 30, height: 30 },
    
    // Trap corridors
    { type: OBSTACLE_TYPES.TRAP, x: 700, y: 200, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 700, y: 760, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 1300, y: 380, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 1300, y: 620, width: 40, height: 40 },
    
    // Large holes
    { type: OBSTACLE_TYPES.HOLE, x: 650, y: 450, width: 80, height: 80 },
    { type: OBSTACLE_TYPES.HOLE, x: 1100, y: 200, width: 70, height: 70 },
    { type: OBSTACLE_TYPES.HOLE, x: 1100, y: 730, width: 70, height: 70 },
    { type: OBSTACLE_TYPES.HOLE, x: 1500, y: 450, width: 90, height: 90 }
  ],
  
  waves: [
    {
      id: 1,
      name: 'Saboteur Introduction',
      startDelay: 3000,
      objectives: ['Watch for traps', 'Clear the area'],
      squads: [
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 900, y: 500 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER],
          spawnPoint: { x: 1600, y: 500 },
          spawnDelay: 8000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.HEALTH, x: 600, y: 500, spawnTime: 5000 },
        { type: POWERUP_TYPES.RAPID_FIRE, x: 1300, y: 500, spawnTime: 10000 }
      ]
    },
    {
      id: 2,
      name: 'Crossfire Chaos',
      startDelay: 2500,
      objectives: ['Survive the crossfire', 'Use the terrain'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 700, y: 150 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 700, y: 850 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 1400, y: 500 },
          spawnDelay: 15000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.SHIELD, x: 200, y: 500, spawnTime: 0 },
        { type: POWERUP_TYPES.INVINCIBILITY, x: 900, y: 500, spawnTime: 8000 },
        { type: POWERUP_TYPES.DAMAGE, x: 1600, y: 500, spawnTime: 20000 }
      ]
    },
    {
      id: 3,
      name: 'Multi-Squad Assault',
      startDelay: 3000,
      objectives: ['Survive the assault', 'Prioritize threats'],
      squads: [
        {
          tactic: SQUAD_TACTICS.FOCUS_ISOLATED,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 400, y: 500 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 900, y: 200 },
          spawnDelay: 5000
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 1400, y: 500 },
          spawnDelay: 10000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.FREEZE, x: 900, y: 500, spawnTime: 0 },
        { type: POWERUP_TYPES.COMBO, x: 400, y: 200, spawnTime: 5000 },
        { type: POWERUP_TYPES.DOUBLE_POINTS, x: 1400, y: 800, spawnTime: 10000 },
        { type: POWERUP_TYPES.REVIVE, x: 900, y: 800, spawnTime: 15000 }
      ]
    },
    {
      id: 4,
      name: 'Final Stand',
      startDelay: 2000,
      objectives: ['Survive the final wave', 'Work together'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER],
          spawnPoint: { x: 900, y: 500 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 200, y: 200 },
          spawnDelay: 5000
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 1600, y: 800 },
          spawnDelay: 10000
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 200, y: 800 },
          spawnDelay: 15000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.HEALTH, x: 500, y: 300, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 1300, y: 700, spawnTime: 0 },
        { type: POWERUP_TYPES.INVINCIBILITY, x: 900, y: 500, spawnTime: 10000 },
        { type: POWERUP_TYPES.RAPID_FIRE, x: 200, y: 500, spawnTime: 15000 }
      ]
    }
  ],
  
  victory: {
    type: 'survive_waves',
    bonus_objectives: [
      { id: 'no_damage', description: 'Take no spike damage', points: 600 },
      { id: 'trap_master', description: 'Avoid all traps', points: 500 },
      { id: 'speed_demon', description: 'Complete in under 5 minutes', points: 700 },
      { id: 'combo_king', description: 'Reach 100% combo meter', points: 800 }
    ]
  }
};

// Level 3: Arena of Champions - Ultimate Challenge
export const LEVEL_3 = {
  id: 'arena_of_champions',
  name: 'Arena of Champions',
  description: 'Face the ultimate test of skill, strategy, and teamwork',
  difficulty: 'hard',
  duration: 600000, // 10 minutes
  
  arena: {
    width: 2000,
    height: 1200,
    theme: 'colosseum',
    ambientColor: '#3a1a1a'
  },
  
  playerSpawns: [
    { x: 1000, y: 600, heroType: 'runner' },
    { x: 1000, y: 700, heroType: 'anchor' }
  ],
  
  // Dynamic obstacle layout - changes between waves
  obstacles: [
    // Outer colosseum walls
    { type: OBSTACLE_TYPES.WALL, x: 20, y: 20, width: 30, height: 1160 },
    { type: OBSTACLE_TYPES.WALL, x: 1950, y: 20, width: 30, height: 1160 },
    { type: OBSTACLE_TYPES.WALL, x: 20, y: 20, width: 1960, height: 30 },
    { type: OBSTACLE_TYPES.WALL, x: 20, y: 1150, width: 1960, height: 30 },
    
    // Central arena pillars
    { type: OBSTACLE_TYPES.WALL, x: 500, y: 300, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.WALL, x: 1440, y: 300, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.WALL, x: 500, y: 840, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.WALL, x: 1440, y: 840, width: 60, height: 60 },
    
    // Central platform
    { type: OBSTACLE_TYPES.WALL, x: 900, y: 550, width: 200, height: 100 },
    
    // Rotating hazard zones (conceptual - would need animation)
    // North hazard zone
    { type: OBSTACLE_TYPES.SPIKE, x: 900, y: 200, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 950, y: 200, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1000, y: 200, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1050, y: 200, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 975, y: 250, width: 50, height: 50 },
    
    // South hazard zone
    { type: OBSTACLE_TYPES.SPIKE, x: 900, y: 960, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 950, y: 960, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1000, y: 960, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1050, y: 960, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 975, y: 900, width: 50, height: 50 },
    
    // East hazard zone
    { type: OBSTACLE_TYPES.SPIKE, x: 1700, y: 550, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1700, y: 600, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 1700, y: 650, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 1640, y: 600, width: 50, height: 50 },
    
    // West hazard zone
    { type: OBSTACLE_TYPES.SPIKE, x: 260, y: 550, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 260, y: 600, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.SPIKE, x: 260, y: 650, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 310, y: 600, width: 50, height: 50 },
    
    // Hole clusters
    { type: OBSTACLE_TYPES.HOLE, x: 700, y: 400, width: 80, height: 80 },
    { type: OBSTACLE_TYPES.HOLE, x: 1220, y: 400, width: 80, height: 80 },
    { type: OBSTACLE_TYPES.HOLE, x: 700, y: 720, width: 80, height: 80 },
    { type: OBSTACLE_TYPES.HOLE, x: 1220, y: 720, width: 80, height: 80 },
    
    // Diagonal corridors
    { type: OBSTACLE_TYPES.WALL, x: 300, y: 400, width: 150, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 300, y: 780, width: 150, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 1550, y: 400, width: 150, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 1550, y: 780, width: 150, height: 20 }
  ],
  
  waves: [
    {
      id: 1,
      name: 'Opening Ceremony',
      startDelay: 5000,
      objectives: ['Prove your worth', 'Survive the opening'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 1000, y: 200 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 1000, y: 1000 },
          spawnDelay: 0
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.SHIELD, x: 500, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.SHIELD, x: 1500, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.DAMAGE, x: 1000, y: 400, spawnTime: 10000 }
      ]
    },
    {
      id: 2,
      name: 'The Gauntlet',
      startDelay: 3000,
      objectives: ['Face multiple squads', 'Control the arena'],
      squads: [
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 200, y: 600 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 1800, y: 600 },
          spawnDelay: 5000
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 1000, y: 200 },
          spawnDelay: 10000
        },
        {
          tactic: SQUAD_TACTICS.FOCUS_ISOLATED,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 1000, y: 1000 },
          spawnDelay: 15000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.INVINCIBILITY, x: 1000, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 300, y: 300, spawnTime: 5000 },
        { type: POWERUP_TYPES.HEALTH, x: 1700, y: 900, spawnTime: 5000 },
        { type: POWERUP_TYPES.RAPID_FIRE, x: 1000, y: 200, spawnTime: 12000 },
        { type: POWERUP_TYPES.FREEZE, x: 1000, y: 1000, spawnTime: 18000 }
      ]
    },
    {
      id: 3,
      name: 'Elite Forces',
      startDelay: 3000,
      objectives: ['Face elite enemies', 'Coordinate attacks'],
      squads: [
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.BULWARK, ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 500, y: 600 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 1500, y: 600 },
          spawnDelay: 8000
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR],
          spawnPoint: { x: 1000, y: 300 },
          spawnDelay: 12000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.COMBO, x: 1000, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.DOUBLE_POINTS, x: 700, y: 600, spawnTime: 5000 },
        { type: POWERUP_TYPES.REVIVE, x: 1300, y: 600, spawnTime: 10000 },
        { type: POWERUP_TYPES.SHIELD, x: 500, y: 300, spawnTime: 15000 },
        { type: POWERUP_TYPES.SHIELD, x: 1500, y: 900, spawnTime: 15000 }
      ]
    },
    {
      id: 4,
      name: 'Champions Rise',
      startDelay: 3000,
      objectives: ['Prove you are champions', 'Master all mechanics'],
      squads: [
        // Wave 1 - All enemy types
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.STALKER, ENEMY_TYPES.ARCHER, ENEMY_TYPES.BULWARK, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SABOTEUR],
          spawnPoint: { x: 1000, y: 200 },
          spawnDelay: 0
        },
        // Wave 2 - Double trouble
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 200, y: 600 },
          spawnDelay: 10000
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 1800, y: 600 },
          spawnDelay: 10000
        },
        // Wave 3 - Final assault
        {
          tactic: SQUAD_TACTICS.FOCUS_ISOLATED,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER],
          spawnPoint: { x: 1000, y: 1000 },
          spawnDelay: 20000
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 500, y: 300 },
          spawnDelay: 25000
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 1500, y: 900 },
          spawnDelay: 25000
        }
      ],
      powerups: [
        { type: POWERUP_TYPES.INVINCIBILITY, x: 1000, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 500, y: 600, spawnTime: 5000 },
        { type: POWERUP_TYPES.HEALTH, x: 1500, y: 600, spawnTime: 5000 },
        { type: POWERUP_TYPES.RAPID_FIRE, x: 1000, y: 400, spawnTime: 10000 },
        { type: POWERUP_TYPES.DAMAGE, x: 1000, y: 800, spawnTime: 15000 },
        { type: POWERUP_TYPES.FREEZE, x: 300, y: 600, spawnTime: 20000 },
        { type: POWERUP_TYPES.COMBO, x: 1700, y: 600, spawnTime: 25000 },
        { type: POWERUP_TYPES.REVIVE, x: 1000, y: 300, spawnTime: 30000 },
        { type: POWERUP_TYPES.DOUBLE_POINTS, x: 1000, y: 900, spawnTime: 35000 }
      ]
    },
    {
      id: 5,
      name: 'Final Stand of Champions',
      startDelay: 5000,
      objectives: ['Survive the ultimate test', 'Become legends'],
      squads: [
        // Massive final wave - all squads at once
        {
          tactic: SQUAD_TACTICS.SURROUND,
          composition: [ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER, ENEMY_TYPES.BRAWLER],
          spawnPoint: { x: 1000, y: 200 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.BAIT_AND_FLANK,
          composition: [ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER, ENEMY_TYPES.STALKER],
          spawnPoint: { x: 200, y: 600 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.SHIELD_CROSSFIRE,
          composition: [ENEMY_TYPES.BULWARK, ENEMY_TYPES.BULWARK, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER, ENEMY_TYPES.ARCHER],
          spawnPoint: { x: 1800, y: 600 },
          spawnDelay: 0
        },
        {
          tactic: SQUAD_TACTICS.ZONE_AND_PUNISH,
          composition: [ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SABOTEUR, ENEMY_TYPES.SKIRMISHER, ENEMY_TYPES.SKIRMISHER],
          spawnPoint: { x: 1000, y: 1000 },
          spawnDelay: 0
        }
      ],
      powerups: [
        // Emergency powerups everywhere
        { type: POWERUP_TYPES.INVINCIBILITY, x: 1000, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.INVINCIBILITY, x: 500, y: 300, spawnTime: 5000 },
        { type: POWERUP_TYPES.INVINCIBILITY, x: 1500, y: 900, spawnTime: 10000 },
        { type: POWERUP_TYPES.HEALTH, x: 300, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 1700, y: 600, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 1000, y: 300, spawnTime: 0 },
        { type: POWERUP_TYPES.HEALTH, x: 1000, y: 900, spawnTime: 0 },
        { type: POWERUP_TYPES.FREEZE, x: 700, y: 500, spawnTime: 15000 },
        { type: POWERUP_TYPES.FREEZE, x: 1300, y: 700, spawnTime: 20000 },
        { type: POWERUP_TYPES.RAPID_FIRE, x: 1000, y: 450, spawnTime: 25000 },
        { type: POWERUP_TYPES.DOUBLE_POINTS, x: 1000, y: 750, spawnTime: 30000 }
      ]
    }
  ],
  
  victory: {
    type: 'survive_all',
    bonus_objectives: [
      { id: 'perfect_run', description: 'Complete without any player being downed', points: 1000 },
      { id: 'speed_master', description: 'Complete in under 8 minutes', points: 1200 },
      { id: 'combo_legend', description: 'Maintain 75% combo for 60 seconds', points: 1500 },
      { id: 'untouchable', description: 'Take less than 50 total damage', points: 2000 },
      { id: 'champion', description: 'Complete all bonus objectives', points: 5000 }
    ]
  }
};

// Level collection
export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3];

// Level manager class
export class LevelManager {
  constructor() {
    this.currentLevel = null;
    this.currentWaveIndex = 0;
    this.levelStartTime = 0;
    this.powerupTimers = [];
    this.squadTimers = [];
    this.completedObjectives = new Set();
  }
  
  loadLevel(levelId) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) {
      console.error(`Level ${levelId} not found`);
      return null;
    }
    
    this.currentLevel = level;
    this.currentWaveIndex = 0;
    this.levelStartTime = Date.now();
    this.powerupTimers = [];
    this.squadTimers = [];
    this.completedObjectives.clear();
    
    return level;
  }
  
  getCurrentWave() {
    if (!this.currentLevel || this.currentWaveIndex >= this.currentLevel.waves.length) {
      return null;
    }
    return this.currentLevel.waves[this.currentWaveIndex];
  }
  
  nextWave() {
    this.currentWaveIndex++;
    return this.getCurrentWave();
  }
  
  isLevelComplete() {
    return this.currentWaveIndex >= this.currentLevel.waves.length;
  }
  
  checkBonusObjectives(gameState) {
    const objectives = [];
    
    for (const objective of this.currentLevel.victory.bonus_objectives) {
      let completed = false;
      
      switch (objective.id) {
        case 'no_downs':
        case 'perfect_run':
          completed = !gameState.anyPlayerDowned;
          break;
        case 'speed_run':
        case 'speed_demon':
        case 'speed_master':
          const timeLimit = objective.id === 'speed_run' ? 180000 : 
                          objective.id === 'speed_demon' ? 300000 : 480000;
          completed = (Date.now() - this.levelStartTime) < timeLimit;
          break;
        case 'combo_master':
        case 'combo_king':
        case 'combo_legend':
          const comboThreshold = objective.id === 'combo_master' ? 0.5 :
                               objective.id === 'combo_king' ? 1.0 : 0.75;
          completed = gameState.maxComboReached >= comboThreshold;
          break;
        case 'no_damage':
          completed = !gameState.spikeDamageTaken;
          break;
        case 'trap_master':
          completed = !gameState.trapTriggered;
          break;
        case 'untouchable':
          completed = gameState.totalDamageTaken < 50;
          break;
        case 'champion':
          completed = this.completedObjectives.size >= 
                     (this.currentLevel.victory.bonus_objectives.length - 1);
          break;
      }
      
      if (completed) {
        this.completedObjectives.add(objective.id);
        objectives.push(objective);
      }
    }
    
    return objectives;
  }
  
  getScore() {
    let score = 0;
    for (const objectiveId of this.completedObjectives) {
      const objective = this.currentLevel.victory.bonus_objectives.find(
        o => o.id === objectiveId
      );
      if (objective) {
        score += objective.points;
      }
    }
    return score;
  }
}

// Export default level manager instance
export const levelManager = new LevelManager();