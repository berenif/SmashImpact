/**
 * Game Modes Module
 * Handles logic for different game modes
 */

export class GameModes {
    constructor(game) {
        this.game = game;
    }
    
    /**
     * Initialize a game mode
     * @param {string} mode - Game mode to initialize
     */
    initMode(mode) {
        switch (mode) {
            case 'survival':
                this.initSurvival();
                break;
            case 'campaign':
                this.initCampaign();
                break;
            case 'sandbox':
                this.initSandbox();
                break;
            case 'multiplayer':
                this.initMultiplayer();
                break;
            default:
                console.warn(`Unknown game mode: ${mode}`);
                this.initSurvival();
        }
    }
    
    /**
     * Update mode-specific logic
     * @param {string} mode - Current game mode
     * @param {Array} entities - Current entities
     */
    updateMode(mode, entities) {
        switch (mode) {
            case 'survival':
                this.updateSurvival(entities);
                break;
            case 'campaign':
                this.updateCampaign(entities);
                break;
            case 'sandbox':
                this.updateSandbox(entities);
                break;
            case 'multiplayer':
                this.updateMultiplayer(entities);
                break;
        }
    }
    
    /**
     * Initialize survival mode
     */
    initSurvival() {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Create player at center
        const player = engine.createPlayer(canvas.width / 2, canvas.height / 2);
        this.game.state.setPlayer(player);
        
        // Spawn first wave
        this.spawnWave(1);
    }
    
    /**
     * Update survival mode
     * @param {Array} entities - Current entities
     */
    updateSurvival(entities) {
        // Check if all enemies are defeated
        const enemies = entities.filter(e => e.type === 'enemy' || e.type === 'wolf');
        
        if (enemies.length === 0) {
            this.game.state.nextWave();
            this.spawnWave(this.game.state.wave);
            
            // Award points for completing wave
            this.game.state.addScore(100 * this.game.state.wave);
        }
        
        // Update enemy count display
        document.getElementById('enemyCount').textContent = enemies.length;
        document.getElementById('waveNum').textContent = this.game.state.wave;
    }
    
    /**
     * Spawn enemies for a wave
     * @param {number} waveNum - Wave number
     */
    spawnWave(waveNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        const enemyCount = 5 + waveNum * 2;
        
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / enemyCount;
            const dist = 300 + Math.random() * 200;
            const x = canvas.width / 2 + Math.cos(angle) * dist;
            const y = canvas.height / 2 + Math.sin(angle) * dist;
            
            if (Math.random() > 0.7 && waveNum > 3) {
                // Spawn wolf
                engine.createWolf(x, y, waveNum > 10);
            } else {
                // Spawn regular enemy
                engine.createEnemy(x, y, 100 + waveNum * 5);
            }
        }
        
        // Add obstacles for higher waves
        if (waveNum > 2) {
            for (let i = 0; i < Math.min(waveNum, 8); i++) {
                engine.createObstacle(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    30 + Math.random() * 20,
                    Math.random() > 0.5
                );
            }
        }
        
        // Add power-ups
        if (waveNum % 3 === 0) {
            for (let i = 0; i < Math.floor(waveNum / 3); i++) {
                engine.createPowerUp(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    Math.floor(Math.random() * 4)
                );
            }
        }
    }
    
    /**
     * Initialize campaign mode
     */
    initCampaign() {
        this.loadLevel(this.game.state.level);
    }
    
    /**
     * Update campaign mode
     * @param {Array} entities - Current entities
     */
    updateCampaign(entities) {
        // Check if level is complete
        const enemies = entities.filter(e => e.type === 'enemy' || e.type === 'wolf');
        
        if (enemies.length === 0) {
            this.game.state.nextLevel();
            this.loadLevel(this.game.state.level);
            
            // Award points for completing level
            this.game.state.addScore(500 * this.game.state.level);
        }
        
        // Update display
        document.getElementById('enemyCount').textContent = enemies.length;
        document.getElementById('waveNum').textContent = `Level ${this.game.state.level}`;
    }
    
    /**
     * Load a campaign level
     * @param {number} levelNum - Level number
     */
    loadLevel(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Create player at specific position based on level
        const playerX = levelNum % 2 === 0 ? 100 : canvas.width - 100;
        const playerY = canvas.height / 2;
        const player = engine.createPlayer(playerX, playerY);
        this.game.state.setPlayer(player);
        
        // Level-specific enemy patterns
        switch (levelNum % 5) {
            case 1: // Circle formation
                this.spawnCircleFormation(levelNum);
                break;
            case 2: // Line formation
                this.spawnLineFormation(levelNum);
                break;
            case 3: // Random with obstacles
                this.spawnRandomWithObstacles(levelNum);
                break;
            case 4: // Wolf pack
                this.spawnWolfPack(levelNum);
                break;
            case 0: // Boss level
                this.spawnBossLevel(levelNum);
                break;
        }
    }
    
    /**
     * Spawn enemies in circle formation
     */
    spawnCircleFormation(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        const enemyCount = 6 + levelNum;
        
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / enemyCount;
            const x = canvas.width / 2 + Math.cos(angle) * 250;
            const y = canvas.height / 2 + Math.sin(angle) * 250;
            engine.createEnemy(x, y, 100 + levelNum * 10);
        }
    }
    
    /**
     * Spawn enemies in line formation
     */
    spawnLineFormation(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        const enemyCount = 5 + Math.floor(levelNum / 2);
        
        for (let i = 0; i < enemyCount; i++) {
            const x = (canvas.width / (enemyCount + 1)) * (i + 1);
            const y = 100;
            engine.createEnemy(x, y, 120 + levelNum * 8);
        }
    }
    
    /**
     * Spawn random enemies with obstacles
     */
    spawnRandomWithObstacles(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Spawn enemies
        for (let i = 0; i < 4 + levelNum; i++) {
            engine.createEnemy(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                100 + levelNum * 10
            );
        }
        
        // Spawn obstacles
        for (let i = 0; i < 3 + Math.floor(levelNum / 3); i++) {
            engine.createObstacle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                40 + Math.random() * 30,
                true
            );
        }
    }
    
    /**
     * Spawn wolf pack
     */
    spawnWolfPack(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        const wolfCount = 3 + Math.floor(levelNum / 2);
        
        // Spawn alpha wolf
        engine.createWolf(canvas.width / 2, 150, true);
        
        // Spawn pack
        for (let i = 0; i < wolfCount; i++) {
            const angle = (Math.PI * 2 * i) / wolfCount;
            const x = canvas.width / 2 + Math.cos(angle) * 200;
            const y = 150 + Math.sin(angle) * 200;
            engine.createWolf(x, y, false);
        }
    }
    
    /**
     * Spawn boss level
     */
    spawnBossLevel(levelNum) {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Create super enemy (boss)
        const boss = engine.createEnemy(canvas.width / 2, 150, 500 + levelNum * 50);
        
        // Create minions
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 * i) / 4;
            const x = canvas.width / 2 + Math.cos(angle) * 150;
            const y = 150 + Math.sin(angle) * 150;
            engine.createEnemy(x, y, 100);
        }
        
        // Add some power-ups as reward
        engine.createPowerUp(100, canvas.height - 100, 0);
        engine.createPowerUp(canvas.width - 100, canvas.height - 100, 1);
    }
    
    /**
     * Initialize sandbox mode
     */
    initSandbox() {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Create player at center
        const player = engine.createPlayer(canvas.width / 2, canvas.height / 2);
        this.game.state.setPlayer(player);
        
        // Spawn various entities for testing
        for (let i = 0; i < 5; i++) {
            engine.createPowerUp(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.floor(Math.random() * 4)
            );
        }
        
        // Add a few enemies
        for (let i = 0; i < 3; i++) {
            engine.createEnemy(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                100
            );
        }
        
        // Add obstacles
        for (let i = 0; i < 4; i++) {
            engine.createObstacle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                30 + Math.random() * 20,
                Math.random() > 0.5
            );
        }
        
        document.getElementById('waveNum').textContent = 'Sandbox';
    }
    
    /**
     * Update sandbox mode
     * @param {Array} entities - Current entities
     */
    updateSandbox(entities) {
        // Sandbox mode - respawn enemies if all defeated
        const enemies = entities.filter(e => e.type === 'enemy' || e.type === 'wolf');
        
        if (enemies.length === 0) {
            const canvas = this.game.state.canvas;
            const engine = this.game.state.engine;
            
            // Spawn new enemies
            for (let i = 0; i < 3; i++) {
                engine.createEnemy(
                    Math.random() * canvas.width,
                    Math.random() * canvas.height,
                    100
                );
            }
        }
        
        document.getElementById('enemyCount').textContent = enemies.length;
    }
    
    /**
     * Initialize multiplayer mode
     */
    initMultiplayer() {
        const canvas = this.game.state.canvas;
        const engine = this.game.state.engine;
        
        // Create player 1
        const player = engine.createPlayer(100, canvas.height / 2);
        this.game.state.setPlayer(player);
        
        // TODO: Create player 2 for local multiplayer
        // TODO: Connect to server for online multiplayer
        
        // Spawn initial enemies
        this.spawnWave(1);
        
        document.getElementById('waveNum').textContent = 'Multiplayer';
    }
    
    /**
     * Update multiplayer mode
     * @param {Array} entities - Current entities
     */
    updateMultiplayer(entities) {
        // Similar to survival mode for now
        this.updateSurvival(entities);
        
        // TODO: Handle multiplayer-specific logic
        // - Sync with other players
        // - Handle player respawning
        // - Team scoring
    }
}