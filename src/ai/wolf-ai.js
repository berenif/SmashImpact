// Advanced Wolf AI System with Pack Tactics
(function(window) {
    'use strict';

    // Wolf AI Configuration
    const WOLF_CONFIG = {
        // Movement and detection
        BASE_SPEED: 2.5,
        SPRINT_SPEED: 4.0,
        STEALTH_SPEED: 1.2,
        DETECTION_RANGE: 8,
        AMBUSH_DETECTION_RANGE: 3,
        ATTACK_RANGE: 1.5,
        
        // Behavior timings
        PATROL_SPEED: 1.5,
        RETREAT_DURATION: 2000,
        AMBUSH_PATIENCE: 5000,
        HOWL_COOLDOWN: 10000,
        ATTACK_COOLDOWN: 1500,
        
        // Pack coordination
        MAX_PACK_SIZE: 5,
        FLANKING_ANGLE: 45, // degrees
        COORDINATION_RANGE: 12,
        
        // Health and damage
        HEALTH: 40,
        DAMAGE: 12,
        CRITICAL_HEALTH_PERCENT: 0.3,
        
        // AI decision weights
        AGGRESSION_BASE: 0.5,
        PACK_CONFIDENCE_BONUS: 0.15, // per pack member
        INJURED_AGGRESSION_PENALTY: 0.3
    };

    // Wolf states for state machine
    const WolfState = {
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

    // Wolf roles in pack
    const WolfRole = {
        ALPHA: 'alpha',        // Leader, coordinates pack
        CHASER: 'chaser',      // Direct pursuit
        FLANKER: 'flanker',    // Circle around for cutoff
        AMBUSHER: 'ambusher',  // Hide and wait
        SUPPORT: 'support'     // Flexible role
    };

    // Pathfinding node for A* algorithm
    class PathNode {
        constructor(x, y, g = 0, h = 0, parent = null) {
            this.x = x;
            this.y = y;
            this.g = g; // Cost from start
            this.h = h; // Heuristic to goal
            this.f = g + h; // Total cost
            this.parent = parent;
        }
    }

    // Advanced Pathfinding with maze awareness
    class MazePathfinder {
        constructor(gridWidth, gridHeight, obstacles) {
            this.gridWidth = gridWidth;
            this.gridHeight = gridHeight;
            this.obstacles = obstacles;
            this.grid = this.buildGrid();
            this.shortcuts = this.findShortcuts();
        }

        buildGrid() {
            const grid = [];
            for (let y = 0; y < this.gridHeight; y++) {
                grid[y] = [];
                for (let x = 0; x < this.gridWidth; x++) {
                    grid[y][x] = this.isWalkable(x, y) ? 0 : 1;
                }
            }
            return grid;
        }

        isWalkable(x, y) {
            // Check if position collides with obstacles
            for (const obstacle of this.obstacles) {
                if (x >= obstacle.x - obstacle.width/2 && 
                    x <= obstacle.x + obstacle.width/2 &&
                    y >= obstacle.y - obstacle.height/2 && 
                    y <= obstacle.y + obstacle.height/2) {
                    return false;
                }
            }
            return true;
        }

        findShortcuts() {
            // Identify narrow passages and alternate routes wolves can use
            const shortcuts = [];
            
            // Find gaps in walls that wolves can squeeze through
            for (let y = 1; y < this.gridHeight - 1; y++) {
                for (let x = 1; x < this.gridWidth - 1; x++) {
                    if (this.grid[y][x] === 0) {
                        // Check if this is a narrow passage (1-2 tiles wide)
                        let narrowHorizontal = (this.grid[y-1][x] === 1 && this.grid[y+1][x] === 1);
                        let narrowVertical = (this.grid[y][x-1] === 1 && this.grid[y][x+1] === 1);
                        
                        if (narrowHorizontal || narrowVertical) {
                            shortcuts.push({ x, y, type: 'passage' });
                        }
                    }
                }
            }
            
            return shortcuts;
        }

        findPath(startX, startY, goalX, goalY, allowShortcuts = false) {
            const start = new PathNode(Math.floor(startX), Math.floor(startY));
            const goal = { x: Math.floor(goalX), y: Math.floor(goalY) };
            
            const openSet = [start];
            const closedSet = new Set();
            
            while (openSet.length > 0) {
                // Get node with lowest f score
                let current = openSet.reduce((min, node) => node.f < min.f ? node : min);
                
                // Check if we reached the goal
                if (current.x === goal.x && current.y === goal.y) {
                    return this.reconstructPath(current);
                }
                
                // Move current from open to closed
                openSet.splice(openSet.indexOf(current), 1);
                closedSet.add(`${current.x},${current.y}`);
                
                // Check neighbors
                const neighbors = this.getNeighbors(current.x, current.y, allowShortcuts);
                
                for (const neighbor of neighbors) {
                    const key = `${neighbor.x},${neighbor.y}`;
                    if (closedSet.has(key)) continue;
                    
                    const g = current.g + this.getMoveCost(current, neighbor, allowShortcuts);
                    const h = this.heuristic(neighbor, goal);
                    
                    let inOpenSet = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                    
                    if (!inOpenSet) {
                        openSet.push(new PathNode(neighbor.x, neighbor.y, g, h, current));
                    } else if (g < inOpenSet.g) {
                        inOpenSet.g = g;
                        inOpenSet.f = g + h;
                        inOpenSet.parent = current;
                    }
                }
            }
            
            return null; // No path found
        }

        getNeighbors(x, y, allowShortcuts) {
            const neighbors = [];
            const directions = [
                { x: 0, y: -1 }, { x: 1, y: 0 }, 
                { x: 0, y: 1 }, { x: -1, y: 0 },
                // Diagonals
                { x: 1, y: -1 }, { x: 1, y: 1 },
                { x: -1, y: 1 }, { x: -1, y: -1 }
            ];
            
            for (const dir of directions) {
                const nx = x + dir.x;
                const ny = y + dir.y;
                
                if (nx >= 0 && nx < this.gridWidth && 
                    ny >= 0 && ny < this.gridHeight) {
                    
                    // Wolves can move through some obstacles if shortcuts allowed
                    if (this.grid[ny][nx] === 0 || 
                        (allowShortcuts && this.isShortcut(nx, ny))) {
                        neighbors.push({ x: nx, y: ny });
                    }
                }
            }
            
            return neighbors;
        }

        isShortcut(x, y) {
            return this.shortcuts.some(s => s.x === x && s.y === y);
        }

        getMoveCost(from, to, allowShortcuts) {
            const dx = Math.abs(to.x - from.x);
            const dy = Math.abs(to.y - from.y);
            const diagonal = dx === 1 && dy === 1;
            
            let cost = diagonal ? 1.414 : 1;
            
            // Shortcuts have higher cost but wolves can use them
            if (allowShortcuts && this.isShortcut(to.x, to.y)) {
                cost *= 1.5;
            }
            
            return cost;
        }

        heuristic(pos, goal) {
            // Manhattan distance with diagonal movement
            const dx = Math.abs(pos.x - goal.x);
            const dy = Math.abs(pos.y - goal.y);
            return dx + dy + (Math.sqrt(2) - 2) * Math.min(dx, dy);
        }

        reconstructPath(node) {
            const path = [];
            while (node) {
                path.unshift({ x: node.x, y: node.y });
                node = node.parent;
            }
            return path;
        }
    }

    // Wolf Pack Coordinator
    class PackCoordinator {
        constructor() {
            this.packs = new Map();
            this.wolfPacks = new Map(); // wolf id -> pack id
        }

        createPack(wolves) {
            const packId = Date.now();
            const pack = {
                id: packId,
                members: wolves,
                alpha: wolves[0],
                target: null,
                strategy: 'hunt',
                formation: 'spread'
            };
            
            this.packs.set(packId, pack);
            wolves.forEach(wolf => this.wolfPacks.set(wolf.id, packId));
            
            return pack;
        }

        assignRoles(pack) {
            if (!pack || pack.members.length === 0) return;
            
            // Alpha is always the first or strongest
            pack.members[0].role = WolfRole.ALPHA;
            
            if (pack.members.length === 1) return;
            
            // Assign roles based on position and pack size
            const target = pack.target;
            if (!target) {
                // Default patrol roles
                pack.members.forEach((wolf, i) => {
                    if (i === 0) return; // Alpha already assigned
                    wolf.role = i % 2 === 0 ? WolfRole.FLANKER : WolfRole.CHASER;
                });
            } else {
                // Combat roles based on position relative to target
                pack.members.forEach((wolf, i) => {
                    if (i === 0) return; // Alpha
                    
                    const angle = Math.atan2(wolf.y - target.y, wolf.x - target.x);
                    const distance = Math.sqrt(
                        Math.pow(wolf.x - target.x, 2) + 
                        Math.pow(wolf.y - target.y, 2)
                    );
                    
                    if (i === 1) {
                        wolf.role = WolfRole.CHASER;
                    } else if (distance > 6 && pack.members.length > 3) {
                        wolf.role = WolfRole.AMBUSHER;
                    } else if (i % 2 === 0) {
                        wolf.role = WolfRole.FLANKER;
                    } else {
                        wolf.role = WolfRole.SUPPORT;
                    }
                });
            }
        }

        coordinateAttack(pack, target) {
            if (!pack || !target) return;
            
            pack.target = target;
            pack.strategy = this.determineStrategy(pack, target);
            
            // Assign roles based on strategy
            this.assignRoles(pack);
            
            // Send coordination signals
            pack.members.forEach(wolf => {
                wolf.packStrategy = pack.strategy;
                wolf.packTarget = target;
            });
            
            // Alpha howls to signal attack
            if (pack.alpha && pack.alpha.canHowl()) {
                pack.alpha.howl();
            }
        }

        determineStrategy(pack, target) {
            const avgDistance = pack.members.reduce((sum, wolf) => {
                const dx = wolf.x - target.x;
                const dy = wolf.y - target.y;
                return sum + Math.sqrt(dx * dx + dy * dy);
            }, 0) / pack.members.length;
            
            const targetHealth = target.health / target.maxHealth;
            const packSize = pack.members.length;
            
            // Choose strategy based on conditions
            if (targetHealth < 0.3 && packSize >= 3) {
                return 'funnel'; // Endgame funnel
            } else if (avgDistance > 10 && packSize >= 2) {
                return 'ambush'; // Set up ambush
            } else if (packSize >= 3) {
                return 'surround'; // Surround and attack
            } else {
                return 'hunt'; // Basic hunting
            }
        }

        updatePack(packId) {
            const pack = this.packs.get(packId);
            if (!pack) return;
            
            // Remove dead members
            pack.members = pack.members.filter(w => w.state !== WolfState.DEAD);
            
            if (pack.members.length === 0) {
                this.packs.delete(packId);
                return;
            }
            
            // Update alpha if needed
            if (!pack.members.includes(pack.alpha)) {
                pack.alpha = pack.members[0];
                pack.alpha.role = WolfRole.ALPHA;
            }
            
            // Re-evaluate strategy periodically
            if (pack.target && Math.random() < 0.02) {
                this.coordinateAttack(pack, pack.target);
            }
        }
    }

    // Main Wolf Class
    class Wolf {
        constructor(x, y, id, gameState) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.z = 0;
            this.vx = 0;
            this.vy = 0;
            
            // Stats
            this.health = WOLF_CONFIG.HEALTH;
            this.maxHealth = WOLF_CONFIG.HEALTH;
            this.speed = WOLF_CONFIG.BASE_SPEED;
            this.damage = WOLF_CONFIG.DAMAGE;
            
            // State machine
            this.state = WolfState.IDLE;
            this.previousState = null;
            this.stateTimer = 0;
            this.stateDuration = 0;
            
            // Pack info
            this.role = WolfRole.SUPPORT;
            this.packId = null;
            this.packStrategy = null;
            this.packTarget = null;
            
            // Behavior properties
            this.target = null;
            this.patrolPath = [];
            this.currentPathIndex = 0;
            this.ambushSpot = null;
            this.lastAttack = 0;
            this.lastHowl = 0;
            this.retreatTimer = 0;
            this.alertLevel = 0;
            
            // Pathfinding
            this.pathfinder = null;
            this.currentPath = null;
            this.pathIndex = 0;
            
            // Visual properties
            this.facing = 0; // Angle in radians
            this.animationPhase = 0;
            this.hitFlash = 0;
            this.color = '#4a5568'; // Dark gray
            this.eyeGlow = 0;
            
            // Reference to game state
            this.gameState = gameState;
            
            // Aggression calculation
            this.aggression = WOLF_CONFIG.AGGRESSION_BASE;
        }

        update(deltaTime, wolves, players, obstacles) {
            // Update timers
            this.stateTimer += deltaTime;
            this.animationPhase += deltaTime * 0.01;
            
            if (this.hitFlash > 0) {
                this.hitFlash -= deltaTime * 3;
            }
            
            // Initialize pathfinder if needed
            if (!this.pathfinder && obstacles) {
                this.pathfinder = new MazePathfinder(
                    Math.ceil(this.gameState.gridWidth),
                    Math.ceil(this.gameState.gridHeight),
                    obstacles
                );
            }
            
            // Update aggression based on pack and health
            this.updateAggression(wolves);
            
            // State machine update
            this.updateStateMachine(deltaTime, wolves, players);
            
            // Movement update
            this.updateMovement(deltaTime);
            
            // Keep in bounds
            this.x = Math.max(1, Math.min(this.gameState.gridWidth - 1, this.x));
            this.y = Math.max(1, Math.min(this.gameState.gridHeight - 1, this.y));
        }

        updateAggression(wolves) {
            // Base aggression
            this.aggression = WOLF_CONFIG.AGGRESSION_BASE;
            
            // Pack confidence
            const nearbyWolves = wolves.filter(w => {
                if (w === this || w.state === WolfState.DEAD) return false;
                const dx = w.x - this.x;
                const dy = w.y - this.y;
                return Math.sqrt(dx * dx + dy * dy) < WOLF_CONFIG.COORDINATION_RANGE;
            });
            
            this.aggression += nearbyWolves.length * WOLF_CONFIG.PACK_CONFIDENCE_BONUS;
            
            // Health penalty
            const healthPercent = this.health / this.maxHealth;
            if (healthPercent < WOLF_CONFIG.CRITICAL_HEALTH_PERCENT) {
                this.aggression -= WOLF_CONFIG.INJURED_AGGRESSION_PENALTY;
            }
            
            this.aggression = Math.max(0.1, Math.min(1, this.aggression));
        }

        updateStateMachine(deltaTime, wolves, players) {
            switch (this.state) {
                case WolfState.IDLE:
                    this.handleIdleState(players);
                    break;
                    
                case WolfState.PATROL:
                    this.handlePatrolState(players);
                    break;
                    
                case WolfState.STALKING:
                    this.handleStalkingState(players);
                    break;
                    
                case WolfState.AMBUSH:
                    this.handleAmbushState(players);
                    break;
                    
                case WolfState.CHASING:
                    this.handleChasingState(players, wolves);
                    break;
                    
                case WolfState.FLANKING:
                    this.handleFlankingState(players);
                    break;
                    
                case WolfState.ATTACKING:
                    this.handleAttackingState(players);
                    break;
                    
                case WolfState.RETREATING:
                    this.handleRetreatingState(deltaTime);
                    break;
                    
                case WolfState.HOWLING:
                    this.handleHowlingState(wolves);
                    break;
                    
                case WolfState.REGROUPING:
                    this.handleRegroupingState(wolves);
                    break;
            }
        }

        handleIdleState(players) {
            // Look for players
            const nearestPlayer = this.findNearestPlayer(players);
            
            if (nearestPlayer) {
                const distance = this.getDistanceTo(nearestPlayer);
                
                if (distance < WOLF_CONFIG.DETECTION_RANGE) {
                    this.target = nearestPlayer;
                    this.alertLevel = 1;
                    
                    // Decide initial action based on role and aggression
                    if (this.role === WolfRole.AMBUSHER && Math.random() < 0.5) {
                        this.setState(WolfState.AMBUSH);
                        this.findAmbushSpot();
                    } else if (this.aggression > 0.7) {
                        this.setState(WolfState.CHASING);
                    } else {
                        this.setState(WolfState.STALKING);
                    }
                } else {
                    // Start patrolling
                    this.setState(WolfState.PATROL);
                    this.generatePatrolPath();
                }
            } else {
                this.setState(WolfState.PATROL);
                this.generatePatrolPath();
            }
        }

        handlePatrolState(players) {
            // Move along patrol path
            if (this.patrolPath.length > 0) {
                const target = this.patrolPath[this.currentPathIndex];
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 0.5) {
                    this.currentPathIndex = (this.currentPathIndex + 1) % this.patrolPath.length;
                } else {
                    this.vx = (dx / dist) * WOLF_CONFIG.PATROL_SPEED * 0.016;
                    this.vy = (dy / dist) * WOLF_CONFIG.PATROL_SPEED * 0.016;
                }
            }
            
            // Check for players
            const nearestPlayer = this.findNearestPlayer(players);
            if (nearestPlayer) {
                const distance = this.getDistanceTo(nearestPlayer);
                
                if (distance < WOLF_CONFIG.DETECTION_RANGE * 0.7) {
                    this.target = nearestPlayer;
                    
                    // Check for ambush opportunity
                    if (this.isGoodAmbushPosition() && Math.random() < 0.4) {
                        this.setState(WolfState.AMBUSH);
                        this.ambushSpot = { x: this.x, y: this.y };
                    } else {
                        this.setState(WolfState.STALKING);
                    }
                }
            }
        }

        handleStalkingState(players) {
            if (!this.target || this.target.health <= 0) {
                this.setState(WolfState.PATROL);
                return;
            }
            
            const distance = this.getDistanceTo(this.target);
            
            // Maintain distance while stalking
            if (distance > WOLF_CONFIG.DETECTION_RANGE) {
                // Lost target
                this.setState(WolfState.PATROL);
            } else if (distance < 4) {
                // Close enough to attack or pressure
                if (this.aggression > 0.6) {
                    this.setState(WolfState.CHASING);
                } else {
                    // Hit and run tactic
                    this.setState(WolfState.ATTACKING);
                }
            } else {
                // Stalk - move slowly and circle
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                const circleAngle = angle + Math.sin(this.animationPhase) * 0.5;
                
                this.vx = Math.cos(circleAngle) * WOLF_CONFIG.STEALTH_SPEED * 0.016;
                this.vy = Math.sin(circleAngle) * WOLF_CONFIG.STEALTH_SPEED * 0.016;
                
                this.eyeGlow = Math.sin(this.animationPhase * 2) * 0.5 + 0.5;
            }
        }

        handleAmbushState(players) {
            if (!this.target || this.target.health <= 0) {
                this.setState(WolfState.PATROL);
                return;
            }
            
            // Stay hidden at ambush spot
            if (this.ambushSpot) {
                const dx = this.ambushSpot.x - this.x;
                const dy = this.ambushSpot.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.2) {
                    this.vx = (dx / dist) * WOLF_CONFIG.STEALTH_SPEED * 0.016;
                    this.vy = (dy / dist) * WOLF_CONFIG.STEALTH_SPEED * 0.016;
                } else {
                    this.vx = 0;
                    this.vy = 0;
                }
            }
            
            // Check if target is close enough to spring ambush
            const distance = this.getDistanceTo(this.target);
            
            if (distance < WOLF_CONFIG.AMBUSH_DETECTION_RANGE) {
                // Spring the ambush!
                this.setState(WolfState.ATTACKING);
                this.howl(); // Alert pack
            } else if (this.stateTimer > WOLF_CONFIG.AMBUSH_PATIENCE / 1000) {
                // Patience ran out
                this.setState(WolfState.STALKING);
            }
            
            // Glowing eyes effect while hiding
            this.eyeGlow = Math.sin(this.animationPhase) * 0.3 + 0.7;
        }

        handleChasingState(players, wolves) {
            if (!this.target || this.target.health <= 0) {
                this.setState(WolfState.PATROL);
                return;
            }
            
            const distance = this.getDistanceTo(this.target);
            
            if (distance < WOLF_CONFIG.ATTACK_RANGE) {
                this.setState(WolfState.ATTACKING);
            } else if (distance > WOLF_CONFIG.DETECTION_RANGE * 1.5) {
                // Lost target
                this.setState(WolfState.PATROL);
            } else {
                // Use pathfinding for intelligent chase
                if (this.pathfinder && (!this.currentPath || Math.random() < 0.1)) {
                    this.currentPath = this.pathfinder.findPath(
                        this.x, this.y,
                        this.target.x, this.target.y,
                        true // Allow shortcuts
                    );
                    this.pathIndex = 0;
                }
                
                if (this.currentPath && this.pathIndex < this.currentPath.length) {
                    const node = this.currentPath[this.pathIndex];
                    const dx = node.x - this.x;
                    const dy = node.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < 0.5) {
                        this.pathIndex++;
                    } else {
                        this.vx = (dx / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                        this.vy = (dy / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                    }
                } else {
                    // Direct chase if no path
                    const dx = this.target.x - this.x;
                    const dy = this.target.y - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    this.vx = (dx / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                    this.vy = (dy / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                }
                
                // Coordinate with pack
                if (this.role === WolfRole.ALPHA && Math.random() < 0.02) {
                    this.howl();
                }
            }
        }

        handleFlankingState(players) {
            if (!this.target || this.target.health <= 0) {
                this.setState(WolfState.PATROL);
                return;
            }
            
            // Calculate flanking position
            const targetVx = this.target.vx || 0;
            const targetVy = this.target.vy || 0;
            const targetSpeed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
            
            let flankX, flankY;
            
            if (targetSpeed > 0.1) {
                // Predict where target is heading
                const predictTime = 2;
                flankX = this.target.x + targetVx * predictTime;
                flankY = this.target.y + targetVy * predictTime;
            } else {
                // Circle around stationary target
                const angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
                const flankAngle = angle + (this.role === WolfRole.FLANKER ? 1 : -1) * Math.PI / 3;
                const flankDist = 5;
                
                flankX = this.target.x + Math.cos(flankAngle) * flankDist;
                flankY = this.target.y + Math.sin(flankAngle) * flankDist;
            }
            
            // Move to flanking position
            const dx = flankX - this.x;
            const dy = flankY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 1) {
                this.vx = (dx / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                this.vy = (dy / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
            } else {
                // In position, switch to chase
                this.setState(WolfState.CHASING);
            }
        }

        handleAttackingState(players) {
            if (!this.target || this.target.health <= 0) {
                this.setState(WolfState.PATROL);
                return;
            }
            
            const distance = this.getDistanceTo(this.target);
            
            if (distance < WOLF_CONFIG.ATTACK_RANGE) {
                // Attack!
                const now = Date.now();
                if (now - this.lastAttack > WOLF_CONFIG.ATTACK_COOLDOWN) {
                    this.lastAttack = now;
                    
                    if (this.target.takeDamage) {
                        this.target.takeDamage(this.damage);
                        
                        // Visual feedback
                        if (this.gameState && this.gameState.particles) {
                            for (let i = 0; i < 5; i++) {
                                this.gameState.particles.push({
                                    x: this.target.x,
                                    y: this.target.y,
                                    z: 0.5,
                                    vx: (Math.random() - 0.5) * 3,
                                    vy: (Math.random() - 0.5) * 3,
                                    vz: Math.random() * 2,
                                    color: '#ef4444',
                                    size: 4,
                                    life: 1,
                                    decay: 0.05
                                });
                            }
                        }
                    }
                    
                    // Decide next action - pressure and retreat
                    if (this.aggression < 0.5 || this.health < this.maxHealth * 0.3) {
                        this.setState(WolfState.RETREATING);
                        this.retreatTimer = WOLF_CONFIG.RETREAT_DURATION;
                    } else if (Math.random() < 0.3) {
                        // Brief retreat for hit-and-run
                        this.setState(WolfState.RETREATING);
                        this.retreatTimer = WOLF_CONFIG.RETREAT_DURATION * 0.5;
                    }
                }
                
                // Circle while waiting for cooldown
                const angle = Math.atan2(this.y - this.target.y, this.x - this.target.x);
                const circleAngle = angle + Math.PI / 2;
                
                this.vx = Math.cos(circleAngle) * WOLF_CONFIG.BASE_SPEED * 0.016;
                this.vy = Math.sin(circleAngle) * WOLF_CONFIG.BASE_SPEED * 0.016;
            } else {
                // Too far, chase again
                this.setState(WolfState.CHASING);
            }
        }

        handleRetreatingState(deltaTime) {
            this.retreatTimer -= deltaTime * 1000;
            
            if (this.retreatTimer <= 0) {
                // Retreat finished, reassess
                if (this.health < this.maxHealth * 0.3) {
                    this.setState(WolfState.REGROUPING);
                } else {
                    this.setState(WolfState.STALKING);
                }
                return;
            }
            
            // Move away from target
            if (this.target) {
                const dx = this.x - this.target.x;
                const dy = this.y - this.target.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    this.vx = (dx / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                    this.vy = (dy / dist) * WOLF_CONFIG.SPRINT_SPEED * 0.016;
                }
            }
        }

        handleHowlingState(wolves) {
            // Howling animation
            this.vx = 0;
            this.vy = 0;
            
            if (this.stateTimer > 2) {
                // Howl complete
                this.setState(WolfState.CHASING);
                
                // Rally nearby wolves
                wolves.forEach(wolf => {
                    if (wolf === this) return;
                    const dist = this.getDistanceTo(wolf);
                    if (dist < WOLF_CONFIG.COORDINATION_RANGE) {
                        wolf.alertLevel = 1;
                        wolf.target = this.target;
                        if (wolf.state === WolfState.PATROL || wolf.state === WolfState.IDLE) {
                            wolf.setState(WolfState.CHASING);
                        }
                    }
                });
            }
        }

        handleRegroupingState(wolves) {
            // Find nearest pack member
            let nearestAlly = null;
            let nearestDist = Infinity;
            
            wolves.forEach(wolf => {
                if (wolf === this || wolf.state === WolfState.DEAD) return;
                const dist = this.getDistanceTo(wolf);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestAlly = wolf;
                }
            });
            
            if (nearestAlly && nearestDist > 3) {
                // Move toward ally
                const dx = nearestAlly.x - this.x;
                const dy = nearestAlly.y - this.y;
                
                this.vx = (dx / nearestDist) * WOLF_CONFIG.BASE_SPEED * 0.016;
                this.vy = (dy / nearestDist) * WOLF_CONFIG.BASE_SPEED * 0.016;
            } else {
                // Regrouped, return to stalking
                this.setState(WolfState.STALKING);
            }
        }

        updateMovement(deltaTime) {
            // Apply velocity
            this.x += this.vx;
            this.y += this.vy;
            
            // Friction
            this.vx *= 0.95;
            this.vy *= 0.95;
            
            // Update facing direction
            if (Math.abs(this.vx) > 0.01 || Math.abs(this.vy) > 0.01) {
                this.facing = Math.atan2(this.vy, this.vx);
            }
        }

        setState(newState) {
            if (this.state !== newState) {
                this.previousState = this.state;
                this.state = newState;
                this.stateTimer = 0;
                this.onStateEnter(newState);
            }
        }

        onStateEnter(state) {
            switch (state) {
                case WolfState.AMBUSH:
                    this.eyeGlow = 0.3;
                    break;
                case WolfState.HOWLING:
                    this.lastHowl = Date.now();
                    // Trigger howl sound if available
                    if (this.gameState && this.gameState.playSound) {
                        this.gameState.playSound('wolf_howl');
                    }
                    break;
                case WolfState.CHASING:
                    this.eyeGlow = 1;
                    break;
            }
        }

        generatePatrolPath() {
            this.patrolPath = [];
            const points = 4 + Math.floor(Math.random() * 3);
            
            for (let i = 0; i < points; i++) {
                this.patrolPath.push({
                    x: 2 + Math.random() * (this.gameState.gridWidth - 4),
                    y: 2 + Math.random() * (this.gameState.gridHeight - 4)
                });
            }
            
            this.currentPathIndex = 0;
        }

        findAmbushSpot() {
            // Find a good hiding spot near choke points or corners
            const spots = [];
            
            // Look for corners and dead ends in the maze
            for (let x = 1; x < this.gameState.gridWidth - 1; x++) {
                for (let y = 1; y < this.gameState.gridHeight - 1; y++) {
                    if (this.isGoodAmbushPosition(x, y)) {
                        spots.push({ x, y });
                    }
                }
            }
            
            if (spots.length > 0) {
                // Choose closest spot to target's predicted path
                let bestSpot = spots[0];
                let bestScore = Infinity;
                
                spots.forEach(spot => {
                    const distToTarget = Math.sqrt(
                        Math.pow(spot.x - this.target.x, 2) +
                        Math.pow(spot.y - this.target.y, 2)
                    );
                    const distToSelf = Math.sqrt(
                        Math.pow(spot.x - this.x, 2) +
                        Math.pow(spot.y - this.y, 2)
                    );
                    
                    const score = distToTarget + distToSelf * 0.5;
                    if (score < bestScore) {
                        bestScore = score;
                        bestSpot = spot;
                    }
                });
                
                this.ambushSpot = bestSpot;
            } else {
                // No good spots, just hide nearby
                this.ambushSpot = {
                    x: this.x + (Math.random() - 0.5) * 4,
                    y: this.y + (Math.random() - 0.5) * 4
                };
            }
        }

        isGoodAmbushPosition(x, y) {
            if (!x) {
                x = this.x;
                y = this.y;
            }
            
            // Check if position is near walls (good for ambush)
            let wallCount = 0;
            const checkDist = 2;
            
            if (this.gameState && this.gameState.obstacles) {
                this.gameState.obstacles.forEach(obstacle => {
                    const dx = Math.abs(obstacle.x - x);
                    const dy = Math.abs(obstacle.y - y);
                    if (dx < checkDist && dy < checkDist) {
                        wallCount++;
                    }
                });
            }
            
            // Good ambush spots have 2-3 nearby walls (corners)
            return wallCount >= 2 && wallCount <= 3;
        }

        findNearestPlayer(players) {
            let nearest = null;
            let nearestDist = Infinity;
            
            players.forEach(player => {
                if (player.health <= 0) return;
                const dist = this.getDistanceTo(player);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = player;
                }
            });
            
            return nearest;
        }

        getDistanceTo(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            return Math.sqrt(dx * dx + dy * dy);
        }

        canHowl() {
            const now = Date.now();
            return now - this.lastHowl > WOLF_CONFIG.HOWL_COOLDOWN;
        }

        howl() {
            if (this.canHowl()) {
                this.setState(WolfState.HOWLING);
            }
        }

        takeDamage(amount) {
            this.health -= amount;
            this.hitFlash = 1;
            
            if (this.health <= 0) {
                this.setState(WolfState.DEAD);
                return true;
            }
            
            // Reaction to damage
            if (this.state !== WolfState.RETREATING && this.aggression < 0.4) {
                this.setState(WolfState.RETREATING);
                this.retreatTimer = WOLF_CONFIG.RETREAT_DURATION * 0.5;
            }
            
            return false;
        }

        draw(ctx, cartesianToIsometric) {
            if (this.state === WolfState.DEAD) return;
            
            const iso = cartesianToIsometric(this.x, this.y, this.z);
            
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            // Shadow
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * (1 - this.z / 10)})`;
            ctx.beginPath();
            ctx.ellipse(0, 5, 25, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Body
            const bodyColor = this.hitFlash > 0 ? '#ef4444' : this.color;
            
            // Wolf body shape (more detailed)
            ctx.fillStyle = bodyColor;
            ctx.save();
            ctx.rotate(this.facing);
            
            // Main body
            ctx.beginPath();
            ctx.ellipse(0, -10, 20, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Head
            ctx.beginPath();
            ctx.ellipse(15, -12, 12, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Snout
            ctx.beginPath();
            ctx.ellipse(25, -10, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Tail
            const tailWag = Math.sin(this.animationPhase * 10) * 0.2;
            ctx.save();
            ctx.rotate(tailWag);
            ctx.beginPath();
            ctx.ellipse(-20, -8, 15, 8, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Eyes (glowing in certain states)
            if (this.eyeGlow > 0) {
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 10 * this.eyeGlow;
                ctx.fillStyle = `rgba(255, 0, 0, ${this.eyeGlow})`;
                ctx.beginPath();
                ctx.arc(18, -15, 2, 0, Math.PI * 2);
                ctx.arc(22, -15, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            ctx.restore();
            
            // Health bar if damaged
            if (this.health < this.maxHealth) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-20, -35, 40, 4);
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = healthPercent > 0.3 ? '#10b981' : '#ef4444';
                ctx.fillRect(-20, -35, 40 * healthPercent, 4);
            }
            
            // State indicator (debug)
            if (this.gameState && this.gameState.debug) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.state, 0, -40);
            }
            
            ctx.restore();
        }
    }

    // Export to global scope
    window.WolfAI = {
        Wolf: Wolf,
        PackCoordinator: PackCoordinator,
        WolfState: WolfState,
        WolfRole: WolfRole,
        WOLF_CONFIG: WOLF_CONFIG
    };

})(window);