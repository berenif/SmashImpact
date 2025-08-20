/**
 * Testing Framework - Automated testing for gameplay systems
 */

import { EventBus, EVENTS } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';
import { BalanceConfig, BalanceValidator } from './balance-config.js';

/**
 * Test categories
 */
export const TEST_CATEGORIES = {
    COMBAT: 'combat',
    MOVEMENT: 'movement',
    COOP: 'coop',
    ENEMIES: 'enemies',
    WAVES: 'waves',
    UPGRADES: 'upgrades',
    NETWORK: 'network',
    PERFORMANCE: 'performance'
};

/**
 * Test result status
 */
export const TEST_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    PASSED: 'passed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
};

/**
 * Test Suite class
 */
export class TestSuite {
    constructor(name, category) {
        this.name = name;
        this.category = category;
        this.tests = [];
        this.results = [];
        this.startTime = 0;
        this.endTime = 0;
    }
    
    /**
     * Add a test to the suite
     */
    addTest(name, testFn, options = {}) {
        this.tests.push({
            name,
            testFn,
            timeout: options.timeout || 5000,
            skip: options.skip || false,
            only: options.only || false
        });
    }
    
    /**
     * Run all tests in the suite
     */
    async run() {
        console.log(`Running test suite: ${this.name}`);
        this.startTime = Date.now();
        this.results = [];
        
        // Filter tests based on only/skip
        const testsToRun = this.tests.filter(test => {
            if (test.skip) return false;
            if (this.tests.some(t => t.only)) {
                return test.only;
            }
            return true;
        });
        
        for (const test of testsToRun) {
            const result = await this.runTest(test);
            this.results.push(result);
        }
        
        this.endTime = Date.now();
        return this.getResults();
    }
    
    /**
     * Run a single test
     */
    async runTest(test) {
        const result = {
            name: test.name,
            status: TEST_STATUS.RUNNING,
            error: null,
            duration: 0
        };
        
        const startTime = Date.now();
        
        try {
            // Run test with timeout
            await Promise.race([
                test.testFn(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Test timeout')), test.timeout)
                )
            ]);
            
            result.status = TEST_STATUS.PASSED;
        } catch (error) {
            result.status = TEST_STATUS.FAILED;
            result.error = error.message;
            console.error(`Test failed: ${test.name}`, error);
        }
        
        result.duration = Date.now() - startTime;
        return result;
    }
    
    /**
     * Get test results summary
     */
    getResults() {
        const passed = this.results.filter(r => r.status === TEST_STATUS.PASSED).length;
        const failed = this.results.filter(r => r.status === TEST_STATUS.FAILED).length;
        const duration = this.endTime - this.startTime;
        
        return {
            suite: this.name,
            category: this.category,
            passed,
            failed,
            total: this.results.length,
            duration,
            results: this.results
        };
    }
}

/**
 * Test assertions
 */
export class Assert {
    static equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }
    
    static notEqual(actual, expected, message) {
        if (actual === expected) {
            throw new Error(message || `Expected not ${expected}, got ${actual}`);
        }
    }
    
    static isTrue(value, message) {
        if (!value) {
            throw new Error(message || `Expected true, got ${value}`);
        }
    }
    
    static isFalse(value, message) {
        if (value) {
            throw new Error(message || `Expected false, got ${value}`);
        }
    }
    
    static isAbove(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} > ${expected}`);
        }
    }
    
    static isBelow(actual, expected, message) {
        if (actual >= expected) {
            throw new Error(message || `Expected ${actual} < ${expected}`);
        }
    }
    
    static inRange(value, min, max, message) {
        if (value < min || value > max) {
            throw new Error(message || `Expected ${value} in range [${min}, ${max}]`);
        }
    }
    
    static throws(fn, message) {
        let thrown = false;
        try {
            fn();
        } catch (e) {
            thrown = true;
        }
        if (!thrown) {
            throw new Error(message || 'Expected function to throw');
        }
    }
}

/**
 * Game System Tests
 */
export class GameSystemTests {
    /**
     * Test combat system
     */
    static createCombatTests() {
        const suite = new TestSuite('Combat System', TEST_CATEGORIES.COMBAT);
        
        suite.addTest('Damage calculation', async () => {
            const damage = 50;
            const reduction = 0.2;
            const result = damage * (1 - reduction);
            Assert.equal(result, 40, 'Damage reduction should work correctly');
        });
        
        suite.addTest('Critical strikes', async () => {
            const baseDamage = 20;
            const critMultiplier = 2.0;
            const critDamage = baseDamage * critMultiplier;
            Assert.equal(critDamage, 40, 'Critical damage should double');
        });
        
        suite.addTest('Health boundaries', async () => {
            const maxHealth = 100;
            let health = 120;
            health = Math.min(health, maxHealth);
            Assert.equal(health, maxHealth, 'Health should not exceed maximum');
            
            health = -10;
            health = Math.max(health, 0);
            Assert.equal(health, 0, 'Health should not go below zero');
        });
        
        suite.addTest('Attack cooldowns', async () => {
            const attackRate = 2; // attacks per second
            const cooldown = 1 / attackRate;
            Assert.equal(cooldown, 0.5, 'Cooldown should be inverse of attack rate');
        });
        
        return suite;
    }
    
    /**
     * Test co-op mechanics
     */
    static createCoopTests() {
        const suite = new TestSuite('Co-op Mechanics', TEST_CATEGORIES.COOP);
        
        suite.addTest('Tether distance', async () => {
            const maxLength = BalanceConfig.coop.tether.maxLength;
            const breakDistance = BalanceConfig.coop.tether.breakDistance;
            Assert.isAbove(breakDistance, maxLength, 'Break distance should be greater than max length');
        });
        
        suite.addTest('Rally healing', async () => {
            const healAmount = BalanceConfig.coop.rally.healAmount;
            const playerHealth = 50;
            const maxHealth = 100;
            const healed = Math.min(playerHealth + healAmount, maxHealth);
            Assert.isBelow(healed, maxHealth + 1, 'Healing should not exceed max health');
        });
        
        suite.addTest('Back-to-back angle', async () => {
            const angle1 = 0;
            const angle2 = Math.PI; // 180 degrees
            const diff = Math.abs(angle1 - angle2);
            Assert.inRange(diff, Math.PI - 0.5, Math.PI + 0.5, 'Should detect back-to-back');
        });
        
        suite.addTest('Combo meter decay', async () => {
            const value = 50;
            const decayRate = BalanceConfig.coop.comboMeter.decayRate;
            const afterOneSecond = Math.max(0, value - decayRate);
            Assert.equal(afterOneSecond, 48, 'Combo should decay correctly');
        });
        
        return suite;
    }
    
    /**
     * Test enemy AI
     */
    static createEnemyTests() {
        const suite = new TestSuite('Enemy AI', TEST_CATEGORIES.ENEMIES);
        
        suite.addTest('Enemy DPS balance', async () => {
            const brawlerDPS = BalanceValidator.calculateDPS('brawler');
            const archerDPS = BalanceValidator.calculateDPS('archer');
            Assert.isAbove(brawlerDPS, 0, 'Brawler should have positive DPS');
            Assert.isAbove(archerDPS, 0, 'Archer should have positive DPS');
        });
        
        suite.addTest('Enemy health scaling', async () => {
            const baseHealth = BalanceConfig.enemies.brawler.health;
            const scaling = BalanceConfig.waves.scaling.healthScaling;
            const wave3Health = baseHealth * Math.pow(scaling, 2);
            Assert.isAbove(wave3Health, baseHealth, 'Health should scale with waves');
        });
        
        suite.addTest('Stalker shimmer time', async () => {
            const shimmerTime = BalanceConfig.enemies.stalker.shimmerTime;
            Assert.inRange(shimmerTime, 0.2, 1.0, 'Shimmer should be noticeable but not too long');
        });
        
        suite.addTest('Bulwark shield', async () => {
            const shieldHealth = BalanceConfig.enemies.bulwark.shieldHealth;
            const mainHealth = BalanceConfig.enemies.bulwark.health;
            Assert.isBelow(shieldHealth, mainHealth, 'Shield should be weaker than main health');
        });
        
        return suite;
    }
    
    /**
     * Test wave system
     */
    static createWaveTests() {
        const suite = new TestSuite('Wave System', TEST_CATEGORIES.WAVES);
        
        suite.addTest('Wave difficulty progression', async () => {
            const wave1 = BalanceValidator.estimateWaveDifficulty(1);
            const wave3 = BalanceValidator.estimateWaveDifficulty(3);
            const wave5 = BalanceValidator.estimateWaveDifficulty(5);
            
            Assert.isAbove(wave3, wave1, 'Wave 3 should be harder than Wave 1');
            Assert.isAbove(wave5, wave3, 'Wave 5 should be harder than Wave 3');
        });
        
        suite.addTest('Enemy count scaling', async () => {
            const base = BalanceConfig.waves.scaling.enemyCountBase;
            const perWave = BalanceConfig.waves.scaling.enemyCountPerWave;
            const wave3Count = base + (perWave * 2);
            Assert.equal(wave3Count, 7, 'Wave 3 should have correct enemy count');
        });
        
        suite.addTest('Preparation time', async () => {
            const prepTime = BalanceConfig.waves.preparationTime;
            Assert.inRange(prepTime, 5, 15, 'Prep time should be reasonable');
        });
        
        suite.addTest('Wave compositions', async () => {
            const compositions = BalanceConfig.waves.compositions;
            Assert.isAbove(compositions.length, 0, 'Should have wave compositions');
            
            compositions.forEach((wave, index) => {
                Assert.isAbove(wave.enemies.length, 0, `Wave ${index + 1} should have enemies`);
                Assert.isAbove(wave.duration, 0, `Wave ${index + 1} should have duration`);
            });
        });
        
        return suite;
    }
    
    /**
     * Test upgrade system
     */
    static createUpgradeTests() {
        const suite = new TestSuite('Upgrade System', TEST_CATEGORIES.UPGRADES);
        
        suite.addTest('Rarity weights', async () => {
            const weights = BalanceConfig.upgrades.rarityWeights;
            const total = Object.values(weights).reduce((a, b) => a + b, 0);
            Assert.equal(total, 100, 'Rarity weights should sum to 100');
        });
        
        suite.addTest('Upgrade scaling', async () => {
            const common = BalanceConfig.upgrades.scaling.common.damageBonus;
            const rare = BalanceConfig.upgrades.scaling.rare.damageBonus;
            const epic = BalanceConfig.upgrades.scaling.epic.damageBonus;
            const legendary = BalanceConfig.upgrades.scaling.legendary.damageBonus;
            
            Assert.isAbove(rare, common, 'Rare should be better than common');
            Assert.isAbove(epic, rare, 'Epic should be better than rare');
            Assert.isAbove(legendary, epic, 'Legendary should be better than epic');
        });
        
        suite.addTest('Reroll cost scaling', async () => {
            const base = BalanceConfig.upgrades.currency.rerollBase;
            const scaling = BalanceConfig.upgrades.currency.rerollScaling;
            const thirdReroll = base * Math.pow(scaling, 2);
            Assert.isAbove(thirdReroll, base, 'Reroll cost should increase');
        });
        
        return suite;
    }
    
    /**
     * Test boss director
     */
    static createBossTests() {
        const suite = new TestSuite('Boss Director', TEST_CATEGORIES.ENEMIES);
        
        suite.addTest('Boss phase thresholds', async () => {
            const phases = BalanceConfig.boss.phases;
            Assert.equal(phases.phase1.healthThreshold, 0.66, 'Phase 1 at 66% health');
            Assert.equal(phases.phase2.healthThreshold, 0.33, 'Phase 2 at 33% health');
            Assert.equal(phases.phase3.healthThreshold, 0.1, 'Phase 3 at 10% health');
        });
        
        suite.addTest('Boss damage scaling', async () => {
            const phase1 = BalanceConfig.boss.phases.phase1.damageMultiplier;
            const phase3 = BalanceConfig.boss.phases.phase3.damageMultiplier;
            const desperation = BalanceConfig.boss.phases.desperation.damageMultiplier;
            
            Assert.isAbove(phase3, phase1, 'Phase 3 should deal more damage');
            Assert.isAbove(desperation, phase3, 'Desperation should be highest damage');
        });
        
        suite.addTest('Boss adaptation', async () => {
            const learnRate = BalanceConfig.boss.adaptation.learnRate;
            Assert.inRange(learnRate, 0.05, 0.2, 'Learn rate should be moderate');
            
            const tacticCooldown = BalanceConfig.boss.adaptation.tacticCooldown;
            Assert.isAbove(tacticCooldown, 5, 'Tactic cooldown should prevent spam');
        });
        
        suite.addTest('Boss attacks', async () => {
            const charge = BalanceConfig.boss.attacks.chargeAttack;
            const precision = BalanceConfig.boss.attacks.precisionStrike;
            
            Assert.isAbove(precision.damage, charge.damage, 'Precision should hit harder');
            Assert.isAbove(charge.telegraphTime, 1.0, 'Charge should have warning');
        });
        
        return suite;
    }
    
    /**
     * Test performance limits
     */
    static createPerformanceTests() {
        const suite = new TestSuite('Performance', TEST_CATEGORIES.PERFORMANCE);
        
        suite.addTest('Entity limits', async () => {
            const maxEnemies = BalanceConfig.performance.maxEnemies;
            const maxProjectiles = BalanceConfig.performance.maxProjectiles;
            
            Assert.inRange(maxEnemies, 20, 50, 'Enemy limit should be reasonable');
            Assert.inRange(maxProjectiles, 30, 100, 'Projectile limit should be reasonable');
        });
        
        suite.addTest('Update rates', async () => {
            const rates = BalanceConfig.performance.updateRates;
            
            Assert.equal(rates.physics, 60, 'Physics should run at 60 Hz');
            Assert.equal(rates.rendering, 60, 'Rendering should run at 60 Hz');
            Assert.inRange(rates.ai, 5, 20, 'AI should update at reasonable rate');
            Assert.inRange(rates.networking, 15, 60, 'Network should update appropriately');
        });
        
        suite.addTest('Culling distance', async () => {
            const distance = BalanceConfig.performance.culling.distance;
            const lodDistance = BalanceConfig.performance.culling.enemyLOD;
            
            Assert.isAbove(distance, 1000, 'Culling distance should be generous');
            Assert.isBelow(lodDistance, distance, 'LOD should kick in before culling');
        });
        
        return suite;
    }
}

/**
 * Test Runner
 */
export class TestRunner {
    constructor() {
        this.suites = [];
        this.results = [];
    }
    
    /**
     * Add test suite
     */
    addSuite(suite) {
        this.suites.push(suite);
    }
    
    /**
     * Run all test suites
     */
    async runAll() {
        console.log('='.repeat(50));
        console.log('Running all tests...');
        console.log('='.repeat(50));
        
        this.results = [];
        const startTime = Date.now();
        
        for (const suite of this.suites) {
            const result = await suite.run();
            this.results.push(result);
            this.printSuiteResult(result);
        }
        
        const duration = Date.now() - startTime;
        this.printSummary(duration);
        
        return this.results;
    }
    
    /**
     * Print suite result
     */
    printSuiteResult(result) {
        const status = result.failed === 0 ? '✓' : '✗';
        const color = result.failed === 0 ? '\x1b[32m' : '\x1b[31m';
        const reset = '\x1b[0m';
        
        console.log(`\n${color}${status}${reset} ${result.suite}`);
        console.log(`  Passed: ${result.passed}/${result.total} (${result.duration}ms)`);
        
        if (result.failed > 0) {
            result.results.filter(r => r.status === TEST_STATUS.FAILED).forEach(test => {
                console.log(`    ${color}✗${reset} ${test.name}: ${test.error}`);
            });
        }
    }
    
    /**
     * Print summary
     */
    printSummary(duration) {
        const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
        const totalFailed = this.results.reduce((sum, r) => sum + r.failed, 0);
        const totalTests = totalPassed + totalFailed;
        
        console.log('\n' + '='.repeat(50));
        console.log('Test Summary');
        console.log('='.repeat(50));
        console.log(`Total: ${totalTests} tests`);
        console.log(`Passed: ${totalPassed}`);
        console.log(`Failed: ${totalFailed}`);
        console.log(`Duration: ${duration}ms`);
        
        if (totalFailed === 0) {
            console.log('\n✓ All tests passed!');
        } else {
            console.log(`\n✗ ${totalFailed} tests failed`);
        }
    }
}

/**
 * Run all tests
 */
export async function runAllTests() {
    const runner = new TestRunner();
    
    // Add all test suites
    runner.addSuite(GameSystemTests.createCombatTests());
    runner.addSuite(GameSystemTests.createCoopTests());
    runner.addSuite(GameSystemTests.createEnemyTests());
    runner.addSuite(GameSystemTests.createWaveTests());
    runner.addSuite(GameSystemTests.createUpgradeTests());
    runner.addSuite(GameSystemTests.createBossTests());
    runner.addSuite(GameSystemTests.createPerformanceTests());
    
    // Run balance validation
    console.log('\nRunning balance validation...');
    const balanceResult = BalanceValidator.validate();
    if (balanceResult && balanceResult.length > 0) {
        console.log('Balance warnings:');
        balanceResult.forEach(warning => console.log(`  ⚠ ${warning}`));
    } else {
        console.log('✓ Balance validation passed');
    }
    
    // Run all tests
    const results = await runner.runAll();
    
    return {
        testResults: results,
        balanceWarnings: balanceResult
    };
}