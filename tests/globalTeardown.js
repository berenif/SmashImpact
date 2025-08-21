/**
 * Global Teardown for Jest
 * Runs once after all test suites
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('\n🏁 Running global test teardown...\n');

  // Calculate test duration
  if (global.__TEST_METRICS__) {
    const duration = Date.now() - global.__TEST_METRICS__.startTime;
    console.log(`⏱️  Total test duration: ${(duration / 1000).toFixed(2)}s`);
  }

  // Generate test summary file
  const summaryPath = path.join(__dirname, '..', 'test-results', 'summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    duration: global.__TEST_METRICS__ ? Date.now() - global.__TEST_METRICS__.startTime : 0,
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    metrics: global.__TEST_METRICS__ || {},
  };

  try {
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log('📊 Test summary saved to test-results/summary.json');
  } catch (error) {
    console.error('Failed to write test summary:', error);
  }

  // Clean up any temporary files
  const tempDir = path.join(__dirname, '..', 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('🧹 Cleaned up temporary files');
  }

  console.log('\n✅ Global teardown complete\n');
};