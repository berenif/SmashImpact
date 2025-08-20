/**
 * Wolf AI Configuration Module
 * @module wolf/config
 */

export const WOLF_CONFIG = {
    // Movement and detection
    movement: {
        BASE_SPEED: 2.5,
        SPRINT_SPEED: 4.0,
        STEALTH_SPEED: 1.2,
        PATROL_SPEED: 1.5
    },
    
    detection: {
        DETECTION_RANGE: 8,
        AMBUSH_DETECTION_RANGE: 3,
        ATTACK_RANGE: 1.5,
        COORDINATION_RANGE: 12
    },
    
    // Behavior timings (in milliseconds)
    timings: {
        RETREAT_DURATION: 2000,
        AMBUSH_PATIENCE: 5000,
        HOWL_COOLDOWN: 10000,
        ATTACK_COOLDOWN: 1500
    },
    
    // Pack coordination
    pack: {
        MAX_PACK_SIZE: 5,
        FLANKING_ANGLE: 45, // degrees
        MIN_PACK_DISTANCE: 2,
        MAX_PACK_DISTANCE: 10
    },
    
    // Health and damage
    combat: {
        HEALTH: 40,
        DAMAGE: 12,
        CRITICAL_HEALTH_PERCENT: 0.3,
        CRITICAL_DAMAGE_MULTIPLIER: 1.5
    },
    
    // AI decision weights
    ai: {
        AGGRESSION_BASE: 0.5,
        PACK_CONFIDENCE_BONUS: 0.15, // per pack member
        INJURED_AGGRESSION_PENALTY: 0.3,
        PLAYER_THREAT_WEIGHT: 1.0,
        HEALTH_WEIGHT: 0.5
    }
};

/**
 * Wolf states for state machine
 * @enum {string}
 */
export const WolfState = {
    IDLE: 'idle',
    PATROL: 'patrol',
    STALKING: 'stalking',
    AMBUSH: 'ambush',
    CHASING: 'chasing',
    FLANKING: 'flanking',
    ATTACKING: 'attacking',
    RETREATING: 'retreating',
    HOWLING: 'howling',
    REGROUPING: 'regrouping',
    DEAD: 'dead'
};

/**
 * Wolf roles in pack
 * @enum {string}
 */
export const WolfRole = {
    ALPHA: 'alpha',        // Leader, coordinates pack
    CHASER: 'chaser',      // Direct pursuit
    FLANKER: 'flanker',    // Circle around for cutoff
    AMBUSHER: 'ambusher',  // Hide and wait
    SUPPORT: 'support'     // Flexible role
};

/**
 * Get scaled config values based on difficulty or wave number
 * @param {number} scaling - Scaling factor
 * @returns {Object} Scaled configuration
 */
export function getScaledConfig(scaling = 1.0) {
    return {
        movement: {
            ...WOLF_CONFIG.movement,
            BASE_SPEED: WOLF_CONFIG.movement.BASE_SPEED * scaling,
            SPRINT_SPEED: WOLF_CONFIG.movement.SPRINT_SPEED * scaling
        },
        combat: {
            ...WOLF_CONFIG.combat,
            HEALTH: WOLF_CONFIG.combat.HEALTH * scaling,
            DAMAGE: WOLF_CONFIG.combat.DAMAGE * scaling
        }
    };
}