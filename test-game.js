#!/usr/bin/env node

/**
 * Game Testing and Balance Script
 * Run with: node test-game.js
 */

import { runAllTests } from './src/testing/test-framework.js';
import { runBalanceTests } from './src/testing/balance-config.js';
import { metrics } from './src/testing/metrics-collector.js';
import fs from 'fs';
import path from 'path';

const TEST_MODES = {
    UNIT: 'unit',        // Run unit tests
    BALANCE: 'balance',  // Run balance validation
    METRICS: 'metrics',  // Generate metrics report
    ALL: 'all'          // Run everything
};

/**
 * Parse command line arguments
 */
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        mode: TEST_MODES.ALL,
        output: null,
        verbose: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--mode':
            case '-m':
                options.mode = args[++i] || TEST_MODES.ALL;
                break;
                
            case '--output':
            case '-o':
                options.output = args[++i];
                break;
                
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
                
            case '--help':
            case '-h':
                printHelp();
                process.exit(0);
                
            default:
                console.error(`Unknown option: ${args[i]}`);
                printHelp();
                process.exit(1);
        }
    }
    
    return options;
}

/**
 * Print help message
 */
function printHelp() {
    console.log(`
Game Testing and Balance Tool

Usage: node test-game.js [options]

Options:
  -m, --mode <mode>     Test mode: unit, balance, metrics, all (default: all)
  -o, --output <file>   Output results to file
  -v, --verbose         Verbose output
  -h, --help           Show this help message

Examples:
  node test-game.js                    # Run all tests
  node test-game.js -m unit            # Run unit tests only
  node test-game.js -m balance -v      # Run balance tests with verbose output
  node test-game.js -o results.json    # Save results to file
`);
}

/**
 * Run unit tests
 */
async function runUnitTests(verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('UNIT TESTS');
    console.log('='.repeat(60));
    
    try {
        const results = await runAllTests();
        
        if (verbose) {
            console.log('\nDetailed Results:');
            console.log(JSON.stringify(results, null, 2));
        }
        
        return results;
    } catch (error) {
        console.error('Error running unit tests:', error);
        return null;
    }
}

/**
 * Run balance validation
 */
function runBalanceValidation(verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('BALANCE VALIDATION');
    console.log('='.repeat(60));
    
    try {
        const results = runBalanceTests();
        
        if (verbose) {
            console.log('\nDetailed Balance Analysis:');
            console.log(JSON.stringify(results, null, 2));
        }
        
        return results;
    } catch (error) {
        console.error('Error running balance tests:', error);
        return null;
    }
}

/**
 * Generate metrics report
 */
function generateMetricsReport(verbose) {
    console.log('\n' + '='.repeat(60));
    console.log('METRICS REPORT');
    console.log('='.repeat(60));
    
    try {
        // Simulate some gameplay to generate metrics
        simulateGameplay();
        
        const report = metrics.generateReport();
        
        console.log('\nSession Duration:', report.sessionDuration.toFixed(1), 'seconds');
        
        console.log('\nKey Metrics:');
        console.log('  Death Rate:', report.analysis.deathRate?.toFixed(2) || 'N/A', 'per minute');
        console.log('  Player DPS:', report.analysis.playerDPS?.toFixed(1) || 'N/A');
        console.log('  Wave Success Rate:', (report.analysis.waveSuccessRate * 100).toFixed(1) + '%');
        console.log('  Average Wave Time:', report.analysis.averageWaveTime?.toFixed(1) || 'N/A', 'seconds');
        console.log('  Co-op Usage:', report.analysis.coopUsage?.toFixed(2) || 'N/A', 'per minute');
        console.log('  Average FPS:', report.analysis.averageFPS?.toFixed(1) || 'N/A');
        
        console.log('\nRecommendations:');
        if (report.recommendations.length === 0) {
            console.log('  ✓ No balance issues detected');
        } else {
            report.recommendations.forEach(rec => {
                const icon = rec.severity === 'high' ? '⚠️' : rec.severity === 'medium' ? '⚡' : 'ℹ️';
                console.log(`  ${icon} [${rec.category}] ${rec.message}`);
                if (verbose && rec.suggestion) {
                    console.log('     Suggestion:', JSON.stringify(rec.suggestion));
                }
            });
        }
        
        if (verbose) {
            console.log('\nFull Report:');
            console.log(JSON.stringify(report, null, 2));
        }
        
        return report;
    } catch (error) {
        console.error('Error generating metrics report:', error);
        return null;
    }
}

/**
 * Simulate gameplay for metrics
 */
function simulateGameplay() {
    // Simulate player actions
    for (let i = 0; i < 10; i++) {
        metrics.updateMetric('player.damage.dealt', Math.random() * 50 + 10);
        metrics.updateMetric('player.damage.taken', Math.random() * 20 + 5);
    }
    
    // Simulate enemy kills
    for (let i = 0; i < 20; i++) {
        metrics.updateMetric('enemies.killed');
        metrics.updateMetric('enemies.spawned');
        metrics.updateMetric('enemies.ttk', Math.random() * 5 + 2);
    }
    
    // Simulate waves
    metrics.updateMetric('waves.completed', 3);
    metrics.updateMetric('waves.failed', 1);
    metrics.updateMetric('waves.duration', 120);
    metrics.updateMetric('waves.duration', 150);
    metrics.updateMetric('waves.duration', 90);
    
    // Simulate co-op
    metrics.updateMetric('coop.tethers', 5);
    metrics.updateMetric('coop.rallies', 3);
    metrics.updateMetric('coop.combo.max', 75);
    
    // Simulate performance
    for (let i = 0; i < 10; i++) {
        metrics.updateMetric('performance.fps', 55 + Math.random() * 10);
        metrics.updateMetric('performance.entities', 15 + Math.random() * 10);
    }
}

/**
 * Save results to file
 */
function saveResults(results, filename) {
    try {
        const outputPath = path.resolve(filename);
        fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
        console.log(`\nResults saved to: ${outputPath}`);
    } catch (error) {
        console.error('Error saving results:', error);
    }
}

/**
 * Main execution
 */
async function main() {
    const options = parseArgs();
    const results = {
        timestamp: new Date().toISOString(),
        mode: options.mode
    };
    
    console.log('\n🎮 SmashImpact Game Testing Tool 🎮');
    console.log('Mode:', options.mode);
    
    // Run tests based on mode
    switch (options.mode) {
        case TEST_MODES.UNIT:
            results.unitTests = await runUnitTests(options.verbose);
            break;
            
        case TEST_MODES.BALANCE:
            results.balance = runBalanceValidation(options.verbose);
            break;
            
        case TEST_MODES.METRICS:
            results.metrics = generateMetricsReport(options.verbose);
            break;
            
        case TEST_MODES.ALL:
        default:
            results.unitTests = await runUnitTests(options.verbose);
            results.balance = runBalanceValidation(options.verbose);
            results.metrics = generateMetricsReport(options.verbose);
            break;
    }
    
    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    if (results.unitTests) {
        const unitPassed = results.unitTests.testResults?.reduce((sum, r) => sum + r.passed, 0) || 0;
        const unitFailed = results.unitTests.testResults?.reduce((sum, r) => sum + r.failed, 0) || 0;
        totalPassed += unitPassed;
        totalFailed += unitFailed;
        console.log(`Unit Tests: ${unitPassed} passed, ${unitFailed} failed`);
    }
    
    if (results.balance) {
        const balanceStatus = results.balance.passed ? 'PASSED' : 'WARNINGS';
        console.log(`Balance Validation: ${balanceStatus}`);
        if (results.balance.warnings?.length > 0) {
            console.log(`  ${results.balance.warnings.length} warnings found`);
        }
    }
    
    if (results.metrics) {
        const recCount = results.metrics.recommendations?.length || 0;
        console.log(`Metrics Analysis: ${recCount} recommendations`);
    }
    
    // Overall status
    const overallStatus = totalFailed === 0 ? '✅ PASSED' : '❌ FAILED';
    console.log(`\nOverall Status: ${overallStatus}`);
    
    // Save results if output specified
    if (options.output) {
        saveResults(results, options.output);
    }
    
    // Exit with appropriate code
    process.exit(totalFailed === 0 ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { main, runUnitTests, runBalanceValidation, generateMetricsReport };