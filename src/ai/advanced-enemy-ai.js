// Advanced Enemy AI System with Hunting Behaviors
(function(window) {
    'use strict';

    // ==========================================
    // PERCEPTION SYSTEM WITH MEMORY
    // ==========================================
    
    class PerceptionSystem {
        constructor(owner, config = {}) {
            this.owner = owner;
            
            // Configuration
            this.config = {
                sightRange: config.sightRange || 10,
                sightAngle: config.sightAngle || 120, // degrees
                hearingRange: config.hearingRange || 8,
                memoryDuration: config.memoryDuration || 10000, // ms
                updateInterval: config.updateInterval || 100, // ms
                ...config
            };
            
            // Perception memory
            this.memory = {
                threats: new Map(), // Map of entityId -> ThreatMemory
                lastKnownPositions: new Map(), // Map of entityId -> {x, y, timestamp}
                sounds: [], // Array of {x, y, type, timestamp}
                allies: new Map() // Map of entityId -> AllyInfo
            };
            
            // Line of sight cache
            this.visibilityCache = new Map();
            this.lastUpdate = 0;
        }
        
        update(deltaTime, entities, obstacles) {
            this.lastUpdate += deltaTime;
            
            if (this.lastUpdate < this.config.updateInterval) {
                return;
            }
            
            this.lastUpdate = 0;
            
            // Update visibility for all entities
            this.updateVisibility(entities, obstacles);
            
            // Update threat memory
            this.updateThreatMemory();
            
            // Clean old memories
            this.cleanOldMemories();
        }
        
        updateVisibility(entities, obstacles) {
            const currentTime = Date.now();
            
            for (const entity of entities) {
                if (entity === this.owner || entity.team === this.owner.team) {
                    // Track allies
                    if (entity.team === this.owner.team) {
                        this.memory.allies.set(entity.id, {
                            entity: entity,
                            position: {x: entity.x, y: entity.y},
                            timestamp: currentTime
                        });
                    }
                    continue;
                }
                
                const wasVisible = this.visibilityCache.get(entity.id);
                const isVisible = this.canSee(entity, obstacles);
                
                this.visibilityCache.set(entity.id, isVisible);
                
                if (isVisible) {
                    // Update or create threat memory
                    const threat = this.memory.threats.get(entity.id) || new ThreatMemory(entity);
                    threat.update(entity, currentTime);
                    this.memory.threats.set(entity.id, threat);
                    
                    // Update last known position
                    this.memory.lastKnownPositions.set(entity.id, {
                        x: entity.x,
                        y: entity.y,
                        timestamp: currentTime,
                        velocity: entity.velocity ? {...entity.velocity} : null
                    });
                } else if (wasVisible && !isVisible) {
                    // Just lost sight - mark last known position
                    const threat = this.memory.threats.get(entity.id);
                    if (threat) {
                        threat.lastSeen = currentTime;
                        threat.isVisible = false;
                    }
                }
            }
        }
        
        canSee(target, obstacles) {
            const dx = target.x - this.owner.x;
            const dy = target.y - this.owner.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check range
            if (distance > this.config.sightRange) {
                return false;
            }
            
            // Check field of view
            const angle = Math.atan2(dy, dx);
            const ownerAngle = this.owner.rotation || 0;
            let angleDiff = Math.abs(angle - ownerAngle) * (180 / Math.PI);
            if (angleDiff > 180) angleDiff = 360 - angleDiff;
            
            if (angleDiff > this.config.sightAngle / 2) {
                return false;
            }
            
            // Check line of sight (ray casting)
            return this.hasLineOfSight(this.owner, target, obstacles);
        }
        
        hasLineOfSight(from, to, obstacles) {
            const steps = 20;
            const dx = (to.x - from.x) / steps;
            const dy = (to.y - from.y) / steps;
            
            for (let i = 1; i < steps; i++) {
                const x = from.x + dx * i;
                const y = from.y + dy * i;
                
                for (const obstacle of obstacles) {
                    if (this.pointIntersectsObstacle(x, y, obstacle)) {
                        return false;
                    }
                }
            }
            
            return true;
        }
        
        pointIntersectsObstacle(x, y, obstacle) {
            return x >= obstacle.x - obstacle.width/2 &&
                   x <= obstacle.x + obstacle.width/2 &&
                   y >= obstacle.y - obstacle.height/2 &&
                   y <= obstacle.y + obstacle.height/2;
        }
        
        updateThreatMemory() {
            const currentTime = Date.now();
            
            for (const [id, threat] of this.memory.threats) {
                // Calculate threat level based on various factors
                threat.threatLevel = this.calculateThreatLevel(threat);
                
                // Predict future position if not visible
                if (!threat.isVisible && threat.lastKnownVelocity) {
                    const timeSinceSeen = (currentTime - threat.lastSeen) / 1000;
                    threat.predictedPosition = {
                        x: threat.lastKnownPosition.x + threat.lastKnownVelocity.x * timeSinceSeen,
                        y: threat.lastKnownPosition.y + threat.lastKnownVelocity.y * timeSinceSeen
                    };
                }
            }
        }
        
        calculateThreatLevel(threat) {
            let level = 0;
            
            // Distance factor
            const distance = this.getDistanceToThreat(threat);
            level += (1 - Math.min(distance / this.config.sightRange, 1)) * 0.3;
            
            // Visibility factor
            if (threat.isVisible) level += 0.3;
            
            // Recent activity factor
            const timeSinceSeen = (Date.now() - threat.lastSeen) / 1000;
            if (timeSinceSeen < 2) level += 0.2;
            
            // Health factor (if known)
            if (threat.health !== undefined && threat.maxHealth) {
                const healthPercent = threat.health / threat.maxHealth;
                level += (1 - healthPercent) * 0.1; // Wounded enemies are less threatening
            }
            
            // Weapon factor (if applicable)
            if (threat.hasRangedWeapon) level += 0.1;
            
            return Math.min(level, 1);
        }
        
        getDistanceToThreat(threat) {
            const pos = threat.isVisible ? threat.lastKnownPosition : threat.predictedPosition;
            const dx = pos.x - this.owner.x;
            const dy = pos.y - this.owner.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
        
        cleanOldMemories() {
            const currentTime = Date.now();
            const memoryDuration = this.config.memoryDuration;
            
            // Clean threat memories
            for (const [id, threat] of this.memory.threats) {
                if (currentTime - threat.lastSeen > memoryDuration) {
                    this.memory.threats.delete(id);
                    this.memory.lastKnownPositions.delete(id);
                }
            }
            
            // Clean sound memories
            this.memory.sounds = this.memory.sounds.filter(
                sound => currentTime - sound.timestamp < memoryDuration / 2
            );
        }
        
        // Public API
        getPrimaryThreat() {
            let primaryThreat = null;
            let highestThreatLevel = 0;
            
            for (const threat of this.memory.threats.values()) {
                if (threat.threatLevel > highestThreatLevel) {
                    highestThreatLevel = threat.threatLevel;
                    primaryThreat = threat;
                }
            }
            
            return primaryThreat;
        }
        
        getVisibleThreats() {
            return Array.from(this.memory.threats.values()).filter(t => t.isVisible);
        }
        
        getLastKnownPosition(entityId) {
            return this.memory.lastKnownPositions.get(entityId);
        }
        
        registerSound(x, y, type = 'generic') {
            this.memory.sounds.push({
                x, y, type,
                timestamp: Date.now()
            });
        }
    }
    
    // Threat memory class
    class ThreatMemory {
        constructor(entity) {
            this.id = entity.id;
            this.type = entity.type || 'unknown';
            this.lastKnownPosition = {x: entity.x, y: entity.y};
            this.predictedPosition = {x: entity.x, y: entity.y};
            this.lastKnownVelocity = entity.velocity ? {...entity.velocity} : null;
            this.lastSeen = Date.now();
            this.firstSeen = Date.now();
            this.isVisible = true;
            this.threatLevel = 0;
            this.health = entity.health;
            this.maxHealth = entity.maxHealth;
            this.hasRangedWeapon = entity.hasRangedWeapon || false;
        }
        
        update(entity, timestamp) {
            this.lastKnownPosition = {x: entity.x, y: entity.y};
            this.lastKnownVelocity = entity.velocity ? {...entity.velocity} : null;
            this.lastSeen = timestamp;
            this.isVisible = true;
            this.health = entity.health;
            
            // Reset predicted position when visible
            this.predictedPosition = {...this.lastKnownPosition};
        }
    }
    
    // ==========================================
    // BEHAVIOR TREE SYSTEM
    // ==========================================
    
    class BehaviorTree {
        constructor(root, blackboard) {
            this.root = root;
            this.blackboard = blackboard || new Blackboard();
        }
        
        tick(deltaTime) {
            return this.root.execute(this.blackboard, deltaTime);
        }
    }
    
    class Blackboard {
        constructor() {
            this.data = new Map();
        }
        
        get(key) {
            return this.data.get(key);
        }
        
        set(key, value) {
            this.data.set(key, value);
        }
        
        has(key) {
            return this.data.has(key);
        }
        
        delete(key) {
            this.data.delete(key);
        }
    }
    
    // Node status
    const NodeStatus = {
        SUCCESS: 'success',
        FAILURE: 'failure',
        RUNNING: 'running'
    };
    
    // Base node class
    class BehaviorNode {
        execute(blackboard, deltaTime) {
            throw new Error('Execute must be implemented by subclass');
        }
    }
    
    // Composite nodes
    class Selector extends BehaviorNode {
        constructor(children) {
            super();
            this.children = children;
            this.currentIndex = 0;
        }
        
        execute(blackboard, deltaTime) {
            while (this.currentIndex < this.children.length) {
                const status = this.children[this.currentIndex].execute(blackboard, deltaTime);
                
                if (status === NodeStatus.RUNNING) {
                    return NodeStatus.RUNNING;
                }
                
                if (status === NodeStatus.SUCCESS) {
                    this.currentIndex = 0;
                    return NodeStatus.SUCCESS;
                }
                
                this.currentIndex++;
            }
            
            this.currentIndex = 0;
            return NodeStatus.FAILURE;
        }
    }
    
    class Sequence extends BehaviorNode {
        constructor(children) {
            super();
            this.children = children;
            this.currentIndex = 0;
        }
        
        execute(blackboard, deltaTime) {
            while (this.currentIndex < this.children.length) {
                const status = this.children[this.currentIndex].execute(blackboard, deltaTime);
                
                if (status === NodeStatus.RUNNING) {
                    return NodeStatus.RUNNING;
                }
                
                if (status === NodeStatus.FAILURE) {
                    this.currentIndex = 0;
                    return NodeStatus.FAILURE;
                }
                
                this.currentIndex++;
            }
            
            this.currentIndex = 0;
            return NodeStatus.SUCCESS;
        }
    }
    
    class Parallel extends BehaviorNode {
        constructor(children, successThreshold = 1, failureThreshold = 1) {
            super();
            this.children = children;
            this.successThreshold = successThreshold;
            this.failureThreshold = failureThreshold;
        }
        
        execute(blackboard, deltaTime) {
            let successCount = 0;
            let failureCount = 0;
            let runningCount = 0;
            
            for (const child of this.children) {
                const status = child.execute(blackboard, deltaTime);
                
                if (status === NodeStatus.SUCCESS) successCount++;
                else if (status === NodeStatus.FAILURE) failureCount++;
                else runningCount++;
            }
            
            if (successCount >= this.successThreshold) {
                return NodeStatus.SUCCESS;
            }
            
            if (failureCount >= this.failureThreshold) {
                return NodeStatus.FAILURE;
            }
            
            return NodeStatus.RUNNING;
        }
    }
    
    // Decorator nodes
    class Inverter extends BehaviorNode {
        constructor(child) {
            super();
            this.child = child;
        }
        
        execute(blackboard, deltaTime) {
            const status = this.child.execute(blackboard, deltaTime);
            
            if (status === NodeStatus.SUCCESS) return NodeStatus.FAILURE;
            if (status === NodeStatus.FAILURE) return NodeStatus.SUCCESS;
            return NodeStatus.RUNNING;
        }
    }
    
    class Repeater extends BehaviorNode {
        constructor(child, times = -1) {
            super();
            this.child = child;
            this.times = times;
            this.count = 0;
        }
        
        execute(blackboard, deltaTime) {
            if (this.times > 0 && this.count >= this.times) {
                this.count = 0;
                return NodeStatus.SUCCESS;
            }
            
            const status = this.child.execute(blackboard, deltaTime);
            
            if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
                this.count++;
                
                if (this.times > 0 && this.count >= this.times) {
                    this.count = 0;
                    return NodeStatus.SUCCESS;
                }
                
                return NodeStatus.RUNNING;
            }
            
            return NodeStatus.RUNNING;
        }
    }
    
    // ==========================================
    // HUNTING BEHAVIORS
    // ==========================================
    
    class HuntingBehavior {
        constructor(enemy, config = {}) {
            this.enemy = enemy;
            this.config = {
                searchRadius: config.searchRadius || 5,
                searchPoints: config.searchPoints || 8,
                coverCheckRadius: config.coverCheckRadius || 3,
                ...config
            };
            
            this.searchPattern = null;
            this.currentSearchIndex = 0;
            this.searchStartTime = 0;
        }
        
        initiateHunt(lastKnownPosition) {
            this.searchPattern = this.generateSearchPattern(lastKnownPosition);
            this.currentSearchIndex = 0;
            this.searchStartTime = Date.now();
            
            // Alert nearby allies
            this.callForBackup(lastKnownPosition);
        }
        
        generateSearchPattern(center) {
            const points = [];
            const numPoints = this.config.searchPoints;
            
            // Spiral search pattern
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const radius = this.config.searchRadius * (1 + i / numPoints);
                
                points.push({
                    x: center.x + Math.cos(angle) * radius,
                    y: center.y + Math.sin(angle) * radius,
                    priority: i
                });
            }
            
            // Add likely cover spots
            const coverSpots = this.findLikelyCoverSpots(center);
            points.push(...coverSpots);
            
            // Sort by priority and distance
            points.sort((a, b) => {
                const distA = Math.hypot(a.x - this.enemy.x, a.y - this.enemy.y);
                const distB = Math.hypot(b.x - this.enemy.x, b.y - this.enemy.y);
                return distA - distB;
            });
            
            return points;
        }
        
        findLikelyCoverSpots(center) {
            const spots = [];
            const obstacles = this.enemy.world?.obstacles || [];
            
            for (const obstacle of obstacles) {
                const dist = Math.hypot(obstacle.x - center.x, obstacle.y - center.y);
                
                if (dist <= this.config.coverCheckRadius) {
                    // Add points around the obstacle
                    const positions = [
                        {x: obstacle.x - obstacle.width/2 - 1, y: obstacle.y},
                        {x: obstacle.x + obstacle.width/2 + 1, y: obstacle.y},
                        {x: obstacle.x, y: obstacle.y - obstacle.height/2 - 1},
                        {x: obstacle.x, y: obstacle.y + obstacle.height/2 + 1}
                    ];
                    
                    for (const pos of positions) {
                        spots.push({
                            ...pos,
                            priority: 10 // High priority for cover spots
                        });
                    }
                }
            }
            
            return spots;
        }
        
        getNextSearchPoint() {
            if (!this.searchPattern || this.currentSearchIndex >= this.searchPattern.length) {
                return null;
            }
            
            return this.searchPattern[this.currentSearchIndex];
        }
        
        advanceSearch() {
            this.currentSearchIndex++;
        }
        
        callForBackup(position) {
            // Notify allies within communication range
            const allies = this.enemy.perception?.memory.allies || new Map();
            
            for (const [id, allyInfo] of allies) {
                const dist = Math.hypot(
                    allyInfo.position.x - this.enemy.x,
                    allyInfo.position.y - this.enemy.y
                );
                
                if (dist <= 15) { // Communication range
                    // Send alert to ally (would integrate with ally's blackboard)
                    if (allyInfo.entity && allyInfo.entity.blackboard) {
                        allyInfo.entity.blackboard.set('alertPosition', position);
                        allyInfo.entity.blackboard.set('alertTime', Date.now());
                    }
                }
            }
        }
        
        shouldAbandonSearch() {
            // Abandon search after timeout or if new threat detected
            const searchDuration = Date.now() - this.searchStartTime;
            return searchDuration > 15000; // 15 seconds
        }
    }
    
    // ==========================================
    // FLANKING AND TACTICAL BEHAVIORS
    // ==========================================
    
    class TacticalBehavior {
        constructor(enemy, config = {}) {
            this.enemy = enemy;
            this.config = {
                flankingAngle: config.flankingAngle || 90,
                interceptLookahead: config.interceptLookahead || 2, // seconds
                coverPreference: config.coverPreference || 0.7,
                highGroundBonus: config.highGroundBonus || 1.5,
                ...config
            };
        }
        
        calculateFlankingPosition(target, allies = []) {
            // Determine flanking side based on ally positions
            let leftScore = 0;
            let rightScore = 0;
            
            for (const ally of allies) {
                const angle = Math.atan2(
                    ally.y - target.y,
                    ally.x - target.x
                );
                const targetAngle = Math.atan2(
                    this.enemy.y - target.y,
                    this.enemy.x - target.x
                );
                
                const diff = this.normalizeAngle(angle - targetAngle);
                if (diff > 0) leftScore++;
                else rightScore++;
            }
            
            // Choose less crowded side
            const flankLeft = leftScore <= rightScore;
            const flankAngle = (this.config.flankingAngle * Math.PI / 180) * (flankLeft ? 1 : -1);
            
            // Calculate flanking position
            const currentAngle = Math.atan2(
                this.enemy.y - target.y,
                this.enemy.x - target.x
            );
            
            const targetAngle = currentAngle + flankAngle;
            const distance = Math.hypot(
                this.enemy.x - target.x,
                this.enemy.y - target.y
            );
            
            return {
                x: target.x + Math.cos(targetAngle) * distance,
                y: target.y + Math.sin(targetAngle) * distance
            };
        }
        
        calculateInterceptPoint(target, targetVelocity) {
            if (!targetVelocity || (targetVelocity.x === 0 && targetVelocity.y === 0)) {
                return {x: target.x, y: target.y};
            }
            
            // Predict where target will be
            const timeToIntercept = this.estimateInterceptTime(target, targetVelocity);
            
            return {
                x: target.x + targetVelocity.x * timeToIntercept,
                y: target.y + targetVelocity.y * timeToIntercept
            };
        }
        
        estimateInterceptTime(target, targetVelocity) {
            const distance = Math.hypot(
                target.x - this.enemy.x,
                target.y - this.enemy.y
            );
            
            const enemySpeed = this.enemy.speed || 3;
            const targetSpeed = Math.hypot(targetVelocity.x, targetVelocity.y);
            
            // Simple intercept calculation
            let interceptTime = distance / (enemySpeed + targetSpeed);
            
            // Cap at lookahead time
            return Math.min(interceptTime, this.config.interceptLookahead);
        }
        
        findBestCoverPosition(targetPosition) {
            const obstacles = this.enemy.world?.obstacles || [];
            let bestCover = null;
            let bestScore = -Infinity;
            
            for (const obstacle of obstacles) {
                // Check all sides of obstacle
                const positions = [
                    {x: obstacle.x - obstacle.width/2 - 1, y: obstacle.y},
                    {x: obstacle.x + obstacle.width/2 + 1, y: obstacle.y},
                    {x: obstacle.x, y: obstacle.y - obstacle.height/2 - 1},
                    {x: obstacle.x, y: obstacle.y + obstacle.height/2 + 1}
                ];
                
                for (const pos of positions) {
                    const score = this.evaluateCoverPosition(pos, targetPosition, obstacle);
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestCover = pos;
                    }
                }
            }
            
            return bestCover;
        }
        
        evaluateCoverPosition(position, targetPosition, obstacle) {
            let score = 0;
            
            // Distance to position (closer is better for immediate use)
            const distToPos = Math.hypot(
                position.x - this.enemy.x,
                position.y - this.enemy.y
            );
            score -= distToPos * 0.1;
            
            // Cover quality (how well it blocks line of sight)
            if (this.checkCoverQuality(position, targetPosition, obstacle)) {
                score += 10;
            }
            
            // High ground bonus
            if (obstacle.type === 'elevated' || obstacle.height > 2) {
                score += this.config.highGroundBonus * 5;
            }
            
            // Escape routes (positions with multiple escape paths are better)
            const escapeRoutes = this.countEscapeRoutes(position);
            score += escapeRoutes * 2;
            
            return score;
        }
        
        checkCoverQuality(position, targetPosition, obstacle) {
            // Check if obstacle blocks line of sight from target to position
            const steps = 10;
            const dx = (position.x - targetPosition.x) / steps;
            const dy = (position.y - targetPosition.y) / steps;
            
            for (let i = 1; i < steps; i++) {
                const x = targetPosition.x + dx * i;
                const y = targetPosition.y + dy * i;
                
                if (x >= obstacle.x - obstacle.width/2 &&
                    x <= obstacle.x + obstacle.width/2 &&
                    y >= obstacle.y - obstacle.height/2 &&
                    y <= obstacle.y + obstacle.height/2) {
                    return true;
                }
            }
            
            return false;
        }
        
        countEscapeRoutes(position) {
            const directions = [
                {x: 1, y: 0}, {x: -1, y: 0},
                {x: 0, y: 1}, {x: 0, y: -1}
            ];
            
            let routes = 0;
            const obstacles = this.enemy.world?.obstacles || [];
            
            for (const dir of directions) {
                const checkPos = {
                    x: position.x + dir.x * 2,
                    y: position.y + dir.y * 2
                };
                
                let blocked = false;
                for (const obstacle of obstacles) {
                    if (checkPos.x >= obstacle.x - obstacle.width/2 &&
                        checkPos.x <= obstacle.x + obstacle.width/2 &&
                        checkPos.y >= obstacle.y - obstacle.height/2 &&
                        checkPos.y <= obstacle.y + obstacle.height/2) {
                        blocked = true;
                        break;
                    }
                }
                
                if (!blocked) routes++;
            }
            
            return routes;
        }
        
        normalizeAngle(angle) {
            while (angle > Math.PI) angle -= 2 * Math.PI;
            while (angle < -Math.PI) angle += 2 * Math.PI;
            return angle;
        }
    }
    
    // ==========================================
    // SPECIFIC BEHAVIOR NODES
    // ==========================================
    
    // Condition nodes
    class HasTarget extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const perception = blackboard.get('perception');
            const threat = perception?.getPrimaryThreat();
            
            if (threat && threat.isVisible) {
                blackboard.set('currentTarget', threat);
                return NodeStatus.SUCCESS;
            }
            
            return NodeStatus.FAILURE;
        }
    }
    
    class HasLastKnownPosition extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const perception = blackboard.get('perception');
            const lastTarget = blackboard.get('lastTarget');
            
            if (lastTarget) {
                const lastPos = perception?.getLastKnownPosition(lastTarget.id);
                if (lastPos) {
                    blackboard.set('searchPosition', lastPos);
                    return NodeStatus.SUCCESS;
                }
            }
            
            return NodeStatus.FAILURE;
        }
    }
    
    class InAttackRange extends BehaviorNode {
        constructor(range = 1.5) {
            super();
            this.range = range;
        }
        
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const target = blackboard.get('currentTarget');
            
            if (!enemy || !target) return NodeStatus.FAILURE;
            
            const distance = Math.hypot(
                target.lastKnownPosition.x - enemy.x,
                target.lastKnownPosition.y - enemy.y
            );
            
            return distance <= this.range ? NodeStatus.SUCCESS : NodeStatus.FAILURE;
        }
    }
    
    // Action nodes
    class MoveToTarget extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const target = blackboard.get('currentTarget');
            const tactical = blackboard.get('tactical');
            
            if (!enemy || !target) return NodeStatus.FAILURE;
            
            // Calculate intercept point if target is moving
            let targetPos = target.lastKnownPosition;
            if (target.lastKnownVelocity && tactical) {
                targetPos = tactical.calculateInterceptPoint(
                    target.lastKnownPosition,
                    target.lastKnownVelocity
                );
            }
            
            // Move towards target
            const dx = targetPos.x - enemy.x;
            const dy = targetPos.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 0.1) {
                enemy.velocity = {
                    x: (dx / distance) * enemy.speed,
                    y: (dy / distance) * enemy.speed
                };
                return NodeStatus.RUNNING;
            }
            
            return NodeStatus.SUCCESS;
        }
    }
    
    class SearchArea extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const hunting = blackboard.get('hunting');
            const searchPosition = blackboard.get('searchPosition');
            
            if (!enemy || !hunting || !searchPosition) return NodeStatus.FAILURE;
            
            // Initialize search if needed
            if (!hunting.searchPattern) {
                hunting.initiateHunt(searchPosition);
            }
            
            // Check if should abandon search
            if (hunting.shouldAbandonSearch()) {
                hunting.searchPattern = null;
                return NodeStatus.FAILURE;
            }
            
            // Get next search point
            const searchPoint = hunting.getNextSearchPoint();
            if (!searchPoint) {
                return NodeStatus.FAILURE;
            }
            
            // Move to search point
            const dx = searchPoint.x - enemy.x;
            const dy = searchPoint.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 0.5) {
                enemy.velocity = {
                    x: (dx / distance) * enemy.speed * 0.7, // Slower when searching
                    y: (dy / distance) * enemy.speed * 0.7
                };
                return NodeStatus.RUNNING;
            } else {
                // Reached search point, move to next
                hunting.advanceSearch();
                return NodeStatus.RUNNING;
            }
        }
    }
    
    class FlankTarget extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const target = blackboard.get('currentTarget');
            const tactical = blackboard.get('tactical');
            const allies = blackboard.get('allies') || [];
            
            if (!enemy || !target || !tactical) return NodeStatus.FAILURE;
            
            // Calculate flanking position
            const flankPos = tactical.calculateFlankingPosition(
                target.lastKnownPosition,
                allies
            );
            
            // Move to flanking position
            const dx = flankPos.x - enemy.x;
            const dy = flankPos.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 1) {
                enemy.velocity = {
                    x: (dx / distance) * enemy.speed,
                    y: (dy / distance) * enemy.speed
                };
                return NodeStatus.RUNNING;
            }
            
            return NodeStatus.SUCCESS;
        }
    }
    
    class TakeCover extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const target = blackboard.get('currentTarget');
            const tactical = blackboard.get('tactical');
            
            if (!enemy || !tactical) return NodeStatus.FAILURE;
            
            // Find best cover position
            const targetPos = target ? target.lastKnownPosition : enemy;
            const coverPos = tactical.findBestCoverPosition(targetPos);
            
            if (!coverPos) return NodeStatus.FAILURE;
            
            // Move to cover
            const dx = coverPos.x - enemy.x;
            const dy = coverPos.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 0.5) {
                enemy.velocity = {
                    x: (dx / distance) * enemy.speed * 1.2, // Move quickly to cover
                    y: (dy / distance) * enemy.speed * 1.2
                };
                return NodeStatus.RUNNING;
            }
            
            blackboard.set('inCover', true);
            return NodeStatus.SUCCESS;
        }
    }
    
    class Attack extends BehaviorNode {
        constructor(damage = 10, cooldown = 1000) {
            super();
            this.damage = damage;
            this.cooldown = cooldown;
            this.lastAttack = 0;
        }
        
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const target = blackboard.get('currentTarget');
            
            if (!enemy || !target) return NodeStatus.FAILURE;
            
            const currentTime = Date.now();
            if (currentTime - this.lastAttack < this.cooldown) {
                return NodeStatus.RUNNING;
            }
            
            // Perform attack (this would integrate with your combat system)
            if (target.entity && target.entity.takeDamage) {
                target.entity.takeDamage(this.damage);
            }
            
            this.lastAttack = currentTime;
            return NodeStatus.SUCCESS;
        }
    }
    
    // ==========================================
    // ADVANCED ENEMY CLASS
    // ==========================================
    
    class AdvancedEnemy {
        constructor(x, y, config = {}) {
            this.x = x;
            this.y = y;
            this.id = 'enemy_' + Math.random().toString(36).substr(2, 9);
            
            // Configuration
            this.config = {
                health: config.health || 100,
                maxHealth: config.maxHealth || 100,
                speed: config.speed || 3,
                team: config.team || 'enemy',
                type: config.type || 'soldier', // soldier, sniper, assault, etc.
                ...config
            };
            
            // State
            this.health = this.config.health;
            this.maxHealth = this.config.maxHealth;
            this.speed = this.config.speed;
            this.team = this.config.team;
            this.type = this.config.type;
            this.velocity = {x: 0, y: 0};
            this.rotation = 0;
            
            // Initialize systems
            this.initializeSystems();
            
            // Create behavior tree
            this.behaviorTree = this.createBehaviorTree();
        }
        
        initializeSystems() {
            // Perception system
            this.perception = new PerceptionSystem(this, {
                sightRange: this.type === 'sniper' ? 15 : 10,
                sightAngle: this.type === 'assault' ? 160 : 120,
                hearingRange: 8
            });
            
            // Hunting behavior
            this.hunting = new HuntingBehavior(this);
            
            // Tactical behavior
            this.tactical = new TacticalBehavior(this);
            
            // Blackboard for behavior tree
            this.blackboard = new Blackboard();
            this.blackboard.set('enemy', this);
            this.blackboard.set('perception', this.perception);
            this.blackboard.set('hunting', this.hunting);
            this.blackboard.set('tactical', this.tactical);
        }
        
        createBehaviorTree() {
            // Build behavior tree based on enemy type
            let root;
            
            switch (this.type) {
                case 'sniper':
                    root = this.createSniperBehaviorTree();
                    break;
                case 'assault':
                    root = this.createAssaultBehaviorTree();
                    break;
                default:
                    root = this.createSoldierBehaviorTree();
            }
            
            return new BehaviorTree(root, this.blackboard);
        }
        
        createSoldierBehaviorTree() {
            // Standard soldier behavior: balanced offense and defense
            return new Selector([
                // Combat sequence
                new Sequence([
                    new HasTarget(),
                    new Selector([
                        // Close combat
                        new Sequence([
                            new InAttackRange(2),
                            new Attack(15, 1000)
                        ]),
                        // Approach target
                        new MoveToTarget()
                    ])
                ]),
                
                // Hunt sequence
                new Sequence([
                    new HasLastKnownPosition(),
                    new SearchArea()
                ]),
                
                // Patrol (fallback)
                new Patrol()
            ]);
        }
        
        createSniperBehaviorTree() {
            // Sniper behavior: long range, use cover, relocate after shots
            return new Selector([
                // Combat sequence
                new Sequence([
                    new HasTarget(),
                    new Selector([
                        // Already in good position
                        new Sequence([
                            new InAttackRange(12), // Long range
                            new Parallel([
                                new Attack(25, 2000), // High damage, slow fire rate
                                new Sequence([
                                    new Wait(2000),
                                    new TakeCover() // Relocate after shooting
                                ])
                            ])
                        ]),
                        // Need to get in position
                        new Sequence([
                            new TakeCover(),
                            new Wait(500)
                        ])
                    ])
                ]),
                
                // Hunt sequence with caution
                new Sequence([
                    new HasLastKnownPosition(),
                    new Selector([
                        new TakeCover(),
                        new SearchArea()
                    ])
                ]),
                
                // Find vantage point
                new FindVantagePoint()
            ]);
        }
        
        createAssaultBehaviorTree() {
            // Assault behavior: aggressive, flanking, coordinated attacks
            return new Selector([
                // Combat sequence
                new Sequence([
                    new HasTarget(),
                    new Parallel([
                        // Main assault behavior
                        new Selector([
                            new Sequence([
                                new InAttackRange(3),
                                new Attack(12, 800)
                            ]),
                            new FlankTarget()
                        ]),
                        // Coordinate with allies
                        new CoordinateAttack()
                    ])
                ]),
                
                // Aggressive hunting
                new Sequence([
                    new HasLastKnownPosition(),
                    new Parallel([
                        new SearchArea(),
                        new CallForBackup()
                    ])
                ]),
                
                // Aggressive patrol
                new AggressivePatrol()
            ]);
        }
        
        update(deltaTime, entities, obstacles, world) {
            // Store world reference for behaviors
            this.world = world;
            
            // Update perception
            this.perception.update(deltaTime, entities, obstacles);
            
            // Update blackboard with current info
            this.blackboard.set('allies', this.getAllies(entities));
            
            // Execute behavior tree
            this.behaviorTree.tick(deltaTime);
            
            // Apply physics
            this.applyPhysics(deltaTime, obstacles);
            
            // Update rotation based on velocity
            if (this.velocity.x !== 0 || this.velocity.y !== 0) {
                this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
            }
        }
        
        getAllies(entities) {
            return entities.filter(e => e.team === this.team && e !== this);
        }
        
        applyPhysics(deltaTime, obstacles) {
            // Simple physics and collision
            const dt = deltaTime / 1000;
            
            const newX = this.x + this.velocity.x * dt;
            const newY = this.y + this.velocity.y * dt;
            
            // Check collisions
            let canMove = true;
            for (const obstacle of obstacles) {
                if (newX >= obstacle.x - obstacle.width/2 &&
                    newX <= obstacle.x + obstacle.width/2 &&
                    newY >= obstacle.y - obstacle.height/2 &&
                    newY <= obstacle.y + obstacle.height/2) {
                    canMove = false;
                    break;
                }
            }
            
            if (canMove) {
                this.x = newX;
                this.y = newY;
            }
            
            // Apply friction
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
        }
        
        takeDamage(damage) {
            this.health -= damage;
            
            // Register the damage as a sound (alert nearby enemies)
            if (this.perception) {
                this.perception.registerSound(this.x, this.y, 'combat');
            }
            
            if (this.health <= 0) {
                this.health = 0;
                this.blackboard.set('isDead', true);
            }
        }
        
        render(ctx) {
            // Save context
            ctx.save();
            
            // Draw enemy based on type
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            // Body
            ctx.fillStyle = this.getColorByType();
            ctx.fillRect(-10, -10, 20, 20);
            
            // Direction indicator
            ctx.fillStyle = '#fff';
            ctx.fillRect(5, -3, 10, 6);
            
            // Health bar
            ctx.restore();
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - 15, this.y - 25, 30, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 25, 30 * (this.health / this.maxHealth), 4);
            
            // Debug: show state
            if (window.DEBUG_AI) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.fillText(this.getCurrentState(), this.x - 20, this.y - 30);
            }
        }
        
        getColorByType() {
            switch (this.type) {
                case 'sniper': return '#800080';
                case 'assault': return '#ff4444';
                case 'soldier': return '#ff8800';
                default: return '#ff0000';
            }
        }
        
        getCurrentState() {
            // Get current state from blackboard for debugging
            if (this.blackboard.get('currentTarget')) return 'COMBAT';
            if (this.blackboard.get('searchPosition')) return 'HUNTING';
            if (this.blackboard.get('inCover')) return 'COVER';
            return 'PATROL';
        }
    }
    
    // Additional behavior nodes
    class Patrol extends BehaviorNode {
        constructor() {
            super();
            this.waypoints = [];
            this.currentWaypoint = 0;
        }
        
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            if (!enemy) return NodeStatus.FAILURE;
            
            // Generate waypoints if needed
            if (this.waypoints.length === 0) {
                this.generateWaypoints(enemy);
            }
            
            // Move to current waypoint
            const waypoint = this.waypoints[this.currentWaypoint];
            const dx = waypoint.x - enemy.x;
            const dy = waypoint.y - enemy.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance > 1) {
                enemy.velocity = {
                    x: (dx / distance) * enemy.speed * 0.5,
                    y: (dy / distance) * enemy.speed * 0.5
                };
            } else {
                // Reached waypoint, move to next
                this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
            }
            
            return NodeStatus.RUNNING;
        }
        
        generateWaypoints(enemy) {
            // Generate patrol waypoints around starting position
            const radius = 10;
            const numPoints = 4;
            
            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                this.waypoints.push({
                    x: enemy.x + Math.cos(angle) * radius,
                    y: enemy.y + Math.sin(angle) * radius
                });
            }
        }
    }
    
    class Wait extends BehaviorNode {
        constructor(duration) {
            super();
            this.duration = duration;
            this.startTime = null;
        }
        
        execute(blackboard, deltaTime) {
            if (!this.startTime) {
                this.startTime = Date.now();
            }
            
            if (Date.now() - this.startTime >= this.duration) {
                this.startTime = null;
                return NodeStatus.SUCCESS;
            }
            
            return NodeStatus.RUNNING;
        }
    }
    
    class FindVantagePoint extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const tactical = blackboard.get('tactical');
            
            if (!enemy || !tactical) return NodeStatus.FAILURE;
            
            // Find high ground or good sniping position
            // This would integrate with your level design
            
            return NodeStatus.SUCCESS;
        }
    }
    
    class CoordinateAttack extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const allies = blackboard.get('allies') || [];
            const target = blackboard.get('currentTarget');
            
            if (!target || allies.length === 0) return NodeStatus.FAILURE;
            
            // Signal allies to coordinate attack
            for (const ally of allies) {
                if (ally.blackboard) {
                    ally.blackboard.set('coordinatedTarget', target);
                    ally.blackboard.set('coordinateTime', Date.now());
                }
            }
            
            return NodeStatus.SUCCESS;
        }
    }
    
    class CallForBackup extends BehaviorNode {
        execute(blackboard, deltaTime) {
            const enemy = blackboard.get('enemy');
            const hunting = blackboard.get('hunting');
            const searchPosition = blackboard.get('searchPosition');
            
            if (!enemy || !hunting || !searchPosition) return NodeStatus.FAILURE;
            
            hunting.callForBackup(searchPosition);
            return NodeStatus.SUCCESS;
        }
    }
    
    class AggressivePatrol extends BehaviorNode {
        execute(blackboard, deltaTime) {
            // Similar to Patrol but with faster movement and wider search
            const patrol = new Patrol();
            const result = patrol.execute(blackboard, deltaTime);
            
            // Increase speed for aggressive patrol
            const enemy = blackboard.get('enemy');
            if (enemy && enemy.velocity) {
                enemy.velocity.x *= 1.5;
                enemy.velocity.y *= 1.5;
            }
            
            return result;
        }
    }
    
    // Export to window
    window.AdvancedEnemyAI = {
        AdvancedEnemy,
        PerceptionSystem,
        BehaviorTree,
        Blackboard,
        HuntingBehavior,
        TacticalBehavior,
        
        // Export node types for custom behaviors
        BehaviorNode,
        Selector,
        Sequence,
        Parallel,
        Inverter,
        Repeater,
        
        // Export status enum
        NodeStatus,
        
        // Utility function to create enemy
        createEnemy: function(x, y, type = 'soldier', config = {}) {
            return new AdvancedEnemy(x, y, {...config, type});
        }
    };
    
})(window);