/**
 * State Machine Module for Wolf AI
 * @module wolf/state-machine
 */

import { WolfState } from './config.js';

/**
 * State transition definition
 * @typedef {Object} StateTransition
 * @property {string} from - Source state
 * @property {string} to - Target state
 * @property {Function} condition - Condition function that returns boolean
 * @property {Function} [onTransition] - Optional callback when transition occurs
 */

/**
 * State Machine for Wolf AI behavior
 * @class
 */
export class WolfStateMachine {
    /**
     * @param {string} initialState - Initial state
     * @param {Object} context - Context object (usually the wolf instance)
     */
    constructor(initialState = WolfState.IDLE, context = null) {
        this.currentState = initialState;
        this.previousState = null;
        this.context = context;
        this.transitions = new Map();
        this.stateHandlers = new Map();
        this.stateTimers = new Map();
        this.lastStateChange = Date.now();
        
        this.setupTransitions();
        this.setupStateHandlers();
    }

    /**
     * Setup valid state transitions
     */
    setupTransitions() {
        // From IDLE
        this.addTransition(WolfState.IDLE, WolfState.PATROL, 
            () => !this.context?.target);
        this.addTransition(WolfState.IDLE, WolfState.STALKING, 
            () => this.context?.target && this.context.aggression <= 0.7);
        this.addTransition(WolfState.IDLE, WolfState.CHASING, 
            () => this.context?.target && this.context.aggression > 0.7);
        this.addTransition(WolfState.IDLE, WolfState.AMBUSH, 
            () => this.context?.shouldAmbush());

        // From PATROL
        this.addTransition(WolfState.PATROL, WolfState.STALKING,
            () => this.context?.detectPlayer());
        this.addTransition(WolfState.PATROL, WolfState.AMBUSH,
            () => this.context?.isGoodAmbushPosition());
        this.addTransition(WolfState.PATROL, WolfState.IDLE,
            () => this.context?.patrolComplete);

        // From STALKING
        this.addTransition(WolfState.STALKING, WolfState.CHASING,
            () => this.context?.shouldChase());
        this.addTransition(WolfState.STALKING, WolfState.FLANKING,
            () => this.context?.shouldFlank());
        this.addTransition(WolfState.STALKING, WolfState.ATTACKING,
            () => this.context?.inAttackRange());
        this.addTransition(WolfState.STALKING, WolfState.PATROL,
            () => !this.context?.target);

        // From CHASING
        this.addTransition(WolfState.CHASING, WolfState.ATTACKING,
            () => this.context?.inAttackRange());
        this.addTransition(WolfState.CHASING, WolfState.FLANKING,
            () => this.context?.shouldFlank());
        this.addTransition(WolfState.CHASING, WolfState.RETREATING,
            () => this.context?.shouldRetreat());
        this.addTransition(WolfState.CHASING, WolfState.STALKING,
            () => this.context?.lostTarget());

        // From ATTACKING
        this.addTransition(WolfState.ATTACKING, WolfState.RETREATING,
            () => this.context?.shouldRetreat());
        this.addTransition(WolfState.ATTACKING, WolfState.CHASING,
            () => !this.context?.inAttackRange() && this.context?.target);
        this.addTransition(WolfState.ATTACKING, WolfState.IDLE,
            () => !this.context?.target);

        // From RETREATING
        this.addTransition(WolfState.RETREATING, WolfState.REGROUPING,
            () => this.context?.needsRegroup());
        this.addTransition(WolfState.RETREATING, WolfState.IDLE,
            () => this.getStateTime() > 2000);
        this.addTransition(WolfState.RETREATING, WolfState.STALKING,
            () => this.context?.canReengage());

        // From FLANKING
        this.addTransition(WolfState.FLANKING, WolfState.ATTACKING,
            () => this.context?.inAttackRange());
        this.addTransition(WolfState.FLANKING, WolfState.CHASING,
            () => this.context?.flankingFailed());
        this.addTransition(WolfState.FLANKING, WolfState.RETREATING,
            () => this.context?.shouldRetreat());

        // From AMBUSH
        this.addTransition(WolfState.AMBUSH, WolfState.ATTACKING,
            () => this.context?.ambushTriggered());
        this.addTransition(WolfState.AMBUSH, WolfState.STALKING,
            () => this.getStateTime() > 5000);
        this.addTransition(WolfState.AMBUSH, WolfState.PATROL,
            () => !this.context?.target);

        // From HOWLING
        this.addTransition(WolfState.HOWLING, WolfState.CHASING,
            () => this.getStateTime() > 1500 && this.context?.target);
        this.addTransition(WolfState.HOWLING, WolfState.IDLE,
            () => this.getStateTime() > 1500);

        // From REGROUPING
        this.addTransition(WolfState.REGROUPING, WolfState.STALKING,
            () => this.context?.regroupComplete());
        this.addTransition(WolfState.REGROUPING, WolfState.IDLE,
            () => !this.context?.packMembers?.length);

        // To DEAD (from any state)
        for (const state of Object.values(WolfState)) {
            if (state !== WolfState.DEAD) {
                this.addTransition(state, WolfState.DEAD,
                    () => this.context?.health <= 0);
            }
        }
    }

    /**
     * Setup state-specific handlers
     */
    setupStateHandlers() {
        // Define enter/exit handlers for each state
        this.setStateHandler(WolfState.IDLE, {
            onEnter: () => {
                this.context?.resetMovement?.();
            },
            onExit: () => {}
        });

        this.setStateHandler(WolfState.PATROL, {
            onEnter: () => {
                this.context?.generatePatrolPath?.();
            },
            onExit: () => {
                this.context?.clearPatrolPath?.();
            }
        });

        this.setStateHandler(WolfState.STALKING, {
            onEnter: () => {
                this.context?.setStealthMode?.(true);
            },
            onExit: () => {
                this.context?.setStealthMode?.(false);
            }
        });

        this.setStateHandler(WolfState.CHASING, {
            onEnter: () => {
                this.context?.setSprintMode?.(true);
            },
            onExit: () => {
                this.context?.setSprintMode?.(false);
            }
        });

        this.setStateHandler(WolfState.ATTACKING, {
            onEnter: () => {
                this.context?.prepareAttack?.();
            },
            onExit: () => {
                this.context?.resetAttack?.();
            }
        });

        this.setStateHandler(WolfState.RETREATING, {
            onEnter: () => {
                this.context?.findRetreatPath?.();
            },
            onExit: () => {}
        });

        this.setStateHandler(WolfState.HOWLING, {
            onEnter: () => {
                this.context?.startHowl?.();
            },
            onExit: () => {
                this.context?.stopHowl?.();
            }
        });

        this.setStateHandler(WolfState.AMBUSH, {
            onEnter: () => {
                this.context?.hideInAmbush?.();
            },
            onExit: () => {
                this.context?.revealFromAmbush?.();
            }
        });

        this.setStateHandler(WolfState.FLANKING, {
            onEnter: () => {
                this.context?.calculateFlankPath?.();
            },
            onExit: () => {}
        });

        this.setStateHandler(WolfState.REGROUPING, {
            onEnter: () => {
                this.context?.callForRegroup?.();
            },
            onExit: () => {}
        });

        this.setStateHandler(WolfState.DEAD, {
            onEnter: () => {
                this.context?.onDeath?.();
            },
            onExit: () => {} // Dead state is final
        });
    }

    /**
     * Add a state transition
     * @param {string} from - Source state
     * @param {string} to - Target state
     * @param {Function} condition - Condition function
     * @param {Function} [onTransition] - Optional transition callback
     */
    addTransition(from, to, condition, onTransition = null) {
        if (!this.transitions.has(from)) {
            this.transitions.set(from, []);
        }
        
        this.transitions.get(from).push({
            from,
            to,
            condition,
            onTransition
        });
    }

    /**
     * Set state handler
     * @param {string} state - State name
     * @param {Object} handler - Handler object with onEnter and onExit
     */
    setStateHandler(state, handler) {
        this.stateHandlers.set(state, handler);
    }

    /**
     * Update state machine
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        // Don't update if dead
        if (this.currentState === WolfState.DEAD) {
            return;
        }

        // Check for valid transitions from current state
        const possibleTransitions = this.transitions.get(this.currentState) || [];
        
        for (const transition of possibleTransitions) {
            if (transition.condition()) {
                this.transitionTo(transition.to, transition.onTransition);
                break; // Only one transition per update
            }
        }
    }

    /**
     * Force transition to a specific state
     * @param {string} newState - Target state
     * @param {Function} [onTransition] - Optional transition callback
     */
    transitionTo(newState, onTransition = null) {
        if (newState === this.currentState) {
            return;
        }

        // Call exit handler for current state
        const currentHandler = this.stateHandlers.get(this.currentState);
        if (currentHandler?.onExit) {
            currentHandler.onExit();
        }

        // Update state
        this.previousState = this.currentState;
        this.currentState = newState;
        this.lastStateChange = Date.now();

        // Call transition callback if provided
        if (onTransition) {
            onTransition();
        }

        // Call enter handler for new state
        const newHandler = this.stateHandlers.get(newState);
        if (newHandler?.onEnter) {
            newHandler.onEnter();
        }

        // Log state change for debugging
        if (this.context?.debug) {
            console.log(`Wolf ${this.context.id}: ${this.previousState} -> ${this.currentState}`);
        }
    }

    /**
     * Get current state
     * @returns {string} Current state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Get previous state
     * @returns {string|null} Previous state
     */
    getPreviousState() {
        return this.previousState;
    }

    /**
     * Get time in current state
     * @returns {number} Time in milliseconds
     */
    getStateTime() {
        return Date.now() - this.lastStateChange;
    }

    /**
     * Check if in a specific state
     * @param {string} state - State to check
     * @returns {boolean} True if in specified state
     */
    isInState(state) {
        return this.currentState === state;
    }

    /**
     * Check if can transition to a state
     * @param {string} targetState - Target state to check
     * @returns {boolean} True if transition is possible
     */
    canTransitionTo(targetState) {
        const possibleTransitions = this.transitions.get(this.currentState) || [];
        return possibleTransitions.some(t => t.to === targetState);
    }

    /**
     * Reset state machine
     * @param {string} [initialState] - Optional initial state
     */
    reset(initialState = WolfState.IDLE) {
        // Call exit handler for current state
        const currentHandler = this.stateHandlers.get(this.currentState);
        if (currentHandler?.onExit) {
            currentHandler.onExit();
        }

        this.currentState = initialState;
        this.previousState = null;
        this.lastStateChange = Date.now();

        // Call enter handler for initial state
        const initialHandler = this.stateHandlers.get(initialState);
        if (initialHandler?.onEnter) {
            initialHandler.onEnter();
        }
    }

    /**
     * Get state statistics
     * @returns {Object} State statistics
     */
    getStatistics() {
        return {
            currentState: this.currentState,
            previousState: this.previousState,
            timeInState: this.getStateTime(),
            possibleTransitions: this.transitions.get(this.currentState)?.map(t => t.to) || []
        };
    }
}