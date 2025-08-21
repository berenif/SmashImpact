/**
 * Jest Setup File
 * Configure test environment before each test suite
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.console.error = (...args) => {
  // Filter out expected errors
  const errorString = args.join(' ');
  if (
    errorString.includes('Warning: ReactDOM.render') ||
    errorString.includes('Warning: useLayoutEffect') ||
    errorString.includes('Not implemented: navigation')
  ) {
    return;
  }
  originalConsoleError.call(console, ...args);
};

global.console.warn = (...args) => {
  // Filter out expected warnings
  const warnString = args.join(' ');
  if (
    warnString.includes('Warning: componentWillReceiveProps') ||
    warnString.includes('Warning: componentWillMount')
  ) {
    return;
  }
  originalConsoleWarn.call(console, ...args);
};

// Mock performance API if not available
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {}
  };
}

// Mock requestAnimationFrame for tests
if (typeof requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
  };
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Mock WebAssembly if needed
if (typeof WebAssembly === 'undefined') {
  global.WebAssembly = {
    Module: class Module {},
    Instance: class Instance {},
    Memory: class Memory {
      constructor(descriptor) {
        this.buffer = new ArrayBuffer((descriptor.initial || 1) * 65536);
      }
    },
    Table: class Table {},
    compile: () => Promise.resolve(new WebAssembly.Module()),
    instantiate: () => Promise.resolve({
      module: new WebAssembly.Module(),
      instance: new WebAssembly.Instance()
    })
  };
}

// Add custom matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toBeValidEntity(received) {
    const pass = 
      received !== null &&
      received !== undefined &&
      typeof received.id !== 'undefined' &&
      typeof received.x === 'number' &&
      typeof received.y === 'number';
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid entity`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid entity with id, x, and y properties`,
        pass: false,
      };
    }
  },
});

// Setup test utilities
global.testUtils = {
  createMockCanvas: () => ({
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
      fillText: jest.fn(),
      strokeText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      createRadialGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
      createPattern: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: jest.fn(),
      setTransform: jest.fn(),
      resetTransform: jest.fn(),
    })),
    width: 800,
    height: 600,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }),

  createMockWasmModule: () => ({
    _createPlayer: jest.fn(() => 1),
    _createEnemy: jest.fn(() => 2),
    _createWolf: jest.fn(() => 3),
    _createProjectile: jest.fn(() => 4),
    _createPowerUp: jest.fn(() => 5),
    _createObstacle: jest.fn(() => 6),
    _removeEntity: jest.fn(),
    _clearEntities: jest.fn(),
    _getEntityCount: jest.fn(() => 0),
    _entityExists: jest.fn(() => true),
    _getEntityX: jest.fn(() => 100),
    _getEntityY: jest.fn(() => 100),
    _getEntityRadius: jest.fn(() => 10),
    _setEntityPosition: jest.fn(),
    _updatePlayerInput: jest.fn(),
    _playerShoot: jest.fn(),
    _updateGame: jest.fn(),
    _getScore: jest.fn(() => 0),
    _setScore: jest.fn(),
    _addScore: jest.fn(),
    _getWave: jest.fn(() => 1),
    _setWave: jest.fn(),
    _nextWave: jest.fn(),
    _pauseGame: jest.fn(),
    _resumeGame: jest.fn(),
    _isGamePaused: jest.fn(() => false),
    _checkCollision: jest.fn(() => false),
    calledRun: true,
    onRuntimeInitialized: null,
  }),

  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  mockPerformance: () => {
    let time = 0;
    return {
      now: jest.fn(() => time),
      advance: (ms) => { time += ms; }
    };
  },
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Set longer timeout for integration tests
jest.setTimeout(10000);

console.log('✅ Test environment setup complete');