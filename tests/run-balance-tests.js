#!/usr/bin/env node

/**
 * Standalone Balance Testing Script
 * Tests game balance configuration without dependencies
 */

import { BalanceConfig } from '../src/testing/balance-config.js';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Simple assertion helper
 */
class Assert {
    static isTrue(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }
    
    static isAbove(value, threshold, message) {
        if (value <= threshold) {
            throw new Error(message || `Expected ${value} > ${threshold}`);
        }
    }
    
    static isBelow(value, threshold, message) {
        if (value >= threshold) {
            throw new Error(message || `Expected ${value} < ${threshold}`);
        }
    }
    
    static inRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(message || `Expected ${value} in range [${min}, ${max}]`);
        }
    }
}

/**
 * Run a test and return result
 */
async function runTest(name, testFn) {
    try {
        await testFn();
        return { name, passed: true, error: null };
    } catch (error) {
        return { name, passed: false, error: error.message };
    }
}

/**
 * Print test result
 */
function printResult(result, indent = '  ') {
    const status = result.passed ? 
        `${colors.green}✓${colors.reset}` : 
        `${colors.red}✗${colors.reset}`;
    
    console.log(`${indent}${status} ${result.name}`);
    if (!result.passed && result.error) {
        console.log(`${indent}  ${colors.red}Error: ${result.error}${colors.reset}`);
    }
}

/**
 * Calculate DPS for balance testing
 */
function calculateDPS(enemyType) {
    const enemy = BalanceConfig.enemies[enemyType];
    if (!enemy) return 0;
    return enemy.damage * (enemy.attackRate || 1);
}

/**
 * Calculate time-to-kill
 */
function calculateTTK(attackerType, targetType) {
    const attacker = BalanceConfig.enemies[attackerType] || BalanceConfig.players[attackerType];
    const target = BalanceConfig.enemies[targetType] || BalanceConfig.players[targetType];
    
    if (!attacker || !target) return Infinity;
    
    const dps = attacker.damage * (attacker.attackRate || 1);
    return target.health / dps;
}

/**
 * Main test execution
 */
async function main() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}🎮 SmashImpact Balance Testing 🎮${colors.reset}`);
    console.log('='.repeat(60));
    
    const categories = [
        {
            name: 'Player Balance',
            tests: [
                ['Runner vs Anchor Health', () => {
                    Assert.isBelow(
                        BalanceConfig.players.runner.health,
                        BalanceConfig.players.anchor.health,
                        'Runner should have less health than Anchor'
                    );
                }],
                ['Runner vs Anchor Speed', () => {
                    Assert.isAbove(
                        BalanceConfig.players.runner.speed,
                        BalanceConfig.players.anchor.speed,
                        'Runner should be faster than Anchor'
                    );
                }],
                ['Dodge Cooldown', () => {
                    Assert.inRange(
                        BalanceConfig.players.runner.dodgeCooldown,
                        1, 5,
                        'Dodge cooldown should be reasonable'
                    );
                }],
                ['Shield Coverage', () => {
                    Assert.inRange(
                        BalanceConfig.players.anchor.shieldAngle,
                        45, 120,
                        'Shield angle should provide good frontal coverage'
                    );
                }]
            ]
        },
        {
            name: 'Enemy Balance',
            tests: [
                ['Enemy Health Progression', () => {
                    Assert.isBelow(
                        BalanceConfig.enemies.archer.health,
                        BalanceConfig.enemies.brawler.health,
                        'Archer should be squishier than Brawler'
                    );
                    Assert.isAbove(
                        BalanceConfig.enemies.bulwark.health,
                        BalanceConfig.enemies.brawler.health,
                        'Bulwark should be tankier than Brawler'
                    );
                }],
                ['Enemy DPS Balance', () => {
                    const brawlerDPS = calculateDPS('brawler');
                    const archerDPS = calculateDPS('archer');
                    const stalkerDPS = calculateDPS('stalker');
                    
                    Assert.isAbove(brawlerDPS, 0, 'Brawler should have positive DPS');
                    Assert.isAbove(archerDPS, 0, 'Archer should have positive DPS');
                    Assert.isAbove(stalkerDPS, brawlerDPS, 'Stalker should have high burst DPS');
                }],
                ['Stalker Telegraph', () => {
                    Assert.inRange(
                        BalanceConfig.enemies.stalker.shimmerTime,
                        0.2, 1.0,
                        'Stalker shimmer should be noticeable but not too long'
                    );
                }],
                ['Saboteur Mines', () => {
                    Assert.inRange(
                        BalanceConfig.enemies.saboteur.maxMines,
                        2, 5,
                        'Mine count should be limited'
                    );
                    Assert.isAbove(
                        BalanceConfig.enemies.saboteur.mineArmTime,
                        0.5,
                        'Mines should have arm time for counterplay'
                    );
                }]
            ]
        },
        {
            name: 'Wave Scaling',
            tests: [
                ['Health Scaling', () => {
                    Assert.isAbove(
                        BalanceConfig.waves.scaling.healthScaling,
                        1.0,
                        'Enemies should get tougher each wave'
                    );
                    Assert.isBelow(
                        BalanceConfig.waves.scaling.healthScaling,
                        1.5,
                        'Health scaling should not be extreme'
                    );
                }],
                ['Enemy Count Scaling', () => {
                    const base = BalanceConfig.waves.scaling.enemyCountBase;
                    const perWave = BalanceConfig.waves.scaling.enemyCountPerWave;
                    
                    Assert.inRange(base, 2, 5, 'Base enemy count should be manageable');
                    Assert.inRange(perWave, 1, 3, 'Enemy count should scale gradually');
                }],
                ['Preparation Time', () => {
                    Assert.inRange(
                        BalanceConfig.waves.preparationTime,
                        5, 20,
                        'Prep time should allow for upgrades but not drag'
                    );
                }],
                ['Wave Compositions', () => {
                    const comps = BalanceConfig.waves.compositions;
                    Assert.isTrue(comps.length >= 5, 'Should have at least 5 waves');
                    Assert.isTrue(
                        comps[0].enemies.length < comps[3].enemies.length,
                        'Later waves should have more enemies'
                    );
                }]
            ]
        },
        {
            name: 'Co-op Mechanics',
            tests: [
                ['Tether Balance', () => {
                    const tether = BalanceConfig.coop.tether;
                    Assert.isAbove(
                        tether.breakDistance,
                        tether.maxLength,
                        'Break distance should exceed max length'
                    );
                    Assert.inRange(
                        tether.cooldown,
                        3, 10,
                        'Tether cooldown should prevent spam'
                    );
                }],
                ['Rally Healing', () => {
                    const rally = BalanceConfig.coop.rally;
                    Assert.inRange(
                        rally.healAmount,
                        20, 50,
                        'Rally heal should be meaningful but not OP'
                    );
                    Assert.isAbove(
                        rally.cooldown,
                        rally.buffDuration,
                        'Rally cooldown should exceed buff duration'
                    );
                }],
                ['Back-to-Back', () => {
                    const b2b = BalanceConfig.coop.backToBack;
                    Assert.inRange(
                        b2b.damageReduction,
                        0.2, 0.5,
                        'Back-to-back should provide good defense'
                    );
                    Assert.inRange(
                        b2b.maxDistance,
                        30, 100,
                        'Back-to-back distance should be close but achievable'
                    );
                }],
                ['Combo Meter', () => {
                    const combo = BalanceConfig.coop.comboMeter;
                    Assert.isAbove(
                        combo.decayRate,
                        0,
                        'Combo should decay to encourage active play'
                    );
                    Assert.inRange(
                        combo.overclock.duration,
                        5, 15,
                        'Overclock should be powerful but brief'
                    );
                }]
            ]
        },
        {
            name: 'Boss Balance',
            tests: [
                ['Boss Phases', () => {
                    const phases = BalanceConfig.boss.phases;
                    Assert.isTrue(
                        phases.phase1.healthThreshold > phases.phase2.healthThreshold,
                        'Phase thresholds should decrease'
                    );
                    Assert.isTrue(
                        phases.phase2.damageMultiplier > phases.phase1.damageMultiplier,
                        'Boss should get more dangerous'
                    );
                }],
                ['Boss Attacks', () => {
                    const attacks = BalanceConfig.boss.attacks;
                    Assert.isAbove(
                        attacks.chargeAttack.chargeTime,
                        1.0,
                        'Charge attack needs telegraph time'
                    );
                    Assert.inRange(
                        attacks.projectileBarrage.count,
                        5, 12,
                        'Barrage should be threatening but dodgeable'
                    );
                }],
                ['Boss Adaptation', () => {
                    const adapt = BalanceConfig.boss.adaptation;
                    Assert.inRange(
                        adapt.learnRate,
                        0.05, 0.2,
                        'Boss should learn gradually'
                    );
                    Assert.isAbove(
                        adapt.tacticCooldown,
                        5,
                        'Tactics should not repeat too quickly'
                    );
                }]
            ]
        },
        {
            name: 'Upgrade System',
            tests: [
                ['Rarity Weights', () => {
                    const weights = BalanceConfig.upgrades.rarityWeights;
                    const total = Object.values(weights).reduce((a, b) => a + b, 0);
                    Assert.isTrue(
                        Math.abs(total - 100) < 0.01,
                        'Rarity weights should sum to 100'
                    );
                    Assert.isAbove(
                        weights.common,
                        weights.legendary,
                        'Common should be more frequent than legendary'
                    );
                }],
                ['Upgrade Power Scaling', () => {
                    const scaling = BalanceConfig.upgrades.scaling;
                    Assert.isAbove(
                        scaling.rare.damageBonus,
                        scaling.common.damageBonus,
                        'Rarer upgrades should be stronger'
                    );
                    Assert.isBelow(
                        scaling.legendary.damageBonus,
                        1.0,
                        'Even legendary should not double damage'
                    );
                }],
                ['Reroll Costs', () => {
                    const currency = BalanceConfig.upgrades.currency;
                    Assert.isAbove(
                        currency.rerollScaling,
                        1.0,
                        'Reroll cost should increase'
                    );
                    Assert.isBelow(
                        currency.rerollScaling,
                        2.0,
                        'Reroll scaling should not be punitive'
                    );
                }]
            ]
        },
        {
            name: 'Performance Limits',
            tests: [
                ['Entity Limits', () => {
                    const perf = BalanceConfig.performance;
                    Assert.inRange(
                        perf.maxEnemies,
                        15, 50,
                        'Enemy limit should balance performance and gameplay'
                    );
                    Assert.inRange(
                        perf.maxProjectiles,
                        20, 100,
                        'Projectile limit should allow for bullet hell moments'
                    );
                }],
                ['Update Rates', () => {
                    const rates = BalanceConfig.performance.updateRates;
                    Assert.inRange(
                        rates.ai,
                        5, 20,
                        'AI should update frequently enough to be responsive'
                    );
                    Assert.inRange(
                        rates.networking,
                        15, 60,
                        'Network rate should balance responsiveness and bandwidth'
                    );
                }]
            ]
        }
    ];
    
    let totalPassed = 0;
    let totalFailed = 0;
    const failedTests = [];
    
    // Run all test categories
    for (const category of categories) {
        console.log(`\n${colors.cyan}${category.name}${colors.reset}`);
        
        for (const [testName, testFn] of category.tests) {
            const result = await runTest(testName, testFn);
            printResult(result);
            
            if (result.passed) {
                totalPassed++;
            } else {
                totalFailed++;
                failedTests.push({ category: category.name, ...result });
            }
        }
    }
    
    // Additional calculations
    console.log(`\n${colors.cyan}Balance Calculations${colors.reset}`);
    
    // DPS calculations
    console.log('\n  Enemy DPS:');
    for (const enemy of Object.keys(BalanceConfig.enemies)) {
        const dps = calculateDPS(enemy);
        console.log(`    ${enemy}: ${dps.toFixed(1)} DPS`);
    }
    
    // TTK calculations
    console.log('\n  Time to Kill (vs Runner):');
    for (const enemy of ['brawler', 'archer', 'stalker', 'bulwark']) {
        const ttk = calculateTTK(enemy, 'runner');
        console.log(`    ${enemy}: ${ttk.toFixed(1)}s`);
    }
    
    // Wave difficulty estimation
    console.log('\n  Wave Enemy Counts:');
    for (let i = 0; i < 5; i++) {
        const base = BalanceConfig.waves.scaling.enemyCountBase;
        const perWave = BalanceConfig.waves.scaling.enemyCountPerWave;
        const count = base + (perWave * i);
        const health = Math.pow(BalanceConfig.waves.scaling.healthScaling, i);
        console.log(`    Wave ${i + 1}: ${count} enemies (${(health * 100).toFixed(0)}% health)`);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bright}SUMMARY${colors.reset}`);
    console.log('='.repeat(60));
    
    const totalTests = totalPassed + totalFailed;
    const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';
    console.log(`\nTests Run: ${totalPassed + totalFailed}`);
    console.log(`${colors.green}Passed: ${totalPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${totalFailed}${colors.reset}`);
    console.log(`Pass Rate: ${passRate}%`);
    
    if (failedTests.length > 0) {
        console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
        for (const test of failedTests) {
            console.log(`  • [${test.category}] ${test.name}`);
            console.log(`    ${test.error}`);
        }
    }
    
    // Balance recommendations
    console.log(`\n${colors.yellow}Balance Recommendations:${colors.reset}`);
    
    const recommendations = [];
    
    // Check if enemies are too tanky
    const bulwarkTTK = calculateTTK('brawler', 'bulwark');
    if (bulwarkTTK > 10) {
        recommendations.push('Consider reducing Bulwark health - takes too long to kill');
    }
    
    // Check if wave scaling is too aggressive
    const wave5Health = Math.pow(BalanceConfig.waves.scaling.healthScaling, 4);
    if (wave5Health > 2.0) {
        recommendations.push('Wave 5 enemies might be too tanky (>200% health)');
    }
    
    // Check if co-op cooldowns are balanced
    if (BalanceConfig.coop.rally.cooldown > 30) {
        recommendations.push('Rally cooldown might be too long for regular use');
    }
    
    // Check upgrade balance
    if (BalanceConfig.upgrades.rarityWeights.legendary < 1) {
        recommendations.push('Legendary upgrades might be too rare');
    }
    
    if (recommendations.length === 0) {
        console.log('  ✓ Balance appears well-tuned!');
    } else {
        recommendations.forEach(rec => {
            console.log(`  • ${rec}`);
        });
    }
    
    // Final status
    const status = totalFailed === 0 ? 
        `${colors.green}✅ ALL TESTS PASSED${colors.reset}` : 
        `${colors.red}❌ SOME TESTS FAILED${colors.reset}`;
    
    console.log(`\n${status}\n`);
    
    // Exit with appropriate code
    process.exit(totalFailed === 0 ? 0 : 1);
}

// Run tests
main().catch(error => {
    console.error(`${colors.red}Fatal error:${colors.reset}`, error);
    process.exit(1);
});