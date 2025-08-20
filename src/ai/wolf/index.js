/**
 * Wolf AI System - Main Export Module
 * @module wolf
 * 
 * This module provides a complete wolf AI system with:
 * - Individual wolf behavior and state management
 * - Pack coordination and tactics
 * - Advanced pathfinding
 * - Configurable difficulty and scaling
 * - WebAssembly compatibility for high performance
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

// WASM compatibility
export { WolfWasmAdapter, createWasmWolfSystem } from './wasm-adapter.js';

/**
 * Quick setup function for integrating wolf AI into a game
 * @param {Object} gameState - Game state object
 * @param {Object} wasmEngine - Optional WASM engine for performance
 * @returns {WolfManager|Object} Wolf manager or WASM-compatible system
 */
export function setupWolfAI(gameState, wasmEngine = null) {
    if (wasmEngine) {
        // Use WASM-optimized system
        return createWasmWolfSystem(gameState, wasmEngine);
    } else {
        // Use standard JavaScript system
        const manager = new WolfManager(gameState);
        manager.initialize();
        return manager;
    }
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
    WolfWasmAdapter,
    createWasmWolfSystem,
    setupWolfAI
};