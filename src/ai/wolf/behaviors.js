/**
 * Wolf AI Behavior Module
 * @module wolf/behaviors
 */

import { WOLF_CONFIG, WolfState } from './config.js';

/**
 * Collection of wolf behavior functions
 * @class
 */
export class WolfBehaviors {
    /**
     * @param {Object} wolf - Wolf instance
     */
    constructor(wolf) {
        this.wolf = wolf;
    }

    /**
     * Calculate aggression level based on various factors
     * @param {Object} factors - Factors affecting aggression
     * @returns {number} Aggression level (0-1)
     */
    calculateAggression(factors = {}) {
        let aggression = WOLF_CONFIG.ai.AGGRESSION_BASE;
        
        // Pack confidence
        if (factors.packSize) {
            aggression += WOLF_CONFIG.ai.PACK_CONFIDENCE_BONUS * (factors.packSize - 1);
        }
        
        // Health factor
        const healthPercent = this.wolf.health / this.wolf.maxHealth;
        if (healthPercent < WOLF_CONFIG.combat.CRITICAL_HEALTH_PERCENT) {
            aggression -= WOLF_CONFIG.ai.INJURED_AGGRESSION_PENALTY;
        }
        
        // Player threat level
        if (factors.playerThreat) {
            aggression *= factors.playerThreat;
        }
        
        // Environmental factors
        if (factors.isNight) {
            aggression += 0.1;
        }
        
        if (factors.inTerritory) {
            aggression += 0.15;
        }
        
        return Math.max(0, Math.min(1, aggression));
    }

    /**
     * Patrol behavior - move along predetermined paths
     * @param {Array} patrolPath - Array of waypoints
     * @returns {Object} Movement vector
     */
    patrol(patrolPath) {
        if (!patrolPath || patrolPath.length === 0) {
            return { vx: 0, vy: 0 };
        }
        
        const target = patrolPath[this.wolf.currentPathIndex || 0];
        const dx = target.x - this.wolf.x;
        const dy = target.y - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.5) {
            // Reached waypoint, move to next
            this.wolf.currentPathIndex = (this.wolf.currentPathIndex + 1) % patrolPath.length;
        }
        
        const speed = WOLF_CONFIG.movement.PATROL_SPEED;
        return {
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        };
    }

    /**
     * Stalking behavior - slowly approach target
     * @param {Object} target - Target to stalk
     * @returns {Object} Movement vector
     */
    stalk(target) {
        if (!target) return { vx: 0, vy: 0 };
        
        const dx = target.x - this.wolf.x;
        const dy = target.y - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Maintain optimal stalking distance
        const optimalDistance = WOLF_CONFIG.detection.DETECTION_RANGE * 0.6;
        let speed = WOLF_CONFIG.movement.STEALTH_SPEED;
        
        if (distance < optimalDistance) {
            // Too close, slow down or stop
            speed *= 0.3;
        }
        
        // Add slight zigzag pattern for realism
        const zigzag = Math.sin(Date.now() * 0.001) * 0.2;
        
        return {
            vx: (dx / distance) * speed + zigzag * (-dy / distance),
            vy: (dy / distance) * speed + zigzag * (dx / distance)
        };
    }

    /**
     * Chase behavior - direct pursuit at high speed
     * @param {Object} target - Target to chase
     * @param {Object} options - Chase options
     * @returns {Object} Movement vector
     */
    chase(target, options = {}) {
        if (!target) return { vx: 0, vy: 0 };
        
        const dx = target.x - this.wolf.x;
        const dy = target.y - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        let speed = WOLF_CONFIG.movement.SPRINT_SPEED;
        
        // Predict target movement
        if (target.vx !== undefined && target.vy !== undefined) {
            const prediction = options.predictionTime || 0.5;
            const predictedX = target.x + target.vx * prediction;
            const predictedY = target.y + target.vy * prediction;
            
            const pdx = predictedX - this.wolf.x;
            const pdy = predictedY - this.wolf.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            
            return {
                vx: (pdx / pdist) * speed,
                vy: (pdy / pdist) * speed
            };
        }
        
        return {
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        };
    }

    /**
     * Flanking behavior - circle around to cut off target
     * @param {Object} target - Target to flank
     * @param {string} direction - 'left' or 'right'
     * @returns {Object} Movement vector
     */
    flank(target, direction = 'left') {
        if (!target) return { vx: 0, vy: 0 };
        
        const dx = target.x - this.wolf.x;
        const dy = target.y - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate perpendicular vector for flanking
        const perpX = -dy / distance;
        const perpY = dx / distance;
        
        const flankDirection = direction === 'left' ? 1 : -1;
        const flankAngle = WOLF_CONFIG.pack.FLANKING_ANGLE * Math.PI / 180;
        
        // Combine forward and perpendicular movement
        const forwardWeight = Math.cos(flankAngle);
        const sideWeight = Math.sin(flankAngle) * flankDirection;
        
        const speed = WOLF_CONFIG.movement.SPRINT_SPEED * 0.9;
        
        return {
            vx: ((dx / distance) * forwardWeight + perpX * sideWeight) * speed,
            vy: ((dy / distance) * forwardWeight + perpY * sideWeight) * speed
        };
    }

    /**
     * Ambush behavior - wait hidden then pounce
     * @param {Object} target - Target to ambush
     * @param {Object} ambushSpot - Position to hide
     * @returns {Object} Movement vector or null if waiting
     */
    ambush(target, ambushSpot) {
        if (!ambushSpot) return { vx: 0, vy: 0 };
        
        // Move to ambush spot if not there yet
        const spotDx = ambushSpot.x - this.wolf.x;
        const spotDy = ambushSpot.y - this.wolf.y;
        const spotDistance = Math.sqrt(spotDx * spotDx + spotDy * spotDy);
        
        if (spotDistance > 0.5) {
            // Still moving to ambush position
            const speed = WOLF_CONFIG.movement.STEALTH_SPEED;
            return {
                vx: (spotDx / spotDistance) * speed,
                vy: (spotDy / spotDistance) * speed
            };
        }
        
        // In position, check if target is close enough
        if (target) {
            const targetDx = target.x - this.wolf.x;
            const targetDy = target.y - this.wolf.y;
            const targetDistance = Math.sqrt(targetDx * targetDx + targetDy * targetDy);
            
            if (targetDistance < WOLF_CONFIG.detection.AMBUSH_DETECTION_RANGE) {
                // Pounce!
                const speed = WOLF_CONFIG.movement.SPRINT_SPEED * 1.2;
                return {
                    vx: (targetDx / targetDistance) * speed,
                    vy: (targetDy / targetDistance) * speed
                };
            }
        }
        
        // Wait in ambush
        return { vx: 0, vy: 0 };
    }

    /**
     * Retreat behavior - move away from threats
     * @param {Object} threat - Threat to retreat from
     * @param {Object} options - Retreat options
     * @returns {Object} Movement vector
     */
    retreat(threat, options = {}) {
        if (!threat) {
            // Random retreat direction
            const angle = Math.random() * Math.PI * 2;
            const speed = WOLF_CONFIG.movement.BASE_SPEED;
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            };
        }
        
        const dx = this.wolf.x - threat.x;
        const dy = this.wolf.y - threat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 0.1) {
            // Too close, emergency evasion
            const angle = Math.random() * Math.PI * 2;
            const speed = WOLF_CONFIG.movement.SPRINT_SPEED;
            return {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed
            };
        }
        
        let speed = WOLF_CONFIG.movement.BASE_SPEED;
        
        // Zigzag retreat if specified
        if (options.zigzag) {
            const zigzagAmount = Math.sin(Date.now() * 0.003) * 0.3;
            return {
                vx: (dx / distance) * speed + zigzagAmount * (-dy / distance),
                vy: (dy / distance) * speed + zigzagAmount * (dx / distance)
            };
        }
        
        return {
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        };
    }

    /**
     * Regroup behavior - move towards pack center
     * @param {Array} packMembers - Array of pack members
     * @returns {Object} Movement vector
     */
    regroup(packMembers) {
        if (!packMembers || packMembers.length === 0) {
            return { vx: 0, vy: 0 };
        }
        
        // Calculate pack center
        let centerX = 0;
        let centerY = 0;
        let count = 0;
        
        for (const member of packMembers) {
            if (member.id !== this.wolf.id && member.health > 0) {
                centerX += member.x;
                centerY += member.y;
                count++;
            }
        }
        
        if (count === 0) {
            return { vx: 0, vy: 0 };
        }
        
        centerX /= count;
        centerY /= count;
        
        const dx = centerX - this.wolf.x;
        const dy = centerY - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < WOLF_CONFIG.pack.MIN_PACK_DISTANCE) {
            // Close enough
            return { vx: 0, vy: 0 };
        }
        
        const speed = WOLF_CONFIG.movement.BASE_SPEED;
        return {
            vx: (dx / distance) * speed,
            vy: (dy / distance) * speed
        };
    }

    /**
     * Circle behavior - circle around a point
     * @param {Object} center - Center point to circle
     * @param {number} radius - Circle radius
     * @param {string} direction - 'clockwise' or 'counter-clockwise'
     * @returns {Object} Movement vector
     */
    circle(center, radius, direction = 'clockwise') {
        if (!center) return { vx: 0, vy: 0 };
        
        const dx = center.x - this.wolf.x;
        const dy = center.y - this.wolf.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate tangent vector
        const tangentX = -dy / distance;
        const tangentY = dx / distance;
        
        const dir = direction === 'clockwise' ? 1 : -1;
        
        // Adjust for maintaining radius
        let radialComponent = 0;
        if (distance > radius * 1.1) {
            radialComponent = 0.3; // Move inward
        } else if (distance < radius * 0.9) {
            radialComponent = -0.3; // Move outward
        }
        
        const speed = WOLF_CONFIG.movement.BASE_SPEED;
        
        return {
            vx: (tangentX * dir * 0.7 + (dx / distance) * radialComponent) * speed,
            vy: (tangentY * dir * 0.7 + (dy / distance) * radialComponent) * speed
        };
    }

    /**
     * Find good ambush position
     * @param {Object} target - Target to ambush
     * @param {Array} obstacles - Array of obstacles
     * @returns {Object|null} Ambush position or null
     */
    findAmbushPosition(target, obstacles = []) {
        if (!target) return null;
        
        const candidates = [];
        const searchRadius = WOLF_CONFIG.detection.DETECTION_RANGE;
        
        // Check positions around the target's predicted path
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const distance = WOLF_CONFIG.detection.AMBUSH_DETECTION_RANGE * 1.5;
            const x = target.x + Math.cos(angle) * distance;
            const y = target.y + Math.sin(angle) * distance;
            
            // Check if position is hidden by obstacles
            let hidden = false;
            for (const obstacle of obstacles) {
                if (this.isPositionHidden({ x, y }, target, obstacle)) {
                    hidden = true;
                    break;
                }
            }
            
            if (hidden) {
                candidates.push({ x, y, score: Math.random() });
            }
        }
        
        // Return best candidate
        if (candidates.length > 0) {
            candidates.sort((a, b) => b.score - a.score);
            return candidates[0];
        }
        
        return null;
    }

    /**
     * Check if position is hidden from target by obstacle
     * @param {Object} position - Position to check
     * @param {Object} target - Target to hide from
     * @param {Object} obstacle - Obstacle to hide behind
     * @returns {boolean} True if hidden
     */
    isPositionHidden(position, target, obstacle) {
        // Simple line-of-sight check
        const dx = target.x - position.x;
        const dy = target.y - position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if obstacle is between position and target
        const steps = Math.ceil(distance);
        for (let i = 1; i < steps; i++) {
            const t = i / steps;
            const checkX = position.x + dx * t;
            const checkY = position.y + dy * t;
            
            if (this.pointInObstacle(checkX, checkY, obstacle)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if point is inside obstacle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} obstacle - Obstacle object
     * @returns {boolean} True if inside obstacle
     */
    pointInObstacle(x, y, obstacle) {
        const halfWidth = obstacle.width / 2;
        const halfHeight = obstacle.height / 2;
        
        return x >= obstacle.x - halfWidth &&
               x <= obstacle.x + halfWidth &&
               y >= obstacle.y - halfHeight &&
               y <= obstacle.y + halfHeight;
    }

    /**
     * Calculate threat level of a target
     * @param {Object} target - Target to evaluate
     * @returns {number} Threat level (0-1)
     */
    calculateThreatLevel(target) {
        if (!target) return 0;
        
        let threat = 0.5;
        
        // Distance factor
        const distance = Math.sqrt(
            Math.pow(target.x - this.wolf.x, 2) +
            Math.pow(target.y - this.wolf.y, 2)
        );
        
        if (distance < WOLF_CONFIG.detection.ATTACK_RANGE) {
            threat += 0.3;
        } else if (distance < WOLF_CONFIG.detection.DETECTION_RANGE) {
            threat += 0.1;
        }
        
        // Target health/strength
        if (target.health !== undefined) {
            const healthRatio = target.health / (target.maxHealth || 100);
            threat += healthRatio * 0.2;
        }
        
        // Target weapons/abilities
        if (target.damage) {
            threat += Math.min(target.damage / 20, 0.3);
        }
        
        return Math.min(1, threat);
    }
}