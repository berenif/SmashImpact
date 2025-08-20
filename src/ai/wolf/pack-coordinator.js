/**
 * Pack Coordination Module for Wolf AI
 * @module wolf/pack-coordinator
 */

import { WOLF_CONFIG, WolfRole } from './config.js';

/**
 * Pack formation types
 * @enum {string}
 */
export const PackFormation = {
    HUNT: 'hunt',           // Spread out to surround prey
    DEFENSIVE: 'defensive', // Tight formation for protection
    PINCER: 'pincer',      // Two groups flanking
    AMBUSH: 'ambush',      // Hidden positions
    SCATTER: 'scatter'     // Dispersed to avoid area attacks
};

/**
 * Pack tactics
 * @enum {string}
 */
export const PackTactic = {
    SURROUND: 'surround',
    DRIVE: 'drive',        // Drive prey toward ambush
    HARASS: 'harass',      // Hit and run attacks
    OVERWHELM: 'overwhelm', // All-out assault
    RETREAT: 'retreat'
};

/**
 * Coordinates wolf pack behavior
 * @class
 */
export class PackCoordinator {
    constructor() {
        this.packs = new Map();
        this.packIdCounter = 0;
        this.globalTactics = new Map();
    }

    /**
     * Create a new pack
     * @param {Array} wolves - Array of wolf instances
     * @returns {string} Pack ID
     */
    createPack(wolves) {
        const packId = `pack_${this.packIdCounter++}`;
        
        const pack = {
            id: packId,
            members: wolves,
            alpha: null,
            formation: PackFormation.HUNT,
            tactic: PackTactic.SURROUND,
            target: null,
            morale: 1.0,
            coordination: 0,
            lastHowl: 0
        };
        
        // Assign alpha (strongest/healthiest wolf)
        pack.alpha = this.selectAlpha(wolves);
        
        // Assign roles
        this.assignRoles(pack);
        
        // Store pack
        this.packs.set(packId, pack);
        
        // Update wolves with pack reference
        wolves.forEach(wolf => {
            wolf.packId = packId;
            wolf.pack = pack;
        });
        
        return packId;
    }

    /**
     * Select alpha wolf from pack
     * @param {Array} wolves - Array of wolves
     * @returns {Object} Alpha wolf
     */
    selectAlpha(wolves) {
        if (!wolves || wolves.length === 0) return null;
        
        // Score based on health, aggression, and experience
        let bestWolf = wolves[0];
        let bestScore = 0;
        
        for (const wolf of wolves) {
            const healthScore = wolf.health / wolf.maxHealth;
            const aggressionScore = wolf.aggression || 0.5;
            const experienceScore = wolf.kills ? wolf.kills * 0.1 : 0;
            
            const totalScore = healthScore + aggressionScore + experienceScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestWolf = wolf;
            }
        }
        
        bestWolf.role = WolfRole.ALPHA;
        return bestWolf;
    }

    /**
     * Assign roles to pack members
     * @param {Object} pack - Pack object
     */
    assignRoles(pack) {
        const members = pack.members.filter(w => w !== pack.alpha);
        const numMembers = members.length;
        
        if (numMembers === 0) return;
        
        // Distribute roles based on pack size
        if (numMembers === 1) {
            members[0].role = WolfRole.CHASER;
        } else if (numMembers === 2) {
            members[0].role = WolfRole.CHASER;
            members[1].role = WolfRole.FLANKER;
        } else if (numMembers === 3) {
            members[0].role = WolfRole.CHASER;
            members[1].role = WolfRole.FLANKER;
            members[2].role = WolfRole.FLANKER;
        } else {
            // Larger packs
            const roles = [
                WolfRole.CHASER,
                WolfRole.FLANKER,
                WolfRole.FLANKER,
                WolfRole.AMBUSHER,
                WolfRole.SUPPORT
            ];
            
            members.forEach((wolf, index) => {
                wolf.role = roles[index % roles.length];
            });
        }
    }

    /**
     * Update pack coordination
     * @param {string} packId - Pack ID
     * @param {number} deltaTime - Time since last update
     */
    updatePack(packId, deltaTime) {
        const pack = this.packs.get(packId);
        if (!pack) return;
        
        // Remove dead members
        pack.members = pack.members.filter(w => w.health > 0);
        
        if (pack.members.length === 0) {
            this.disbandPack(packId);
            return;
        }
        
        // Update alpha if needed
        if (!pack.alpha || pack.alpha.health <= 0) {
            pack.alpha = this.selectAlpha(pack.members);
            this.assignRoles(pack);
        }
        
        // Update morale
        this.updateMorale(pack);
        
        // Update coordination
        this.updateCoordination(pack, deltaTime);
        
        // Update tactics based on situation
        this.updateTactics(pack);
        
        // Coordinate actions
        this.coordinateActions(pack);
    }

    /**
     * Update pack morale
     * @param {Object} pack - Pack object
     */
    updateMorale(pack) {
        let morale = 1.0;
        
        // Size bonus
        morale += (pack.members.length - 1) * 0.1;
        
        // Health factor
        const avgHealth = pack.members.reduce((sum, w) => sum + w.health / w.maxHealth, 0) / pack.members.length;
        morale *= avgHealth;
        
        // Recent success/failure
        const recentKills = pack.members.reduce((sum, w) => sum + (w.recentKills || 0), 0);
        morale += recentKills * 0.15;
        
        // Alpha presence
        if (pack.alpha && pack.alpha.health > 0) {
            morale += 0.2;
        }
        
        pack.morale = Math.max(0.2, Math.min(1.5, morale));
    }

    /**
     * Update pack coordination level
     * @param {Object} pack - Pack object
     * @param {number} deltaTime - Time delta
     */
    updateCoordination(pack, deltaTime) {
        // Coordination increases over time when pack is together
        const center = this.getPackCenter(pack);
        let avgDistance = 0;
        
        for (const wolf of pack.members) {
            const dx = wolf.x - center.x;
            const dy = wolf.y - center.y;
            avgDistance += Math.sqrt(dx * dx + dy * dy);
        }
        avgDistance /= pack.members.length;
        
        if (avgDistance < WOLF_CONFIG.pack.MAX_PACK_DISTANCE) {
            pack.coordination = Math.min(1, pack.coordination + deltaTime * 0.001);
        } else {
            pack.coordination = Math.max(0, pack.coordination - deltaTime * 0.002);
        }
    }

    /**
     * Update pack tactics based on situation
     * @param {Object} pack - Pack object
     */
    updateTactics(pack) {
        if (!pack.target) {
            pack.tactic = PackTactic.SURROUND;
            pack.formation = PackFormation.HUNT;
            return;
        }
        
        const targetDistance = this.getDistanceToTarget(pack);
        const healthRatio = this.getPackHealthRatio(pack);
        
        // Retreat if heavily damaged
        if (healthRatio < 0.3) {
            pack.tactic = PackTactic.RETREAT;
            pack.formation = PackFormation.SCATTER;
            return;
        }
        
        // Choose tactic based on situation
        if (targetDistance > WOLF_CONFIG.detection.DETECTION_RANGE) {
            // Far from target - hunt formation
            pack.tactic = PackTactic.SURROUND;
            pack.formation = PackFormation.HUNT;
        } else if (targetDistance > WOLF_CONFIG.detection.ATTACK_RANGE * 2) {
            // Medium range - coordinate attack
            if (pack.coordination > 0.7) {
                pack.tactic = PackTactic.DRIVE;
                pack.formation = PackFormation.PINCER;
            } else {
                pack.tactic = PackTactic.HARASS;
                pack.formation = PackFormation.HUNT;
            }
        } else {
            // Close range - attack
            if (pack.morale > 1.0 && pack.members.length >= 3) {
                pack.tactic = PackTactic.OVERWHELM;
                pack.formation = PackFormation.HUNT;
            } else {
                pack.tactic = PackTactic.HARASS;
                pack.formation = PackFormation.DEFENSIVE;
            }
        }
    }

    /**
     * Coordinate pack member actions
     * @param {Object} pack - Pack object
     */
    coordinateActions(pack) {
        if (!pack.target) {
            this.coordinatePatrol(pack);
            return;
        }
        
        switch (pack.tactic) {
            case PackTactic.SURROUND:
                this.coordinateSurround(pack);
                break;
            case PackTactic.DRIVE:
                this.coordinateDrive(pack);
                break;
            case PackTactic.HARASS:
                this.coordinateHarass(pack);
                break;
            case PackTactic.OVERWHELM:
                this.coordinateOverwhelm(pack);
                break;
            case PackTactic.RETREAT:
                this.coordinateRetreat(pack);
                break;
        }
    }

    /**
     * Coordinate patrol behavior
     * @param {Object} pack - Pack object
     */
    coordinatePatrol(pack) {
        // Move in loose formation
        const leader = pack.alpha || pack.members[0];
        
        pack.members.forEach((wolf, index) => {
            if (wolf === leader) return;
            
            // Follow leader with offset
            const angle = (index / pack.members.length) * Math.PI * 2;
            const offset = {
                x: Math.cos(angle) * 3,
                y: Math.sin(angle) * 3
            };
            
            wolf.followTarget = {
                x: leader.x + offset.x,
                y: leader.y + offset.y
            };
        });
    }

    /**
     * Coordinate surround tactic
     * @param {Object} pack - Pack object
     */
    coordinateSurround(pack) {
        const angleStep = (Math.PI * 2) / pack.members.length;
        const radius = WOLF_CONFIG.detection.ATTACK_RANGE * 2;
        
        pack.members.forEach((wolf, index) => {
            const angle = angleStep * index;
            wolf.targetPosition = {
                x: pack.target.x + Math.cos(angle) * radius,
                y: pack.target.y + Math.sin(angle) * radius
            };
            wolf.maintainDistance = radius;
        });
    }

    /**
     * Coordinate drive tactic
     * @param {Object} pack - Pack object
     */
    coordinateDrive(pack) {
        // Split into drivers and ambushers
        const drivers = [];
        const ambushers = [];
        
        pack.members.forEach(wolf => {
            if (wolf.role === WolfRole.AMBUSHER || wolf.role === WolfRole.FLANKER) {
                ambushers.push(wolf);
            } else {
                drivers.push(wolf);
            }
        });
        
        // Position ambushers ahead of target
        if (pack.target.vx !== undefined && pack.target.vy !== undefined) {
            const predictX = pack.target.x + pack.target.vx * 5;
            const predictY = pack.target.y + pack.target.vy * 5;
            
            ambushers.forEach((wolf, index) => {
                const angle = (index / ambushers.length - 0.5) * Math.PI;
                wolf.targetPosition = {
                    x: predictX + Math.cos(angle) * 3,
                    y: predictY + Math.sin(angle) * 3
                };
                wolf.hideInAmbush = true;
            });
        }
        
        // Drivers chase from behind
        drivers.forEach(wolf => {
            wolf.targetPosition = pack.target;
            wolf.chaseMode = true;
        });
    }

    /**
     * Coordinate harass tactic
     * @param {Object} pack - Pack object
     */
    coordinateHarass(pack) {
        // Take turns attacking
        const attackInterval = 2000; // 2 seconds
        const currentTime = Date.now();
        
        pack.members.forEach((wolf, index) => {
            const wolfAttackTime = (currentTime + index * attackInterval) % (attackInterval * pack.members.length);
            
            if (wolfAttackTime < attackInterval) {
                // This wolf's turn to attack
                wolf.targetPosition = pack.target;
                wolf.aggressive = true;
            } else {
                // Circle and wait
                const angle = (index / pack.members.length) * Math.PI * 2;
                wolf.targetPosition = {
                    x: pack.target.x + Math.cos(angle) * 5,
                    y: pack.target.y + Math.sin(angle) * 5
                };
                wolf.aggressive = false;
            }
        });
    }

    /**
     * Coordinate overwhelm tactic
     * @param {Object} pack - Pack object
     */
    coordinateOverwhelm(pack) {
        // All wolves attack simultaneously
        pack.members.forEach(wolf => {
            wolf.targetPosition = pack.target;
            wolf.aggressive = true;
            wolf.sprintMode = true;
        });
        
        // Alpha leads the charge
        if (pack.alpha) {
            pack.alpha.damageBonus = 1.5;
        }
    }

    /**
     * Coordinate retreat
     * @param {Object} pack - Pack object
     */
    coordinateRetreat(pack) {
        const retreatPoint = this.findRetreatPoint(pack);
        
        pack.members.forEach(wolf => {
            wolf.targetPosition = retreatPoint;
            wolf.retreatMode = true;
            wolf.aggressive = false;
        });
        
        // Alpha covers retreat
        if (pack.alpha && pack.alpha.health > pack.alpha.maxHealth * 0.5) {
            pack.alpha.coverRetreat = true;
        }
    }

    /**
     * Get pack center position
     * @param {Object} pack - Pack object
     * @returns {Object} Center position
     */
    getPackCenter(pack) {
        if (pack.members.length === 0) return { x: 0, y: 0 };
        
        const sum = pack.members.reduce((acc, wolf) => ({
            x: acc.x + wolf.x,
            y: acc.y + wolf.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / pack.members.length,
            y: sum.y / pack.members.length
        };
    }

    /**
     * Get distance from pack center to target
     * @param {Object} pack - Pack object
     * @returns {number} Distance
     */
    getDistanceToTarget(pack) {
        if (!pack.target) return Infinity;
        
        const center = this.getPackCenter(pack);
        const dx = pack.target.x - center.x;
        const dy = pack.target.y - center.y;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get average health ratio of pack
     * @param {Object} pack - Pack object
     * @returns {number} Health ratio (0-1)
     */
    getPackHealthRatio(pack) {
        if (pack.members.length === 0) return 0;
        
        const totalRatio = pack.members.reduce((sum, wolf) => 
            sum + wolf.health / wolf.maxHealth, 0);
        
        return totalRatio / pack.members.length;
    }

    /**
     * Find safe retreat point
     * @param {Object} pack - Pack object
     * @returns {Object} Retreat position
     */
    findRetreatPoint(pack) {
        const center = this.getPackCenter(pack);
        
        if (pack.target) {
            // Retreat away from target
            const dx = center.x - pack.target.x;
            const dy = center.y - pack.target.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                return {
                    x: center.x + (dx / distance) * 10,
                    y: center.y + (dy / distance) * 10
                };
            }
        }
        
        // Default retreat position
        return {
            x: center.x + Math.random() * 10 - 5,
            y: center.y + Math.random() * 10 - 5
        };
    }

    /**
     * Trigger pack howl
     * @param {Object} pack - Pack object
     */
    triggerHowl(pack) {
        const currentTime = Date.now();
        
        if (currentTime - pack.lastHowl < WOLF_CONFIG.timings.HOWL_COOLDOWN) {
            return false;
        }
        
        pack.lastHowl = currentTime;
        
        // Alpha howls first
        if (pack.alpha) {
            pack.alpha.startHowl();
        }
        
        // Others join in sequence
        pack.members.forEach((wolf, index) => {
            if (wolf !== pack.alpha) {
                setTimeout(() => wolf.startHowl(), index * 200);
            }
        });
        
        // Boost morale
        pack.morale = Math.min(1.5, pack.morale + 0.3);
        
        return true;
    }

    /**
     * Disband a pack
     * @param {string} packId - Pack ID
     */
    disbandPack(packId) {
        const pack = this.packs.get(packId);
        if (!pack) return;
        
        // Clear pack references from wolves
        pack.members.forEach(wolf => {
            wolf.packId = null;
            wolf.pack = null;
            wolf.role = WolfRole.SUPPORT;
        });
        
        this.packs.delete(packId);
    }

    /**
     * Get pack by ID
     * @param {string} packId - Pack ID
     * @returns {Object|null} Pack object
     */
    getPack(packId) {
        return this.packs.get(packId) || null;
    }

    /**
     * Get all packs
     * @returns {Array} Array of packs
     */
    getAllPacks() {
        return Array.from(this.packs.values());
    }

    /**
     * Merge two packs
     * @param {string} packId1 - First pack ID
     * @param {string} packId2 - Second pack ID
     * @returns {string|null} Merged pack ID
     */
    mergePacks(packId1, packId2) {
        const pack1 = this.packs.get(packId1);
        const pack2 = this.packs.get(packId2);
        
        if (!pack1 || !pack2) return null;
        
        // Merge members
        const allMembers = [...pack1.members, ...pack2.members];
        
        // Disband old packs
        this.disbandPack(packId1);
        this.disbandPack(packId2);
        
        // Create new pack
        return this.createPack(allMembers);
    }
}