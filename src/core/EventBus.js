/**
 * EventBus - Central event system for decoupled communication
 * Supports wildcards, priorities, and async handlers
 */

class EventBus {
  constructor() {
    this.events = new Map();
    this.wildcardHandlers = [];
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.debug = false;
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name (supports wildcards like "player.*")
   * @param {Function} handler - Event handler function
   * @param {Object} options - { priority: 0, once: false, context: null }
   * @returns {Function} Unsubscribe function
   */
  on(event, handler, options = {}) {
    const { priority = 0, once = false, context = null } = options;
    
    const wrapper = {
      handler,
      priority,
      once,
      context,
      id: Math.random().toString(36).substr(2, 9)
    };

    if (event.includes('*')) {
      // Wildcard subscription
      this.wildcardHandlers.push({ pattern: event, ...wrapper });
      this.wildcardHandlers.sort((a, b) => b.priority - a.priority);
    } else {
      // Regular subscription
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      
      const handlers = this.events.get(event);
      handlers.push(wrapper);
      handlers.sort((a, b) => b.priority - a.priority);
    }

    // Return unsubscribe function
    return () => this.off(event, wrapper.id);
  }

  /**
   * Subscribe to an event that fires only once
   */
  once(event, handler, options = {}) {
    return this.on(event, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off(event, handlerId) {
    if (event.includes('*')) {
      const index = this.wildcardHandlers.findIndex(h => h.id === handlerId);
      if (index !== -1) {
        this.wildcardHandlers.splice(index, 1);
      }
    } else {
      const handlers = this.events.get(event);
      if (handlers) {
        const index = handlers.findIndex(h => h.id === handlerId);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    }
  }

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Event data
   * @param {Object} metadata - Additional metadata
   */
  emit(event, data = null, metadata = {}) {
    if (this.debug) {
      console.log(`[EventBus] Emit: ${event}`, data);
    }

    // Add to history
    this.addToHistory(event, data, metadata);

    const handlers = [];
    
    // Collect regular handlers
    if (this.events.has(event)) {
      handlers.push(...this.events.get(event));
    }
    
    // Collect matching wildcard handlers
    for (const wildcard of this.wildcardHandlers) {
      if (this.matchesWildcard(event, wildcard.pattern)) {
        handlers.push(wildcard);
      }
    }
    
    // Sort by priority and execute
    handlers.sort((a, b) => b.priority - a.priority);
    
    const toRemove = [];
    
    for (const wrapper of handlers) {
      try {
        const result = wrapper.context 
          ? wrapper.handler.call(wrapper.context, data, metadata)
          : wrapper.handler(data, metadata);
          
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`[EventBus] Async handler error for ${event}:`, error);
          });
        }
        
        if (wrapper.once) {
          toRemove.push(wrapper);
        }
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event}:`, error);
      }
    }
    
    // Remove one-time handlers
    for (const wrapper of toRemove) {
      this.off(event, wrapper.id);
    }
  }

  /**
   * Emit an event and wait for all handlers to complete
   */
  async emitAsync(event, data = null, metadata = {}) {
    if (this.debug) {
      console.log(`[EventBus] EmitAsync: ${event}`, data);
    }

    this.addToHistory(event, data, metadata);

    const handlers = [];
    
    if (this.events.has(event)) {
      handlers.push(...this.events.get(event));
    }
    
    for (const wildcard of this.wildcardHandlers) {
      if (this.matchesWildcard(event, wildcard.pattern)) {
        handlers.push(wildcard);
      }
    }
    
    handlers.sort((a, b) => b.priority - a.priority);
    
    const promises = [];
    const toRemove = [];
    
    for (const wrapper of handlers) {
      const promise = Promise.resolve().then(() => {
        return wrapper.context 
          ? wrapper.handler.call(wrapper.context, data, metadata)
          : wrapper.handler(data, metadata);
      }).catch(error => {
        console.error(`[EventBus] Async handler error for ${event}:`, error);
      });
      
      promises.push(promise);
      
      if (wrapper.once) {
        toRemove.push(wrapper);
      }
    }
    
    await Promise.all(promises);
    
    for (const wrapper of toRemove) {
      this.off(event, wrapper.id);
    }
  }

  /**
   * Check if event matches wildcard pattern
   */
  matchesWildcard(event, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(event);
  }

  /**
   * Add event to history for debugging
   */
  addToHistory(event, data, metadata) {
    this.eventHistory.push({
      event,
      data,
      metadata,
      timestamp: Date.now()
    });
    
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Clear all event handlers
   */
  clear() {
    this.events.clear();
    this.wildcardHandlers = [];
  }

  /**
   * Get event history for debugging
   */
  getHistory(filter = null) {
    if (!filter) return this.eventHistory;
    
    return this.eventHistory.filter(entry => 
      entry.event.includes(filter) || this.matchesWildcard(entry.event, filter)
    );
  }

  /**
   * Enable/disable debug logging
   */
  setDebug(enabled) {
    this.debug = enabled;
  }

  /**
   * Get statistics about registered events
   */
  getStats() {
    const stats = {
      totalEvents: this.events.size,
      totalHandlers: 0,
      wildcardHandlers: this.wildcardHandlers.length,
      events: {}
    };
    
    for (const [event, handlers] of this.events) {
      stats.totalHandlers += handlers.length;
      stats.events[event] = handlers.length;
    }
    
    return stats;
  }
}

// Singleton instance
const eventBus = new EventBus();

// Common event names as constants
export const EVENTS = {
  // Game lifecycle
  GAME_START: 'game.start',
  GAME_PAUSE: 'game.pause',
  GAME_RESUME: 'game.resume',
  GAME_END: 'game.end',
  
  // Player events
  PLAYER_SPAWN: 'player.spawn',
  PLAYER_DAMAGED: 'player.damaged',
  PLAYER_HEALED: 'player.healed',
  PLAYER_DOWNED: 'player.downed',
  PLAYER_REVIVED: 'player.revived',
  PLAYER_ABILITY_USED: 'player.ability.used',
  
  // Enemy events
  ENEMY_SPAWN: 'enemy.spawn',
  ENEMY_KILLED: 'enemy.killed',
  ENEMY_DAMAGED: 'enemy.damaged',
  SQUAD_SPAWN: 'squad.spawn',
  SQUAD_TACTIC_CHANGE: 'squad.tactic.change',
  
  // Wave events
  WAVE_START: 'wave.start',
  WAVE_COMPLETE: 'wave.complete',
  WAVE_FAILED: 'wave.failed',
  
  // Objective events
  OBJECTIVE_START: 'objective.start',
  OBJECTIVE_COMPLETE: 'objective.complete',
  OBJECTIVE_FAILED: 'objective.failed',
  
  // Network events
  NETWORK_CONNECTED: 'network.connected',
  NETWORK_DISCONNECTED: 'network.disconnected',
  NETWORK_MESSAGE: 'network.message',
  NETWORK_LATENCY: 'network.latency',
  
  // UI events
  UI_MENU_OPEN: 'ui.menu.open',
  UI_MENU_CLOSE: 'ui.menu.close',
  UI_BUTTON_CLICK: 'ui.button.click',
  
  // Debug events
  DEBUG_COMMAND: 'debug.command',
  DEBUG_TOGGLE: 'debug.toggle'
};

export default eventBus;