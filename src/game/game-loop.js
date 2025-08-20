/**
 * Game Loop Module
 * Manages the main game loop, updates, and timing
 */

export class GameLoop {
    constructor(game) {
        this.game = game;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        this.animationId = null;
        
        // Performance tracking
        this.performanceMetrics = {
            updateTime: 0,
            renderTime: 0,
            wasmTime: 0,
            totalTime: 0
        };
    }

    /**
     * Start the game loop
     */
    start() {
        this.lastTime = performance.now();
        this.fpsUpdateTime = this.lastTime;
        this.loop(this.lastTime);
    }

    /**
     * Stop the game loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Main game loop
     */
    loop(timestamp) {
        if (!this.game.running) {
            this.stop();
            return;
        }
        
        // Calculate delta time
        this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = timestamp;
        
        // Update FPS
        this.frameCount++;
        if (timestamp - this.fpsUpdateTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = timestamp;
            this.updatePerformanceDisplay();
        }
        
        // Performance timing
        const startTime = performance.now();
        
        // Update game state
        const updateStart = performance.now();
        this.update(this.deltaTime);
        this.performanceMetrics.updateTime = performance.now() - updateStart;
        
        // Render
        const renderStart = performance.now();
        this.game.renderer.render(this.game.engine, this.game);
        this.performanceMetrics.renderTime = performance.now() - renderStart;
        
        // Total frame time
        this.performanceMetrics.totalTime = performance.now() - startTime;
        
        // Continue loop
        this.animationId = requestAnimationFrame((t) => this.loop(t));
    }

    /**
     * Update game state
     */
    update(dt) {
        if (!this.game.engine) return;
        
        // Process input
        this.game.inputHandler.processInput(this.game.engine);
        
        // Update WASM engine
        const wasmStart = performance.now();
        this.game.engine.update(dt);
        this.performanceMetrics.wasmTime = performance.now() - wasmStart;
        
        // Check game state
        const gameState = this.game.engine.getGameState();
        
        // Update HUD
        this.updateHUD(gameState);
        
        // Check for game over
        if (gameState.gameOver && this.game.running) {
            this.game.gameOver();
        }
        
        // Spawn enemies based on game mode
        if (this.game.mode === 'survival') {
            this.updateSurvivalMode(gameState);
        } else if (this.game.mode === 'campaign') {
            this.updateCampaignMode(gameState);
        }
    }

    /**
     * Update survival mode logic
     */
    updateSurvivalMode(gameState) {
        // Check if we need to spawn a new wave
        if (gameState.enemyCount === 0 && this.game.currentWave) {
            this.game.currentWave++;
            this.spawnWave(this.game.currentWave);
        }
    }

    /**
     * Update campaign mode logic
     */
    updateCampaignMode(gameState) {
        // Check if level is complete
        if (gameState.enemyCount === 0 && this.game.currentLevel) {
            this.game.currentLevel++;
            this.loadLevel(this.game.currentLevel);
        }
    }

    /**
     * Spawn enemy wave
     */
    spawnWave(waveNum) {
        const enemyCount = 5 + waveNum * 2;
        const radius = 400;
        
        for (let i = 0; i < enemyCount; i++) {
            const angle = (Math.PI * 2 * i) / enemyCount;
            const x = this.game.canvas.width / 2 + Math.cos(angle) * radius;
            const y = this.game.canvas.height / 2 + Math.sin(angle) * radius;
            
            // Create enemy with increasing difficulty
            const health = 50 + waveNum * 10;
            const speed = 50 + waveNum * 5;
            const damage = 10 + waveNum * 2;
            
            this.game.engine.createEnemy(x, y, 1); // Type 1 = basic enemy
        }
        
        // Update wave display
        const waveElement = document.getElementById('waveNum');
        if (waveElement) {
            waveElement.textContent = waveNum;
        }
        
        // Show wave notification
        this.game.uiManager.showNotification(`Wave ${waveNum} Started!`, 'warning');
    }

    /**
     * Load campaign level
     */
    loadLevel(levelNum) {
        // Clear existing entities
        this.game.engine.clearEntities();
        
        // Create player at spawn point
        this.game.player = this.game.engine.createPlayer(
            this.game.canvas.width / 2,
            this.game.canvas.height / 2
        );
        
        // Generate level-specific content
        const enemyCount = 10 + levelNum * 5;
        const obstacleCount = 5 + levelNum * 2;
        
        // Add obstacles
        this.game.engine.generateObstacles(obstacleCount);
        
        // Add enemies
        for (let i = 0; i < enemyCount; i++) {
            const x = Math.random() * 1920;
            const y = Math.random() * 1080;
            this.game.engine.createEnemy(x, y, levelNum % 3); // Vary enemy types
        }
        
        // Show level notification
        this.game.uiManager.showNotification(`Level ${levelNum}`, 'info');
    }

    /**
     * Update HUD elements
     */
    updateHUD(gameState) {
        if (!gameState) return;
        
        // Update health bar
        const healthBar = document.getElementById('healthBar');
        if (healthBar && gameState.playerHealth !== undefined) {
            healthBar.style.width = Math.max(0, gameState.playerHealth) + '%';
        }
        
        // Update energy bar
        const energyBar = document.getElementById('energyBar');
        if (energyBar && gameState.playerEnergy !== undefined) {
            energyBar.style.width = Math.max(0, gameState.playerEnergy) + '%';
        }
        
        // Update score
        const scoreElement = document.getElementById('score');
        if (scoreElement && gameState.score !== undefined) {
            scoreElement.textContent = gameState.score;
        }
        
        // Update enemy count
        const enemyCount = document.getElementById('enemyCount');
        if (enemyCount && gameState.enemyCount !== undefined) {
            enemyCount.textContent = gameState.enemyCount;
        }
    }

    /**
     * Update performance display
     */
    updatePerformanceDisplay() {
        const fpsElement = document.getElementById('fps');
        const msElement = document.getElementById('ms');
        const wasmElement = document.getElementById('wasmMs');
        const entitiesElement = document.getElementById('entities');
        
        if (fpsElement) fpsElement.textContent = this.fps;
        if (msElement) msElement.textContent = this.performanceMetrics.totalTime.toFixed(1);
        if (wasmElement) wasmElement.textContent = this.performanceMetrics.wasmTime.toFixed(1);
        
        if (entitiesElement && this.game.engine) {
            const entities = this.game.engine.getEntityPositions();
            entitiesElement.textContent = entities.length;
        }
    }

    /**
     * Get current FPS
     */
    getFPS() {
        return this.fps;
    }

    /**
     * Get performance metrics
     */
    getMetrics() {
        return { ...this.performanceMetrics };
    }
}

export default GameLoop;