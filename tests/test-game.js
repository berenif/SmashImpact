/**
 * Game Engine Core Tests
 * Tests for main game functionality
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');

// Mock DOM environment for browser-based game code
global.document = {
    getElementById: jest.fn(),
    createElement: jest.fn(() => ({
        getContext: jest.fn(() => ({
            clearRect: jest.fn(),
            fillRect: jest.fn(),
            strokeRect: jest.fn(),
            beginPath: jest.fn(),
            arc: jest.fn(),
            fill: jest.fn(),
            stroke: jest.fn(),
            closePath: jest.fn(),
            drawImage: jest.fn(),
            save: jest.fn(),
            restore: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            scale: jest.fn(),
        })),
        width: 800,
        height: 600,
    })),
    addEventListener: jest.fn(),
};

global.window = {
    requestAnimationFrame: jest.fn(cb => setTimeout(cb, 16)),
    cancelAnimationFrame: jest.fn(id => clearTimeout(id)),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    innerWidth: 1024,
    innerHeight: 768,
};

// Game state management
class GameEngine {
    constructor() {
        this.entities = [];
        this.score = 0;
        this.wave = 1;
        this.isPaused = false;
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.powerUps = [];
        this.lastEntityId = 0;
    }

    createEntity(type, x, y, options = {}) {
        const entity = {
            id: ++this.lastEntityId,
            type,
            x,
            y,
            vx: options.vx || 0,
            vy: options.vy || 0,
            radius: options.radius || 10,
            health: options.health || 100,
            damage: options.damage || 10,
            speed: options.speed || 1,
            active: true,
            ...options
        };

        this.entities.push(entity);

        switch(type) {
            case 'player':
                this.player = entity;
                break;
            case 'enemy':
                this.enemies.push(entity);
                break;
            case 'projectile':
                this.projectiles.push(entity);
                break;
            case 'powerup':
                this.powerUps.push(entity);
                break;
        }

        return entity.id;
    }

    removeEntity(id) {
        const index = this.entities.findIndex(e => e.id === id);
        if (index !== -1) {
            const entity = this.entities[index];
            entity.active = false;
            this.entities.splice(index, 1);

            // Remove from specific arrays
            if (entity.type === 'enemy') {
                const enemyIndex = this.enemies.findIndex(e => e.id === id);
                if (enemyIndex !== -1) this.enemies.splice(enemyIndex, 1);
            } else if (entity.type === 'projectile') {
                const projIndex = this.projectiles.findIndex(e => e.id === id);
                if (projIndex !== -1) this.projectiles.splice(projIndex, 1);
            } else if (entity.type === 'powerup') {
                const powerIndex = this.powerUps.findIndex(e => e.id === id);
                if (powerIndex !== -1) this.powerUps.splice(powerIndex, 1);
            }
        }
    }

    getEntity(id) {
        return this.entities.find(e => e.id === id);
    }

    updateEntity(id, updates) {
        const entity = this.getEntity(id);
        if (entity) {
            Object.assign(entity, updates);
        }
    }

    checkCollision(entity1, entity2) {
        if (!entity1 || !entity2) return false;
        
        const dx = entity1.x - entity2.x;
        const dy = entity1.y - entity2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (entity1.radius + entity2.radius);
    }

    update(deltaTime) {
        if (this.isPaused) return;

        // Update all entities
        this.entities.forEach(entity => {
            if (entity.active) {
                entity.x += entity.vx * deltaTime;
                entity.y += entity.vy * deltaTime;

                // Keep entities within bounds
                entity.x = Math.max(entity.radius, Math.min(800 - entity.radius, entity.x));
                entity.y = Math.max(entity.radius, Math.min(600 - entity.radius, entity.y));
            }
        });

        // Check collisions
        this.checkAllCollisions();
    }

    checkAllCollisions() {
        // Player vs enemies
        if (this.player) {
            this.enemies.forEach(enemy => {
                if (this.checkCollision(this.player, enemy)) {
                    this.player.health -= enemy.damage;
                    this.removeEntity(enemy.id);
                }
            });

            // Player vs powerups
            this.powerUps.forEach(powerUp => {
                if (this.checkCollision(this.player, powerUp)) {
                    this.applyPowerUp(powerUp);
                    this.removeEntity(powerUp.id);
                }
            });
        }

        // Projectiles vs enemies
        this.projectiles.forEach(projectile => {
            this.enemies.forEach(enemy => {
                if (this.checkCollision(projectile, enemy)) {
                    enemy.health -= projectile.damage;
                    if (enemy.health <= 0) {
                        this.score += enemy.points || 10;
                        this.removeEntity(enemy.id);
                    }
                    this.removeEntity(projectile.id);
                }
            });
        });
    }

    applyPowerUp(powerUp) {
        if (!this.player) return;

        switch(powerUp.subtype) {
            case 'health':
                this.player.health = Math.min(this.player.health + 50, 100);
                break;
            case 'speed':
                this.player.speed *= 1.5;
                break;
            case 'damage':
                this.player.damage *= 2;
                break;
        }
    }

    reset() {
        this.entities = [];
        this.enemies = [];
        this.projectiles = [];
        this.powerUps = [];
        this.player = null;
        this.score = 0;
        this.wave = 1;
        this.isPaused = false;
    }

    pauseGame() {
        this.isPaused = true;
    }

    resumeGame() {
        this.isPaused = false;
    }

    nextWave() {
        this.wave++;
        this.enemies = [];
        this.spawnEnemies(this.wave * 3);
    }

    spawnEnemies(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * 800;
            const y = Math.random() * 600;
            this.createEntity('enemy', x, y, {
                speed: 1 + Math.random() * 2,
                health: 50 + this.wave * 10,
                damage: 5 + this.wave * 2,
                points: 10 * this.wave
            });
        }
    }
}

describe('Game Engine Core Tests', () => {
    let game;

    beforeEach(() => {
        game = new GameEngine();
    });

    describe('Entity Management', () => {
        test('should create player entity', () => {
            const playerId = game.createEntity('player', 400, 300);
            expect(playerId).toBeGreaterThan(0);
            expect(game.player).toBeDefined();
            expect(game.player.x).toBe(400);
            expect(game.player.y).toBe(300);
        });

        test('should create enemy entity', () => {
            const enemyId = game.createEntity('enemy', 100, 100, { speed: 2 });
            expect(enemyId).toBeGreaterThan(0);
            expect(game.enemies.length).toBe(1);
            expect(game.enemies[0].speed).toBe(2);
        });

        test('should create projectile', () => {
            const projectileId = game.createEntity('projectile', 200, 200, {
                vx: 5,
                vy: 0,
                damage: 20
            });
            expect(projectileId).toBeGreaterThan(0);
            expect(game.projectiles.length).toBe(1);
            expect(game.projectiles[0].damage).toBe(20);
        });

        test('should remove entity', () => {
            const enemyId = game.createEntity('enemy', 100, 100);
            expect(game.entities.length).toBe(1);
            
            game.removeEntity(enemyId);
            expect(game.entities.length).toBe(0);
            expect(game.enemies.length).toBe(0);
        });

        test('should get entity by id', () => {
            const playerId = game.createEntity('player', 400, 300);
            const entity = game.getEntity(playerId);
            expect(entity).toBeDefined();
            expect(entity.type).toBe('player');
        });

        test('should update entity properties', () => {
            const enemyId = game.createEntity('enemy', 100, 100);
            game.updateEntity(enemyId, { x: 200, y: 200, health: 50 });
            
            const entity = game.getEntity(enemyId);
            expect(entity.x).toBe(200);
            expect(entity.y).toBe(200);
            expect(entity.health).toBe(50);
        });
    });

    describe('Collision Detection', () => {
        test('should detect collision between entities', () => {
            const entity1 = { x: 100, y: 100, radius: 10 };
            const entity2 = { x: 105, y: 100, radius: 10 };
            
            expect(game.checkCollision(entity1, entity2)).toBe(true);
        });

        test('should not detect collision when entities are far apart', () => {
            const entity1 = { x: 100, y: 100, radius: 10 };
            const entity2 = { x: 200, y: 200, radius: 10 };
            
            expect(game.checkCollision(entity1, entity2)).toBe(false);
        });

        test('should handle player-enemy collision', () => {
            game.createEntity('player', 100, 100, { health: 100 });
            game.createEntity('enemy', 105, 100, { damage: 10 });
            
            game.checkAllCollisions();
            
            expect(game.player.health).toBe(90);
            expect(game.enemies.length).toBe(0);
        });

        test('should handle projectile-enemy collision', () => {
            game.createEntity('enemy', 100, 100, { health: 50 });
            game.createEntity('projectile', 105, 100, { damage: 30 });
            
            const initialScore = game.score;
            game.checkAllCollisions();
            
            expect(game.enemies[0].health).toBe(20);
            expect(game.projectiles.length).toBe(0);
        });
    });

    describe('Game State Management', () => {
        test('should manage score', () => {
            expect(game.score).toBe(0);
            game.score = 100;
            expect(game.score).toBe(100);
        });

        test('should manage wave progression', () => {
            expect(game.wave).toBe(1);
            game.nextWave();
            expect(game.wave).toBe(2);
        });

        test('should pause and resume game', () => {
            game.pauseGame();
            expect(game.isPaused).toBe(true);
            
            game.resumeGame();
            expect(game.isPaused).toBe(false);
        });

        test('should reset game state', () => {
            game.createEntity('player', 400, 300);
            game.createEntity('enemy', 100, 100);
            game.score = 500;
            game.wave = 5;
            
            game.reset();
            
            expect(game.entities.length).toBe(0);
            expect(game.score).toBe(0);
            expect(game.wave).toBe(1);
            expect(game.player).toBeNull();
        });

        test('should not update when paused', () => {
            game.createEntity('enemy', 100, 100, { vx: 10, vy: 0 });
            game.pauseGame();
            
            const initialX = game.entities[0].x;
            game.update(16);
            
            expect(game.entities[0].x).toBe(initialX);
        });
    });

    describe('Power-ups', () => {
        test('should apply health power-up', () => {
            game.createEntity('player', 100, 100, { health: 50 });
            game.createEntity('powerup', 105, 100, { subtype: 'health' });
            
            game.checkAllCollisions();
            
            expect(game.player.health).toBe(100);
            expect(game.powerUps.length).toBe(0);
        });

        test('should apply speed power-up', () => {
            game.createEntity('player', 100, 100, { speed: 1 });
            game.createEntity('powerup', 105, 100, { subtype: 'speed' });
            
            game.checkAllCollisions();
            
            expect(game.player.speed).toBe(1.5);
        });

        test('should apply damage power-up', () => {
            game.createEntity('player', 100, 100, { damage: 10 });
            game.createEntity('powerup', 105, 100, { subtype: 'damage' });
            
            game.checkAllCollisions();
            
            expect(game.player.damage).toBe(20);
        });
    });

    describe('Enemy Spawning', () => {
        test('should spawn correct number of enemies', () => {
            game.spawnEnemies(5);
            expect(game.enemies.length).toBe(5);
        });

        test('should increase enemy stats with wave', () => {
            game.wave = 3;
            game.spawnEnemies(1);
            
            const enemy = game.enemies[0];
            expect(enemy.health).toBeGreaterThan(50);
            expect(enemy.damage).toBeGreaterThan(5);
            expect(enemy.points).toBe(30);
        });
    });

    describe('Update Loop', () => {
        test('should update entity positions', () => {
            game.createEntity('enemy', 100, 100, { vx: 10, vy: 5 });
            
            game.update(1);
            
            const entity = game.entities[0];
            expect(entity.x).toBe(110);
            expect(entity.y).toBe(105);
        });

        test('should keep entities within bounds', () => {
            game.createEntity('enemy', 10, 10, { vx: -100, vy: -100, radius: 10 });
            
            game.update(1);
            
            const entity = game.entities[0];
            expect(entity.x).toBeGreaterThanOrEqual(10);
            expect(entity.y).toBeGreaterThanOrEqual(10);
        });
    });
});

module.exports = GameEngine;