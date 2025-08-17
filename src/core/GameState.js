/**
 * GameState - Centralized state management with immutable updates
 * Redux-like pattern for predictable state changes
 */

import eventBus, { EVENTS } from './EventBus.js';

class GameState {
  constructor() {
    this.state = this.getInitialState();
    this.subscribers = new Set();
    this.history = [];
    this.maxHistorySize = 50;
    this.middleware = [];
    this.reducers = new Map();
    
    // Register default reducers
    this.registerDefaultReducers();
  }

  /**
   * Get initial game state
   */
  getInitialState() {
    return {
      // Game info
      game: {
        mode: 'menu', // menu, playing, paused, gameOver
        difficulty: 'normal',
        elapsedTime: 0,
        isPaused: false,
        isHost: true
      },
      
      // Players
      players: new Map(),
      localPlayerId: null,
      
      // Enemies
      enemies: new Map(),
      squads: new Map(),
      
      // Wave system
      wave: {
        current: 0,
        enemiesRemaining: 0,
        objectives: [],
        timeRemaining: 0,
        status: 'waiting' // waiting, active, complete, failed
      },
      
      // Arena
      arena: {
        id: null,
        width: 1600,
        height: 900,
        obstacles: [],
        pickups: []
      },
      
      // Team stats
      team: {
        comboMeter: 0,
        score: 0,
        upgrades: [],
        resources: 0
      },
      
      // Network
      network: {
        connected: false,
        latency: 0,
        peers: new Map()
      },
      
      // UI
      ui: {
        activeMenu: null,
        notifications: [],
        debugPanel: false
      },
      
      // Performance metrics
      performance: {
        fps: 60,
        entityCount: 0,
        updateTime: 0,
        renderTime: 0
      }
    };
  }

  /**
   * Register default reducers for state updates
   */
  registerDefaultReducers() {
    // Game reducers
    this.registerReducer('SET_GAME_MODE', (state, payload) => ({
      ...state,
      game: { ...state.game, mode: payload.mode }
    }));
    
    this.registerReducer('PAUSE_GAME', (state) => ({
      ...state,
      game: { ...state.game, isPaused: true }
    }));
    
    this.registerReducer('RESUME_GAME', (state) => ({
      ...state,
      game: { ...state.game, isPaused: false }
    }));
    
    // Player reducers
    this.registerReducer('ADD_PLAYER', (state, payload) => {
      const players = new Map(state.players);
      players.set(payload.id, payload.player);
      return { ...state, players };
    });
    
    this.registerReducer('UPDATE_PLAYER', (state, payload) => {
      const players = new Map(state.players);
      const player = players.get(payload.id);
      if (player) {
        players.set(payload.id, { ...player, ...payload.updates });
      }
      return { ...state, players };
    });
    
    this.registerReducer('REMOVE_PLAYER', (state, payload) => {
      const players = new Map(state.players);
      players.delete(payload.id);
      return { ...state, players };
    });
    
    // Enemy reducers
    this.registerReducer('ADD_ENEMY', (state, payload) => {
      const enemies = new Map(state.enemies);
      enemies.set(payload.id, payload.enemy);
      return { ...state, enemies };
    });
    
    this.registerReducer('UPDATE_ENEMY', (state, payload) => {
      const enemies = new Map(state.enemies);
      const enemy = enemies.get(payload.id);
      if (enemy) {
        enemies.set(payload.id, { ...enemy, ...payload.updates });
      }
      return { ...state, enemies };
    });
    
    this.registerReducer('REMOVE_ENEMY', (state, payload) => {
      const enemies = new Map(state.enemies);
      enemies.delete(payload.id);
      return { ...state, enemies };
    });
    
    // Wave reducers
    this.registerReducer('START_WAVE', (state, payload) => ({
      ...state,
      wave: {
        ...state.wave,
        current: payload.waveNumber,
        enemiesRemaining: payload.enemyCount,
        objectives: payload.objectives,
        status: 'active'
      }
    }));
    
    this.registerReducer('COMPLETE_WAVE', (state) => ({
      ...state,
      wave: { ...state.wave, status: 'complete' }
    }));
    
    // Team reducers
    this.registerReducer('UPDATE_COMBO_METER', (state, payload) => ({
      ...state,
      team: { ...state.team, comboMeter: payload.value }
    }));
    
    this.registerReducer('ADD_SCORE', (state, payload) => ({
      ...state,
      team: { ...state.team, score: state.team.score + payload.points }
    }));
    
    // Network reducers
    this.registerReducer('SET_NETWORK_STATUS', (state, payload) => ({
      ...state,
      network: { ...state.network, connected: payload.connected }
    }));
    
    this.registerReducer('UPDATE_LATENCY', (state, payload) => ({
      ...state,
      network: { ...state.network, latency: payload.latency }
    }));
  }

  /**
   * Register a custom reducer
   */
  registerReducer(actionType, reducer) {
    this.reducers.set(actionType, reducer);
  }

  /**
   * Register middleware for intercepting actions
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  /**
   * Dispatch an action to update state
   */
  dispatch(action) {
    // Validate action
    if (!action || !action.type) {
      console.error('[GameState] Invalid action:', action);
      return;
    }
    
    // Run middleware
    let finalAction = action;
    for (const mw of this.middleware) {
      finalAction = mw(finalAction, this.state);
      if (!finalAction) return; // Middleware can cancel action
    }
    
    // Get reducer
    const reducer = this.reducers.get(finalAction.type);
    if (!reducer) {
      console.warn(`[GameState] No reducer for action: ${finalAction.type}`);
      return;
    }
    
    // Create new state
    const oldState = this.state;
    const newState = reducer(oldState, finalAction.payload);
    
    // Update state
    this.state = newState;
    
    // Add to history
    this.addToHistory(finalAction, oldState, newState);
    
    // Notify subscribers
    this.notifySubscribers(finalAction, oldState, newState);
    
    // Emit event
    eventBus.emit('state.changed', {
      action: finalAction,
      oldState,
      newState
    });
  }

  /**
   * Batch multiple actions
   */
  batchDispatch(actions) {
    const oldState = this.state;
    
    for (const action of actions) {
      const reducer = this.reducers.get(action.type);
      if (reducer) {
        this.state = reducer(this.state, action.payload);
      }
    }
    
    const newState = this.state;
    
    // Single notification for all changes
    this.notifySubscribers({ type: 'BATCH', actions }, oldState, newState);
    
    eventBus.emit('state.batchChanged', {
      actions,
      oldState,
      newState
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback, selector = null) {
    const subscriber = { callback, selector };
    this.subscribers.add(subscriber);
    
    // Return unsubscribe function
    return () => this.subscribers.delete(subscriber);
  }

  /**
   * Notify subscribers of state changes
   */
  notifySubscribers(action, oldState, newState) {
    for (const subscriber of this.subscribers) {
      try {
        if (subscriber.selector) {
          // Only notify if selected part changed
          const oldSelected = subscriber.selector(oldState);
          const newSelected = subscriber.selector(newState);
          
          if (oldSelected !== newSelected) {
            subscriber.callback(newSelected, oldSelected, action);
          }
        } else {
          // Notify of any change
          subscriber.callback(newState, oldState, action);
        }
      } catch (error) {
        console.error('[GameState] Subscriber error:', error);
      }
    }
  }

  /**
   * Add action to history
   */
  addToHistory(action, oldState, newState) {
    this.history.push({
      action,
      oldState,
      newState,
      timestamp: Date.now()
    });
    
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get current state or part of it
   */
  getState(selector = null) {
    if (selector) {
      return selector(this.state);
    }
    return this.state;
  }

  /**
   * Reset state to initial
   */
  reset() {
    const oldState = this.state;
    this.state = this.getInitialState();
    this.history = [];
    
    this.notifySubscribers(
      { type: 'RESET' },
      oldState,
      this.state
    );
  }

  /**
   * Time travel for debugging
   */
  timeTravel(steps) {
    if (steps === 0) return;
    
    const targetIndex = this.history.length - 1 - Math.abs(steps);
    if (targetIndex < 0 || targetIndex >= this.history.length) {
      console.warn('[GameState] Cannot time travel that far');
      return;
    }
    
    const entry = this.history[targetIndex];
    this.state = steps < 0 ? entry.oldState : entry.newState;
    
    this.notifySubscribers(
      { type: 'TIME_TRAVEL', steps },
      entry.oldState,
      this.state
    );
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot() {
    return {
      state: JSON.parse(JSON.stringify(this.state)),
      timestamp: Date.now()
    };
  }

  /**
   * Restore from snapshot
   */
  restoreSnapshot(snapshot) {
    const oldState = this.state;
    this.state = snapshot.state;
    
    this.notifySubscribers(
      { type: 'RESTORE_SNAPSHOT' },
      oldState,
      this.state
    );
  }

  /**
   * Get state statistics for debugging
   */
  getStats() {
    return {
      subscriberCount: this.subscribers.size,
      historySize: this.history.length,
      reducerCount: this.reducers.size,
      middlewareCount: this.middleware.length,
      stateSize: JSON.stringify(this.state).length
    };
  }
}

// Singleton instance
const gameState = new GameState();

// Helper selectors
export const selectors = {
  getPlayer: (id) => (state) => state.players.get(id),
  getLocalPlayer: (state) => state.players.get(state.localPlayerId),
  getEnemy: (id) => (state) => state.enemies.get(id),
  getSquad: (id) => (state) => state.squads.get(id),
  getGameMode: (state) => state.game.mode,
  getWaveStatus: (state) => state.wave.status,
  getComboMeter: (state) => state.team.comboMeter,
  getScore: (state) => state.team.score,
  isConnected: (state) => state.network.connected,
  getLatency: (state) => state.network.latency
};

// Action creators
export const actions = {
  // Game actions
  setGameMode: (mode) => ({ type: 'SET_GAME_MODE', payload: { mode } }),
  pauseGame: () => ({ type: 'PAUSE_GAME' }),
  resumeGame: () => ({ type: 'RESUME_GAME' }),
  
  // Player actions
  addPlayer: (id, player) => ({ type: 'ADD_PLAYER', payload: { id, player } }),
  updatePlayer: (id, updates) => ({ type: 'UPDATE_PLAYER', payload: { id, updates } }),
  removePlayer: (id) => ({ type: 'REMOVE_PLAYER', payload: { id } }),
  
  // Enemy actions
  addEnemy: (id, enemy) => ({ type: 'ADD_ENEMY', payload: { id, enemy } }),
  updateEnemy: (id, updates) => ({ type: 'UPDATE_ENEMY', payload: { id, updates } }),
  removeEnemy: (id) => ({ type: 'REMOVE_ENEMY', payload: { id } }),
  
  // Wave actions
  startWave: (waveNumber, enemyCount, objectives) => ({
    type: 'START_WAVE',
    payload: { waveNumber, enemyCount, objectives }
  }),
  completeWave: () => ({ type: 'COMPLETE_WAVE' }),
  
  // Team actions
  updateComboMeter: (value) => ({ type: 'UPDATE_COMBO_METER', payload: { value } }),
  addScore: (points) => ({ type: 'ADD_SCORE', payload: { points } }),
  
  // Network actions
  setNetworkStatus: (connected) => ({ type: 'SET_NETWORK_STATUS', payload: { connected } }),
  updateLatency: (latency) => ({ type: 'UPDATE_LATENCY', payload: { latency } })
};

export default gameState;