/**
 * Global Setup for Jest
 * Runs once before all test suites
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('\n🚀 Starting global test setup...\n');

  // Create test-results directory if it doesn't exist
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
    console.log('📁 Created test-results directory');
  }

  // Create coverage directory if it doesn't exist
  const coverageDir = path.join(__dirname, '..', 'coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
    console.log('📁 Created coverage directory');
  }

  // Set environment variables for tests
  process.env.NODE_ENV = 'test';
  process.env.CI = 'true';

  // Initialize test metrics
  global.__TEST_METRICS__ = {
    startTime: Date.now(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
  };

  console.log('✅ Global setup complete\n');
};