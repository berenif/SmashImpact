// Multiplayer Game Synchronization Module
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
    
    // Network stats
    this.latency = 0;
    this.lastPingTime = 0;
    
    // Sync settings
    this.SYNC_RATE = 30; // 30 Hz - reduced for better performance
    this.lastSyncTime = 0;
    
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
        console.log('Data channel state:', this.dataChannel.readyState);
        
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
        
        this.isConnected = this.dataChannel.readyState === 'open';
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
          if (this.dataChannel && this.dataChannel.readyState === 'open') {
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
      console.warn('No game connection found in window, trying fallback');
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
          
          this.isConnected = this.dataChannel.readyState === 'open';
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
        console.error('No WebRTC connection found - game may not work in multiplayer mode');
        this.setupMessagePassingFallback();
      }
    }
  }
  
  setupMessagePassingFallback() {
    // Listen for messages from the game's WebRTC connection via postMessage
    window.addEventListener('message', (event) => {
      if (event.data.type === 'webrtc-message') {
        this.handleMessage(event.data.message);
      }
    });
    
    // Start sync loops anyway
    this.startSyncLoop();
    this.startPingLoop();
  }
  
  // Send message through data channel
  sendMessage(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message));
    } else {
      console.warn('Cannot send message, data channel not open. State:', 
        this.dataChannel ? this.dataChannel.readyState : 'no channel');
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
      if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
        return; // Skip if connection not ready
      }
      
      const now = Date.now();
      
      // Send local player state to remote
      if (now - this.lastSyncTime > (1000 / this.SYNC_RATE)) {
        this.syncLocalState();
        this.lastSyncTime = now;
      }
      
      // Host sends full state sync periodically to prevent drift
      if (this.role === 'host' && now - this.lastFullSyncTime > FULL_SYNC_INTERVAL) {
        this.sendFullStateSync();
        this.lastFullSyncTime = now;
      }
    }, 1000 / this.SYNC_RATE);
  }
  
  // Start ping loop for latency measurement
  startPingLoop() {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      if (this.dataChannel && this.dataChannel.readyState === 'open') {
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
    
    // Send position and velocity
    this.sendMessage({
      type: 'playerPosition',
      data: {
        role: this.role,
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
    
    // Send input state for prediction
    this.sendMessage({
      type: 'playerInput',
      data: {
        role: this.role,
        input: this.localInput,
        timestamp: Date.now()
      }
    });
  }
  
  // Handle position update from remote player
  handlePositionUpdate(data) {
    // Don't update our own player from remote
    if (data.role === this.role) return;
    
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
    const predictedX = data.x + (data.vx * timeDiff / 1000);
    const predictedY = data.y + (data.vy * timeDiff / 1000);
    
    // Smooth large position jumps with interpolation
    const distance = Math.sqrt(Math.pow(predictedX - prevX, 2) + Math.pow(predictedY - prevY, 2));
    const maxJump = 50; // Maximum allowed instant jump
    
    if (distance > maxJump && prevX !== 0 && prevY !== 0) {
      // Smooth large jumps
      const smoothFactor = 0.3;
      player.x = prevX + (predictedX - prevX) * smoothFactor;
      player.y = prevY + (predictedY - prevY) * smoothFactor;
    } else {
      // Apply position directly for small movements
      player.x = predictedX;
      player.y = predictedY;
    }
    
    player.vx = data.vx;
    player.vy = data.vy;
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
      const speed = data.input.boost ? 10 : 5;
      player.vx = data.input.x * speed;
      player.vy = data.input.y * speed;
    }
  }
  
  // Handle attack from remote player
  handleAttack(data) {
    // Don't process our own attacks
    if (data.role === this.role) return;
    
    const attacker = data.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    const target = data.role === 'host' ? 
      this.gameState.players.player : 
      this.gameState.players.host;
    
    // Use the attacker's position from the attack data (compensated for latency)
    const attackerX = data.x || attacker.x;
    const attackerY = data.y || attacker.y;
    
    // Check if attack hits
    const dx = target.x - attackerX;
    const dy = target.y - attackerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const attackRange = 50 + target.radius;
    
    if (distance < attackRange) {
      // Hit detected
      target.health = Math.max(0, target.health - 10);
      
      // Visual/haptic feedback for being hit
      this.onHit();
      
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
    
    const speed = boost ? 10 : 5;
    myPlayer.vx = x * speed;
    myPlayer.vy = y * speed;
    myPlayer.boosting = boost;
  }
  
  // Perform attack
  performAttack() {
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
        timestamp: Date.now()
      }
    });
    
    // Visual feedback
    this.onAttack();
    
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
      
      // For local player, only update non-position properties to avoid jumps
      // unless the difference is too large (indicating a reset or teleport)
      const newPlayer = data.players.player;
      const positionDiff = Math.sqrt(
        Math.pow(newPlayer.x - myOldPlayer.x, 2) + 
        Math.pow(newPlayer.y - myOldPlayer.y, 2)
      );
      
      // If position difference is huge (> 200 pixels), it's likely a reset
      if (positionDiff > 200) {
        // Accept the full state including position
        this.gameState.players.player = newPlayer;
      } else {
        // Keep local position but update other properties
        this.gameState.players.player.health = newPlayer.health;
        this.gameState.players.player.score = newPlayer.score;
        this.gameState.players.player.radius = newPlayer.radius;
        this.gameState.players.player.color = newPlayer.color;
        // Don't override local position/velocity for smooth movement
      }
    }
  }
  
  // Handle game state update (deprecated, use fullStateSync)
  handleGameStateUpdate(data) {
    // For backward compatibility
    this.handleFullStateSync(data);
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