// Mock WASM Game Engine Module for Testing
// This is a JavaScript implementation that mimics the WASM module interface

class MockGameEngine {
    constructor(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
        this.entities = [];
        this.nextEntityId = 1;
        this.player = null;
        this.gameState = 0; // MENU
        this.score = 0;
        this.highScore = 0;
        this.visualEffects = [];
    }

    createPlayer(x, y) {
        const id = this.nextEntityId++;
        const player = {
            id: id,
            type: 0, // PLAYER
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            rotation: 0, // Start facing right
            radius: 15,
            health: 100,
            maxHealth: 100,
            active: true,
            energy: 100,
            maxEnergy: 100
        };
        this.entities.push(player);
        this.player = player;
        return id;
    }

    createEnemy(x, y) {
        const id = this.nextEntityId++;
        const enemy = {
            id: id,
            type: 1, // ENEMY
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            rotation: Math.random() * Math.PI * 2, // Random initial rotation
            radius: 12,
            health: 50,
            maxHealth: 50,
            active: true,
            target: this.player
        };
        this.entities.push(enemy);
        return id;
    }

    createProjectile(x, y, dirX, dirY, damage, ownerId) {
        const id = this.nextEntityId++;
        const projectile = {
            id: id,
            type: 2, // PROJECTILE
            x: x,
            y: y,
            vx: dirX * 10,
            vy: dirY * 10,
            rotation: Math.atan2(dirY, dirX), // Rotation based on direction
            radius: 4,
            health: 1,
            maxHealth: 1,
            active: true,
            damage: damage,
            ownerId: ownerId,
            lifetime: 2000
        };
        this.entities.push(projectile);
        return id;
    }

    updatePlayerInput(dx, dy, aimX, aimY) {
        if (!this.player || !this.player.active) return;
        
        // Update velocity
        const speed = 5;
        this.player.vx = dx * speed;
        this.player.vy = dy * speed;
        
        // Update rotation based on aim direction
        const aimDx = aimX - this.player.x;
        const aimDy = aimY - this.player.y;
        if (aimDx !== 0 || aimDy !== 0) {
            this.player.rotation = Math.atan2(aimDy, aimDx);
        }
    }

    playerShoot(aimX, aimY) {
        if (!this.player || !this.player.active) return;
        
        const dx = aimX - this.player.x;
        const dy = aimY - this.player.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (magnitude > 0) {
            const dirX = dx / magnitude;
            const dirY = dy / magnitude;
            this.createProjectile(
                this.player.x,
                this.player.y,
                dirX,
                dirY,
                10,
                this.player.id
            );
        }
    }

    update(deltaTime) {
        // Update all entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            if (!entity.active) {
                this.entities.splice(i, 1);
                continue;
            }
            
            // Update position
            entity.x += entity.vx * (deltaTime / 16);
            entity.y += entity.vy * (deltaTime / 16);
            
            // Update enemy AI
            if (entity.type === 1 && this.player && this.player.active) {
                const dx = this.player.x - entity.x;
                const dy = this.player.y - entity.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 50) {
                    // Move towards player
                    const speed = 2;
                    entity.vx = (dx / distance) * speed;
                    entity.vy = (dy / distance) * speed;
                    // Update rotation to face player
                    entity.rotation = Math.atan2(dy, dx);
                }
            }
            
            // Update projectile lifetime
            if (entity.type === 2) {
                entity.lifetime -= deltaTime;
                if (entity.lifetime <= 0) {
                    entity.active = false;
                }
            }
        }
    }

    getEntityPositions() {
        return this.entities
            .filter(e => e.active)
            .map(e => ({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                vx: e.vx,
                vy: e.vy,
                rotation: e.rotation || 0, // Ensure rotation is always defined
                radius: e.radius,
                health: e.health,
                maxHealth: e.maxHealth
            }));
    }

    getPlayerState() {
        if (!this.player || !this.player.active) return null;
        return {
            id: this.player.id,
            x: this.player.x,
            y: this.player.y,
            health: this.player.health,
            maxHealth: this.player.maxHealth,
            energy: this.player.energy,
            maxEnergy: this.player.maxEnergy,
            rotation: this.player.rotation
        };
    }

    getVisualEffects() {
        return this.visualEffects;
    }

    startGame() {
        this.gameState = 1; // PLAYING
        this.score = 0;
        this.entities = [];
        
        // Create player at center
        this.createPlayer(this.worldWidth / 2, this.worldHeight / 2);
        
        // Create some enemies
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5;
            const distance = 200;
            this.createEnemy(
                this.worldWidth / 2 + Math.cos(angle) * distance,
                this.worldHeight / 2 + Math.sin(angle) * distance
            );
        }
    }

    getGameState() {
        return this.gameState;
    }

    getScore() {
        return this.score;
    }

    getHighScore() {
        return this.highScore;
    }

    setWorldBounds(width, height) {
        this.worldWidth = width;
        this.worldHeight = height;
    }

    // Stub functions for other features
    activateBoost() {}
    activateBlock() {}
    activateRoll() {}
    activateSwordAttack() {}
    endGame() {}
    restartGame() { this.startGame(); }
    generateObstacles() {}
    clearEntities() { this.entities = []; }
    getPerformanceMetrics() { return { fps: 60, updateTime: 0, renderTime: 0 }; }
    getWaveInfo() { return { currentWave: 1, enemiesRemaining: this.entities.filter(e => e.type === 1).length }; }
    isBlocking() { return false; }
    isPerfectParryWindow() { return false; }
}

// Create the module export that mimics the WASM module interface
const GameEngineModule = async function(config = {}) {
    // Simulate async loading
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Call initialization callback if provided
    if (config.onRuntimeInitialized) {
        config.onRuntimeInitialized();
    }
    
    return {
        GameEngine: MockGameEngine,
        ready: Promise.resolve()
    };
};

// Export as ES6 module
export default GameEngineModule;