/**
 * Wolf Entity Module
 * @module wolf/wolf
 */

import { WOLF_CONFIG, WolfState, WolfRole } from './config.js';
import { MazePathfinder } from './pathfinding.js';
import { WolfStateMachine } from './state-machine.js';
import { WolfBehaviors } from './behaviors.js';

/**
 * Wolf entity class
 * @class
 */
export class Wolf {
    /**
     * Create a new Wolf instance
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {string} id - Unique wolf ID
     * @param {Object} gameState - Game state reference
     */
    constructor(x, y, id, gameState = {}) {
        // Position and movement
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.rotation = 0;
        this.id = id;
        
        // Health and combat
        this.maxHealth = WOLF_CONFIG.combat.HEALTH;
        this.health = this.maxHealth;
        this.damage = WOLF_CONFIG.combat.DAMAGE;
        this.lastAttackTime = 0;
        this.attackCooldown = WOLF_CONFIG.timings.ATTACK_COOLDOWN;
        
        // AI properties
        this.aggression = WOLF_CONFIG.ai.AGGRESSION_BASE;
        this.alertLevel = 0;
        this.target = null;
        this.lastTargetPosition = null;
        
        // Pack properties
        this.packId = null;
        this.pack = null;
        this.role = WolfRole.SUPPORT;
        
        // Game state reference
        this.gameState = gameState;
        
        // Initialize modules
        this.pathfinder = new MazePathfinder(
            gameState.gridWidth || 25,
            gameState.gridHeight || 25,
            gameState.obstacles || []
        );
        
        this.stateMachine = new WolfStateMachine(WolfState.IDLE, this);
        this.behaviors = new WolfBehaviors(this);
        
        // Path and movement
        this.currentPath = [];
        this.currentPathIndex = 0;
        this.patrolPath = [];
        this.retreatPath = [];
        
        // Animation
        this.animationPhase = 0;
        this.eyeGlow = 0;
        
        // Statistics
        this.kills = 0;
        this.recentKills = 0;
        this.distanceTraveled = 0;
        this.timeAlive = 0;
        
        // Flags and states
        this.isStealthMode = false;
        this.isSprintMode = false;
        this.isRetreating = false;
        this.isHowling = false;
        this.ambushSpot = null;
        this.flankDirection = 'left';
        
        // Timers
        this.stateTimer = 0;
        this.howlCooldown = 0;
        this.retreatTimer = 0;
        this.lungeCooldown = 0;
        
        // Animation states
        this.wasHurt = false;
        this.isStunned = false;
        this.lungeComplete = false;
        this.deathAnimationProgress = 0;
        this.hurtAnimationProgress = 0;
        this.stunAnimationProgress = 0;
        
        // Lunge properties
        this.lungeStartPosition = null;
        this.lungeTargetPosition = null;
        this.lungeStartTime = null;
    }

    /**
     * Update wolf state
     * @param {number} deltaTime - Time since last update (ms)
     * @param {Array} players - Array of player objects
     * @param {Array} wolves - Array of other wolves
     */
    update(deltaTime, players = [], wolves = []) {
        // Update timers
        this.timeAlive += deltaTime;
        this.stateTimer += deltaTime;
        
        if (this.howlCooldown > 0) {
            this.howlCooldown -= deltaTime;
        }
        
        if (this.retreatTimer > 0) {
            this.retreatTimer -= deltaTime;
        }
        
        if (this.lungeCooldown > 0) {
            this.lungeCooldown -= deltaTime;
        }
        
        // Update state machine
        this.stateMachine.update(deltaTime);
        
        // Execute behavior based on current state
        this.executeBehavior(deltaTime, players, wolves);
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update aggression
        this.updateAggression(players, wolves);
    }

    /**
     * Execute behavior based on current state
     * @param {number} deltaTime - Delta time
     * @param {Array} players - Players array
     * @param {Array} wolves - Wolves array
     */
    executeBehavior(deltaTime, players, wolves) {
        const state = this.stateMachine.getState();
        let movement = { vx: 0, vy: 0 };
        
        switch (state) {
            case WolfState.IDLE:
                // Look for targets
                this.scanForTargets(players);
                break;
                
            case WolfState.PATROL:
                movement = this.behaviors.patrol(this.patrolPath);
                this.scanForTargets(players);
                break;
                
            case WolfState.STALKING:
                if (this.target) {
                    movement = this.behaviors.stalk(this.target);
                }
                break;
                
            case WolfState.CHASING:
                if (this.target) {
                    movement = this.behaviors.chase(this.target);
                }
                break;
                
            case WolfState.FLANKING:
                if (this.target) {
                    movement = this.behaviors.flank(this.target, this.flankDirection);
                }
                break;
                
            case WolfState.ATTACKING:
                this.performAttack();
                break;
                
            case WolfState.LUNGING:
                if (this.target) {
                    movement = this.behaviors.lunge(this.target);
                    // Check for collision with target during lunge
                    if (movement && movement.isLunging && movement.progress > 0.3) {
                        this.checkLungeHit();
                    }
                    if (movement && movement.progress >= 1) {
                        this.lungeComplete = true;
                    }
                }
                break;
                
            case WolfState.HURT:
                // Knockback effect
                if (this.hurtKnockback) {
                    movement = this.hurtKnockback;
                    this.hurtKnockback.vx *= 0.9;
                    this.hurtKnockback.vy *= 0.9;
                }
                break;
                
            case WolfState.STUNNED:
                // No movement when stunned
                movement = { vx: 0, vy: 0 };
                break;
                
            case WolfState.DYING:
                // Slow down movement during death animation
                movement = { vx: this.vx * 0.8, vy: this.vy * 0.8 };
                break;
                
            case WolfState.RETREATING:
                movement = this.behaviors.retreat(this.target, { zigzag: true });
                break;
                
            case WolfState.AMBUSH:
                movement = this.behaviors.ambush(this.target, this.ambushSpot);
                break;
                
            case WolfState.HOWLING:
                this.performHowl();
                break;
                
            case WolfState.REGROUPING:
                if (this.pack) {
                    movement = this.behaviors.regroup(this.pack.members);
                }
                break;
        }
        
        // Apply movement
        this.vx = movement.vx;
        this.vy = movement.vy;
    }

    /**
     * Update position based on velocity
     * @param {number} deltaTime - Delta time
     */
    updatePosition(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        // Store old position
        const oldX = this.x;
        const oldY = this.y;
        
        // Update position
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Check collision
        const collidedObstacle = this.checkCollision();
        if (collidedObstacle) {
            // Revert position
            this.x = oldX;
            this.y = oldY;
            
            // Try to slide along the specific obstacle that was hit
            this.slideAlongObstacle(collidedObstacle);
        }
        
        // Update rotation based on movement
        if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
            this.rotation = Math.atan2(this.vy, this.vx);
        }
        
        // Track distance traveled
        const dx = this.x - oldX;
        const dy = this.y - oldY;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check collision with obstacles
     * @returns {Object|null} The obstacle that was collided with, or null if no collision
     */
    checkCollision() {
        if (!this.gameState.obstacles) return null;
        
        for (const obstacle of this.gameState.obstacles) {
            if (this.behaviors.pointInObstacle(this.x, this.y, obstacle)) {
                return obstacle;
            }
        }
        
        return null;
    }

    /**
     * Try to slide along obstacle
     * @param {Object} obstacle - The obstacle to slide along
     */
    slideAlongObstacle(obstacle) {
        // Try horizontal movement only
        const testX = this.x + this.vx * 0.016;
        if (!this.behaviors.pointInObstacle(testX, this.y, obstacle)) {
            this.x = testX;
            this.vy = 0;
            return;
        }
        
        // Try vertical movement only
        const testY = this.y + this.vy * 0.016;
        if (!this.behaviors.pointInObstacle(this.x, testY, obstacle)) {
            this.y = testY;
            this.vx = 0;
            return;
        }
        
        // Can't move
        this.vx = 0;
        this.vy = 0;
    }

    /**
     * Update animation phase
     * @param {number} deltaTime - Delta time
     */
    updateAnimation(deltaTime) {
        // Update animation phase based on movement
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.animationPhase += speed * deltaTime * 0.01;
        
        // Update eye glow based on state
        const targetGlow = this.getTargetEyeGlow();
        this.eyeGlow += (targetGlow - this.eyeGlow) * 0.1;
        
        // Update animation progress
        if (this.stateMachine.isInState(WolfState.HURT)) {
            this.hurtAnimationProgress = Math.min(1, this.hurtAnimationProgress + deltaTime / WOLF_CONFIG.timings.HURT_DURATION);
        }
        
        if (this.stateMachine.isInState(WolfState.STUNNED)) {
            this.stunAnimationProgress = Math.min(1, this.stunAnimationProgress + deltaTime / WOLF_CONFIG.timings.STUN_DURATION);
        }
        
        if (this.stateMachine.isInState(WolfState.DYING)) {
            this.deathAnimationProgress = Math.min(1, this.deathAnimationProgress + deltaTime / WOLF_CONFIG.timings.DEATH_ANIMATION_DURATION);
        }
    }

    /**
     * Get target eye glow based on state
     * @returns {number} Eye glow intensity (0-1)
     */
    getTargetEyeGlow() {
        switch (this.stateMachine.getState()) {
            case WolfState.STALKING:
                return 0.3;
            case WolfState.CHASING:
            case WolfState.ATTACKING:
            case WolfState.LUNGING:
                return 1.0;
            case WolfState.HOWLING:
                return 0.7;
            case WolfState.AMBUSH:
                return 0.1;
            case WolfState.STUNNED:
                return 0.5 + Math.sin(Date.now() * 0.01) * 0.5; // Pulsing effect
            default:
                return 0;
        }
    }

    /**
     * Update aggression level
     * @param {Array} players - Players array
     * @param {Array} wolves - Wolves array
     */
    updateAggression(players, wolves) {
        const factors = {
            packSize: wolves.filter(w => w.packId === this.packId).length,
            playerThreat: this.target ? this.behaviors.calculateThreatLevel(this.target) : 0,
            isNight: this.gameState.isNight || false,
            inTerritory: this.gameState.inWolfTerritory || false
        };
        
        this.aggression = this.behaviors.calculateAggression(factors);
    }

    /**
     * Scan for targets
     * @param {Array} players - Players to scan
     */
    scanForTargets(players) {
        let nearestTarget = null;
        let nearestDistance = WOLF_CONFIG.detection.DETECTION_RANGE;
        
        for (const player of players) {
            if (player.health <= 0) continue;
            
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestTarget = player;
            }
        }
        
        if (nearestTarget) {
            this.target = nearestTarget;
            this.lastTargetPosition = { x: nearestTarget.x, y: nearestTarget.y };
            this.alertLevel = Math.min(1, this.alertLevel + 0.1);
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - 0.05);
        }
    }

    /**
     * Check if should perform lunge attack
     * @returns {boolean}
     */
    shouldLunge() {
        if (!this.target || this.lungeCooldown > 0) return false;
        
        const distance = this.getDistanceTo(this.target);
        return distance > WOLF_CONFIG.detection.ATTACK_RANGE && 
               distance <= WOLF_CONFIG.movement.LUNGE_DISTANCE &&
               this.aggression > 0.6 &&
               Math.random() < 0.3; // 30% chance when conditions are met
    }
    
    /**
     * Start lunge attack
     */
    startLunge() {
        this.lungeComplete = false;
        this.lungeCooldown = WOLF_CONFIG.timings.LUNGE_COOLDOWN;
        
        // Play lunge sound if available
        if (this.gameState.playSound) {
            this.gameState.playSound('wolf_growl');
        }
    }
    
    /**
     * End lunge attack
     */
    endLunge() {
        this.lungeStartPosition = null;
        this.lungeTargetPosition = null;
        this.lungeStartTime = null;
        this.lungeComplete = false;
    }
    
    /**
     * Check if lunge hits the target
     */
    checkLungeHit() {
        if (!this.target || this.lastAttackTime + 200 > Date.now()) return;
        
        const distance = this.getDistanceTo(this.target);
        if (distance <= WOLF_CONFIG.detection.ATTACK_RANGE * 1.5) {
            // Check if player is blocking
            let damage = WOLF_CONFIG.combat.LUNGE_DAMAGE;
            let blocked = false;
            
            if (this.target.isBlocking && this.target.isBlocking()) {
                // Player blocked the lunge
                blocked = true;
                
                // Check for perfect parry
                if (this.target.isPerfectParry && this.target.isPerfectParry()) {
                    // Perfect parry - wolf gets stunned
                    this.isStunned = true;
                    this.stunAnimationProgress = 0;
                    damage = 0;
                    
                    // Create parry effect
                    this.createDamageEffect('parry');
                    
                    // Play parry sound
                    if (this.gameState.playSound) {
                        this.gameState.playSound('perfect_parry');
                    }
                } else {
                    // Normal block - reduced damage
                    damage *= 0.3;
                    
                    // Create block effect
                    this.createDamageEffect('block');
                }
            }
            
            if (!blocked || damage > 0) {
                // Apply damage and knockback
                if (this.target.takeDamage) {
                    this.target.takeDamage(damage);
                } else {
                    this.target.health -= damage;
                }
                
                // Apply knockback
                if (this.target.applyKnockback) {
                    const dx = this.target.x - this.x;
                    const dy = this.target.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    this.target.applyKnockback({
                        vx: (dx / dist) * WOLF_CONFIG.combat.LUNGE_KNOCKBACK,
                        vy: (dy / dist) * WOLF_CONFIG.combat.LUNGE_KNOCKBACK
                    });
                }
            }
            
            this.lastAttackTime = Date.now();
        }
    }
    
    /**
     * Perform attack
     */
    performAttack() {
        if (!this.target || Date.now() - this.lastAttackTime < this.attackCooldown) {
            return;
        }
        
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= WOLF_CONFIG.detection.ATTACK_RANGE) {
            // Deal damage
            let damage = this.damage;
            
            // Critical hit chance
            if (Math.random() < 0.2) {
                damage *= WOLF_CONFIG.combat.CRITICAL_DAMAGE_MULTIPLIER;
                this.createDamageEffect('critical');
            }
            
            // Apply damage
            if (this.target.takeDamage) {
                this.target.takeDamage(damage);
            } else {
                this.target.health -= damage;
            }
            
            this.lastAttackTime = Date.now();
            
            // Check if target died
            if (this.target.health <= 0) {
                this.kills++;
                this.recentKills++;
                this.target = null;
            }
        }
    }

    /**
     * Perform howl
     */
    performHowl() {
        if (this.howlCooldown > 0) return;
        
        this.isHowling = true;
        this.howlCooldown = WOLF_CONFIG.timings.HOWL_COOLDOWN;
        
        // Play howl sound
        if (this.gameState.playSound) {
            this.gameState.playSound('wolf_howl');
        }
        
        // Alert nearby wolves
        if (this.gameState.wolves) {
            const nearbyWolves = this.gameState.wolves.filter(w => {
                if (w === this) return false;
                const dx = w.x - this.x;
                const dy = w.y - this.y;
                return Math.sqrt(dx * dx + dy * dy) < WOLF_CONFIG.pack.COORDINATION_RANGE;
            });
            
            nearbyWolves.forEach(w => w.respondToHowl(this));
        }
    }

    /**
     * Respond to another wolf's howl
     * @param {Wolf} howler - The wolf that howled
     */
    respondToHowl(howler) {
        this.alertLevel = 1;
        
        // Join pack if not in one
        if (!this.packId && howler.packId) {
            this.packId = howler.packId;
            this.pack = howler.pack;
        }
        
        // Move toward howler if far
        const dx = howler.x - this.x;
        const dy = howler.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > WOLF_CONFIG.pack.MAX_PACK_DISTANCE) {
            this.stateMachine.transitionTo(WolfState.REGROUPING);
        }
    }

    /**
     * Take damage
     * @param {number} amount - Damage amount
     * @param {Object} options - Damage options (e.g., from blocking)
     */
    takeDamage(amount, options = {}) {
        this.health = Math.max(0, this.health - amount);
        
        // Set hurt flag for state machine
        this.wasHurt = true;
        this.hurtAnimationProgress = 0;
        
        // Apply knockback if provided
        if (options.knockback) {
            this.hurtKnockback = {
                vx: options.knockback.vx || 0,
                vy: options.knockback.vy || 0
            };
        }
        
        // Create damage effect
        this.createDamageEffect('hit');
        
        // Play hurt sound
        if (this.gameState.playSound) {
            this.gameState.playSound('wolf_hurt');
        }
        
        // Check if should retreat
        if (this.health < this.maxHealth * WOLF_CONFIG.combat.CRITICAL_HEALTH_PERCENT) {
            if (Math.random() < 0.5) {
                this.stateMachine.transitionTo(WolfState.RETREATING);
                this.retreatTimer = WOLF_CONFIG.timings.RETREAT_DURATION;
            }
        }
        
        // Death
        if (this.health <= 0) {
            this.playDeathAnimation();
        }
    }
    
    /**
     * Play hurt animation
     */
    playHurtAnimation() {
        this.hurtAnimationProgress = 0;
        // Flash red
        this.createDamageEffect('hurt');
    }
    
    /**
     * Play stunned animation
     */
    playStunnedAnimation() {
        this.stunAnimationProgress = 0;
        // Create stun stars effect
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            if (this.gameState.particles) {
                this.gameState.particles.push({
                    x: this.x,
                    y: this.y - 20,
                    vx: Math.cos(angle) * 2,
                    vy: Math.sin(angle) * 2 - 1,
                    color: '#ffff00',
                    life: 1000,
                    size: 3,
                    type: 'star'
                });
            }
        }
    }
    
    /**
     * Play death animation
     */
    playDeathAnimation() {
        this.deathAnimationProgress = 0;
        // Create death effect
        this.createDamageEffect('death');
        
        // Play death sound
        if (this.gameState.playSound) {
            this.gameState.playSound('wolf_death');
        }
    }

    /**
     * Handle death
     */
    onDeath() {
        // Remove from pack
        if (this.pack) {
            this.pack.members = this.pack.members.filter(w => w !== this);
        }
    }

    /**
     * Create visual damage effect
     * @param {string} type - Effect type
     */
    createDamageEffect(type) {
        if (!this.gameState.particles) return;
        
        const colors = {
            hit: '#ff0000',
            critical: '#ff00ff',
            death: '#800000',
            hurt: '#ff6600',
            parry: '#00ffff',
            block: '#0088ff'
        };
        
        const color = colors[type] || '#ff0000';
        const count = type === 'death' ? 20 : 5;
        
        for (let i = 0; i < count; i++) {
            this.gameState.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                color: color,
                life: 1000,
                size: Math.random() * 3 + 1
            });
        }
    }

    /**
     * Generate patrol path
     */
    generatePatrolPath() {
        const points = [];
        const radius = 5;
        const steps = 8;
        
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            points.push({
                x: this.x + Math.cos(angle) * radius,
                y: this.y + Math.sin(angle) * radius
            });
        }
        
        this.patrolPath = points;
        this.currentPathIndex = 0;
    }

    /**
     * Clear patrol path
     */
    clearPatrolPath() {
        this.patrolPath = [];
        this.currentPathIndex = 0;
    }

    /**
     * Find retreat path
     */
    findRetreatPath() {
        if (!this.target) {
            this.retreatPath = [];
            return;
        }
        
        // Find path away from target
        const dx = this.x - this.target.x;
        const dy = this.y - this.target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const retreatX = this.x + (dx / distance) * 10;
            const retreatY = this.y + (dy / distance) * 10;
            
            this.retreatPath = this.pathfinder.findPath(
                { x: this.x, y: this.y },
                { x: retreatX, y: retreatY }
            ) || [];
        }
    }

    // State machine condition methods
    detectPlayer() {
        return this.target !== null && this.alertLevel > 0.5;
    }

    shouldChase() {
        return this.aggression > 0.6 && this.target && 
               this.getDistanceTo(this.target) < WOLF_CONFIG.detection.DETECTION_RANGE;
    }

    shouldFlank() {
        return this.role === WolfRole.FLANKER && this.pack && 
               this.pack.members.length > 2;
    }

    shouldRetreat() {
        return this.health < this.maxHealth * WOLF_CONFIG.combat.CRITICAL_HEALTH_PERCENT;
    }

    shouldAmbush() {
        return this.role === WolfRole.AMBUSHER && Math.random() < 0.5;
    }

    inAttackRange() {
        return this.target && 
               this.getDistanceTo(this.target) <= WOLF_CONFIG.detection.ATTACK_RANGE;
    }

    lostTarget() {
        return !this.target || 
               this.getDistanceTo(this.target) > WOLF_CONFIG.detection.DETECTION_RANGE * 1.5;
    }

    canReengage() {
        return this.health > this.maxHealth * 0.5 && this.retreatTimer <= 0;
    }

    needsRegroup() {
        return this.pack && this.pack.members.length > 1;
    }

    regroupComplete() {
        if (!this.pack) return true;
        
        const center = this.getPackCenter();
        const distance = this.getDistanceTo(center);
        return distance < WOLF_CONFIG.pack.MIN_PACK_DISTANCE;
    }

    ambushTriggered() {
        return this.target && 
               this.getDistanceTo(this.target) < WOLF_CONFIG.detection.AMBUSH_DETECTION_RANGE;
    }

    flankingFailed() {
        return this.stateTimer > 5000; // 5 seconds timeout
    }

    isGoodAmbushPosition() {
        return this.behaviors.findAmbushPosition(this.target, this.gameState.obstacles) !== null;
    }

    getPackCenter() {
        if (!this.pack) return { x: this.x, y: this.y };
        
        const members = this.pack.members.filter(w => w.health > 0);
        if (members.length === 0) return { x: this.x, y: this.y };
        
        const sum = members.reduce((acc, w) => ({
            x: acc.x + w.x,
            y: acc.y + w.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / members.length,
            y: sum.y / members.length
        };
    }

    /**
     * Get distance to target
     * @param {Object} target - Target object with x, y
     * @returns {number} Distance
     */
    getDistanceTo(target) {
        if (!target) return Infinity;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // State handler methods
    resetMovement() {
        this.vx = 0;
        this.vy = 0;
    }

    setStealthMode(enabled) {
        this.isStealthMode = enabled;
    }

    setSprintMode(enabled) {
        this.isSprintMode = enabled;
    }

    prepareAttack() {
        // Animation or preparation logic
    }

    resetAttack() {
        // Reset attack state
    }

    startHowl() {
        this.performHowl();
    }

    stopHowl() {
        this.isHowling = false;
    }

    hideInAmbush() {
        this.ambushSpot = this.behaviors.findAmbushPosition(
            this.target, 
            this.gameState.obstacles
        );
    }

    revealFromAmbush() {
        this.ambushSpot = null;
    }

    calculateFlankPath() {
        this.flankDirection = Math.random() < 0.5 ? 'left' : 'right';
    }

    callForRegroup() {
        if (this.role === WolfRole.ALPHA) {
            this.performHowl();
        }
    }

    /**
     * Render wolf
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    render(ctx) {
        ctx.save();
        
        // Apply screen shake for hurt/stunned states
        let shakeX = 0, shakeY = 0;
        if (this.stateMachine.isInState(WolfState.HURT)) {
            shakeX = Math.sin(Date.now() * 0.1) * 2 * (1 - this.hurtAnimationProgress);
            shakeY = Math.cos(Date.now() * 0.1) * 2 * (1 - this.hurtAnimationProgress);
        } else if (this.stateMachine.isInState(WolfState.STUNNED)) {
            // Wobble effect when stunned
            shakeX = Math.sin(Date.now() * 0.05) * 3;
            shakeY = Math.cos(Date.now() * 0.08) * 2;
        }
        
        // Transform to wolf position
        ctx.translate(this.x + shakeX, this.y + shakeY);
        ctx.rotate(this.rotation);
        
        // Scale based on state
        let scale = 1;
        if (this.stateMachine.isInState(WolfState.ATTACKING)) {
            scale = 1.1 + Math.sin(Date.now() * 0.01) * 0.05;
        } else if (this.stateMachine.isInState(WolfState.LUNGING)) {
            // Stretch effect during lunge
            let lungeProgress = this.behaviors.getLungeProgress();
            const lungeResult = this.behaviors.lunge(this.target);
            lungeProgress = lungeResult && lungeResult.progress ? lungeResult.progress : lungeProgress;
            scale = 1 + lungeProgress * 0.3;
            ctx.scale(scale * 1.2, scale * 0.8); // Stretch horizontally
        } else if (this.stateMachine.isInState(WolfState.DYING)) {
            // Shrink during death
            scale = 1 - this.deathAnimationProgress * 0.5;
            ctx.globalAlpha = 1 - this.deathAnimationProgress * 0.7;
        } else if (this.stateMachine.isInState(WolfState.HURT)) {
            // Flash red when hurt
            ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.1) * 0.2;
        }
        
        if (scale !== 1 && !this.stateMachine.isInState(WolfState.LUNGING)) {
            ctx.scale(scale, scale);
        }
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 5, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw body
        const bodyColor = this.getBodyColor();
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Head
        ctx.save();
        ctx.translate(15, -5);
        ctx.rotate(-0.2);
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Ears
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-5, -8);
        ctx.lineTo(-3, -15);
        ctx.lineTo(0, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(5, -8);
        ctx.lineTo(7, -15);
        ctx.lineTo(10, -10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Snout
        ctx.beginPath();
        ctx.ellipse(10, 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Eyes
        if (this.eyeGlow > 0) {
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 10 * this.eyeGlow;
            ctx.fillStyle = `rgba(255, 0, 0, ${this.eyeGlow})`;
        } else {
            ctx.fillStyle = '#000000';
        }
        ctx.beginPath();
        ctx.arc(3, -2, 2, 0, Math.PI * 2);
        ctx.arc(7, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.restore();
        
        // Tail
        const tailWag = Math.sin(this.animationPhase * 10) * 0.2;
        ctx.save();
        ctx.translate(-15, 0);
        ctx.rotate(tailWag);
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(-5, -2, 12, 6, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        
        // Legs (simplified)
        ctx.fillStyle = bodyColor;
        const legOffset = Math.sin(this.animationPhase * 15) * 2;
        
        // Front legs
        ctx.fillRect(5, 10, 4, 10 + legOffset);
        ctx.fillRect(10, 10, 4, 10 - legOffset);
        
        // Back legs
        ctx.fillRect(-10, 10, 4, 10 - legOffset);
        ctx.fillRect(-5, 10, 4, 10 + legOffset);
        
        ctx.restore();
        
        // Health bar
        if (this.health < this.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(this.x - 20, this.y - 35, 40, 4);
            
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.3 ? '#10b981' : '#ef4444';
            ctx.fillRect(this.x - 20, this.y - 35, 40 * healthPercent, 4);
        }
        
        // Draw stunned stars
        if (this.stateMachine.isInState(WolfState.STUNNED)) {
            ctx.save();
            ctx.translate(this.x, this.y - 30);
            const starAngle = Date.now() * 0.003;
            for (let i = 0; i < 3; i++) {
                const angle = starAngle + (i * Math.PI * 2 / 3);
                const starX = Math.cos(angle) * 15;
                const starY = Math.sin(angle) * 8;
                
                ctx.fillStyle = '#ffff00';
                ctx.strokeStyle = '#ffaa00';
                ctx.lineWidth = 1;
                
                // Draw star
                ctx.save();
                ctx.translate(starX, starY);
                ctx.rotate(angle * 2);
                ctx.beginPath();
                for (let j = 0; j < 5; j++) {
                    const starPointAngle = (j * Math.PI * 2) / 5 - Math.PI / 2;
                    const radius = j % 2 === 0 ? 4 : 2;
                    const px = Math.cos(starPointAngle) * radius;
                    const py = Math.sin(starPointAngle) * radius;
                    if (j === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }
        
        // Debug info
        if (this.gameState.debug) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.stateMachine.getState(), this.x, this.y - 40);
            
            if (this.role !== WolfRole.SUPPORT) {
                ctx.fillText(this.role, this.x, this.y - 50);
            }
        }
    }

    /**
     * Get body color based on state and role
     * @returns {string} Color string
     */
    getBodyColor() {
        let baseColor = '#666666';
        
        // Role-based tint
        switch (this.role) {
            case WolfRole.ALPHA:
                baseColor = '#4a4a4a';
                break;
            case WolfRole.FLANKER:
                baseColor = '#5a5a5a';
                break;
            case WolfRole.AMBUSHER:
                baseColor = '#6a6a6a';
                break;
        }
        
        // State-based modification
        if (this.stateMachine.isInState(WolfState.ATTACKING)) {
            return '#8a4a4a'; // Reddish tint
        } else if (this.stateMachine.isInState(WolfState.LUNGING)) {
            return '#aa3a3a'; // Deep red for lunge
        } else if (this.stateMachine.isInState(WolfState.HURT)) {
            // Flash between red and base color
            const flash = Math.sin(Date.now() * 0.02) > 0;
            return flash ? '#ff6666' : baseColor;
        } else if (this.stateMachine.isInState(WolfState.STUNNED)) {
            return '#999999'; // Grayed out when stunned
        } else if (this.stateMachine.isInState(WolfState.DYING)) {
            // Fade to dark
            const fade = 1 - this.deathAnimationProgress;
            const r = parseInt(baseColor.substr(1, 2), 16);
            const g = parseInt(baseColor.substr(3, 2), 16);
            const b = parseInt(baseColor.substr(5, 2), 16);
            return `rgb(${Math.floor(r * fade)}, ${Math.floor(g * fade)}, ${Math.floor(b * fade)})`;
        } else if (this.stateMachine.isInState(WolfState.STALKING)) {
            return '#4a4a6a'; // Bluish tint
        } else if (this.stateMachine.isInState(WolfState.RETREATING)) {
            return '#7a7a7a'; // Lighter
        }
        
        return baseColor;
    }
}