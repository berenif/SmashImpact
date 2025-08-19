// Wolf Wave Management System
// Controls wolf spawning with wave pattern: Wave 1 = 1 wolf, Wave 2 = 3 wolves, then multiply by 2

(function(window) {
    'use strict';

    class WolfWaveManager {
        constructor(gameState) {
            this.gameState = gameState;
            this.currentWave = 0;
            this.wolvesSpawnedThisWave = 0;
            this.wolvesRequiredThisWave = 0;
            this.isWaveActive = false;
            this.waveCompleteCallback = null;
            this.spawnDelay = 500; // ms between spawns
            this.waveStartDelay = 3000; // delay before wave starts
            this.allWolvesDefeated = true;
            
            // Stats multipliers per wave
            this.statsMultipliers = {
                health: 1.15,    // 15% more health per wave
                damage: 1.10,    // 10% more damage per wave
                speed: 1.05      // 5% faster per wave
            };
        }
        
        calculateWolvesForWave(waveNumber) {
            // Wave 1: 1 wolf
            // Wave 2: 3 wolves
            // Wave 3+: multiply by 2 each wave
            if (waveNumber === 1) return 1;
            if (waveNumber === 2) return 3;
            
            // For wave 3 and beyond, start with 3 and multiply by 2 for each wave after 2
            let wolves = 3;
            for (let i = 2; i < waveNumber; i++) {
                wolves *= 2;
            }
            
            // Cap at reasonable number
            const maxWolves = 20;
            return Math.min(wolves, maxWolves);
        }
        
        getWaveStats(waveNumber) {
            // Calculate stat multipliers for the current wave
            const healthMultiplier = Math.pow(this.statsMultipliers.health, waveNumber - 1);
            const damageMultiplier = Math.pow(this.statsMultipliers.damage, waveNumber - 1);
            const speedMultiplier = Math.pow(this.statsMultipliers.speed, waveNumber - 1);
            
            return {
                health: Math.round(75 * healthMultiplier),  // Base health: 75
                damage: Math.round(15 * damageMultiplier),  // Base damage: 15
                speed: 3 * speedMultiplier,                 // Base speed: 3
                waveNumber: waveNumber
            };
        }
        
        startNextWave() {
            if (this.isWaveActive) {
                console.warn('Wave already in progress');
                return;
            }
            
            this.currentWave++;
            this.wolvesRequiredThisWave = this.calculateWolvesForWave(this.currentWave);
            this.wolvesSpawnedThisWave = 0;
            this.isWaveActive = true;
            this.allWolvesDefeated = false;
            
            console.log(`🐺 Wolf Wave ${this.currentWave} Starting!`);
            console.log(`Will spawn ${this.wolvesRequiredThisWave} wolves`);
            
            // Show wave notification
            this.showWaveNotification();
            
            // Start spawning after delay
            setTimeout(() => {
                this.spawnWaveWolves();
            }, this.waveStartDelay);
            
            return {
                wave: this.currentWave,
                wolfCount: this.wolvesRequiredThisWave,
                stats: this.getWaveStats(this.currentWave)
            };
        }
        
        spawnWaveWolves() {
            const stats = this.getWaveStats(this.currentWave);
            
            for (let i = 0; i < this.wolvesRequiredThisWave; i++) {
                setTimeout(() => {
                    if (!this.gameState) return;
                    
                    // Get spawn point at edge of screen
                    const spawnPoint = this.getRandomEdgePoint();
                    
                    // Create wolf with wave-scaled stats
                    const wolf = this.createWolf(spawnPoint.x, spawnPoint.y, stats);
                    
                    // Add to game
                    if (this.gameState.wolves) {
                        this.gameState.wolves.push(wolf);
                    }
                    if (this.gameState.enemies) {
                        this.gameState.enemies.push(wolf);
                    }
                    
                    this.wolvesSpawnedThisWave++;
                    
                    // Visual effect
                    this.createSpawnEffect(spawnPoint.x, spawnPoint.y);
                    
                    console.log(`Spawned wolf ${this.wolvesSpawnedThisWave}/${this.wolvesRequiredThisWave}`);
                    
                    // Check if all wolves spawned
                    if (this.wolvesSpawnedThisWave >= this.wolvesRequiredThisWave) {
                        this.onWaveSpawnComplete();
                    }
                }, i * this.spawnDelay);
            }
        }
        
        createWolf(x, y, stats) {
            // If WolfAI is available, use it
            if (window.WolfAI && window.WolfAI.Wolf) {
                const wolfId = `wolf_wave${this.currentWave}_${Date.now()}_${Math.random()}`;
                const wolf = new window.WolfAI.Wolf(x, y, wolfId, this.gameState);
                
                // Apply wave scaling
                wolf.health = stats.health;
                wolf.maxHealth = stats.health;
                wolf.damage = stats.damage;
                wolf.speed = stats.speed;
                wolf.waveNumber = stats.waveNumber;
                
                return wolf;
            }
            
            // Fallback to basic wolf
            return {
                id: `wolf_wave${this.currentWave}_${Date.now()}_${Math.random()}`,
                x: x,
                y: y,
                vx: 0,
                vy: 0,
                radius: 18,
                speed: stats.speed,
                health: stats.health,
                maxHealth: stats.health,
                damage: stats.damage,
                color: '#8B4513',
                type: 'wolf',
                state: 'idle',
                lastAttack: 0,
                waveNumber: stats.waveNumber,
                isWolf: true
            };
        }
        
        getRandomEdgePoint() {
            const canvas = this.gameState.canvas || { width: 800, height: 600 };
            const edge = Math.floor(Math.random() * 4);
            const margin = 50;
            let x, y;
            
            switch(edge) {
                case 0: // Top
                    x = margin + Math.random() * (canvas.width - margin * 2);
                    y = -20;
                    break;
                case 1: // Right
                    x = canvas.width + 20;
                    y = margin + Math.random() * (canvas.height - margin * 2);
                    break;
                case 2: // Bottom
                    x = margin + Math.random() * (canvas.width - margin * 2);
                    y = canvas.height + 20;
                    break;
                case 3: // Left
                    x = -20;
                    y = margin + Math.random() * (canvas.height - margin * 2);
                    break;
            }
            
            return { x, y };
        }
        
        createSpawnEffect(x, y) {
            // Visual effects if available
            if (this.gameState.vfx) {
                if (this.gameState.vfx.createExplosion) {
                    this.gameState.vfx.createExplosion(x, y, '#8b4513', 20);
                }
                if (this.gameState.vfx.createShockwave) {
                    this.gameState.vfx.createShockwave(x, y, {
                        color: '#8b4513',
                        speed: 5,
                        maxRadius: 50
                    });
                }
            }
            
            // Create particles if available
            if (this.gameState.particles) {
                for (let i = 0; i < 15; i++) {
                    this.gameState.particles.push({
                        x: x,
                        y: y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        color: i % 2 === 0 ? '#8b4513' : '#ff6600',
                        size: Math.random() * 6 + 2,
                        life: 1,
                        decay: 0.02
                    });
                }
            }
        }
        
        showWaveNotification() {
            const stats = this.getWaveStats(this.currentWave);
            
            // Create wave notification UI
            const notification = document.createElement('div');
            notification.id = 'wolf-wave-notification';
            notification.innerHTML = `
                <div class="wave-title">🐺 WOLF WAVE ${this.currentWave} 🐺</div>
                <div class="wave-count">${this.wolvesRequiredThisWave} ${this.wolvesRequiredThisWave === 1 ? 'Wolf' : 'Wolves'} Incoming!</div>
                <div class="wave-stats">
                    <span class="stat-item">❤️ Health: ${stats.health}</span>
                    <span class="stat-item">⚔️ Damage: ${stats.damage}</span>
                    <span class="stat-item">💨 Speed: ${stats.speed.toFixed(1)}</span>
                </div>
            `;
            
            // Style the notification
            notification.style.cssText = `
                position: fixed;
                top: 20%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #1a0000, #8b0000, #ff4444);
                color: white;
                padding: 30px 50px;
                border-radius: 15px;
                font-family: 'Arial Black', Arial, sans-serif;
                text-align: center;
                z-index: 10000;
                animation: waveNotificationPulse 0.5s ease-out;
                box-shadow: 0 0 50px rgba(255, 0, 0, 0.8), inset 0 0 20px rgba(255, 100, 0, 0.3);
                border: 3px solid #ff6600;
            `;
            
            // Add styles if not already present
            if (!document.getElementById('wolf-wave-styles')) {
                const style = document.createElement('style');
                style.id = 'wolf-wave-styles';
                style.textContent = `
                    @keyframes waveNotificationPulse {
                        0% { 
                            transform: translate(-50%, -50%) scale(0.5) rotate(-5deg); 
                            opacity: 0; 
                        }
                        50% { 
                            transform: translate(-50%, -50%) scale(1.15) rotate(2deg); 
                        }
                        100% { 
                            transform: translate(-50%, -50%) scale(1) rotate(0deg); 
                            opacity: 1; 
                        }
                    }
                    
                    @keyframes fadeOutScale {
                        0% { 
                            transform: translate(-50%, -50%) scale(1); 
                            opacity: 1; 
                        }
                        100% { 
                            transform: translate(-50%, -50%) scale(0.8); 
                            opacity: 0; 
                        }
                    }
                    
                    #wolf-wave-notification .wave-title { 
                        font-size: 42px;
                        font-weight: bold;
                        margin-bottom: 15px;
                        text-shadow: 3px 3px 6px rgba(0,0,0,0.8), 0 0 20px rgba(255,100,0,0.5);
                        letter-spacing: 2px;
                    }
                    
                    #wolf-wave-notification .wave-count { 
                        font-size: 28px;
                        margin-bottom: 15px;
                        color: #ffcc00;
                        text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
                    }
                    
                    #wolf-wave-notification .wave-stats { 
                        font-size: 18px;
                        opacity: 0.95;
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                    }
                    
                    #wolf-wave-notification .stat-item {
                        background: rgba(0,0,0,0.3);
                        padding: 5px 10px;
                        border-radius: 5px;
                        border: 1px solid rgba(255,100,0,0.5);
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Remove any existing notification
            const existing = document.getElementById('wolf-wave-notification');
            if (existing) {
                existing.remove();
            }
            
            document.body.appendChild(notification);
            
            // Remove after delay
            setTimeout(() => {
                notification.style.animation = 'fadeOutScale 0.5s ease-in forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }, this.waveStartDelay - 500);
            
            // Screen effects
            if (this.gameState.vfx) {
                if (this.gameState.vfx.createScreenFlash) {
                    this.gameState.vfx.createScreenFlash('#ff0000', 0.3);
                }
                if (this.gameState.vfx.shakeScreen) {
                    this.gameState.vfx.shakeScreen(10, 500);
                }
            }
            
            // Play sound if available
            if (this.gameState.playSound) {
                this.gameState.playSound('wolf_howl');
            }
        }
        
        onWaveSpawnComplete() {
            console.log(`✅ Wave ${this.currentWave} all wolves spawned!`);
            this.isWaveActive = false;
        }
        
        update(deltaTime) {
            // Only check for wave completion if:
            // 1. Wave has started (currentWave > 0)
            // 2. All wolves have been spawned
            // 3. Wave is not already marked as complete
            if (!this.allWolvesDefeated && 
                this.currentWave > 0 && 
                this.wolvesSpawnedThisWave >= this.wolvesRequiredThisWave &&
                this.wolvesRequiredThisWave > 0) {
                
                const remainingWolves = this.getRemainingWolves();
                
                // Only mark complete if we actually spawned wolves and they're all defeated
                if (remainingWolves === 0 && this.wolvesSpawnedThisWave > 0) {
                    this.allWolvesDefeated = true;
                    this.onWaveComplete();
                }
            }
        }
        
        getRemainingWolves() {
            if (!this.gameState.wolves || this.gameState.wolves.length === 0) {
                // If no wolves exist but we haven't spawned any yet, don't count as 0
                if (this.wolvesSpawnedThisWave === 0) {
                    return -1; // Indicate waiting state
                }
                return 0;
            }
            
            // Count wolves from current wave that are still alive
            return this.gameState.wolves.filter(wolf => 
                wolf.waveNumber === this.currentWave && 
                wolf.health > 0 &&
                wolf.state !== 'dead'
            ).length;
        }
        
        onWaveComplete() {
            console.log(`🎉 Wave ${this.currentWave} complete! All wolves defeated!`);
            
            // Show completion message
            this.showWaveCompleteMessage();
            
            // Don't auto-start next wave - let the game or player decide
            // The game can call startNextWave() when ready
            if (this.waveCompleteCallback) {
                this.waveCompleteCallback(this.currentWave);
            }
        }
        
        showWaveCompleteMessage() {
            const message = document.createElement('div');
            message.innerHTML = `
                <div style="font-size: 36px; font-weight: bold; color: #00ff00; margin-bottom: 10px;">
                    WAVE ${this.currentWave} COMPLETE!
                </div>
                <div style="font-size: 24px; color: #ffff00;">
                    Next Wave: ${this.calculateWolvesForWave(this.currentWave + 1)} Wolves
                </div>
            `;
            
            message.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #003300, #006600);
                color: white;
                padding: 30px 50px;
                border-radius: 10px;
                font-family: Arial, sans-serif;
                text-align: center;
                z-index: 10000;
                animation: waveNotificationPulse 0.5s ease-out;
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.5);
                border: 2px solid #00ff00;
            `;
            
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.style.animation = 'fadeOutScale 0.5s ease-in forwards';
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 500);
            }, 3000);
        }
        
        getWaveInfo() {
            return {
                currentWave: this.currentWave,
                wolvesSpawned: this.wolvesSpawnedThisWave,
                wolvesRequired: this.wolvesRequiredThisWave,
                wolvesRemaining: this.getRemainingWolves(),
                isActive: this.isWaveActive,
                allDefeated: this.allWolvesDefeated,
                nextWaveWolves: this.calculateWolvesForWave(this.currentWave + 1),
                stats: this.getWaveStats(this.currentWave)
            };
        }
        
        reset() {
            this.currentWave = 0;
            this.wolvesSpawnedThisWave = 0;
            this.wolvesRequiredThisWave = 0;
            this.isWaveActive = false;
            this.allWolvesDefeated = true;
        }
    }
    
    // Export to global scope
    window.WolfWaveManager = WolfWaveManager;
    
    // Auto-initialize if game exists
    if (window.gameInstance) {
        window.gameInstance.wolfWaveManager = new WolfWaveManager(window.gameInstance);
        console.log('Wolf Wave Manager initialized!');
    }
    
})(window);