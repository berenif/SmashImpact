// Combat WASM Adapter - Integrates WASM physics with JavaScript game
(function(window) {
  'use strict';

  class CombatWasmAdapter {
    constructor(game) {
      this.game = game;
      this.wasmEngine = null;
      // Removed: this.useWasm - WASM is always required
      this.entityIdMap = new Map();
    }
    
    async initialize() {
      try {
        // Check WebAssembly support
        if (typeof WebAssembly === 'undefined') {
          throw new Error('WebAssembly not supported in this browser');
        }
        
        // Load WASM module
        const WasmGameEngine = window.Module?.GameEngine;
        if (!WasmGameEngine) {
          throw new Error('WASM module not loaded - game engine required');
        }
        
        // Initialize engine
        this.wasmEngine = new WasmGameEngine(
          this.game.canvas.width,
          this.game.canvas.height
        );
        
        // Create player
        if (this.game.player) {
          const id = this.wasmEngine.createPlayer(
            this.game.player.x,
            this.game.player.y
          );
          this.entityIdMap.set('player', id);
        }
        
        console.log('✅ WASM engine initialized');
        return true;
        
      } catch (error) {
        console.error('WASM init failed:', error);
        throw error; // Propagate error - WASM is required
      }
    }
    
    update(deltaTime) {
      if (!this.wasmEngine) {
        throw new Error('WASM engine not initialized');
      }
      
      const playerId = this.entityIdMap.get('player');
      if (!playerId) return;
      
      // Update player input
      let dx = 0, dy = 0;
      const keys = this.game.input.keys;
      
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
      
      this.wasmEngine.updatePlayerInput(dx, dy, deltaTime);
      
      // Handle combat actions
      if (keys['control']) {
        // Sword attack handled in JavaScript for now
        this.game.performSwordAttack?.();
      }
      
      if (keys['alt']) {
        if (!this.shieldActive) {
          this.wasmEngine.startBlock?.(playerId);
          this.shieldActive = true;
        }
      } else if (this.shieldActive) {
        this.wasmEngine.endBlock?.(playerId);
        this.shieldActive = false;
      }
      
      // Sync enemies
      for (const enemy of this.game.enemies) {
        let wasmId = this.entityIdMap.get(enemy);
        if (!wasmId) {
          wasmId = this.wasmEngine.createEnemy(enemy.x, enemy.y, 2);
          this.entityIdMap.set(enemy, wasmId);
        }
      }
      
      // Update physics
      this.wasmEngine.update(deltaTime);
      
      // Sync back
      const playerState = this.wasmEngine.getPlayerState(playerId);
      if (playerState && this.game.player) {
        this.game.player.x = playerState.get('x');
        this.game.player.y = playerState.get('y');
        this.game.player.health = playerState.get('health');
        this.game.player.energy = playerState.get('energy');
      }
    }
    
    cleanup() {
      if (this.wasmEngine) {
        this.wasmEngine.destroy();
      }
      this.entityIdMap.clear();
    }
  }
  
  window.CombatWasmAdapter = CombatWasmAdapter;
})(window);