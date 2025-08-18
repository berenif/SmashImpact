/**
 * EventBus - Central event system for game communication
 */

/**
 * Common event names
 */
export const EVENTS = {
    // Player events
    PLAYER_SPAWN: 'player:spawn',
    PLAYER_MOVE: 'player:move',
    PLAYER_ATTACK: 'player:attack',
    PLAYER_DAMAGED: 'player:damaged',
    PLAYER_DOWNED: 'player:downed',
    PLAYER_REVIVED: 'player:revived',
    PLAYER_ABILITY_USED: 'player:ability:used',
    
    // Enemy events
    ENEMY_SPAWN: 'enemy:spawn',
    ENEMY_MOVE: 'enemy:move',
    ENEMY_ATTACK: 'enemy:attack',
    ENEMY_DAMAGED: 'enemy:damaged',
    ENEMY_KILLED: 'enemy:killed',
    
    // Wave events
    WAVE_START: 'wave:start',
    WAVE_COMPLETE: 'wave:complete',
    WAVE_FAILED: 'wave:failed',
    
    // Co-op events
    TETHER_START: 'tether:start',
    TETHER_BREAK: 'tether:break',
    TETHER_PULL: 'tether:pull',
    RALLY_START: 'rally:start',
    RALLY_COMPLETE: 'rally:complete',
    BACK_TO_BACK_START: 'back2back:start',
    BACK_TO_BACK_END: 'back2back:end',
    COMBO_ADD: 'combo:add',
    COMBO_RESET: 'combo:reset',
    OVERCLOCK_START: 'overclock:start',
    OVERCLOCK_END: 'overclock:end',
    
    // Upgrade events
    UPGRADE_AVAILABLE: 'upgrade:available',
    UPGRADE_APPLIED: 'upgrade:applied',
    UPGRADE_REROLL: 'upgrade:reroll',
    
    // Boss events
    BOSS_SPAWN: 'boss:spawn',
    BOSS_PHASE_CHANGE: 'boss:phase:change',
    BOSS_TACTIC_CHANGE: 'boss:tactic:change',
    BOSS_ATTACK: 'boss:attack',
    BOSS_DEFEATED: 'boss:defeated',
    
    // System events
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    
    // Network events
    NETWORK_CONNECTED: 'network:connected',
    NETWORK_DISCONNECTED: 'network:disconnected',
    NETWORK_LATENCY: 'network:latency',
    NETWORK_PACKET_LOSS: 'network:packet:loss',
    
    // Debug events
    DEBUG_BALANCE_CHANGE: 'debug:balance:change',
    DEBUG_STATE_CHANGE: 'debug:state:change',
    DEBUG_COMMAND: 'debug:command'
};

/**
 * EventBus class - Singleton pattern
 */
class EventBusClass {
    constructor() {
        this.events = new Map();
        this.history = [];
        this.maxHistorySize = 100;
        this.debug = false;
        this.stats = {
            emitted: 0,
            listeners: 0
        };
    }
    
    /**
     * Subscribe to an event
     */
    on(event, callback, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const listener = { callback, context };
        this.events.get(event).push(listener);
        this.stats.listeners++;
        
        // Return unsubscribe function
        return () => this.off(event, callback, context);
    }
    
    /**
     * Subscribe to an event once
     */
    once(event, callback, context = null) {
        const wrapper = (...args) => {
            callback.apply(context, args);
            this.off(event, wrapper, context);
        };
        
        return this.on(event, wrapper, context);
    }
    
    /**
     * Unsubscribe from an event
     */
    off(event, callback = null, context = null) {
        if (!this.events.has(event)) return;
        
        if (!callback) {
            // Remove all listeners for this event
            const count = this.events.get(event).length;
            this.stats.listeners -= count;
            this.events.delete(event);
        } else {
            // Remove specific listener
            const listeners = this.events.get(event);
            const index = listeners.findIndex(l => 
                l.callback === callback && l.context === context
            );
            
            if (index !== -1) {
                listeners.splice(index, 1);
                this.stats.listeners--;
                
                if (listeners.length === 0) {
                    this.events.delete(event);
                }
            }
        }
    }
    
    /**
     * Emit an event
     */
    emit(event, data = null) {
        this.stats.emitted++;
        
        // Add to history
        this.addToHistory(event, data);
        
        // Debug logging
        if (this.debug) {
            console.log(`[EventBus] ${event}`, data);
        }
        
        // Check for wildcard listeners
        if (this.events.has('*')) {
            const wildcardListeners = this.events.get('*');
            wildcardListeners.forEach(listener => {
                try {
                    listener.callback.call(listener.context, event, data);
                } catch (error) {
                    console.error(`Error in wildcard listener:`, error);
                }
            });
        }
        
        // Check for specific event listeners
        if (!this.events.has(event)) return;
        
        const listeners = [...this.events.get(event)]; // Copy to prevent modification during iteration
        listeners.forEach(listener => {
            try {
                listener.callback.call(listener.context, data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }
    
    /**
     * Emit an event asynchronously
     */
    async emitAsync(event, data = null) {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.emit(event, data);
                resolve();
            }, 0);
        });
    }
    
    /**
     * Check if event matches wildcard pattern
     */
    matchesWildcard(event, pattern) {
        if (pattern === '*') return true;
        
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(event);
    }
    
    /**
     * Add event to history
     */
    addToHistory(event, data) {
        this.history.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * Clear all event listeners
     */
    clear() {
        this.stats.listeners = 0;
        this.events.clear();
    }
    
    /**
     * Get event history
     */
    getHistory() {
        return [...this.history];
    }
    
    /**
     * Set debug mode
     */
    setDebug(enabled) {
        this.debug = enabled;
    }
    
    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeEvents: this.events.size,
            historySize: this.history.length
        };
    }
}

// Create singleton instance
export const EventBus = new EventBusClass();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
    window.EventBus = EventBus;
}