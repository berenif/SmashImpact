/**
 * Unit Tests for Wolf AI System
 */

import { Wolf } from '../src/ai/wolf/wolf.js';
import { WolfManager } from '../src/ai/wolf/wolf-manager.js';
import { PackCoordinator } from '../src/ai/wolf/pack-coordinator.js';
import { MazePathfinder } from '../src/ai/wolf/pathfinding.js';
import { WolfStateMachine } from '../src/ai/wolf/state-machine.js';
import { WolfBehaviors } from '../src/ai/wolf/behaviors.js';
import { WOLF_CONFIG, WolfState, WolfRole } from '../src/ai/wolf/config.js';

/**
 * Test suite for Wolf AI components
 */
class WolfAITestSuite {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.log('🐺 Starting Wolf AI Test Suite...\n');
        
        // Configuration tests
        await this.testConfiguration();
        
        // Pathfinding tests
        await this.testPathfinding();
        
        // State machine tests
        await this.testStateMachine();
        
        // Behavior tests
        await this.testBehaviors();
        
        // Wolf entity tests
        await this.testWolfEntity();
        
        // Pack coordination tests
        await this.testPackCoordination();
        
        // Manager tests
        await this.testWolfManager();
        
        // Print results
        this.printResults();
    }

    /**
     * Test configuration module
     */
    async testConfiguration() {
        console.log('Testing Configuration Module...');
        
        this.assert(
            'Config has movement settings',
            WOLF_CONFIG.movement !== undefined &&
            WOLF_CONFIG.movement.BASE_SPEED === 2.5
        );
        
        this.assert(
            'Config has detection ranges',
            WOLF_CONFIG.detection !== undefined &&
            WOLF_CONFIG.detection.DETECTION_RANGE === 8
        );
        
        this.assert(
            'Wolf states are defined',
            WolfState.IDLE === 'idle' &&
            WolfState.CHASING === 'chasing'
        );
        
        this.assert(
            'Wolf roles are defined',
            WolfRole.ALPHA === 'alpha' &&
            WolfRole.FLANKER === 'flanker'
        );
    }

    /**
     * Test pathfinding module
     */
    async testPathfinding() {
        console.log('Testing Pathfinding Module...');
        
        const pathfinder = new MazePathfinder(10, 10, []);
        
        this.assert(
            'Pathfinder initializes grid',
            pathfinder.grid !== undefined &&
            pathfinder.grid.length === 10
        );
        
        // Test path finding
        const path = pathfinder.findPath(
            { x: 0, y: 0 },
            { x: 5, y: 5 }
        );
        
        this.assert(
            'Pathfinder finds path in empty grid',
            path !== null && path.length > 0
        );
        
        this.assert(
            'Path starts at origin',
            path[0].x === 0 && path[0].y === 0
        );
        
        this.assert(
            'Path ends at destination',
            path[path.length - 1].x === 5 && 
            path[path.length - 1].y === 5
        );
        
        // Test with obstacles
        const obstaclePathfinder = new MazePathfinder(10, 10, [
            { x: 5, y: 5, width: 2, height: 2 }
        ]);
        
        const blockedPath = obstaclePathfinder.findPath(
            { x: 0, y: 0 },
            { x: 5, y: 5 }
        );
        
        this.assert(
            'Pathfinder returns null for blocked destination',
            blockedPath === null
        );
        
        // Test line of sight
        this.assert(
            'Line of sight works for clear path',
            pathfinder.hasLineOfSight({ x: 0, y: 0 }, { x: 3, y: 3 })
        );
    }

    /**
     * Test state machine module
     */
    async testStateMachine() {
        console.log('Testing State Machine Module...');
        
        const mockWolf = {
            target: null,
            aggression: 0.5,
            health: 100,
            maxHealth: 100
        };
        
        const stateMachine = new WolfStateMachine(WolfState.IDLE, mockWolf);
        
        this.assert(
            'State machine starts in IDLE',
            stateMachine.getState() === WolfState.IDLE
        );
        
        // Test transition
        stateMachine.transitionTo(WolfState.PATROL);
        
        this.assert(
            'State machine transitions to PATROL',
            stateMachine.getState() === WolfState.PATROL
        );
        
        this.assert(
            'Previous state is stored',
            stateMachine.getPreviousState() === WolfState.IDLE
        );
        
        // Test state time
        const initialTime = stateMachine.getStateTime();
        await this.sleep(100);
        const laterTime = stateMachine.getStateTime();
        
        this.assert(
            'State time increases',
            laterTime > initialTime
        );
        
        // Test reset
        stateMachine.reset();
        
        this.assert(
            'State machine resets to IDLE',
            stateMachine.getState() === WolfState.IDLE
        );
    }

    /**
     * Test behaviors module
     */
    async testBehaviors() {
        console.log('Testing Behaviors Module...');
        
        const mockWolf = {
            x: 0,
            y: 0,
            health: 100,
            maxHealth: 100,
            aggression: 0.5
        };
        
        const behaviors = new WolfBehaviors(mockWolf);
        
        // Test aggression calculation
        const aggression = behaviors.calculateAggression({
            packSize: 3,
            playerThreat: 0.8
        });
        
        this.assert(
            'Aggression calculation works',
            aggression > 0 && aggression <= 1
        );
        
        // Test patrol behavior
        const patrolPath = [
            { x: 5, y: 5 },
            { x: 10, y: 5 }
        ];
        mockWolf.currentPathIndex = 0;
        
        const patrolMovement = behaviors.patrol(patrolPath);
        
        this.assert(
            'Patrol returns movement vector',
            patrolMovement.vx !== undefined &&
            patrolMovement.vy !== undefined
        );
        
        // Test chase behavior
        const target = { x: 10, y: 10 };
        const chaseMovement = behaviors.chase(target);
        
        this.assert(
            'Chase moves toward target',
            chaseMovement.vx > 0 && chaseMovement.vy > 0
        );
        
        // Test retreat behavior
        const threat = { x: 0, y: 0 };
        mockWolf.x = 5;
        mockWolf.y = 5;
        const retreatMovement = behaviors.retreat(threat);
        
        this.assert(
            'Retreat moves away from threat',
            retreatMovement.vx > 0 && retreatMovement.vy > 0
        );
        
        // Test threat level calculation
        const threatLevel = behaviors.calculateThreatLevel({
            x: 5,
            y: 5,
            health: 100,
            damage: 20
        });
        
        this.assert(
            'Threat level calculation works',
            threatLevel >= 0 && threatLevel <= 1
        );
    }

    /**
     * Test Wolf entity
     */
    async testWolfEntity() {
        console.log('Testing Wolf Entity...');
        
        const gameState = {
            gridWidth: 20,
            gridHeight: 20,
            obstacles: []
        };
        
        const wolf = new Wolf(10, 10, 'test_wolf', gameState);
        
        this.assert(
            'Wolf initializes with correct position',
            wolf.x === 10 && wolf.y === 10
        );
        
        this.assert(
            'Wolf has correct initial health',
            wolf.health === WOLF_CONFIG.combat.HEALTH
        );
        
        this.assert(
            'Wolf has state machine',
            wolf.stateMachine !== undefined
        );
        
        this.assert(
            'Wolf starts in IDLE state',
            wolf.stateMachine.getState() === WolfState.IDLE
        );
        
        // Test damage
        const initialHealth = wolf.health;
        wolf.takeDamage(10);
        
        this.assert(
            'Wolf takes damage correctly',
            wolf.health === initialHealth - 10
        );
        
        // Test death
        wolf.takeDamage(1000);
        
        this.assert(
            'Wolf dies when health reaches 0',
            wolf.health === 0 &&
            wolf.stateMachine.getState() === WolfState.DEAD
        );
        
        // Test movement
        const wolf2 = new Wolf(0, 0, 'test_wolf_2', gameState);
        wolf2.vx = 1;
        wolf2.vy = 1;
        wolf2.updatePosition(1000); // 1 second
        
        this.assert(
            'Wolf position updates with velocity',
            wolf2.x > 0 && wolf2.y > 0
        );
        
        // Test target scanning
        const wolf3 = new Wolf(0, 0, 'test_wolf_3', gameState);
        const players = [
            { x: 5, y: 5, health: 100 }
        ];
        
        wolf3.scanForTargets(players);
        
        this.assert(
            'Wolf detects nearby players',
            wolf3.target !== null
        );
    }

    /**
     * Test pack coordination
     */
    async testPackCoordination() {
        console.log('Testing Pack Coordination...');
        
        const coordinator = new PackCoordinator();
        
        // Create mock wolves
        const wolves = [
            { id: 'w1', x: 0, y: 0, health: 100, maxHealth: 100, aggression: 0.5 },
            { id: 'w2', x: 5, y: 5, health: 100, maxHealth: 100, aggression: 0.6 },
            { id: 'w3', x: 10, y: 10, health: 100, maxHealth: 100, aggression: 0.4 }
        ];
        
        const packId = coordinator.createPack(wolves);
        
        this.assert(
            'Pack is created with ID',
            packId !== null && packId.startsWith('pack_')
        );
        
        const pack = coordinator.getPack(packId);
        
        this.assert(
            'Pack has correct number of members',
            pack.members.length === 3
        );
        
        this.assert(
            'Pack has alpha wolf',
            pack.alpha !== null
        );
        
        this.assert(
            'Alpha has highest score',
            pack.alpha.aggression === 0.6
        );
        
        // Test pack center calculation
        const center = coordinator.getPackCenter(pack);
        
        this.assert(
            'Pack center is calculated correctly',
            center.x === 5 && center.y === 5
        );
        
        // Test pack health ratio
        const healthRatio = coordinator.getPackHealthRatio(pack);
        
        this.assert(
            'Pack health ratio is correct',
            healthRatio === 1.0
        );
        
        // Test pack disbanding
        coordinator.disbandPack(packId);
        
        this.assert(
            'Pack is disbanded',
            coordinator.getPack(packId) === null
        );
    }

    /**
     * Test Wolf Manager
     */
    async testWolfManager() {
        console.log('Testing Wolf Manager...');
        
        const gameState = {
            mapWidth: 800,
            mapHeight: 600,
            gridWidth: 20,
            gridHeight: 20,
            obstacles: [],
            enemies: [],
            wolves: []
        };
        
        const manager = new WolfManager(gameState);
        manager.initialize();
        
        this.assert(
            'Manager initializes',
            manager.packCoordinator !== null
        );
        
        // Test wolf spawning
        const wolves = manager.spawnWolves({
            count: 3,
            position: { x: 100, y: 100 },
            difficulty: 1
        });
        
        this.assert(
            'Manager spawns correct number of wolves',
            wolves.length === 3
        );
        
        this.assert(
            'Wolves are tracked by manager',
            manager.wolves.size === 3
        );
        
        this.assert(
            'Statistics are updated',
            manager.statistics.totalSpawned === 3
        );
        
        // Test wolf retrieval
        const wolf = manager.getWolf(wolves[0].id);
        
        this.assert(
            'Can retrieve wolf by ID',
            wolf !== null && wolf.id === wolves[0].id
        );
        
        // Test living wolves
        const livingWolves = manager.getLivingWolves();
        
        this.assert(
            'Living wolves count is correct',
            livingWolves.length === 3
        );
        
        // Test wolf removal
        manager.removeWolf(wolves[0].id);
        
        this.assert(
            'Wolf is removed correctly',
            manager.wolves.size === 2
        );
        
        // Test pack spawning
        const packId = manager.spawnPack(
            { x: 200, y: 200 },
            3,
            { difficulty: 1.5 }
        );
        
        this.assert(
            'Pack is spawned',
            packId !== null
        );
        
        // Test clearing all wolves
        manager.clearAllWolves();
        
        this.assert(
            'All wolves are cleared',
            manager.wolves.size === 0
        );
    }

    /**
     * Helper function to assert test results
     */
    assert(description, condition) {
        if (condition) {
            console.log(`  ✅ ${description}`);
            this.passed++;
        } else {
            console.log(`  ❌ ${description}`);
            this.failed++;
        }
        
        this.tests.push({
            description,
            passed: condition
        });
    }

    /**
     * Helper sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n' + '='.repeat(50));
        console.log('TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`Total Tests: ${this.tests.length}`);
        console.log(`Passed: ${this.passed} ✅`);
        console.log(`Failed: ${this.failed} ❌`);
        console.log(`Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);
        
        if (this.failed > 0) {
            console.log('\nFailed Tests:');
            this.tests.filter(t => !t.passed).forEach(t => {
                console.log(`  - ${t.description}`);
            });
        }
        
        console.log('='.repeat(50));
    }
}

// Run tests if this is the main module
if (typeof process !== 'undefined' && process.argv[1] === import.meta.url) {
    const suite = new WolfAITestSuite();
    suite.runAll().catch(console.error);
}

// Export for use in other test runners
export { WolfAITestSuite };