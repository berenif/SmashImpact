/**
 * Metrics Collector - Tracks gameplay metrics for balance analysis
 */

import { EventBus, EVENTS } from '../core/EventBus.js';

/**
 * Metric types
 */
export const METRIC_TYPES = {
    COUNTER: 'counter',      // Simple count
    AVERAGE: 'average',      // Running average
    RATE: 'rate',           // Events per time
    DISTRIBUTION: 'distribution', // Value distribution
    TIMELINE: 'timeline'     // Time-series data
};

/**
 * Metrics Collector class
 */
export class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.sessionStartTime = Date.now();
        this.enabled = true;
        
        this.setupDefaultMetrics();
        this.setupEventListeners();
    }
    
    /**
     * Setup default metrics to track
     */
    setupDefaultMetrics() {
        // Player metrics
        this.registerMetric('player.deaths', METRIC_TYPES.COUNTER);
        this.registerMetric('player.damage.dealt', METRIC_TYPES.COUNTER);
        this.registerMetric('player.damage.taken', METRIC_TYPES.COUNTER);
        this.registerMetric('player.abilities.used', METRIC_TYPES.COUNTER);
        this.registerMetric('player.health', METRIC_TYPES.TIMELINE);
        this.registerMetric('player.revives', METRIC_TYPES.COUNTER);
        
        // Enemy metrics
        this.registerMetric('enemies.killed', METRIC_TYPES.COUNTER);
        this.registerMetric('enemies.spawned', METRIC_TYPES.COUNTER);
        this.registerMetric('enemies.dps', METRIC_TYPES.AVERAGE);
        this.registerMetric('enemies.ttk', METRIC_TYPES.DISTRIBUTION);
        
        // Wave metrics
        this.registerMetric('waves.completed', METRIC_TYPES.COUNTER);
        this.registerMetric('waves.failed', METRIC_TYPES.COUNTER);
        this.registerMetric('waves.duration', METRIC_TYPES.DISTRIBUTION);
        this.registerMetric('waves.difficulty', METRIC_TYPES.TIMELINE);
        
        // Co-op metrics
        this.registerMetric('coop.tethers', METRIC_TYPES.COUNTER);
        this.registerMetric('coop.rallies', METRIC_TYPES.COUNTER);
        this.registerMetric('coop.backtoback.time', METRIC_TYPES.COUNTER);
        this.registerMetric('coop.combo.max', METRIC_TYPES.AVERAGE);
        this.registerMetric('coop.overclocks', METRIC_TYPES.COUNTER);
        
        // Upgrade metrics
        this.registerMetric('upgrades.selected', METRIC_TYPES.COUNTER);
        this.registerMetric('upgrades.rerolls', METRIC_TYPES.COUNTER);
        this.registerMetric('upgrades.rarity', METRIC_TYPES.DISTRIBUTION);
        
        // Boss metrics
        this.registerMetric('boss.phases.reached', METRIC_TYPES.COUNTER);
        this.registerMetric('boss.tactics.used', METRIC_TYPES.DISTRIBUTION);
        this.registerMetric('boss.adaptation.level', METRIC_TYPES.TIMELINE);
        this.registerMetric('boss.damage.dealt', METRIC_TYPES.COUNTER);
        
        // Performance metrics
        this.registerMetric('performance.fps', METRIC_TYPES.TIMELINE);
        this.registerMetric('performance.entities', METRIC_TYPES.TIMELINE);
        this.registerMetric('performance.network.latency', METRIC_TYPES.TIMELINE);
        this.registerMetric('performance.network.packets.lost', METRIC_TYPES.COUNTER);
    }
    
    /**
     * Register a new metric
     */
    registerMetric(name, type, options = {}) {
        this.metrics.set(name, {
            name,
            type,
            value: this.getInitialValue(type),
            samples: [],
            options,
            lastUpdate: Date.now()
        });
    }
    
    /**
     * Get initial value for metric type
     */
    getInitialValue(type) {
        switch (type) {
            case METRIC_TYPES.COUNTER:
                return 0;
            case METRIC_TYPES.AVERAGE:
                return { sum: 0, count: 0, value: 0 };
            case METRIC_TYPES.RATE:
                return { events: 0, startTime: Date.now(), rate: 0 };
            case METRIC_TYPES.DISTRIBUTION:
                return new Map();
            case METRIC_TYPES.TIMELINE:
                return [];
            default:
                return null;
        }
    }
    
    /**
     * Update a metric
     */
    updateMetric(name, value = 1) {
        if (!this.enabled) return;
        
        const metric = this.metrics.get(name);
        if (!metric) {
            console.warn(`Metric not found: ${name}`);
            return;
        }
        
        const now = Date.now();
        
        switch (metric.type) {
            case METRIC_TYPES.COUNTER:
                metric.value += value;
                break;
                
            case METRIC_TYPES.AVERAGE:
                metric.value.sum += value;
                metric.value.count++;
                metric.value.value = metric.value.sum / metric.value.count;
                break;
                
            case METRIC_TYPES.RATE:
                metric.value.events += value;
                const elapsed = (now - metric.value.startTime) / 1000;
                metric.value.rate = metric.value.events / Math.max(1, elapsed);
                break;
                
            case METRIC_TYPES.DISTRIBUTION:
                const key = String(value);
                metric.value.set(key, (metric.value.get(key) || 0) + 1);
                break;
                
            case METRIC_TYPES.TIMELINE:
                metric.value.push({ time: now, value });
                // Keep only last 1000 samples
                if (metric.value.length > 1000) {
                    metric.value.shift();
                }
                break;
        }
        
        metric.lastUpdate = now;
        
        // Store sample for analysis
        metric.samples.push({ time: now, value });
        if (metric.samples.length > 100) {
            metric.samples.shift();
        }
    }
    
    /**
     * Get metric value
     */
    getMetric(name) {
        const metric = this.metrics.get(name);
        if (!metric) return null;
        
        switch (metric.type) {
            case METRIC_TYPES.COUNTER:
            case METRIC_TYPES.RATE:
                return metric.value;
                
            case METRIC_TYPES.AVERAGE:
                return metric.value.value;
                
            case METRIC_TYPES.DISTRIBUTION:
                return Object.fromEntries(metric.value);
                
            case METRIC_TYPES.TIMELINE:
                return metric.value.slice(-100); // Last 100 samples
                
            default:
                return metric.value;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Player events
        EventBus.on(EVENTS.PLAYER_DAMAGED, (data) => {
            this.updateMetric('player.damage.taken', data.amount);
            this.updateMetric('player.health', data.currentHealth);
        });
        
        EventBus.on(EVENTS.PLAYER_ATTACK, (data) => {
            this.updateMetric('player.damage.dealt', data.damage);
        });
        
        EventBus.on(EVENTS.PLAYER_DOWNED, () => {
            this.updateMetric('player.deaths');
        });
        
        EventBus.on(EVENTS.PLAYER_REVIVED, () => {
            this.updateMetric('player.revives');
        });
        
        EventBus.on(EVENTS.PLAYER_ABILITY_USED, () => {
            this.updateMetric('player.abilities.used');
        });
        
        // Enemy events
        EventBus.on(EVENTS.ENEMY_SPAWN, () => {
            this.updateMetric('enemies.spawned');
        });
        
        EventBus.on(EVENTS.ENEMY_KILLED, (data) => {
            this.updateMetric('enemies.killed');
            if (data.timeToKill) {
                this.updateMetric('enemies.ttk', data.timeToKill);
            }
        });
        
        EventBus.on(EVENTS.ENEMY_DAMAGED, (data) => {
            if (data.dps) {
                this.updateMetric('enemies.dps', data.dps);
            }
        });
        
        // Wave events
        EventBus.on(EVENTS.WAVE_START, (data) => {
            this.waveStartTime = Date.now();
            this.updateMetric('waves.difficulty', data.difficulty || 1);
        });
        
        EventBus.on(EVENTS.WAVE_COMPLETE, () => {
            this.updateMetric('waves.completed');
            if (this.waveStartTime) {
                const duration = (Date.now() - this.waveStartTime) / 1000;
                this.updateMetric('waves.duration', duration);
            }
        });
        
        EventBus.on(EVENTS.WAVE_FAILED, () => {
            this.updateMetric('waves.failed');
        });
        
        // Co-op events
        EventBus.on(EVENTS.TETHER_START, () => {
            this.updateMetric('coop.tethers');
        });
        
        EventBus.on(EVENTS.RALLY_COMPLETE, () => {
            this.updateMetric('coop.rallies');
        });
        
        EventBus.on(EVENTS.BACK_TO_BACK_START, () => {
            this.backToBackStart = Date.now();
        });
        
        EventBus.on(EVENTS.BACK_TO_BACK_END, () => {
            if (this.backToBackStart) {
                const duration = (Date.now() - this.backToBackStart) / 1000;
                this.updateMetric('coop.backtoback.time', duration);
            }
        });
        
        EventBus.on(EVENTS.COMBO_ADD, (data) => {
            this.updateMetric('coop.combo.max', data.total);
        });
        
        EventBus.on(EVENTS.OVERCLOCK_START, () => {
            this.updateMetric('coop.overclocks');
        });
        
        // Upgrade events
        EventBus.on(EVENTS.UPGRADE_APPLIED, (data) => {
            this.updateMetric('upgrades.selected');
            this.updateMetric('upgrades.rarity', data.upgrade.rarity.name);
        });
        
        EventBus.on(EVENTS.UPGRADE_REROLL, () => {
            this.updateMetric('upgrades.rerolls');
        });
        
        // Boss events
        EventBus.on(EVENTS.BOSS_PHASE_CHANGE, (data) => {
            this.updateMetric('boss.phases.reached');
            this.updateMetric('boss.adaptation.level', data.adaptationLevel || 0);
        });
        
        EventBus.on(EVENTS.BOSS_TACTIC_CHANGE, (data) => {
            this.updateMetric('boss.tactics.used', data.tactic);
        });
        
        EventBus.on(EVENTS.BOSS_ATTACK, (data) => {
            this.updateMetric('boss.damage.dealt', data.damage);
        });
        
        // Performance tracking
        setInterval(() => {
            this.trackPerformance();
        }, 1000);
    }
    
    /**
     * Track performance metrics
     */
    trackPerformance() {
        // FPS calculation
        if (window.performance && window.performance.now) {
            const fps = this.calculateFPS();
            this.updateMetric('performance.fps', fps);
        }
        
        // Entity count
        const entityCount = this.countEntities();
        this.updateMetric('performance.entities', entityCount);
    }
    
    /**
     * Calculate current FPS
     */
    calculateFPS() {
        if (!this.lastFrameTime) {
            this.lastFrameTime = performance.now();
            this.frameCount = 0;
            return 60;
        }
        
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.frameCount++;
        
        if (delta >= 1000) {
            const fps = (this.frameCount * 1000) / delta;
            this.lastFrameTime = now;
            this.frameCount = 0;
            return Math.round(fps);
        }
        
        return 60; // Default
    }
    
    /**
     * Count active entities
     */
    countEntities() {
        // This would connect to actual game state
        // For now, return estimate
        return 10 + Math.random() * 20;
    }
    
    /**
     * Generate report
     */
    generateReport() {
        const report = {
            sessionDuration: (Date.now() - this.sessionStartTime) / 1000,
            metrics: {},
            analysis: {},
            recommendations: []
        };
        
        // Collect all metrics
        this.metrics.forEach((metric, name) => {
            report.metrics[name] = this.getMetric(name);
        });
        
        // Perform analysis
        report.analysis = this.analyzeMetrics();
        
        // Generate recommendations
        report.recommendations = this.generateRecommendations(report.analysis);
        
        return report;
    }
    
    /**
     * Analyze collected metrics
     */
    analyzeMetrics() {
        const analysis = {};
        
        // Death rate analysis
        const deaths = this.getMetric('player.deaths') || 0;
        const duration = (Date.now() - this.sessionStartTime) / 60000; // Minutes
        analysis.deathRate = deaths / Math.max(1, duration);
        
        // DPS analysis
        const damageDealt = this.getMetric('player.damage.dealt') || 0;
        analysis.playerDPS = damageDealt / Math.max(1, duration * 60);
        
        // Wave success rate
        const wavesCompleted = this.getMetric('waves.completed') || 0;
        const wavesFailed = this.getMetric('waves.failed') || 0;
        const totalWaves = wavesCompleted + wavesFailed;
        analysis.waveSuccessRate = totalWaves > 0 ? wavesCompleted / totalWaves : 0;
        
        // Average wave duration
        const waveDurations = this.metrics.get('waves.duration');
        if (waveDurations && waveDurations.value.size > 0) {
            let totalDuration = 0;
            let count = 0;
            waveDurations.value.forEach((frequency, duration) => {
                totalDuration += parseFloat(duration) * frequency;
                count += frequency;
            });
            analysis.averageWaveTime = count > 0 ? totalDuration / count : 0;
        }
        
        // Co-op usage
        const tethers = this.getMetric('coop.tethers') || 0;
        const rallies = this.getMetric('coop.rallies') || 0;
        analysis.coopUsage = (tethers + rallies) / Math.max(1, duration);
        
        // Upgrade preferences
        const upgradeRarity = this.getMetric('upgrades.rarity');
        if (upgradeRarity) {
            analysis.upgradePreferences = upgradeRarity;
        }
        
        // Performance
        const fpsTimeline = this.getMetric('performance.fps');
        if (fpsTimeline && fpsTimeline.length > 0) {
            const avgFPS = fpsTimeline.reduce((sum, sample) => sum + sample.value, 0) / fpsTimeline.length;
            analysis.averageFPS = avgFPS;
        }
        
        return analysis;
    }
    
    /**
     * Generate balance recommendations
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        
        // Death rate recommendations
        if (analysis.deathRate > 0.5) {
            recommendations.push({
                category: 'difficulty',
                severity: 'high',
                message: 'High death rate detected. Consider reducing enemy damage or increasing player health.',
                suggestion: { enemyDamage: 0.9, playerHealth: 1.1 }
            });
        } else if (analysis.deathRate < 0.1) {
            recommendations.push({
                category: 'difficulty',
                severity: 'low',
                message: 'Low death rate detected. Consider increasing difficulty.',
                suggestion: { enemyDamage: 1.1, enemyHealth: 1.1 }
            });
        }
        
        // Wave duration recommendations
        if (analysis.averageWaveTime > 180) {
            recommendations.push({
                category: 'pacing',
                severity: 'medium',
                message: 'Waves taking too long. Consider reducing enemy health or count.',
                suggestion: { enemyHealth: 0.85, waveEnemyCount: 0.9 }
            });
        } else if (analysis.averageWaveTime < 60) {
            recommendations.push({
                category: 'pacing',
                severity: 'low',
                message: 'Waves ending too quickly. Consider adding more enemies.',
                suggestion: { waveEnemyCount: 1.2 }
            });
        }
        
        // Co-op usage recommendations
        if (analysis.coopUsage < 0.5) {
            recommendations.push({
                category: 'mechanics',
                severity: 'medium',
                message: 'Low co-op mechanic usage. Consider making them more rewarding or necessary.',
                suggestion: { coopBonuses: 1.2, coopCooldowns: 0.8 }
            });
        }
        
        // Performance recommendations
        if (analysis.averageFPS < 30) {
            recommendations.push({
                category: 'performance',
                severity: 'high',
                message: 'Low FPS detected. Consider reducing particle effects or enemy count.',
                suggestion: { maxEnemies: 0.8, particleQuality: 0.5 }
            });
        }
        
        // Wave success rate
        if (analysis.waveSuccessRate < 0.5) {
            recommendations.push({
                category: 'balance',
                severity: 'high',
                message: 'Low wave success rate. Game may be too difficult.',
                suggestion: { globalDifficulty: 0.85 }
            });
        } else if (analysis.waveSuccessRate > 0.95) {
            recommendations.push({
                category: 'balance',
                severity: 'low',
                message: 'Very high wave success rate. Game may be too easy.',
                suggestion: { globalDifficulty: 1.15 }
            });
        }
        
        return recommendations;
    }
    
    /**
     * Export metrics to JSON
     */
    exportToJSON() {
        const report = this.generateReport();
        return JSON.stringify(report, null, 2);
    }
    
    /**
     * Export metrics to CSV
     */
    exportToCSV() {
        const csv = ['Metric,Value,Type'];
        
        this.metrics.forEach((metric, name) => {
            const value = this.getMetric(name);
            let valueStr = '';
            
            if (typeof value === 'object') {
                valueStr = JSON.stringify(value);
            } else {
                valueStr = String(value);
            }
            
            csv.push(`${name},${valueStr},${metric.type}`);
        });
        
        return csv.join('\n');
    }
    
    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.forEach((metric) => {
            metric.value = this.getInitialValue(metric.type);
            metric.samples = [];
            metric.lastUpdate = Date.now();
        });
        
        this.sessionStartTime = Date.now();
    }
    
    /**
     * Enable/disable metrics collection
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsCollector();