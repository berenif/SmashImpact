/**
 * Wolf AI System - Main Export Module
 * @module wolf
 * 
 * This module provides a complete wolf AI system with:
 * - Individual wolf behavior and state management
 * - Pack coordination and tactics
 * - Advanced pathfinding
 * - Configurable difficulty and scaling
 */

// Core modules
export { Wolf } from './wolf.js';
export { WolfManager } from './wolf-manager.js';
export { PackCoordinator, PackFormation, PackTactic } from './pack-coordinator.js';

// Configuration
export { WOLF_CONFIG, WolfState, WolfRole, getScaledConfig } from './config.js';

// Utility modules
export { MazePathfinder, PathNode } from './pathfinding.js';
export { WolfStateMachine } from './state-machine.js';
export { WolfBehaviors } from './behaviors.js';

/**
 * Quick setup function for integrating wolf AI into a game
 * @param {Object} gameState - Game state object
 * @returns {WolfManager} Configured wolf manager instance
 */
export function setupWolfAI(gameState) {
    const manager = new WolfManager(gameState);
    manager.initialize();
    return manager;
}

/**
 * Default export for convenience
 */
export default {
    Wolf,
    WolfManager,
    PackCoordinator,
    WOLF_CONFIG,
    WolfState,
    WolfRole,
    setupWolfAI
};