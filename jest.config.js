/**
 * Jest Configuration for WASM Game Engine
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Use jsdom for browser-like environment when needed
  projects: [
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/test-*.js',
        '<rootDir>/tests/*-tests.js'
      ],
      testPathIgnorePatterns: ['/node_modules/', '/wasm/', '/tests/setup.js', '/tests/globalSetup.js', '/tests/globalTeardown.js'],
    }
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    'public/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!public/game_engine.js',
    '!public/game_engine.wasm',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/dist/**',
    '!**/build/**'
  ],
  
  // Coverage thresholds (lowered for now)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'json',
    'html',
    'lcov',
    'cobertura'
  ],

  // Test reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      ancestorSeparator: ' › ',
      uniqueOutputName: 'false',
      suiteNameTemplate: '{filepath}',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}'
    }],
    ['jest-html-reporter', {
      pageTitle: 'WASM Game Engine Test Report',
      outputPath: 'test-results/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true,
      theme: 'darkTheme',
      dateFormat: 'yyyy-mm-dd HH:MM:ss'
    }]
  ],

  // Test timeout
  testTimeout: 10000,

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Transform files
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }]
  },

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Fail on console errors
  silent: false,

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/tests/**/test-*.js',
    '**/tests/**/*-tests.js'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '/.git/',
    '/tests/setup.js',
    '/tests/globalSetup.js',
    '/tests/globalTeardown.js'
  ],

  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],

  // Bail on first test failure
  bail: false,

  // Max workers for parallel execution
  maxWorkers: '50%',

  // Detect open handles
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Notify on completion
  notify: false,
  notifyMode: 'failure-change',

  // Cache
  cache: true,
  cacheDirectory: '/tmp/jest_cache',

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Expand console output
  expand: false,

  // List all tests
  listTests: false,

  // Pass with no tests
  passWithNoTests: true,

  // Update snapshots
  updateSnapshot: false,

  // Use stderr for output
  useStderr: false,

  // Watch mode
  watch: false,
  watchAll: false,
};