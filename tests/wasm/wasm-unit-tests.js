/**
 * WASM Game Engine Unit Tests
 * Comprehensive test suite for the WASM module functionality
 */

class WASMTestSuite {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.wasmModule = null;
    }

    /**
     * Initialize the WASM module for testing
     */
    async initialize() {
        try {
            // Load the WASM module
            if (typeof Module !== 'undefined') {
                this.wasmModule = Module;
                await this.waitForModule();
                return true;
            } else {
                throw new Error('WASM Module not loaded');
            }
        } catch (error) {
            console.error('Failed to initialize WASM module:', error);
            return false;
        }
    }

    /**
     * Wait for WASM module to be ready
     */
    waitForModule() {
        return new Promise((resolve) => {
            if (this.wasmModule.calledRun) {
                resolve();
            } else {
                this.wasmModule.onRuntimeInitialized = () => {
                    resolve();
                };
            }
        });
    }

    /**
     * Register a test
     */
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    /**
     * Assert helper functions
     */
    assert = {
        equal: (actual, expected, message) => {
            if (actual !== expected) {
                throw new Error(message || `Expected ${expected}, got ${actual}`);
            }
        },
        
        notEqual: (actual, expected, message) => {
            if (actual === expected) {
                throw new Error(message || `Expected not ${expected}, got ${actual}`);
            }
        },
        
        true: (value, message) => {
            if (!value) {
                throw new Error(message || `Expected true, got ${value}`);
            }
        },
        
        false: (value, message) => {
            if (value) {
                throw new Error(message || `Expected false, got ${value}`);
            }
        },
        
        greaterThan: (actual, expected, message) => {
            if (actual <= expected) {
                throw new Error(message || `Expected ${actual} > ${expected}`);
            }
        },
        
        lessThan: (actual, expected, message) => {
            if (actual >= expected) {
                throw new Error(message || `Expected ${actual} < ${expected}`);
            }
        },
        
        throws: (fn, message) => {
            let threw = false;
            try {
                fn();
            } catch (e) {
                threw = true;
            }
            if (!threw) {
                throw new Error(message || 'Expected function to throw');
            }
        }
    };

    /**
     * Run all tests
     */
    async runAll() {
        console.log('🧪 Starting WASM Unit Tests...\n');
        
        const initialized = await this.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize WASM module');
            return this.results;
        }

        for (const test of this.tests) {
            await this.runTest(test);
        }

        this.printResults();
        return this.results;
    }

    /**
     * Run a single test
     */
    async runTest(test) {
        this.results.total++;
        
        try {
            await test.testFn.call(this);
            this.results.passed++;
            this.results.details.push({
                name: test.name,
                status: 'passed',
                error: null
            });
            console.log(`✅ ${test.name}`);
        } catch (error) {
            this.results.failed++;
            this.results.details.push({
                name: test.name,
                status: 'failed',
                error: error.message
            });
            console.error(`❌ ${test.name}`);
            console.error(`   ${error.message}`);
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Results Summary');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
        console.log('='.repeat(50));
        
        if (this.results.failed === 0) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('⚠️ Some tests failed. Check the details above.');
        }
    }
}

// Create test suite instance
const testSuite = new WASMTestSuite();

// ============================================
// ENTITY CREATION TESTS
// ============================================

testSuite.test('Create Player Entity', function() {
    const playerId = this.wasmModule._createPlayer(400, 300);
    this.assert.greaterThan(playerId, -1, 'Player ID should be valid');
    
    // Verify player position
    const x = this.wasmModule._getEntityX(playerId);
    const y = this.wasmModule._getEntityY(playerId);
    this.assert.equal(x, 400, 'Player X position should be 400');
    this.assert.equal(y, 300, 'Player Y position should be 300');
});

testSuite.test('Create Enemy Entity', function() {
    const enemyId = this.wasmModule._createEnemy(100, 100, 2.0);
    this.assert.greaterThan(enemyId, -1, 'Enemy ID should be valid');
    
    // Verify enemy exists
    const exists = this.wasmModule._entityExists(enemyId);
    this.assert.true(exists, 'Enemy should exist after creation');
});

testSuite.test('Create Wolf Entity', function() {
    const wolfId = this.wasmModule._createWolf(200, 200);
    this.assert.greaterThan(wolfId, -1, 'Wolf ID should be valid');
    
    // Verify wolf position
    const x = this.wasmModule._getEntityX(wolfId);
    const y = this.wasmModule._getEntityY(wolfId);
    this.assert.equal(x, 200, 'Wolf X position should be 200');
    this.assert.equal(y, 200, 'Wolf Y position should be 200');
});

testSuite.test('Create Projectile', function() {
    const playerId = this.wasmModule._createPlayer(400, 300);
    const projectileId = this.wasmModule._createProjectile(400, 300, 1.0, 0.0, 10, playerId);
    this.assert.greaterThan(projectileId, -1, 'Projectile ID should be valid');
});

testSuite.test('Create PowerUp', function() {
    const powerUpId = this.wasmModule._createPowerUp(250, 250, 1);
    this.assert.greaterThan(powerUpId, -1, 'PowerUp ID should be valid');
});

testSuite.test('Create Obstacle', function() {
    const obstacleId = this.wasmModule._createObstacle(300, 300, 50, 1);
    this.assert.greaterThan(obstacleId, -1, 'Obstacle ID should be valid');
    
    // Verify obstacle radius
    const radius = this.wasmModule._getEntityRadius(obstacleId);
    this.assert.equal(radius, 50, 'Obstacle radius should be 50');
});

// ============================================
// ENTITY MANAGEMENT TESTS
// ============================================

testSuite.test('Remove Entity', function() {
    const enemyId = this.wasmModule._createEnemy(150, 150, 1.5);
    this.assert.true(this.wasmModule._entityExists(enemyId), 'Enemy should exist');
    
    this.wasmModule._removeEntity(enemyId);
    this.assert.false(this.wasmModule._entityExists(enemyId), 'Enemy should not exist after removal');
});

testSuite.test('Clear All Entities', function() {
    // Create multiple entities
    const enemy1 = this.wasmModule._createEnemy(100, 100, 1.0);
    const enemy2 = this.wasmModule._createEnemy(200, 200, 1.0);
    const powerUp = this.wasmModule._createPowerUp(300, 300, 1);
    
    // Clear all entities
    this.wasmModule._clearEntities();
    
    // Verify entities are removed
    this.assert.false(this.wasmModule._entityExists(enemy1), 'Enemy 1 should be removed');
    this.assert.false(this.wasmModule._entityExists(enemy2), 'Enemy 2 should be removed');
    this.assert.false(this.wasmModule._entityExists(powerUp), 'PowerUp should be removed');
});

testSuite.test('Get Entity Count', function() {
    this.wasmModule._clearEntities();
    const initialCount = this.wasmModule._getEntityCount();
    
    // Create some entities
    this.wasmModule._createPlayer(400, 300);
    this.wasmModule._createEnemy(100, 100, 1.0);
    this.wasmModule._createEnemy(200, 200, 1.0);
    
    const newCount = this.wasmModule._getEntityCount();
    this.assert.equal(newCount - initialCount, 3, 'Should have 3 new entities');
});

// ============================================
// PLAYER CONTROL TESTS
// ============================================

testSuite.test('Update Player Input', function() {
    const playerId = this.wasmModule._createPlayer(400, 300);
    
    // Update player movement
    this.wasmModule._updatePlayerInput(1.0, 0.0, 500, 300);
    
    // Update game to apply movement
    this.wasmModule._updateGame(16); // 16ms delta time
    
    // Check if player moved
    const newX = this.wasmModule._getEntityX(playerId);
    this.assert.greaterThan(newX, 400, 'Player should have moved right');
});

testSuite.test('Player Shooting', function() {
    const playerId = this.wasmModule._createPlayer(400, 300);
    const initialCount = this.wasmModule._getEntityCount();
    
    // Trigger shooting
    this.wasmModule._playerShoot();
    
    const newCount = this.wasmModule._getEntityCount();
    this.assert.greaterThan(newCount, initialCount, 'Projectile should be created');
});

// ============================================
// GAME STATE TESTS
// ============================================

testSuite.test('Game Score Management', function() {
    this.wasmModule._setScore(0);
    this.assert.equal(this.wasmModule._getScore(), 0, 'Score should be 0');
    
    this.wasmModule._setScore(100);
    this.assert.equal(this.wasmModule._getScore(), 100, 'Score should be 100');
    
    this.wasmModule._addScore(50);
    this.assert.equal(this.wasmModule._getScore(), 150, 'Score should be 150');
});

testSuite.test('Wave Management', function() {
    this.wasmModule._setWave(1);
    this.assert.equal(this.wasmModule._getWave(), 1, 'Wave should be 1');
    
    this.wasmModule._nextWave();
    this.assert.equal(this.wasmModule._getWave(), 2, 'Wave should be 2');
});

testSuite.test('Game State Control', function() {
    // Test pause
    this.wasmModule._pauseGame();
    this.assert.true(this.wasmModule._isGamePaused(), 'Game should be paused');
    
    // Test resume
    this.wasmModule._resumeGame();
    this.assert.false(this.wasmModule._isGamePaused(), 'Game should not be paused');
});

// ============================================
// COLLISION TESTS
// ============================================

testSuite.test('Check Collision Detection', function() {
    // Create two entities close to each other
    const entity1 = this.wasmModule._createEnemy(100, 100, 0);
    const entity2 = this.wasmModule._createEnemy(110, 100, 0);
    
    // Check if collision is detected
    const colliding = this.wasmModule._checkCollision(entity1, entity2);
    this.assert.true(colliding, 'Entities should be colliding');
    
    // Move entity2 far away
    this.wasmModule._setEntityPosition(entity2, 500, 500);
    const notColliding = this.wasmModule._checkCollision(entity1, entity2);
    this.assert.false(notColliding, 'Entities should not be colliding');
});

// ============================================
// PERFORMANCE TESTS
// ============================================

testSuite.test('Performance - Create Many Entities', function() {
    const startTime = performance.now();
    const entityCount = 100;
    const entities = [];
    
    for (let i = 0; i < entityCount; i++) {
        const id = this.wasmModule._createEnemy(
            Math.random() * 800,
            Math.random() * 600,
            1.0
        );
        entities.push(id);
    }
    
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    
    this.assert.lessThan(timeTaken, 100, `Creating ${entityCount} entities should take less than 100ms`);
    this.assert.equal(entities.length, entityCount, `Should have created ${entityCount} entities`);
    
    // Clean up
    entities.forEach(id => this.wasmModule._removeEntity(id));
});

testSuite.test('Performance - Update Loop', function() {
    // Create a realistic game scenario
    this.wasmModule._clearEntities();
    this.wasmModule._createPlayer(400, 300);
    
    for (let i = 0; i < 20; i++) {
        this.wasmModule._createEnemy(
            Math.random() * 800,
            Math.random() * 600,
            1.0
        );
    }
    
    const startTime = performance.now();
    const frames = 60;
    
    // Simulate 60 frames
    for (let i = 0; i < frames; i++) {
        this.wasmModule._updateGame(16.67); // ~60 FPS
    }
    
    const endTime = performance.now();
    const timeTaken = endTime - startTime;
    const avgFrameTime = timeTaken / frames;
    
    this.assert.lessThan(avgFrameTime, 16.67, 'Average frame time should be less than 16.67ms (60 FPS)');
});

// ============================================
// MEMORY TESTS
// ============================================

testSuite.test('Memory - Entity Lifecycle', function() {
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
        // Create and remove entities repeatedly
        const id = this.wasmModule._createEnemy(100, 100, 1.0);
        this.wasmModule._removeEntity(id);
    }
    
    // Check that we can still create entities (no memory leak)
    const finalId = this.wasmModule._createEnemy(200, 200, 1.0);
    this.assert.greaterThan(finalId, -1, 'Should still be able to create entities after many create/remove cycles');
});

// ============================================
// BOUNDARY TESTS
// ============================================

testSuite.test('Boundary - Invalid Entity ID', function() {
    // Test with invalid ID
    const exists = this.wasmModule._entityExists(-1);
    this.assert.false(exists, 'Invalid entity ID should not exist');
    
    // Test with very large ID
    const existsLarge = this.wasmModule._entityExists(999999);
    this.assert.false(existsLarge, 'Very large entity ID should not exist');
});

testSuite.test('Boundary - Entity Position Limits', function() {
    const enemyId = this.wasmModule._createEnemy(0, 0, 1.0);
    
    // Test extreme positions
    this.wasmModule._setEntityPosition(enemyId, -1000, -1000);
    let x = this.wasmModule._getEntityX(enemyId);
    let y = this.wasmModule._getEntityY(enemyId);
    this.assert.equal(x, -1000, 'Should handle negative X position');
    this.assert.equal(y, -1000, 'Should handle negative Y position');
    
    this.wasmModule._setEntityPosition(enemyId, 10000, 10000);
    x = this.wasmModule._getEntityX(enemyId);
    y = this.wasmModule._getEntityY(enemyId);
    this.assert.equal(x, 10000, 'Should handle large X position');
    this.assert.equal(y, 10000, 'Should handle large Y position');
});

// Export for use in HTML
if (typeof module !== 'undefined' && module.exports) {
    module.exports = testSuite;
}