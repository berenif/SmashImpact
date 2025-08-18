/**
 * GameState - Centralized state management system
 */

import { EventBus, EVENTS } from './EventBus.js';

/**
 * GameState class - Redux-like state management
 */
export class GameState {
    constructor() {
        this.state = this.getInitialState();
        this.reducers = new Map();
        this.middleware = [];
        this.subscribers = new Set();
        this.history = [];
        this.maxHistorySize = 50;
        this.snapshots = new Map();
        
        // Register default reducers
        this.registerDefaultReducers();
        
        // Make instance available globally
        GameState.instance = this;
    }
    
    /**
     * Get initial state structure
     */
    getInitialState() {
        return {
            game: {
                status: 'menu', // menu, playing, paused, gameOver
                mode: 'coop',   // coop, versus
                time: 0,
                score: 0,
                wave: 0,
                difficulty: 1.0
            },
            
            players: new Map(),
            enemies: new Map(),
            projectiles: new Map(),
            effects: new Map(),
            
            arena: {
                width: 1600,
                height: 1000,
                layout: null,
                objectives: [],
                hazards: []
            },
            
            coop: {
                tether: {
                    active: false,
                    player1: null,
                    player2: null,
                    strength: 0
                },
                rally: {
                    active: false,
                    progress: 0,
                    position: null
                },
                backToBack: {
                    active: false,
                    duration: 0
                },
                combo: {
                    value: 0,
                    multiplier: 1,
                    overclock: false
                }
            },
            
            upgrades: {
                available: [],
                applied: [],
                currency: 0,
                rerolls: 0
            },
            
            boss: {
                active: false,
                phase: 0,
                health: 0,
                maxHealth: 0,
                tactic: null,
                adaptationLevel: 0
            },
            
            network: {
                connected: false,
                role: null, // host, peer
                latency: 0,
                packetLoss: 0,
                peers: []
            },
            
            debug: {
                enabled: false,
                showHitboxes: false,
                showPaths: false,
                showStats: false,
                godMode: false,
                speedMultiplier: 1.0
            }
        };
    }
    
    /**
     * Register default reducers
     */
    registerDefaultReducers() {
        // Game reducers
        this.registerReducer('GAME_START', (state) => ({
            ...state,
            game: { ...state.game, status: 'playing', time: 0 }
        }));
        
        this.registerReducer('GAME_PAUSE', (state) => ({
            ...state,
            game: { ...state.game, status: 'paused' }
        }));
        
        this.registerReducer('GAME_RESUME', (state) => ({
            ...state,
            game: { ...state.game, status: 'playing' }
        }));
        
        this.registerReducer('GAME_OVER', (state, action) => ({
            ...state,
            game: { ...state.game, status: 'gameOver', finalScore: action.payload.score }
        }));
        
        // Player reducers
        this.registerReducer('PLAYER_SPAWN', (state, action) => {
            const newState = { ...state };
            newState.players = new Map(state.players);
            newState.players.set(action.payload.id, action.payload);
            return newState;
        });
        
        this.registerReducer('PLAYER_UPDATE', (state, action) => {
            const newState = { ...state };
            newState.players = new Map(state.players);
            const player = newState.players.get(action.payload.id);
            if (player) {
                newState.players.set(action.payload.id, { ...player, ...action.payload.updates });
            }
            return newState;
        });
        
        // Enemy reducers
        this.registerReducer('ENEMY_SPAWN', (state, action) => {
            const newState = { ...state };
            newState.enemies = new Map(state.enemies);
            newState.enemies.set(action.payload.id, action.payload);
            return newState;
        });
        
        this.registerReducer('ENEMY_REMOVE', (state, action) => {
            const newState = { ...state };
            newState.enemies = new Map(state.enemies);
            newState.enemies.delete(action.payload.id);
            return newState;
        });
        
        // Wave reducers
        this.registerReducer('WAVE_START', (state, action) => ({
            ...state,
            game: { ...state.game, wave: action.payload.wave }
        }));
        
        // Co-op reducers
        this.registerReducer('TETHER_UPDATE', (state, action) => ({
            ...state,
            coop: { ...state.coop, tether: { ...state.coop.tether, ...action.payload } }
        }));
        
        this.registerReducer('COMBO_UPDATE', (state, action) => ({
            ...state,
            coop: { ...state.coop, combo: { ...state.coop.combo, ...action.payload } }
        }));
        
        // Upgrade reducers
        this.registerReducer('UPGRADE_AVAILABLE', (state, action) => ({
            ...state,
            upgrades: { ...state.upgrades, available: action.payload.upgrades }
        }));
        
        this.registerReducer('UPGRADE_APPLIED', (state, action) => {
            const newState = { ...state };
            newState.upgrades = {
                ...state.upgrades,
                applied: [...state.upgrades.applied, action.payload.upgrade],
                available: []
            };
            return newState;
        });
        
        // Debug reducers
        this.registerReducer('DEBUG_TOGGLE', (state, action) => ({
            ...state,
            debug: { ...state.debug, ...action.payload }
        }));
    }
    
    /**
     * Register a reducer
     */
    registerReducer(actionType, reducer) {
        this.reducers.set(actionType, reducer);
    }
    
    /**
     * Add middleware
     */
    use(middleware) {
        this.middleware.push(middleware);
    }
    
    /**
     * Dispatch an action
     */
    dispatch(action) {
        // Validate action
        if (!action || !action.type) {
            console.error('Invalid action:', action);
            return;
        }
        
        // Apply middleware
        let finalAction = action;
        for (const mw of this.middleware) {
            finalAction = mw(finalAction, this.state);
            if (!finalAction) return; // Middleware can cancel action
        }
        
        // Get reducer
        const reducer = this.reducers.get(finalAction.type);
        if (!reducer) {
            if (this.state.debug?.enabled) {
                console.warn(`No reducer for action: ${finalAction.type}`);
            }
            return;
        }
        
        // Apply reducer
        const prevState = this.state;
        this.state = reducer(prevState, finalAction);
        
        // Add to history
        this.addToHistory(finalAction, prevState, this.state);
        
        // Notify subscribers
        this.notifySubscribers(finalAction, prevState, this.state);
        
        // Emit event
        EventBus.emit(`state:${finalAction.type}`, finalAction.payload);
    }
    
    /**
     * Batch dispatch multiple actions
     */
    batchDispatch(actions) {
        actions.forEach(action => this.dispatch(action));
    }
    
    /**
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }
    
    /**
     * Notify subscribers of state change
     */
    notifySubscribers(action, prevState, newState) {
        this.subscribers.forEach(callback => {
            try {
                callback(action, prevState, newState);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }
    
    /**
     * Add to history
     */
    addToHistory(action, prevState, newState) {
        this.history.push({
            action,
            prevState,
            newState,
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    
    /**
     * Reset state
     */
    reset() {
        this.state = this.getInitialState();
        this.history = [];
        this.notifySubscribers({ type: 'RESET' }, null, this.state);
    }
    
    /**
     * Time travel to a previous state
     */
    timeTravel(index) {
        if (index < 0 || index >= this.history.length) {
            console.error('Invalid history index:', index);
            return;
        }
        
        const entry = this.history[index];
        this.state = entry.newState;
        this.notifySubscribers({ type: 'TIME_TRAVEL', payload: { index } }, entry.prevState, entry.newState);
    }
    
    /**
     * Create a snapshot
     */
    createSnapshot(name = null) {
        const snapshot = {
            state: JSON.parse(JSON.stringify(this.state)),
            timestamp: Date.now()
        };
        
        if (name) {
            this.snapshots.set(name, snapshot);
        }
        
        return snapshot;
    }
    
    /**
     * Restore a snapshot
     */
    restoreSnapshot(snapshotOrName) {
        let snapshot;
        
        if (typeof snapshotOrName === 'string') {
            snapshot = this.snapshots.get(snapshotOrName);
            if (!snapshot) {
                console.error('Snapshot not found:', snapshotOrName);
                return;
            }
        } else {
            snapshot = snapshotOrName;
        }
        
        this.state = snapshot.state;
        this.notifySubscribers({ type: 'RESTORE_SNAPSHOT' }, null, this.state);
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            historySize: this.history.length,
            snapshotCount: this.snapshots.size,
            subscriberCount: this.subscribers.size,
            reducerCount: this.reducers.size,
            middlewareCount: this.middleware.length
        };
    }
}

/**
 * Selectors - Helper functions to get data from state
 */
export const selectors = {
    getPlayer: (state, id) => state.players.get(id),
    getEnemy: (state, id) => state.enemies.get(id),
    getAllPlayers: (state) => Array.from(state.players.values()),
    getAllEnemies: (state) => Array.from(state.enemies.values()),
    getAliveEnemies: (state) => Array.from(state.enemies.values()).filter(e => e.health > 0),
    getGameStatus: (state) => state.game.status,
    getCurrentWave: (state) => state.game.wave,
    getComboValue: (state) => state.coop.combo.value,
    isOverclockActive: (state) => state.coop.combo.overclock,
    getUpgradeCurrency: (state) => state.upgrades.currency,
    getBossPhase: (state) => state.boss.phase,
    isConnected: (state) => state.network.connected,
    getNetworkRole: (state) => state.network.role,
    isDebugEnabled: (state) => state.debug.enabled
};

/**
 * Action creators - Helper functions to create actions
 */
export const actions = {
    // Game actions
    startGame: () => ({ type: 'GAME_START' }),
    pauseGame: () => ({ type: 'GAME_PAUSE' }),
    resumeGame: () => ({ type: 'GAME_RESUME' }),
    endGame: (score) => ({ type: 'GAME_OVER', payload: { score } }),
    
    // Player actions
    spawnPlayer: (player) => ({ type: 'PLAYER_SPAWN', payload: player }),
    updatePlayer: (id, updates) => ({ type: 'PLAYER_UPDATE', payload: { id, updates } }),
    
    // Enemy actions
    spawnEnemy: (enemy) => ({ type: 'ENEMY_SPAWN', payload: enemy }),
    removeEnemy: (id) => ({ type: 'ENEMY_REMOVE', payload: { id } }),
    
    // Wave actions
    startWave: (wave) => ({ type: 'WAVE_START', payload: { wave } }),
    
    // Co-op actions
    updateTether: (updates) => ({ type: 'TETHER_UPDATE', payload: updates }),
    updateCombo: (updates) => ({ type: 'COMBO_UPDATE', payload: updates }),
    
    // Upgrade actions
    setAvailableUpgrades: (upgrades) => ({ type: 'UPGRADE_AVAILABLE', payload: { upgrades } }),
    applyUpgrade: (upgrade) => ({ type: 'UPGRADE_APPLIED', payload: { upgrade } }),
    
    // Debug actions
    toggleDebug: (settings) => ({ type: 'DEBUG_TOGGLE', payload: settings })
};

// Create singleton instance
const gameState = new GameState();

// Export singleton
export default gameState;

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    window.GameState = gameState;
}