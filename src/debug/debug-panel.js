/**
 * Debug Panel - Live balancing and debugging tools
 */

import { BalanceConfig } from '../testing/balance-config.js';
import { metrics } from '../testing/metrics-collector.js';
import { EventBus, EVENTS } from '../core/EventBus.js';
import { GameState } from '../core/GameState.js';

/**
 * Debug Panel class
 */
export class DebugPanel {
    constructor() {
        this.visible = false;
        this.activeTab = 'balance';
        this.selectedCategory = 'players';
        this.urlParams = new URLSearchParams(window.location.search);
        
        // Performance tracking
        this.fps = 60;
        this.frameTime = 0;
        this.entityCount = 0;
        this.networkLatency = 0;
        
        // History tracking
        this.eventHistory = [];
        this.stateHistory = [];
        this.maxHistorySize = 100;
        
        // Live adjustments
        this.liveAdjustments = {};
        
        // Create panel UI
        this.createPanel();
        this.setupEventListeners();
        this.loadFromURL();
        
        // Start performance monitoring
        this.startPerformanceMonitoring();
    }
    
    /**
     * Create the debug panel UI
     */
    createPanel() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'debug-panel';
        this.container.className = 'debug-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            right: -400px;
            width: 400px;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            color: #0f0;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border-left: 2px solid #0f0;
            transition: right 0.3s ease;
            z-index: 10000;
            overflow-y: auto;
            overflow-x: hidden;
        `;
        
        // Toggle button
        this.toggleBtn = document.createElement('button');
        this.toggleBtn.innerHTML = '🔧';
        this.toggleBtn.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.8);
            color: #0f0;
            border: 2px solid #0f0;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            z-index: 10001;
            transition: transform 0.3s ease;
        `;
        this.toggleBtn.onclick = () => this.toggle();
        
        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid #0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        header.innerHTML = `
            <h3 style="margin: 0; color: #0f0;">🎮 Debug Panel</h3>
            <button id="debug-close" style="background: none; border: none; color: #0f0; font-size: 20px; cursor: pointer;">✕</button>
        `;
        
        // Tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            border-bottom: 1px solid #0f0;
            background: rgba(0, 255, 0, 0.1);
        `;
        
        const tabNames = ['Balance', 'Performance', 'Events', 'State', 'Network', 'Metrics'];
        tabNames.forEach(name => {
            const tab = document.createElement('button');
            tab.textContent = name;
            tab.style.cssText = `
                flex: 1;
                padding: 8px;
                background: none;
                border: none;
                color: #0f0;
                cursor: pointer;
                transition: background 0.2s;
            `;
            tab.onclick = () => this.switchTab(name.toLowerCase());
            tab.className = `debug-tab debug-tab-${name.toLowerCase()}`;
            tabs.appendChild(tab);
        });
        
        // Content area
        this.content = document.createElement('div');
        this.content.style.cssText = `
            padding: 10px;
            height: calc(100vh - 100px);
            overflow-y: auto;
        `;
        
        // Assemble panel
        this.container.appendChild(header);
        this.container.appendChild(tabs);
        this.container.appendChild(this.content);
        
        // Add to document
        document.body.appendChild(this.container);
        document.body.appendChild(this.toggleBtn);
        
        // Setup close button
        document.getElementById('debug-close').onclick = () => this.hide();
        
        // Initial content
        this.updateContent();
    }
    
    /**
     * Switch active tab
     */
    switchTab(tab) {
        this.activeTab = tab;
        
        // Update tab styles
        document.querySelectorAll('.debug-tab').forEach(t => {
            t.style.background = 'none';
        });
        document.querySelector(`.debug-tab-${tab}`).style.background = 'rgba(0, 255, 0, 0.2)';
        
        this.updateContent();
    }
    
    /**
     * Update content based on active tab
     */
    updateContent() {
        switch (this.activeTab) {
            case 'balance':
                this.showBalanceTab();
                break;
            case 'performance':
                this.showPerformanceTab();
                break;
            case 'events':
                this.showEventsTab();
                break;
            case 'state':
                this.showStateTab();
                break;
            case 'network':
                this.showNetworkTab();
                break;
            case 'metrics':
                this.showMetricsTab();
                break;
        }
    }
    
    /**
     * Show balance adjustment tab
     */
    showBalanceTab() {
        let html = '<h4>⚖️ Balance Adjustments</h4>';
        
        // Category selector
        html += '<select id="balance-category" style="width: 100%; padding: 5px; background: #000; color: #0f0; border: 1px solid #0f0; margin-bottom: 10px;">';
        const categories = ['players', 'enemies', 'waves', 'coop', 'boss', 'upgrades', 'performance'];
        categories.forEach(cat => {
            html += `<option value="${cat}" ${cat === this.selectedCategory ? 'selected' : ''}>${cat.toUpperCase()}</option>`;
        });
        html += '</select>';
        
        // Balance controls for selected category
        html += '<div id="balance-controls" style="max-height: 400px; overflow-y: auto;">';
        html += this.generateBalanceControls(this.selectedCategory);
        html += '</div>';
        
        // Quick presets
        html += '<h4>🎯 Quick Presets</h4>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">';
        html += '<button class="debug-btn" onclick="debugPanel.applyPreset(\'easy\')">Easy Mode</button>';
        html += '<button class="debug-btn" onclick="debugPanel.applyPreset(\'hard\')">Hard Mode</button>';
        html += '<button class="debug-btn" onclick="debugPanel.applyPreset(\'chaos\')">Chaos Mode</button>';
        html += '<button class="debug-btn" onclick="debugPanel.applyPreset(\'reset\')">Reset All</button>';
        html += '</div>';
        
        // Export/Import
        html += '<h4>💾 Configuration</h4>';
        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">';
        html += '<button class="debug-btn" onclick="debugPanel.exportConfig()">Export</button>';
        html += '<button class="debug-btn" onclick="debugPanel.importConfig()">Import</button>';
        html += '<button class="debug-btn" onclick="debugPanel.copyURL()">Copy URL</button>';
        html += '<button class="debug-btn" onclick="debugPanel.saveToLocal()">Save Local</button>';
        html += '</div>';
        
        this.content.innerHTML = html;
        
        // Setup category change handler
        document.getElementById('balance-category').onchange = (e) => {
            this.selectedCategory = e.target.value;
            document.getElementById('balance-controls').innerHTML = this.generateBalanceControls(this.selectedCategory);
            this.setupBalanceHandlers();
        };
        
        // Setup balance control handlers
        this.setupBalanceHandlers();
        
        // Add button styles
        this.addButtonStyles();
    }
    
    /**
     * Generate balance controls for a category
     */
    generateBalanceControls(category) {
        let html = '';
        const config = BalanceConfig[category];
        
        if (!config) return '<p>No configuration found</p>';
        
        // Recursively generate controls
        const generateControl = (obj, path = '') => {
            Object.entries(obj).forEach(([key, value]) => {
                const fullPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'number') {
                    const id = `balance-${category}-${fullPath}`.replace(/\./g, '-');
                    const currentValue = this.getNestedValue(BalanceConfig[category], fullPath);
                    
                    html += `
                        <div style="margin-bottom: 10px; padding: 5px; border: 1px solid #0f0; background: rgba(0, 255, 0, 0.05);">
                            <label style="display: block; margin-bottom: 5px; color: #0f0;">
                                ${fullPath}: <span id="${id}-value">${currentValue}</span>
                            </label>
                            <input type="range" 
                                id="${id}" 
                                data-path="${fullPath}"
                                data-category="${category}"
                                min="${this.getMinValue(value)}" 
                                max="${this.getMaxValue(value)}" 
                                step="${this.getStepValue(value)}"
                                value="${currentValue}"
                                style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 2px;">
                                <span>${this.getMinValue(value)}</span>
                                <button onclick="debugPanel.resetValue('${category}', '${fullPath}')" style="background: none; border: none; color: #0f0; cursor: pointer;">↺</button>
                                <span>${this.getMaxValue(value)}</span>
                            </div>
                        </div>
                    `;
                } else if (typeof value === 'object' && !Array.isArray(value)) {
                    // Recurse for nested objects
                    generateControl(value, fullPath);
                }
            });
        };
        
        generateControl(config);
        return html;
    }
    
    /**
     * Show performance tab
     */
    showPerformanceTab() {
        let html = '<h4>📊 Performance Metrics</h4>';
        
        // Real-time stats
        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <div style="border: 1px solid #0f0; padding: 10px;">
                    <div style="font-size: 24px; color: ${this.fps < 30 ? '#f00' : this.fps < 50 ? '#ff0' : '#0f0'};">
                        ${this.fps} FPS
                    </div>
                    <div style="font-size: 10px;">Frame Time: ${this.frameTime.toFixed(2)}ms</div>
                </div>
                <div style="border: 1px solid #0f0; padding: 10px;">
                    <div style="font-size: 24px; color: #0f0;">
                        ${this.entityCount}
                    </div>
                    <div style="font-size: 10px;">Active Entities</div>
                </div>
            </div>
        `;
        
        // Performance settings
        html += '<h4>⚙️ Performance Settings</h4>';
        html += `
            <div style="margin-bottom: 10px;">
                <label>Max Enemies: <span id="perf-enemies">${BalanceConfig.performance.maxEnemies}</span></label>
                <input type="range" id="perf-enemies-slider" min="10" max="100" value="${BalanceConfig.performance.maxEnemies}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Max Projectiles: <span id="perf-projectiles">${BalanceConfig.performance.maxProjectiles}</span></label>
                <input type="range" id="perf-projectiles-slider" min="10" max="200" value="${BalanceConfig.performance.maxProjectiles}" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>AI Update Rate: <span id="perf-ai">${BalanceConfig.performance.updateRates.ai}</span> Hz</label>
                <input type="range" id="perf-ai-slider" min="1" max="30" value="${BalanceConfig.performance.updateRates.ai}" style="width: 100%;">
            </div>
        `;
        
        // Memory stats
        if (performance.memory) {
            const mem = performance.memory;
            const used = (mem.usedJSHeapSize / 1048576).toFixed(1);
            const total = (mem.totalJSHeapSize / 1048576).toFixed(1);
            const limit = (mem.jsHeapSizeLimit / 1048576).toFixed(1);
            
            html += '<h4>💾 Memory Usage</h4>';
            html += `
                <div style="border: 1px solid #0f0; padding: 10px;">
                    <div>Used: ${used} MB</div>
                    <div>Total: ${total} MB</div>
                    <div>Limit: ${limit} MB</div>
                    <div style="margin-top: 5px;">
                        <div style="background: #333; height: 20px; position: relative;">
                            <div style="background: #0f0; height: 100%; width: ${(mem.usedJSHeapSize / mem.jsHeapSizeLimit * 100)}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        this.content.innerHTML = html;
        
        // Setup performance sliders
        this.setupPerformanceHandlers();
    }
    
    /**
     * Show events tab
     */
    showEventsTab() {
        let html = '<h4>📡 Event History</h4>';
        
        // Event filters
        html += `
            <div style="margin-bottom: 10px;">
                <input type="text" id="event-filter" placeholder="Filter events..." 
                    style="width: 100%; padding: 5px; background: #000; color: #0f0; border: 1px solid #0f0;">
            </div>
        `;
        
        // Event list
        html += '<div style="max-height: 500px; overflow-y: auto; border: 1px solid #0f0; padding: 5px;">';
        
        this.eventHistory.slice(-50).reverse().forEach(event => {
            const time = new Date(event.timestamp).toLocaleTimeString();
            const color = this.getEventColor(event.type);
            
            html += `
                <div style="margin-bottom: 5px; padding: 5px; border-left: 3px solid ${color}; background: rgba(0, 255, 0, 0.05);">
                    <div style="color: ${color}; font-weight: bold;">${event.type}</div>
                    <div style="font-size: 10px; color: #888;">${time}</div>
                    ${event.data ? `<pre style="font-size: 10px; margin: 5px 0 0 0;">${JSON.stringify(event.data, null, 2)}</pre>` : ''}
                </div>
            `;
        });
        
        if (this.eventHistory.length === 0) {
            html += '<p style="color: #888;">No events recorded</p>';
        }
        
        html += '</div>';
        
        // Controls
        html += `
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button class="debug-btn" onclick="debugPanel.clearEvents()">Clear</button>
                <button class="debug-btn" onclick="debugPanel.exportEvents()">Export</button>
            </div>
        `;
        
        this.content.innerHTML = html;
        
        // Setup filter
        const filterInput = document.getElementById('event-filter');
        if (filterInput) {
            filterInput.onkeyup = (e) => {
                this.filterEvents(e.target.value);
            };
        }
        
        this.addButtonStyles();
    }
    
    /**
     * Show state tab
     */
    showStateTab() {
        let html = '<h4>🎮 Game State</h4>';
        
        // Get current state (if GameState is available)
        let currentState = {};
        try {
            if (typeof GameState !== 'undefined' && GameState.instance) {
                currentState = GameState.instance.getState();
            }
        } catch (e) {
            currentState = { error: 'GameState not available' };
        }
        
        // State tree view
        html += '<div style="max-height: 400px; overflow-y: auto; border: 1px solid #0f0; padding: 10px; background: #000;">';
        html += '<pre style="color: #0f0; margin: 0;">';
        html += this.formatJSON(currentState);
        html += '</pre>';
        html += '</div>';
        
        // State controls
        html += '<h4>🎛️ State Controls</h4>';
        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button class="debug-btn" onclick="debugPanel.saveState()">Save Snapshot</button>
                <button class="debug-btn" onclick="debugPanel.loadState()">Load Snapshot</button>
                <button class="debug-btn" onclick="debugPanel.resetState()">Reset State</button>
                <button class="debug-btn" onclick="debugPanel.exportState()">Export State</button>
            </div>
        `;
        
        // Time travel
        if (this.stateHistory && stateHistory && stateHistory && stateHistory.length > 0) {
            html += '<h4>⏰ Time Travel</h4>';
            html += `
                <input type="range" id="time-travel-slider" 
                    min="0" max="${this.stateHistory.length - 1}" 
                    value="${this.stateHistory.length - 1}"
                    style="width: 100%;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px;">
                    <span>Oldest</span>
                    <span id="time-travel-index">${this.stateHistory.length - 1}</span>
                    <span>Current</span>
                </div>
            `;
        }
        
        this.content.innerHTML = html;
        
        // Setup time travel slider
        const slider = document.getElementById('time-travel-slider');
        if (slider) {
            slider.oninput = (e) => {
                document.getElementById('time-travel-index').textContent = e.target.value;
                this.previewState(parseInt(e.target.value));
            };
        }
        
        this.addButtonStyles();
    }
    
    /**
     * Show network tab
     */
    showNetworkTab() {
        let html = '<h4>🌐 Network Stats</h4>';
        
        // Network stats
        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                <div style="border: 1px solid #0f0; padding: 10px;">
                    <div style="font-size: 20px; color: ${this.networkLatency > 100 ? '#f00' : this.networkLatency > 50 ? '#ff0' : '#0f0'};">
                        ${this.networkLatency}ms
                    </div>
                    <div style="font-size: 10px;">Latency</div>
                </div>
                <div style="border: 1px solid #0f0; padding: 10px;">
                    <div style="font-size: 20px; color: #0f0;">
                        0%
                    </div>
                    <div style="font-size: 10px;">Packet Loss</div>
                </div>
            </div>
        `;
        
        // Network simulation
        html += '<h4>🔧 Network Simulation</h4>';
        html += `
            <div style="margin-bottom: 10px;">
                <label>Simulated Latency: <span id="net-latency">0</span>ms</label>
                <input type="range" id="net-latency-slider" min="0" max="500" value="0" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Packet Loss: <span id="net-loss">0</span>%</label>
                <input type="range" id="net-loss-slider" min="0" max="50" value="0" style="width: 100%;">
            </div>
            <div style="margin-bottom: 10px;">
                <label>Jitter: <span id="net-jitter">0</span>ms</label>
                <input type="range" id="net-jitter-slider" min="0" max="100" value="0" style="width: 100%;">
            </div>
        `;
        
        // Connection info
        html += '<h4>📡 Connection Info</h4>';
        html += `
            <div style="border: 1px solid #0f0; padding: 10px; font-size: 11px;">
                <div>Status: <span style="color: #0f0;">Connected</span></div>
                <div>Role: Host</div>
                <div>Peers: 1</div>
                <div>Data Channels: 2 (reliable, unreliable)</div>
                <div>Messages Sent: 1,234</div>
                <div>Messages Received: 1,189</div>
                <div>Bandwidth: ~15 KB/s</div>
            </div>
        `;
        
        this.content.innerHTML = html;
        
        // Setup network simulation handlers
        this.setupNetworkHandlers();
    }
    
    /**
     * Show metrics tab
     */
    showMetricsTab() {
        let html = '<h4>📈 Gameplay Metrics</h4>';
        
        // Get metrics report
        const report = metrics.generateReport();
        
        // Key metrics
        html += '<div style="border: 1px solid #0f0; padding: 10px; margin-bottom: 10px;">';
        html += `<div>Session Time: ${(report.sessionDuration / 60).toFixed(1)} min</div>`;
        
        if (report.analysis) {
            html += `<div>Death Rate: ${report.analysis.deathRate?.toFixed(2) || 'N/A'}/min</div>`;
            html += `<div>Player DPS: ${report.analysis.playerDPS?.toFixed(1) || 'N/A'}</div>`;
            html += `<div>Wave Success: ${((report.analysis.waveSuccessRate || 0) * 100).toFixed(0)}%</div>`;
            html += `<div>Avg Wave Time: ${report.analysis.averageWaveTime?.toFixed(0) || 'N/A'}s</div>`;
        }
        html += '</div>';
        
        // Recommendations
        if (report.recommendations && report.recommendations && recommendations && recommendations && recommendations.length > 0) {
            html += '<h4>💡 Balance Recommendations</h4>';
            html += '<div style="border: 1px solid #ff0; padding: 10px; background: rgba(255, 255, 0, 0.1);">';
            
            report.recommendations.forEach(rec => {
                const icon = rec.severity === 'high' ? '⚠️' : rec.severity === 'medium' ? '⚡' : 'ℹ️';
                html += `
                    <div style="margin-bottom: 10px;">
                        <div>${icon} <strong>${rec.category}</strong></div>
                        <div style="font-size: 11px; margin-left: 20px;">${rec.message}</div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        // Controls
        html += `
            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
                <button class="debug-btn" onclick="debugPanel.exportMetrics()">Export</button>
                <button class="debug-btn" onclick="debugPanel.resetMetrics()">Reset</button>
            </div>
        `;
        
        this.content.innerHTML = html;
        this.addButtonStyles();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen to game events
        if (typeof EventBus !== 'undefined') {
            // Track all events
            const originalEmit = EventBus.emit;
            EventBus.emit = (event, data) => {
                this.recordEvent(event, data);
                return originalEmit.call(EventBus, event, data);
            };
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Toggle with F12 or backtick
            if (e.key === 'F12' || e.key === '`') {
                e.preventDefault();
                this.toggle();
            }
            
            // Quick actions with Ctrl/Cmd
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'd':
                        e.preventDefault();
                        this.toggle();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveState();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportConfig();
                        break;
                }
            }
        });
    }
    
    /**
     * Setup balance control handlers
     */
    setupBalanceHandlers() {
        const inputs = this.content.querySelectorAll('input[type="range"]');
        inputs.forEach(input => {
            input.oninput = (e) => {
                const path = e.target.dataset.path;
                const category = e.target.dataset.category;
                const value = parseFloat(e.target.value);
                
                // Update display
                document.getElementById(`${e.target.id}-value`).textContent = value;
                
                // Update config
                this.setNestedValue(BalanceConfig[category], path, value);
                
                // Track adjustment
                this.liveAdjustments[`${category}.${path}`] = value;
                
                // Emit change event
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('DEBUG_BALANCE_CHANGE', { category, path, value });
                }
            };
        });
    }
    
    /**
     * Setup performance handlers
     */
    setupPerformanceHandlers() {
        const handlers = [
            ['perf-enemies-slider', 'perf-enemies', 'performance.maxEnemies'],
            ['perf-projectiles-slider', 'perf-projectiles', 'performance.maxProjectiles'],
            ['perf-ai-slider', 'perf-ai', 'performance.updateRates.ai']
        ];
        
        handlers.forEach(([sliderId, displayId, path]) => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.oninput = (e) => {
                    const value = parseInt(e.target.value);
                    document.getElementById(displayId).textContent = value;
                    this.setNestedValue(BalanceConfig, path, value);
                };
            }
        });
    }
    
    /**
     * Setup network handlers
     */
    setupNetworkHandlers() {
        const handlers = [
            ['net-latency-slider', 'net-latency'],
            ['net-loss-slider', 'net-loss'],
            ['net-jitter-slider', 'net-jitter']
        ];
        
        handlers.forEach(([sliderId, displayId]) => {
            const slider = document.getElementById(sliderId);
            if (slider) {
                slider.oninput = (e) => {
                    document.getElementById(displayId).textContent = e.target.value;
                    // Apply network simulation
                    this.applyNetworkSimulation();
                };
            }
        });
    }
    
    /**
     * Apply preset configuration
     */
    applyPreset(preset) {
        const presets = {
            easy: {
                'enemies.brawler.health': 20,
                'enemies.brawler.damage': 10,
                'players.runner.health': 150,
                'players.anchor.health': 200,
                'waves.scaling.healthScaling': 1.05,
                'waves.scaling.enemyCountPerWave': 1
            },
            hard: {
                'enemies.brawler.health': 40,
                'enemies.brawler.damage': 20,
                'players.runner.health': 80,
                'players.anchor.health': 120,
                'waves.scaling.healthScaling': 1.2,
                'waves.scaling.enemyCountPerWave': 3
            },
            chaos: {
                'enemies.brawler.speed': 300,
                'enemies.archer.attackRate': 2,
                'waves.scaling.enemyCountPerWave': 5,
                'performance.maxEnemies': 50,
                'coop.comboMeter.decayRate': 0.5
            },
            reset: {}
        };
        
        if (preset === 'reset') {
            // Reset all adjustments
            this.liveAdjustments = {};
            location.reload();
        } else if (presets[preset]) {
            // Apply preset values
            Object.entries(presets[preset]).forEach(([path, value]) => {
                const [category, ...rest] = path.split('.');
                this.setNestedValue(BalanceConfig[category], rest.join('.'), value);
                this.liveAdjustments[path] = value;
            });
            
            // Refresh display
            this.updateContent();
        }
    }
    
    /**
     * Helper functions
     */
    
    toggle() {
        this.visible = !this.visible;
        this.container.style.right = this.visible ? '0' : '-400px';
        this.toggleBtn.style.transform = this.visible ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    show() {
        this.visible = true;
        this.container.style.right = '0';
        this.toggleBtn.style.transform = 'rotate(180deg)';
    }
    
    hide() {
        this.visible = false;
        this.container.style.right = '-400px';
        this.toggleBtn.style.transform = 'rotate(0deg)';
    }
    
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, p) => o?.[p], obj);
    }
    
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => o[k], obj);
        target[lastKey] = value;
    }
    
    getMinValue(value) {
        if (value < 1) return 0;
        if (value < 10) return 0;
        if (value < 100) return value * 0.5;
        return value * 0.1;
    }
    
    getMaxValue(value) {
        if (value < 1) return 2;
        if (value < 10) return 20;
        if (value < 100) return value * 2;
        return value * 3;
    }
    
    getStepValue(value) {
        if (value < 1) return 0.01;
        if (value < 10) return 0.1;
        if (value < 100) return 1;
        return 10;
    }
    
    resetValue(category, path) {
        // Reset to original value (would need to store originals)
        this.updateContent();
    }
    
    recordEvent(type, data) {
        this.eventHistory.push({
            type,
            data,
            timestamp: Date.now()
        });
        
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }
    
    getEventColor(type) {
        if (type.includes('PLAYER')) return '#0ff';
        if (type.includes('ENEMY')) return '#f00';
        if (type.includes('WAVE')) return '#ff0';
        if (type.includes('COOP')) return '#f0f';
        if (type.includes('BOSS')) return '#f80';
        return '#0f0';
    }
    
    formatJSON(obj) {
        return JSON.stringify(obj, null, 2)
            .replace(/(".*?")/g, '<span style="color: #ff0;">$1</span>')
            .replace(/: (\d+)/g, ': <span style="color: #0ff;">$1</span>')
            .replace(/: (true|false)/g, ': <span style="color: #f0f;">$1</span>');
    }
    
    addButtonStyles() {
        const style = document.getElementById('debug-panel-styles');
        if (!style) {
            const styleEl = document.createElement('style');
            styleEl.id = 'debug-panel-styles';
            styleEl.textContent = `
                .debug-btn {
                    padding: 5px 10px;
                    background: #000;
                    color: #0f0;
                    border: 1px solid #0f0;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .debug-btn:hover {
                    background: #0f0;
                    color: #000;
                }
            `;
            document.head.appendChild(styleEl);
        }
    }
    
    /**
     * Export/Import functions
     */
    
    exportConfig() {
        const config = {
            adjustments: this.liveAdjustments,
            timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-config-${Date.now()}.json`;
        a.click();
    }
    
    importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);
                    this.liveAdjustments = config.adjustments || {};
                    this.applyAdjustments();
                    this.updateContent();
                } catch (err) {
                    console.error('Failed to import config:', err);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }
    
    copyURL() {
        const params = new URLSearchParams();
        Object.entries(this.liveAdjustments).forEach(([key, value]) => {
            params.set(key, value);
        });
        
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
        navigator.clipboard.writeText(url);
        console.log('URL copied to clipboard');
    }
    
    saveToLocal() {
        localStorage.setItem('debugConfig', JSON.stringify(this.liveAdjustments));
        console.log('Config saved to localStorage');
    }
    
    loadFromURL() {
        this.urlParams.forEach((value, key) => {
            const num = parseFloat(value);
            if (!isNaN(num)) {
                this.liveAdjustments[key] = num;
            }
        });
        
        // Also check localStorage
        const saved = localStorage.getItem('debugConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.liveAdjustments = { ...this.liveAdjustments, ...config };
            } catch (e) {
                console.error('Failed to load saved config:', e);
            }
        }
        
        this.applyAdjustments();
    }
    
    applyAdjustments() {
        Object.entries(this.liveAdjustments).forEach(([path, value]) => {
            const [category, ...rest] = path.split('.');
            if (BalanceConfig[category]) {
                this.setNestedValue(BalanceConfig[category], rest.join('.'), value);
            }
        });
    }
    
    /**
     * Performance monitoring
     */
    startPerformanceMonitoring() {
        let lastTime = performance.now();
        let frames = 0;
        
        const monitor = () => {
            frames++;
            const now = performance.now();
            const delta = now - lastTime;
            
            if (delta >= 1000) {
                this.fps = Math.round((frames * 1000) / delta);
                this.frameTime = delta / frames;
                frames = 0;
                lastTime = now;
                
                // Update display if performance tab is active
                if (this.visible && this.activeTab === 'performance') {
                    this.updateContent();
                }
            }
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }
    
    /**
     * Event management
     */
    clearEvents() {
        this.eventHistory = [];
        this.updateContent();
    }
    
    exportEvents() {
        const blob = new Blob([JSON.stringify(this.eventHistory, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `events-${Date.now()}.json`;
        a.click();
    }
    
    filterEvents(filter) {
        // Would implement filtering logic here
        console.log('Filtering events:', filter);
    }
    
    /**
     * State management
     */
    saveState() {
        if (typeof GameState !== 'undefined' && GameState.instance) {
            const snapshot = GameState.instance.createSnapshot();
            this.stateHistory.push(snapshot);
            if (this.stateHistory.length > this.maxHistorySize) {
                this.stateHistory.shift();
            }
            console.log('State snapshot saved');
        }
    }
    
    loadState() {
        if (this.stateHistory && stateHistory && stateHistory && stateHistory.length > 0 && typeof GameState !== 'undefined' && GameState.instance) {
            const snapshot = this.stateHistory[this.stateHistory.length - 1];
            GameState.instance.restoreSnapshot(snapshot);
            console.log('State snapshot loaded');
        }
    }
    
    resetState() {
        if (typeof GameState !== 'undefined' && GameState.instance) {
            GameState.instance.reset();
            console.log('State reset');
        }
    }
    
    exportState() {
        if (typeof GameState !== 'undefined' && GameState.instance) {
            const state = GameState.instance.getState();
            const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `state-${Date.now()}.json`;
            a.click();
        }
    }
    
    previewState(index) {
        if (this.stateHistory[index]) {
            console.log('Preview state:', this.stateHistory[index]);
        }
    }
    
    /**
     * Network simulation
     */
    applyNetworkSimulation() {
        const latency = parseInt(document.getElementById('net-latency-slider')?.value || 0);
        const loss = parseInt(document.getElementById('net-loss-slider')?.value || 0);
        const jitter = parseInt(document.getElementById('net-jitter-slider')?.value || 0);
        
        // Would apply network simulation here
        console.log('Network simulation:', { latency, loss, jitter });
    }
    
    /**
     * Metrics management
     */
    exportMetrics() {
        const report = metrics.exportToJSON();
        const blob = new Blob([report], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metrics-${Date.now()}.json`;
        a.click();
    }
    
    resetMetrics() {
        metrics.reset();
        this.updateContent();
    }
}

// Create global instance
window.debugPanel = new DebugPanel();

// Export for module usage
export default DebugPanel;