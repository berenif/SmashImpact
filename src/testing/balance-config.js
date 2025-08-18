/**
 * Balance Configuration - Centralized gameplay balance settings
 * All values are carefully tuned for optimal gameplay experience
 */

export const BalanceConfig = {
    // ============================================
    // PLAYER BALANCE
    // ============================================
    players: {
        runner: {
            health: 100,           // Fragile but mobile
            speed: 350,           // Fast base speed
            dodgeCooldown: 2,     // Quick dodge recovery
            dodgeDistance: 150,   // Good escape distance
            dodgeInvulnerability: 0.5, // Half second of i-frames
            smokeRadius: 120,     // Area denial size
            smokeDuration: 5,     // Decent area control time
            stunRadius: 80,       // Close-range stun
            stunDuration: 1.5,    // Brief disable
            
            // Balance notes: Runner should feel nimble but fragile
            // Relies on positioning and timing rather than tanking
        },
        
        anchor: {
            health: 150,          // Tanky
            speed: 250,           // Slower movement
            shieldHealth: 50,     // Extra protection
            shieldAngle: 90,      // Frontal coverage (degrees)
            shieldRegen: 5,       // Per second when not blocking
            grappleRange: 300,    // Medium range pull
            grappleCooldown: 4,   // Strategic use
            grappleSpeed: 800,    // Fast projectile
            
            // Balance notes: Anchor should feel sturdy but deliberate
            // Rewards good positioning and timing
        }
    },
    
    // ============================================
    // ENEMY BALANCE
    // ============================================
    enemies: {
        // Basic enemies (Wave 1-2)
        brawler: {
            health: 30,
            speed: 200,
            damage: 15,
            attackRate: 1.5,      // Attacks per second
            aggroRange: 200,
            score: 10,
            
            // Should be threatening in groups but manageable solo
        },
        
        archer: {
            health: 20,
            speed: 180,
            damage: 10,
            attackRate: 0.8,
            projectileSpeed: 400,
            range: 350,
            score: 15,
            
            // Glass cannon - dangerous at range, weak up close
        },
        
        // Advanced enemies (Wave 3+)
        stalker: {
            health: 25,
            speed: 280,
            damage: 20,
            attackRate: 2,
            shimmerTime: 0.4,     // Telegraph before attack
            invisDuration: 3,
            score: 20,
            
            // High threat assassin - requires awareness
        },
        
        bulwark: {
            health: 60,
            speed: 150,
            damage: 25,
            attackRate: 0.8,      // Slow but heavy attacks
            shieldHealth: 40,
            shieldRegen: 2,
            knockback: 200,
            score: 25,
            
            // Tank that requires flanking or abilities
        },
        
        // Specialist enemies (Wave 4+)
        skirmisher: {
            health: 35,
            speed: 250,
            damage: 12,
            attackRate: 1.5,      // Fast combo attacks
            dashCooldown: 2,
            dashDistance: 150,
            comboDamage: 30,      // If hits 3 times
            score: 20,
            
            // Mobile harasser - annoying but manageable
        },
        
        saboteur: {
            health: 30,
            speed: 200,
            damage: 8,
            attackRate: 1.0,      // Normal attack rate
            mineDamage: 25,
            mineRadius: 60,
            mineArmTime: 1,       // Seconds to activate
            maxMines: 3,
            score: 25,
            
            // Area denial specialist - changes battlefield
        }
    },
    
    // ============================================
    // BOSS BALANCE
    // ============================================
    boss: {
        health: 1000,
        phases: {
            phase1: {
                healthThreshold: 0.66,
                speedMultiplier: 1.0,
                damageMultiplier: 1.0,
                abilityRate: 1.0,
                minionSpawnRate: 0.5,
            },
            phase2: {
                healthThreshold: 0.33,
                speedMultiplier: 1.2,
                damageMultiplier: 1.2,
                abilityRate: 1.3,
                minionSpawnRate: 0.8,
            },
            phase3: {
                healthThreshold: 0.1,
                speedMultiplier: 1.5,
                damageMultiplier: 1.5,
                abilityRate: 1.6,
                minionSpawnRate: 1.0,
            },
            desperation: {
                healthThreshold: 0.1,
                speedMultiplier: 2.0,
                damageMultiplier: 2.0,
                abilityRate: 2.0,
                minionSpawnRate: 1.5,
                damageReduction: 0.3,  // Takes less damage
            }
        },
        
        attacks: {
            chargeAttack: {
                damage: 50,
                chargeTime: 1.5,      // Telegraph duration
                speed: 600,
                knockback: 300,
            },
            aoeBlast: {
                damage: 30,
                radius: 150,
                chargeTime: 1.0,
                knockback: 200,
            },
            projectileBarrage: {
                damage: 10,
                count: 8,
                speed: 350,
                spread: 45,           // Degrees
            },
            precisionStrike: {
                damage: 60,
                radius: 30,
                telegraphTime: 1.5,
                trackingTime: 0.5,    // Follows player briefly
            }
        },
        
        // AI adaptation settings
        adaptation: {
            learnRate: 0.1,           // How fast boss learns
            tacticDuration: 8,         // Seconds per tactic
            tacticCooldown: 10,        // Can't repeat same tactic
            maxTacticRepeats: 3,       // Before forced change
            patternMemory: 30,         // Seconds of player history
        }
    },
    
    // ============================================
    // WAVE BALANCE
    // ============================================
    waves: {
        preparationTime: 10,           // Seconds between waves
        
        scaling: {
            enemyCountBase: 3,
            enemyCountPerWave: 2,      // +2 enemies per wave
            healthScaling: 1.1,         // 10% more health per wave
            damageScaling: 1.05,        // 5% more damage per wave
            scoreMultiplier: 1.2,       // 20% more score per wave
        },
        
        // Wave compositions
        compositions: [
            // Wave 1: Introduction
            {
                enemies: ['brawler', 'brawler', 'archer'],
                squadTactics: ['basic_rush'],
                objectives: ['eliminate'],
                duration: 60,
            },
            // Wave 2: Coordination check
            {
                enemies: ['brawler', 'archer', 'archer', 'stalker'],
                squadTactics: ['bait_and_flank'],
                objectives: ['survive', 'defend'],
                duration: 90,
            },
            // Wave 3: Pressure test
            {
                enemies: ['bulwark', 'archer', 'skirmisher', 'stalker'],
                squadTactics: ['shield_crossfire', 'zone_and_punish'],
                objectives: ['eliminate', 'collect'],
                duration: 120,
            },
            // Wave 4: Specialist challenge
            {
                enemies: ['bulwark', 'saboteur', 'skirmisher', 'stalker', 'archer'],
                squadTactics: ['divide_and_conquer', 'overwhelming_force'],
                objectives: ['survive', 'defend', 'eliminate'],
                duration: 150,
            },
            // Wave 5: Boss fight
            {
                enemies: ['boss'],
                squadTactics: ['adaptive'],
                objectives: ['boss_fight'],
                duration: 300,
            }
        ]
    },
    
    // ============================================
    // CO-OP MECHANICS BALANCE
    // ============================================
    coop: {
        tether: {
            maxLength: 250,
            breakDistance: 350,
            chargeTime: 1.5,
            pullForce: 500,
            cooldown: 5,
            
            // Should encourage close teamwork without being restrictive
        },
        
        rally: {
            radius: 100,
            requiredTime: 3,
            healAmount: 30,
            buffDuration: 10,
            speedBonus: 1.2,
            damageReduction: 0.2,
            cooldown: 20,
            
            // Powerful but requires commitment and timing
        },
        
        backToBack: {
            maxDistance: 50,
            angleThreshold: 30,       // Degrees of tolerance
            damageReduction: 0.3,
            awarenessRadius: 200,
            
            // Rewards coordinated positioning
        },
        
        comboMeter: {
            maxValue: 100,
            fillRates: {
                kill: 10,
                damage: 0.1,           // Per point of damage
                dodge: 5,
                ability: 8,
            },
            decayRate: 2,              // Per second
            comboWindow: 3,            // Seconds to maintain
            
            overclock: {
                duration: 10,
                damageBonus: 1.5,
                speedBonus: 1.3,
                cooldownReduction: 0.5,
                threshold: 100,        // Full meter required
            }
        }
    },
    
    // ============================================
    // UPGRADE BALANCE
    // ============================================
    upgrades: {
        // Rarity weights (out of 100)
        rarityWeights: {
            common: 60,
            rare: 30,
            epic: 9,
            legendary: 1,
        },
        
        // Upgrade power scaling
        scaling: {
            common: {
                damageBonus: 0.15,     // 15% increase
                healthBonus: 0.20,     // 20% increase
                speedBonus: 0.10,      // 10% increase
            },
            rare: {
                damageBonus: 0.25,
                healthBonus: 0.30,
                speedBonus: 0.20,
                specialBonus: 0.30,    // For unique effects
            },
            epic: {
                damageBonus: 0.40,
                healthBonus: 0.50,
                speedBonus: 0.30,
                specialBonus: 0.50,
            },
            legendary: {
                damageBonus: 0.60,
                healthBonus: 0.75,
                speedBonus: 0.40,
                specialBonus: 1.0,     // Doubles special effects
            }
        },
        
        // Currency and costs
        currency: {
            perKill: 5,
            perWave: 50,
            perObjective: 25,
            bossBonux: 200,
            
            rerollBase: 50,
            rerollScaling: 1.5,        // Multiplier per reroll
        }
    },
    
    // ============================================
    // ARENA BALANCE
    // ============================================
    arena: {
        dimensions: {
            small: { width: 1200, height: 800 },
            medium: { width: 1600, height: 1000 },
            large: { width: 2000, height: 1200 },
        },
        
        hazards: {
            fireDamage: 5,             // Per second
            slowAmount: 0.5,           // 50% slow
            stunDuration: 1.0,
        },
        
        cover: {
            lowHealth: 50,
            highHealth: 100,
            regeneration: 5,           // Per second out of combat
        },
        
        objectives: {
            defendHealth: 200,
            defendRegen: 2,
            collectCount: 5,
            collectSpawnRate: 10,      // Seconds
            escortSpeed: 100,
            escortHealth: 150,
        }
    },
    
    // ============================================
    // DIFFICULTY SETTINGS
    // ============================================
    difficulty: {
        easy: {
            enemyHealth: 0.75,
            enemyDamage: 0.75,
            enemySpeed: 0.9,
            playerHealth: 1.25,
            reviveTime: 1.5,
            upgradeRarity: 1.2,        // Better upgrade chances
        },
        
        normal: {
            enemyHealth: 1.0,
            enemyDamage: 1.0,
            enemySpeed: 1.0,
            playerHealth: 1.0,
            reviveTime: 2.0,
            upgradeRarity: 1.0,
        },
        
        hard: {
            enemyHealth: 1.25,
            enemyDamage: 1.25,
            enemySpeed: 1.1,
            playerHealth: 0.9,
            reviveTime: 2.5,
            upgradeRarity: 0.8,
        },
        
        nightmare: {
            enemyHealth: 1.5,
            enemyDamage: 1.5,
            enemySpeed: 1.2,
            playerHealth: 0.75,
            reviveTime: 3.0,
            upgradeRarity: 0.6,
            noSecondWind: true,        // Disable revive upgrade
        }
    },
    
    // ============================================
    // PERFORMANCE SETTINGS
    // ============================================
    performance: {
        maxEnemies: 30,                // Cap for performance
        maxProjectiles: 50,
        maxParticles: 200,
        maxEffects: 20,
        
        updateRates: {
            ai: 10,                    // Hz
            physics: 60,
            rendering: 60,
            networking: 30,
        },
        
        culling: {
            distance: 2000,            // Units from camera
            enemyLOD: 500,            // Simplified rendering distance
        }
    }
};

/**
 * Balance validation and auto-tuning
 */
export class BalanceValidator {
    /**
     * Validate balance settings
     */
    static validate() {
        const warnings = [];
        const config = BalanceConfig;
        
        // Check player balance
        if (config.players.runner.health >= config.players.anchor.health) {
            warnings.push('Runner should have less health than Anchor');
        }
        
        if (config.players.runner.speed <= config.players.anchor.speed) {
            warnings.push('Runner should be faster than Anchor');
        }
        
        // Check enemy progression
        const enemyTypes = ['brawler', 'archer', 'stalker', 'bulwark'];
        for (let i = 1; i < enemyTypes.length; i++) {
            const prev = config.enemies[enemyTypes[i-1]];
            const curr = config.enemies[enemyTypes[i]];
            
            if (curr.score < prev.score) {
                warnings.push(`${enemyTypes[i]} score should be >= ${enemyTypes[i-1]}`);
            }
        }
        
        // Check wave scaling
        if (config.waves.scaling.healthScaling <= 1.0) {
            warnings.push('Wave health scaling should be > 1.0 for progression');
        }
        
        // Check co-op balance
        if (config.coop.rally.cooldown < config.coop.rally.buffDuration) {
            warnings.push('Rally cooldown should be longer than buff duration');
        }
        
        // Check upgrade balance
        const rarities = ['common', 'rare', 'epic', 'legendary'];
        for (let i = 1; i < rarities.length; i++) {
            const prev = config.upgrades.scaling[rarities[i-1]];
            const curr = config.upgrades.scaling[rarities[i]];
            
            if (curr.damageBonus <= prev.damageBonus) {
                warnings.push(`${rarities[i]} upgrades should be stronger than ${rarities[i-1]}`);
            }
        }
        
        return warnings;
    }
    
    /**
     * Calculate DPS for balance testing
     */
    static calculateDPS(enemyType) {
        if (enemyType === 'boss') {
            // Boss DPS varies by phase, return average
            return 50; // Approximate boss DPS
        }
        const enemy = BalanceConfig.enemies[enemyType];
        if (!enemy || !enemy.damage || !enemy.attackRate) {
            return 0; // Return 0 for invalid enemies
        }
        return enemy.damage * enemy.attackRate;
    }
    
    /**
     * Calculate time-to-kill
     */
    static calculateTTK(attackerType, targetType) {
        const attacker = BalanceConfig.enemies[attackerType] || BalanceConfig.players[attackerType];
        const target = BalanceConfig.enemies[targetType] || BalanceConfig.players[targetType];
        
        const dps = attacker.damage * (attacker.attackRate || 1);
        return target.health / dps;
    }
    
    /**
     * Estimate wave difficulty
     */
    static estimateWaveDifficulty(waveNumber) {
        const wave = BalanceConfig.waves.compositions[waveNumber - 1];
        if (!wave) return 0;
        
        let difficulty = 0;
        
        // Calculate enemy threat
        wave.enemies.forEach(enemyType => {
            // Special handling for boss
            if (enemyType === 'boss') {
                const boss = BalanceConfig.boss;
                // Boss has significantly higher difficulty
                difficulty += (boss.health / 100) * 2; // Boss is worth ~20 difficulty points
            } else {
                const enemy = BalanceConfig.enemies[enemyType];
                if (enemy) {
                    const threat = (enemy.health / 30) * (this.calculateDPS(enemyType) / 10);
                    difficulty += threat;
                }
            }
        });
        
        // Factor in wave duration
        difficulty *= (wave.duration / 60);
        
        // Factor in objectives
        difficulty *= (1 + wave.objectives.length * 0.2);
        
        return difficulty;
    }
    
    /**
     * Auto-balance based on player performance
     */
    static autoBalance(playerStats) {
        const adjustments = {};
        
        // If players are dying too much, reduce difficulty
        if (playerStats.deathRate > 0.5) { // More than 1 death per 2 minutes
            adjustments.enemyDamage = 0.9;
            adjustments.enemyHealth = 0.9;
        }
        
        // If players are breezing through, increase difficulty
        if (playerStats.deathRate < 0.1) { // Less than 1 death per 10 minutes
            adjustments.enemyDamage = 1.1;
            adjustments.enemyHealth = 1.1;
            adjustments.enemySpeed = 1.05;
        }
        
        // If waves are taking too long, reduce enemy health
        if (playerStats.averageWaveTime > 180) { // More than 3 minutes
            adjustments.enemyHealth = 0.85;
        }
        
        // If waves are too quick, increase enemy count
        if (playerStats.averageWaveTime < 60) { // Less than 1 minute
            adjustments.enemyCount = 1.2;
        }
        
        return adjustments;
    }
}

/**
 * Export for testing
 */
export function runBalanceTests() {
    console.log('Running balance validation...');
    
    const warnings = BalanceValidator.validate();
    if (warnings.length > 0) {
        console.warn('Balance warnings:', warnings);
    } else {
        console.log('✓ Balance validation passed');
    }
    
    // Test DPS calculations
    console.log('\nEnemy DPS:');
    Object.keys(BalanceConfig.enemies).forEach(enemy => {
        console.log(`  ${enemy}: ${BalanceValidator.calculateDPS(enemy).toFixed(1)} DPS`);
    });
    
    // Test TTK calculations
    console.log('\nTime to Kill (Brawler vs Players):');
    console.log(`  vs Runner: ${BalanceValidator.calculateTTK('brawler', 'runner').toFixed(1)}s`);
    console.log(`  vs Anchor: ${BalanceValidator.calculateTTK('brawler', 'anchor').toFixed(1)}s`);
    
    // Test wave difficulty
    console.log('\nWave Difficulty Estimates:');
    for (let i = 1; i <= 5; i++) {
        console.log(`  Wave ${i}: ${BalanceValidator.estimateWaveDifficulty(i).toFixed(1)}`);
    }
    
    return {
        warnings,
        passed: warnings.length === 0
    };
}