// Multiplayer Game Synchronization Module
(function() {
  // Prevent redeclaration if already defined
  if (typeof window.MultiplayerGame !== 'undefined') {
    console.warn('MultiplayerGame already defined, skipping redeclaration');
    return;
  }
  
  class MultiplayerGame {
  constructor() {
    this.pc = null;
    this.dataChannel = null;
    this.role = null;
    this.isConnected = false;
    this.connectionId = null;
    this.syncInterval = null;
    this.pingInterval = null;
    this.connectionCheckInterval = null;
    this.sequenceNumber = 0;
    this.lastReceivedSeq = {};
    this.stateBuffer = [];
    this.maxBufferSize = 3;
    this.gameState = {
      players: {
        host: {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          score: 0,
          health: 100,
          radius: 20,
          color: '#6366f1',
          boosting: false,
          attacking: false
        },
        player: {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          score: 0,
          health: 100,
          radius: 20,
          color: '#ef4444',
          boosting: false,
          attacking: false
        }
      },
      gameTime: 0,
      roundStart: null,
      gameActive: false
    };
    
    // Local input state
    this.localInput = {
      x: 0,
      y: 0,
      boost: false,
      attack: false
    };
    
    // Attack cooldown tracking (SECURITY FIX)
    this.lastAttackTime = 0;
    this.ATTACK_COOLDOWN = 500; // 500ms between attacks
    
    // Network stats
    this.latency = 0;
    this.lastPingTime = 0;
    
    // Sync settings
    this.SYNC_RATE = 60; // Base sync rate, will adjust based on connection quality
    this.lastSyncTime = 0;
    this.adaptiveSyncRate = 60; // Actual sync rate that adapts to network conditions
    
    this.init();
  }
  
  init() {
    // Check if we have connection info from p2p-connect
    this.role = sessionStorage.getItem('connectionRole');
    this.isConnected = sessionStorage.getItem('p2pConnected') === 'true';
    this.connectionId = sessionStorage.getItem('connectionId');
    
    console.log('MultiplayerGame init:', {
      role: this.role,
      isConnected: this.isConnected,
      connectionId: this.connectionId
    });
    
    if (this.isConnected) {
      this.setupConnection();
    }
  }
  
  setupConnection() {
    console.log('Setting up connection, checking for window.gamePC and window.gameDataChannel');
    console.log('window.gamePC:', window.gamePC);
    console.log('window.gameDataChannel:', window.gameDataChannel);
    console.log('window.gameRole:', window.gameRole);
    
    // Clean up any existing intervals first
    this.cleanup();
    
    // Try to get connection from window globals (preserved from connect.html)
    if (window.gamePC && window.gameDataChannel) {
      console.log('Found game connection in window');
      this.pc = window.gamePC;
      this.dataChannel = window.gameDataChannel;
      this.role = window.gameRole || this.role;
      
      // Set up data channel handlers
      if (this.dataChannel) {
        console.log('Data channel state:', this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState);
        
        this.dataChannel.onmessage = (msgEvent) => {
          try {
            const message = JSON.parse(msgEvent.data);
            console.log('Received message:', message.type);
            this.handleMessage(message);
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
        
        this.dataChannel.onerror = (error) => {
          console.error('Data channel error:', error);
          this.isConnected = false;
          this.cleanup();
        };
        
        this.dataChannel.onclose = () => {
          console.log('Data channel closed');
          this.isConnected = false;
          this.cleanup();
        };
        
        this.isConnected = this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState === 'open';
        console.log('Connection established, isConnected:', this.isConnected);
      }
      
      // Initialize player positions
      this.initializePositions();
      
      // Start sync loops only if connection is open
      if (this.isConnected) {
        this.startSyncLoop();
        this.startPingLoop();
        
        // Host sends initial state to player
        if (this.role === 'host') {
          setTimeout(() => {
            this.sendFullStateSync();
          }, 100);
        }
      } else {
        // Wait for connection to be ready
        this.connectionCheckInterval = setInterval(() => {
          if (this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState === 'open') {
            this.isConnected = true;
            this.startSyncLoop();
            this.startPingLoop();
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
            console.log('Connection ready, started sync loops');
            
            // Host sends initial state to player
            if (this.role === 'host') {
              setTimeout(() => {
                this.sendFullStateSync();
              }, 100);
            }
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
            this.connectionCheckInterval = null;
            console.warn('Connection check timed out');
          }
        }, 5000);
      }
    } else {
      console.warn('No game connection found in window');
      // Try opener window if we were opened in a new window/tab
      if (window.opener && window.opener.gamePC && window.opener.gameDataChannel) {
        console.log('Found game connection in opener window');
        this.pc = window.opener.gamePC;
        this.dataChannel = window.opener.gameDataChannel;
        this.role = window.opener.gameRole || this.role;
        
        // Set up data channel handlers
        if (this.dataChannel) {
          this.dataChannel.onmessage = (msgEvent) => {
            try {
              const message = JSON.parse(msgEvent.data);
              this.handleMessage(message);
            } catch (e) {
              console.error('Failed to parse message:', e);
            }
          };
          
          this.dataChannel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.isConnected = false;
            this.cleanup();
          };
          
          this.dataChannel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            this.cleanup();
          };
          
          this.isConnected = this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState === 'open';
        }
        
        // Initialize player positions
        this.initializePositions();
        
        // Start sync loops if connected
        if (this.isConnected) {
          this.startSyncLoop();
          this.startPingLoop();
          
          // Host sends initial state
          if (this.role === 'host') {
            setTimeout(() => {
              this.sendFullStateSync();
            }, 100);
          }
        }
      } else {
        console.error('No WebRTC connection found - multiplayer mode requires WebRTC');
        throw new Error('WebRTC connection required for multiplayer mode');
      }
    }
  }
  
  // Removed: setupMessagePassingFallback - WebRTC is required
  
  // Send message through data channel
  sendMessage(message) {
    if (this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message, data channel not open. State:', 
        this.dataChannel ? this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState : 'no channel');
    }
  }
  
  // Handle incoming messages
  handleMessage(message) {
    switch (message.type) {
      case 'gameState':
        this.handleGameStateUpdate(message.data);
        break;
        
      case 'playerInput':
        this.handlePlayerInput(message.data);
        break;
        
      case 'playerPosition':
        this.handlePositionUpdate(message.data);
        break;
        
      case 'attack':
        this.handleAttack(message.data);
        break;
        
      case 'score':
        this.handleScoreUpdate(message.data);
        break;
        
      case 'ping':
        this.sendMessage({ type: 'pong', timestamp: message.timestamp });
        break;
        
      case 'pong':
        this.latency = Date.now() - message.timestamp;
        this.adjustSyncRate();
        break;
        
      case 'hitConfirmed':
        // Host has confirmed a hit (SECURITY FIX)
        this.handleHitConfirmed(message.data);
        break;
        
      case 'fullStateSync':
        this.handleFullStateSync(message.data);
        break;
    }
  }
  
  // Start synchronization loop
  startSyncLoop() {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    // Track last full sync time
    this.lastFullSyncTime = 0;
    const FULL_SYNC_INTERVAL = 1000; // Full sync every second
    
    this.syncInterval = setInterval(() => {
      if (!this.dataChannel || this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState !== 'open') {
        return; // Skip if connection not ready
      }
      
      const now = Date.now();
      
      // Send local player state to remote
      this.syncLocalState();
      this.lastSyncTime = now;
      
      // Host sends full state sync periodically to prevent drift
      if (this.role === 'host' && now - this.lastFullSyncTime > FULL_SYNC_INTERVAL) {
        this.sendFullStateSync();
        this.lastFullSyncTime = now;
      }
    }, 1000 / this.adaptiveSyncRate);
  }
  
  // Adjust sync rate based on network conditions
  adjustSyncRate() {
    // Adjust sync rate based on latency
    if (this.latency < 30) {
      // Excellent connection - use high sync rate
      this.adaptiveSyncRate = 60;
    } else if (this.latency < 60) {
      // Good connection - slightly reduce sync rate
      this.adaptiveSyncRate = 45;
    } else if (this.latency < 100) {
      // Fair connection - moderate sync rate
      this.adaptiveSyncRate = 30;
    } else {
      // Poor connection - lower sync rate to reduce congestion
      this.adaptiveSyncRate = 20;
    }
    
    // Restart sync loop with new rate if it changed significantly
    const rateDiff = Math.abs(this.adaptiveSyncRate - this.SYNC_RATE);
    if (rateDiff > 10) {
      this.SYNC_RATE = this.adaptiveSyncRate;
      this.startSyncLoop(); // Restart with new rate
    }
  }
  
  // Start ping loop for latency measurement
  startPingLoop() {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel && this.dataChannel.readyState === 'open') {
        this.sendMessage({ 
          type: 'ping', 
          timestamp: Date.now() 
        });
      }
    }, 1000);
  }
  
  // Sync local player state to remote
  syncLocalState() {
    const myPlayer = this.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    // Increment sequence number for ordering
    this.sequenceNumber++;
    
    // Send position and velocity
    this.sendMessage({
      type: 'playerPosition',
      data: {
        role: this.role,
        seq: this.sequenceNumber,
        x: myPlayer.x,
        y: myPlayer.y,
        vx: myPlayer.vx,
        vy: myPlayer.vy,
        boosting: myPlayer.boosting,
        attacking: myPlayer.attacking,
        health: myPlayer.health,
        score: myPlayer.score,
        timestamp: Date.now()
      }
    });
    
    // Send input state less frequently for prediction
    if (this.sequenceNumber % 2 === 0) {  // Send every other frame
      this.sendMessage({
        type: 'playerInput',
        data: {
          role: this.role,
          input: this.localInput,
          timestamp: Date.now()
        }
      });
    }
  }
  
  // Handle position update from remote player
  handlePositionUpdate(data) {
    // Don't update our own player from remote
    if (data.role === this.role) return;
    
    // Check sequence number to avoid out-of-order updates
    if (data.seq && this.lastReceivedSeq[data.role]) {
      if (data.seq <= this.lastReceivedSeq[data.role]) {
        return; // Ignore old update
      }
    }
    this.lastReceivedSeq[data.role] = data.seq || 0;
    
    const player = data.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    // Store previous position for smoothing
    const prevX = player.x;
    const prevY = player.y;
    
    // Apply position with interpolation
    const latencyCompensation = Math.min(this.latency / 2, 50); // Cap compensation at 50ms
    const timeDiff = Math.max(0, Date.now() - data.timestamp + latencyCompensation);
    
    // Predict position based on velocity and time difference
    const dt = timeDiff / 1000; // Convert to seconds
    const predictedX = data.x + (data.vx * dt);
    const predictedY = data.y + (data.vy * dt);
    
    // Smooth large position jumps with interpolation
    const distance = Math.sqrt(Math.pow(predictedX - prevX, 2) + Math.pow(predictedY - prevY, 2));
    const maxJump = 100; // Increased threshold for smoother movement
    
    if (distance > maxJump && prevX !== 0 && prevY !== 0) {
      // Smooth large jumps with better interpolation
      const smoothFactor = Math.min(0.5, 30 / distance); // Dynamic smoothing based on distance
      player.x = prevX + (predictedX - prevX) * smoothFactor;
      player.y = prevY + (predictedY - prevY) * smoothFactor;
      
      // Also smooth velocity for large jumps
      player.vx = player.vx * 0.7 + data.vx * 0.3;
      player.vy = player.vy * 0.7 + data.vy * 0.3;
    } else {
      // Apply position directly for small movements
      player.x = predictedX;
      player.y = predictedY;
      
      // Smooth velocity changes
      player.vx = player.vx * 0.3 + data.vx * 0.7;
      player.vy = player.vy * 0.3 + data.vy * 0.7;
    }
    player.boosting = data.boosting;
    player.attacking = data.attacking || false;
    player.health = data.health !== undefined ? data.health : player.health;
    player.score = data.score !== undefined ? data.score : player.score;
  }
  
  // Handle input from remote player (for prediction)
  handlePlayerInput(data) {
    if (data.role !== this.role) {
      const player = data.role === 'host' ? 
        this.gameState.players.host : 
        this.gameState.players.player;
      
      // Apply input to remote player for smooth prediction
      // Normalize diagonal movement
      let dx = data.input.x;
      let dy = data.input.y;
      if (dx !== 0 && dy !== 0) {
        const mag = Math.sqrt(dx * dx + dy * dy);
        dx /= mag;
        dy /= mag;
      }
      const speed = data.input.boost ? 10 : 5;
      player.vx = dx * speed;
      player.vy = dy * speed;
    }
  }
  
  // Handle attack - HOST AUTHORITATIVE (SECURITY FIX)
  handleAttack(data) {
    // HOST-AUTHORITATIVE: Only host validates and applies hits
    if (this.role === 'host') {
      // Host validates the attack
      const attacker = data.role === 'host' ? 
        this.gameState.players.host : 
        this.gameState.players.player;
      
      const target = data.role === 'host' ? 
        this.gameState.players.player : 
        this.gameState.players.host;
      
      // Validate attack position (prevent teleport attacks)
      const posDiff = Math.sqrt(
        Math.pow(attacker.x - data.x, 2) + 
        Math.pow(attacker.y - data.y, 2)
      );
      
      // Reject if attacker position doesn't match (with some tolerance for lag)
      if (posDiff > 100) {
        console.warn('Attack position mismatch, rejecting');
        return;
      }
      
      // Use the attacker's position from the attack data
      const attackerX = data.x || attacker.x;
      const attackerY = data.y || attacker.y;
      
      // Check if attack hits
      const dx = target.x - attackerX;
      const dy = target.y - attackerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const attackRange = 50 + target.radius;
      
      if (distance < attackRange) {
        // Hit detected by host
        target.health = Math.max(0, target.health - 10);
        
        // Notify both players of the hit
        this.sendMessage({
          type: 'hitConfirmed',
          data: {
            attacker: data.role,
            target: data.role === 'host' ? 'player' : 'host',
            damage: 10,
            health: target.health
          }
        });
        
        // Apply feedback if we were hit
        if (data.role !== this.role) {
          this.onHit();
        }
        
        // Update scores and check for round end
        if (target.health <= 0) {
          attacker.score++;
          this.onScoreChange();
          
          // Reset round after a short delay
          setTimeout(() => {
            this.resetRound();
          }, 500);
        }
      }
    }
    // Players just send attack requests to host, no local validation
  }
  
  // Handle confirmed hit from host (SECURITY FIX)
  handleHitConfirmed(data) {
    // Apply the damage as confirmed by host
    const target = data.target === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    target.health = data.health;
    
    // Trigger hit feedback if we were hit
    if (data.target === this.role) {
      this.onHit();
    }
    
    // Check for round end
    if (target.health <= 0) {
      const attacker = data.attacker === 'host' ? 
        this.gameState.players.host : 
        this.gameState.players.player;
      attacker.score++;
      this.onScoreChange();
      
      if (this.role === 'host') {
        setTimeout(() => {
          this.resetRound();
        }, 500);
      }
    }
  }
  
  // Handle score update
  handleScoreUpdate(data) {
    this.gameState.players.host.score = data.hostScore;
    this.gameState.players.player.score = data.playerScore;
    this.onScoreChange();
  }
  
  // Update local player input
  updateLocalInput(x, y, boost, attack) {
    this.localInput.x = x;
    this.localInput.y = y;
    this.localInput.boost = boost;
    
    if (attack && !this.localInput.attack) {
      // New attack
      this.performAttack();
    }
    
    this.localInput.attack = attack;
    
    // Apply to local player immediately
    const myPlayer = this.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    const speed = boost ? 8 : 4; // Adjusted for better control parity
    const targetVx = x * speed;
    const targetVy = y * speed;
    
    // Smooth velocity changes for better feel
    const smoothing = 0.2; // Balanced for both desktop and mobile
    myPlayer.vx = myPlayer.vx * (1 - smoothing) + targetVx * smoothing;
    myPlayer.vy = myPlayer.vy * (1 - smoothing) + targetVy * smoothing;
    myPlayer.boosting = boost;
  }
  
  // Perform attack with rate limiting (SECURITY FIX)
  performAttack() {
    // Check attack cooldown
    const now = Date.now();
    if (now - this.lastAttackTime < this.ATTACK_COOLDOWN) {
      return; // Still on cooldown
    }
    
    this.lastAttackTime = now;
    
    const myPlayer = this.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    // Set attacking state
    myPlayer.attacking = true;
    
    // Send attack message
    this.sendMessage({
      type: 'attack',
      data: {
        role: this.role,
        x: myPlayer.x,
        y: myPlayer.y,
        timestamp: now
      }
    });
    
    // Visual feedback
    this.onAttack();
    
    // If we're the host, process our own attack immediately (HOST-AUTHORITATIVE)
    if (this.role === 'host') {
      this.handleAttack({
        role: 'host',
        x: myPlayer.x,
        y: myPlayer.y,
        timestamp: now
      });
    }
    
    // Reset attacking state after animation
    setTimeout(() => {
      myPlayer.attacking = false;
    }, 200);
  }
  
  // Update local player position
  updateLocalPosition(deltaTime) {
    const myPlayer = this.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    // Update position based on velocity
    myPlayer.x += myPlayer.vx * (deltaTime / 1000);
    myPlayer.y += myPlayer.vy * (deltaTime / 1000);
    
    // Keep in bounds (assuming canvas size)
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      myPlayer.x = Math.max(myPlayer.radius, 
        Math.min(canvas.width - myPlayer.radius, myPlayer.x));
      myPlayer.y = Math.max(myPlayer.radius, 
        Math.min(canvas.height - myPlayer.radius, myPlayer.y));
    }
  }
  
  // Initialize player positions
  initializePositions() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
      // Try again after DOM is ready, but limit retries
      if (!this.initRetries) this.initRetries = 0;
      this.initRetries++;
      
      if (this.initRetries < 10) {
        setTimeout(() => this.initializePositions(), 100);
      } else {
        console.error('Failed to initialize positions: canvas not found after 10 retries');
      }
      return;
    }
    
    const width = canvas.width || 800;
    const height = canvas.height || 600;
    
    // Set initial positions
    this.gameState.players.host.x = width / 3;
    this.gameState.players.host.y = height / 2;
    this.gameState.players.player.x = (width * 2) / 3;
    this.gameState.players.player.y = height / 2;
    
    // Reset velocities
    this.gameState.players.host.vx = 0;
    this.gameState.players.host.vy = 0;
    this.gameState.players.player.vx = 0;
    this.gameState.players.player.vy = 0;
    
    // Reset health
    this.gameState.players.host.health = 100;
    this.gameState.players.player.health = 100;
  }
  
  // Reset round
  resetRound() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    
    const width = canvas.width || 800;
    const height = canvas.height || 600;
    
    // Reset positions
    this.gameState.players.host.x = width / 3;
    this.gameState.players.host.y = height / 2;
    this.gameState.players.player.x = (width * 2) / 3;
    this.gameState.players.player.y = height / 2;
    
    // Reset velocities
    this.gameState.players.host.vx = 0;
    this.gameState.players.host.vy = 0;
    this.gameState.players.player.vx = 0;
    this.gameState.players.player.vy = 0;
    
    // Reset health
    this.gameState.players.host.health = 100;
    this.gameState.players.player.health = 100;
    
    // Reset attacking state
    this.gameState.players.host.attacking = false;
    this.gameState.players.player.attacking = false;
    
    this.gameState.roundStart = Date.now();
    
    // Sync reset - host sends full state
    if (this.role === 'host') {
      this.sendFullStateSync();
    }
  }
  
  // Get current game state
  getGameState() {
    return this.gameState;
  }
  
  // Get latency
  getLatency() {
    return this.latency;
  }
  
  // Get connection quality
  getConnectionQuality() {
    if (!this.isConnected) return 'disconnected';
    if (this.latency < 30) return 'excellent';
    if (this.latency < 60) return 'good';
    if (this.latency < 100) return 'fair';
    return 'poor';
  }
  
  // Send full state sync (host only)
  sendFullStateSync() {
    if (this.role === 'host') {
      this.sendMessage({
        type: 'fullStateSync',
        data: {
          players: this.gameState.players,
          gameTime: this.gameState.gameTime,
          roundStart: this.gameState.roundStart,
          gameActive: this.gameState.gameActive,
          timestamp: Date.now()
        }
      });
    }
  }
  
  // Handle full state sync from host
  handleFullStateSync(data) {
    // Only non-host players should process this
    if (this.role !== 'host') {
      // Store old state for comparison
      const myOldPlayer = { ...this.gameState.players.player };
      const remoteOldPlayer = { ...this.gameState.players.host };
      
      // Update game state
      this.gameState.gameTime = data.gameTime;
      this.gameState.roundStart = data.roundStart;
      this.gameState.gameActive = data.gameActive;
      
      // Update remote player (host) completely
      this.gameState.players.host = data.players.host;
      
      // For local player, reconcile state carefully
      const newPlayer = data.players.player;
      const positionDiff = Math.sqrt(
        Math.pow(newPlayer.x - myOldPlayer.x, 2) + 
        Math.pow(newPlayer.y - myOldPlayer.y, 2)
      );
      
      // Always update critical game state
      this.gameState.players.player.health = newPlayer.health;
      this.gameState.players.player.score = newPlayer.score;
      this.gameState.players.player.radius = newPlayer.radius;
      this.gameState.players.player.color = newPlayer.color;
      
      // If position difference is huge (> 300 pixels), it's likely a reset or teleport
      if (positionDiff > 300 || !this.gameState.gameActive) {
        // Accept the full state including position
        this.gameState.players.player.x = newPlayer.x;
        this.gameState.players.player.y = newPlayer.y;
        this.gameState.players.player.vx = newPlayer.vx;
        this.gameState.players.player.vy = newPlayer.vy;
      } else if (positionDiff > 50) {
        // Moderate difference - blend positions
        const blendFactor = 0.2; // Gradual correction
        this.gameState.players.player.x = myOldPlayer.x * (1 - blendFactor) + newPlayer.x * blendFactor;
        this.gameState.players.player.y = myOldPlayer.y * (1 - blendFactor) + newPlayer.y * blendFactor;
      }
      // For small differences, keep local position for smooth movement
    }
  }
  
  // Handle game state update with validation (SECURITY FIX)
  handleGameStateUpdate(data) {
    // Only process if we're the player (host is authoritative)
    if (this.role !== 'player') return;
    
    // Validate the game state for security
    if (!this.validateGameState(data)) {
      console.warn('Invalid game state received, ignoring');
      return;
    }
    
    // For backward compatibility
    this.handleFullStateSync(data);
  }
  
  // Validate game state for security (SECURITY FIX)
  validateGameState(state) {
    if (!state || typeof state !== 'object') return false;
    if (!state.players || !state.players.host || !state.players.player) return false;
    
    // Validate player data
    for (const player of [state.players.host, state.players.player]) {
      // Check required fields exist and are numbers
      if (typeof player.x !== 'number' || typeof player.y !== 'number') return false;
      if (typeof player.health !== 'number' || typeof player.score !== 'number') return false;
      
      // Validate ranges
      // Health can be up to 150 for anchor players
      if (player.health < 0 || player.health > 200) return false;
      if (player.score < 0 || player.score > 999999) return false;
      
      // Validate position bounds (assuming max canvas size)
      if (player.x < 0 || player.x > 2000 || player.y < 0 || player.y > 2000) return false;
      
      // Validate velocity bounds (prevent teleportation)
      // Max speed is 350 for runner, add some buffer for physics
      if (Math.abs(player.vx) > 500 || Math.abs(player.vy) > 500) return false;
    }
    
    return true;
  }
  
  // Callbacks (to be overridden)
  onAttack() {}
  onHit() {}
  onScoreChange() {}
  
  // Clean up intervals and connections
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }
  
  // Set WebRTC connection
  setConnection(pc, dataChannel) {
    // Clean up any existing connection
    this.cleanup();
    
    this.pc = pc;
    this.dataChannel = dataChannel;
    
    if (this.dataChannel) {
      this.dataChannel.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };
      
      this.dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        this.isConnected = false;
        this.cleanup();
      };
      
      this.dataChannel.onclose = () => {
        console.log('Data channel closed');
        this.isConnected = false;
        this.cleanup();
      };
    }
  }
}

  // Export for use in game
  window.MultiplayerGame = MultiplayerGame;
})();