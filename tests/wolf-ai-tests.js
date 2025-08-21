/**
 * Wolf AI Behavior Tests
 * Tests for wolf AI pathfinding, pack behavior, and hunting strategies
 */

const { describe, test, expect, beforeEach, afterEach } = require('@jest/globals');

// Wolf AI implementation
class WolfAI {
    constructor(x, y, id) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.health = 100;
        this.damage = 15;
        this.radius = 15;
        this.state = 'idle'; // idle, hunting, attacking, fleeing, pack_hunting
        this.target = null;
        this.pack = [];
        this.alertRadius = 200;
        this.attackRadius = 30;
        this.fleeThreshold = 30;
        this.lastDecisionTime = 0;
        this.decisionInterval = 500; // ms
        this.path = [];
        this.currentPathIndex = 0;
    }

    update(deltaTime, player, otherWolves, obstacles) {
        const now = Date.now();
        
        // Make decisions at intervals
        if (now - this.lastDecisionTime > this.decisionInterval) {
            this.makeDecision(player, otherWolves, obstacles);
            this.lastDecisionTime = now;
        }

        // Execute current behavior
        switch(this.state) {
            case 'idle':
                this.patrol();
                break;
            case 'hunting':
                this.hunt(player);
                break;
            case 'attacking':
                this.attack(player);
                break;
            case 'fleeing':
                this.flee(player);
                break;
            case 'pack_hunting':
                this.packHunt(player, otherWolves);
                break;
        }

        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Avoid obstacles
        this.avoidObstacles(obstacles);
    }

    makeDecision(player, otherWolves, obstacles) {
        const distToPlayer = this.getDistance(player);

        // Check health for fleeing
        if (this.health < this.fleeThreshold) {
            this.state = 'fleeing';
            return;
        }

        // Check for pack hunting opportunity
        const nearbyWolves = this.findNearbyWolves(otherWolves, 150);
        if (nearbyWolves.length >= 2 && distToPlayer < this.alertRadius * 1.5) {
            this.state = 'pack_hunting';
            this.pack = nearbyWolves;
            return;
        }

        // Individual behavior based on distance
        if (distToPlayer < this.attackRadius) {
            this.state = 'attacking';
        } else if (distToPlayer < this.alertRadius) {
            this.state = 'hunting';
            this.target = player;
        } else {
            this.state = 'idle';
            this.target = null;
        }
    }

    patrol() {
        // Random wandering behavior
        if (Math.random() < 0.02) {
            this.vx = (Math.random() - 0.5) * this.speed;
            this.vy = (Math.random() - 0.5) * this.speed;
        }
    }

    hunt(target) {
        if (!target) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Move towards target
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }
    }

    attack(target) {
        if (!target) return;

        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.attackRadius) {
            // Deal damage (in real implementation)
            this.vx = 0;
            this.vy = 0;
            return { damage: this.damage, target: target };
        } else {
            // Move closer
            this.hunt(target);
        }
    }

    flee(threat) {
        if (!threat) return;

        const dx = this.x - threat.x;
        const dy = this.y - threat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Move away from threat
            this.vx = (dx / distance) * this.speed * 1.5;
            this.vy = (dy / distance) * this.speed * 1.5;
        }
    }

    packHunt(target, otherWolves) {
        if (!target || !this.pack.length) {
            this.state = 'hunting';
            return;
        }

        // Coordinate with pack for flanking
        const angle = this.calculateFlankingAngle(target, otherWolves);
        const idealDistance = 50;
        
        const targetX = target.x + Math.cos(angle) * idealDistance;
        const targetY = target.y + Math.sin(angle) * idealDistance;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 5) {
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        }
    }

    calculateFlankingAngle(target, otherWolves) {
        // Calculate unique angle for each wolf to surround target
        const wolfIndex = otherWolves.findIndex(w => w.id === this.id);
        const totalWolves = otherWolves.length;
        const angleStep = (Math.PI * 2) / totalWolves;
        return angleStep * wolfIndex;
    }

    findNearbyWolves(otherWolves, radius) {
        return otherWolves.filter(wolf => {
            if (wolf.id === this.id) return false;
            const dist = this.getDistance(wolf);
            return dist <= radius;
        });
    }

    avoidObstacles(obstacles) {
        if (!obstacles) return;

        obstacles.forEach(obstacle => {
            const dist = this.getDistance(obstacle);
            const minDist = this.radius + obstacle.radius + 10;

            if (dist < minDist) {
                // Push away from obstacle
                const dx = this.x - obstacle.x;
                const dy = this.y - obstacle.y;
                const force = (minDist - dist) / minDist;

                this.vx += (dx / dist) * force * 2;
                this.vy += (dy / dist) * force * 2;
            }
        });
    }

    getDistance(entity) {
        if (!entity) return Infinity;
        const dx = entity.x - this.x;
        const dy = entity.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    findPath(target, obstacles) {
        // Simple A* pathfinding implementation
        const path = [];
        const start = { x: this.x, y: this.y };
        const end = { x: target.x, y: target.y };

        // For testing, return direct path
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            path.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            });
        }

        this.path = path;
        this.currentPathIndex = 0;
        return path;
    }

    followPath() {
        if (!this.path.length || this.currentPathIndex >= this.path.length) {
            return false;
        }

        const target = this.path[this.currentPathIndex];
        const dist = this.getDistance(target);

        if (dist < 5) {
            this.currentPathIndex++;
            if (this.currentPathIndex >= this.path.length) {
                this.path = [];
                return false;
            }
        }

        const dx = target.x - this.x;
        const dy = target.y - this.y;

        if (dist > 0) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        }

        return true;
    }

    communicateWithPack(message, data) {
        // Simulate pack communication
        this.pack.forEach(wolf => {
            wolf.receiveMessage(this.id, message, data);
        });
    }

    receiveMessage(senderId, message, data) {
        // Handle messages from pack members
        switch(message) {
            case 'target_spotted':
                if (!this.target) {
                    this.target = data.target;
                    this.state = 'hunting';
                }
                break;
            case 'need_help':
                if (this.state === 'idle') {
                    this.state = 'hunting';
                    this.target = data.target;
                }
                break;
            case 'retreat':
                this.state = 'fleeing';
                break;
        }
    }
}

describe('Wolf AI Behavior Tests', () => {
    let wolf;
    let player;
    let otherWolves;
    let obstacles;

    beforeEach(() => {
        wolf = new WolfAI(100, 100, 1);
        player = { x: 200, y: 200, health: 100 };
        otherWolves = [];
        obstacles = [];
    });

    describe('Basic Wolf Properties', () => {
        test('should initialize with correct properties', () => {
            expect(wolf.x).toBe(100);
            expect(wolf.y).toBe(100);
            expect(wolf.health).toBe(100);
            expect(wolf.state).toBe('idle');
            expect(wolf.speed).toBe(2);
        });

        test('should calculate distance correctly', () => {
            const target = { x: 103, y: 104 };
            const distance = wolf.getDistance(target);
            expect(distance).toBeCloseTo(5, 1);
        });
    });

    describe('State Management', () => {
        test('should transition to hunting when player is in alert radius', () => {
            player = { x: 150, y: 150, health: 100 };
            wolf.makeDecision(player, otherWolves, obstacles);
            expect(wolf.state).toBe('hunting');
            expect(wolf.target).toBe(player);
        });

        test('should transition to attacking when player is close', () => {
            player = { x: 120, y: 120, health: 100 };
            wolf.makeDecision(player, otherWolves, obstacles);
            expect(wolf.state).toBe('attacking');
        });

        test('should flee when health is low', () => {
            wolf.health = 25;
            wolf.makeDecision(player, otherWolves, obstacles);
            expect(wolf.state).toBe('fleeing');
        });

        test('should remain idle when player is far', () => {
            player = { x: 500, y: 500, health: 100 };
            wolf.makeDecision(player, otherWolves, obstacles);
            expect(wolf.state).toBe('idle');
        });
    });

    describe('Movement Behaviors', () => {
        test('should move towards player when hunting', () => {
            wolf.state = 'hunting';
            wolf.target = player;
            wolf.hunt(player);
            
            expect(wolf.vx).toBeGreaterThan(0);
            expect(wolf.vy).toBeGreaterThan(0);
        });

        test('should move away from player when fleeing', () => {
            wolf.state = 'fleeing';
            wolf.flee(player);
            
            expect(wolf.vx).toBeLessThan(0);
            expect(wolf.vy).toBeLessThan(0);
        });

        test('should stop moving when attacking in range', () => {
            wolf.state = 'attacking';
            player = { x: 110, y: 110, health: 100 };
            const result = wolf.attack(player);
            
            expect(wolf.vx).toBe(0);
            expect(wolf.vy).toBe(0);
            expect(result.damage).toBe(15);
        });

        test('should patrol randomly when idle', () => {
            wolf.state = 'idle';
            const initialVx = wolf.vx;
            const initialVy = wolf.vy;
            
            // Run patrol multiple times to trigger random movement
            for (let i = 0; i < 100; i++) {
                wolf.patrol();
            }
            
            // At least one of the velocities should have changed
            const changed = wolf.vx !== initialVx || wolf.vy !== initialVy;
            expect(changed).toBe(true);
        });
    });

    describe('Pack Behavior', () => {
        beforeEach(() => {
            otherWolves = [
                wolf,
                new WolfAI(120, 120, 2),
                new WolfAI(130, 130, 3)
            ];
        });

        test('should find nearby wolves', () => {
            const nearby = wolf.findNearbyWolves(otherWolves, 50);
            expect(nearby.length).toBe(2);
        });

        test('should initiate pack hunting with enough wolves nearby', () => {
            player = { x: 180, y: 180, health: 100 };
            wolf.makeDecision(player, otherWolves, obstacles);
            expect(wolf.state).toBe('pack_hunting');
            expect(wolf.pack.length).toBeGreaterThan(0);
        });

        test('should calculate flanking angles for pack hunting', () => {
            const angle = wolf.calculateFlankingAngle(player, otherWolves);
            expect(angle).toBeGreaterThanOrEqual(0);
            expect(angle).toBeLessThan(Math.PI * 2);
        });

        test('should communicate with pack members', () => {
            const wolf2 = new WolfAI(120, 120, 2);
            wolf2.receiveMessage = jest.fn();
            
            wolf.pack = [wolf2];
            wolf.communicateWithPack('target_spotted', { target: player });
            
            expect(wolf2.receiveMessage).toHaveBeenCalledWith(
                1,
                'target_spotted',
                { target: player }
            );
        });

        test('should respond to pack messages', () => {
            wolf.state = 'idle';
            wolf.receiveMessage(2, 'target_spotted', { target: player });
            
            expect(wolf.state).toBe('hunting');
            expect(wolf.target).toBe(player);
        });
    });

    describe('Pathfinding', () => {
        test('should find path to target', () => {
            const target = { x: 300, y: 300 };
            const path = wolf.findPath(target, obstacles);
            
            expect(path.length).toBeGreaterThan(0);
            expect(path[0].x).toBe(wolf.x);
            expect(path[0].y).toBe(wolf.y);
            expect(path[path.length - 1].x).toBe(target.x);
            expect(path[path.length - 1].y).toBe(target.y);
        });

        test('should follow path', () => {
            const target = { x: 200, y: 200 };
            wolf.findPath(target, obstacles);
            
            // Ensure wolf is not at the target already
            wolf.x = 100;
            wolf.y = 100;
            
            const following = wolf.followPath();
            expect(following).toBe(true);
            // Velocity should be set when following path
            const hasVelocity = wolf.vx !== 0 || wolf.vy !== 0;
            expect(hasVelocity).toBe(true);
        });

        test('should advance to next path point when close', () => {
            wolf.path = [
                { x: 100, y: 100 },
                { x: 110, y: 110 },
                { x: 120, y: 120 }
            ];
            wolf.currentPathIndex = 0;
            
            // Move wolf very close to first path point
            wolf.x = 102;
            wolf.y = 102;
            wolf.followPath();
            
            expect(wolf.currentPathIndex).toBe(1);
        });
    });

    describe('Obstacle Avoidance', () => {
        test('should avoid obstacles', () => {
            obstacles = [
                { x: 110, y: 100, radius: 20 }
            ];
            
            const initialVx = wolf.vx;
            const initialVy = wolf.vy;
            
            wolf.avoidObstacles(obstacles);
            
            // Wolf should be pushed away from obstacle
            expect(wolf.vx).toBeLessThan(initialVx);
        });

        test('should not be affected by distant obstacles', () => {
            obstacles = [
                { x: 500, y: 500, radius: 20 }
            ];
            
            wolf.vx = 1;
            wolf.vy = 1;
            
            wolf.avoidObstacles(obstacles);
            
            // Velocities should remain unchanged
            expect(wolf.vx).toBe(1);
            expect(wolf.vy).toBe(1);
        });
    });

    describe('Update Loop', () => {
        test('should update position based on velocity', () => {
            wolf.vx = 2;
            wolf.vy = 3;
            
            wolf.update(1, player, otherWolves, obstacles);
            
            // Position should have changed based on velocity
            expect(wolf.x).toBeGreaterThan(100);
            expect(wolf.y).toBeGreaterThan(100);
        });

        test('should make decisions at intervals', () => {
            jest.spyOn(wolf, 'makeDecision');
            
            wolf.lastDecisionTime = Date.now() - 600;
            wolf.update(16, player, otherWolves, obstacles);
            
            expect(wolf.makeDecision).toHaveBeenCalled();
        });

        test('should execute current behavior state', () => {
            wolf.state = 'hunting';
            wolf.target = player;
            jest.spyOn(wolf, 'hunt');
            
            wolf.update(16, player, otherWolves, obstacles);
            
            expect(wolf.hunt).toHaveBeenCalledWith(player);
        });
    });

    describe('Combat Behavior', () => {
        test('should deal damage when attacking', () => {
            wolf.state = 'attacking';
            player = { x: 110, y: 110, health: 100 };
            
            const result = wolf.attack(player);
            
            expect(result).toBeDefined();
            expect(result.damage).toBe(15);
            expect(result.target).toBe(player);
        });

        test('should continue hunting if not in attack range', () => {
            wolf.state = 'attacking';
            player = { x: 200, y: 200, health: 100 };
            jest.spyOn(wolf, 'hunt');
            
            wolf.attack(player);
            
            expect(wolf.hunt).toHaveBeenCalledWith(player);
        });
    });

    describe('Advanced Pack Tactics', () => {
        test('should coordinate flanking maneuvers', () => {
            otherWolves = [
                wolf,
                new WolfAI(120, 120, 2),
                new WolfAI(130, 130, 3),
                new WolfAI(140, 140, 4)
            ];
            
            wolf.state = 'pack_hunting';
            wolf.pack = otherWolves.slice(1);
            
            wolf.packHunt(player, otherWolves);
            
            // Wolf should move to flanking position
            expect(wolf.vx).not.toBe(0);
            expect(wolf.vy).not.toBe(0);
        });

        test('should fall back to hunting if pack disperses', () => {
            wolf.state = 'pack_hunting';
            wolf.pack = [];
            
            wolf.packHunt(player, otherWolves);
            
            expect(wolf.state).toBe('hunting');
        });
    });
});

module.exports = WolfAI;