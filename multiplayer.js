// Multiplayer Game Synchronization Module
class MultiplayerGame {
  constructor() {
    this.pc = null;
    this.dataChannel = null;
    this.role = null;
    this.isConnected = false;
    this.connectionId = null;
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
    this.SYNC_RATE = 60; // 60 Hz
    this.lastSyncTime = 0;
    
    this.init();
  }
  
  init() {
    // Check if we have connection info from p2p-connect
    this.role = sessionStorage.getItem('connectionRole');
    this.isConnected = sessionStorage.getItem('p2pConnected') === 'true';
    this.connectionId = sessionStorage.getItem('connectionId');
    
    if (this.isConnected && this.connectionId) {
      this.setupConnection();
    }
  }
  
  setupConnection() {
    // Try to receive connection via BroadcastChannel
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('game_connection');
      
      // Request the connection from connect.html if it's still open
      channel.postMessage({
        type: 'request_connection',
        connectionId: this.connectionId
      });
      
      channel.onmessage = (event) => {
        if (event.data.type === 'connection_handoff' && 
            event.data.connectionId === this.connectionId) {
          // We received the connection!
          this.pc = event.data.pc;
          this.dataChannel = event.data.dataChannel;
          this.role = event.data.role;
          
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
            };
            
            this.dataChannel.onclose = () => {
              console.log('Data channel closed');
              this.isConnected = false;
            };
          }
          
          // Initialize player positions
          this.initializePositions();
          
          // Start sync loops
          this.startSyncLoop();
          this.startPingLoop();
          
          // Close the broadcast channel
          channel.close();
        }
      };
      
      // Timeout fallback - if we don't get connection in 2 seconds
      setTimeout(() => {
        if (!this.dataChannel) {
          console.warn('Connection handoff timeout - falling back to message passing');
          // Set up message passing fallback
          this.setupMessagePassingFallback();
        }
        channel.close();
      }, 2000);
    } else {
      // Fallback for browsers without BroadcastChannel
      this.setupMessagePassingFallback();
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
    } else if (window.gameDataChannel) {
      // Fallback to global data channel if available
      window.gameDataChannel.send(JSON.stringify(message));
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
    }
  }
  
  // Start synchronization loop
  startSyncLoop() {
    setInterval(() => {
      const now = Date.now();
      
      // Send local player state to remote
      if (now - this.lastSyncTime > (1000 / this.SYNC_RATE)) {
        this.syncLocalState();
        this.lastSyncTime = now;
      }
    }, 1000 / this.SYNC_RATE);
  }
  
  // Start ping loop for latency measurement
  startPingLoop() {
    setInterval(() => {
      this.sendMessage({ 
        type: 'ping', 
        timestamp: Date.now() 
      });
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
    const player = data.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    // Apply position with interpolation
    const latencyCompensation = this.latency / 2;
    const timeDiff = Date.now() - data.timestamp + latencyCompensation;
    
    // Predict position based on velocity and time difference
    player.x = data.x + (data.vx * timeDiff / 1000);
    player.y = data.y + (data.vy * timeDiff / 1000);
    player.vx = data.vx;
    player.vy = data.vy;
    player.boosting = data.boosting;
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
    const attacker = data.role === 'host' ? 
      this.gameState.players.host : 
      this.gameState.players.player;
    
    const target = data.role === 'host' ? 
      this.gameState.players.player : 
      this.gameState.players.host;
    
    // Check if attack hits
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50 + target.radius) {
      // Hit detected
      target.health -= 10;
      
      if (data.role !== this.role) {
        // Remote player hit us
        this.onHit();
      }
      
      // Update scores
      if (target.health <= 0) {
        attacker.score++;
        this.onScoreChange();
        
        // Reset positions
        this.resetRound();
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
      // Try again after DOM is ready
      setTimeout(() => this.initializePositions(), 100);
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
    
    this.gameState.roundStart = Date.now();
    
    // Sync reset
    if (this.role === 'host') {
      this.sendMessage({
        type: 'gameState',
        data: this.gameState
      });
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
  
  // Callbacks (to be overridden)
  onAttack() {}
  onHit() {}
  onScoreChange() {}
  
  // Set WebRTC connection
  setConnection(pc, dataChannel) {
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
    }
  }
}

// Export for use in game
window.MultiplayerGame = MultiplayerGame;