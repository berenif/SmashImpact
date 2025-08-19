// Multiplayer functionality for SmashImpact
class MultiplayerManager {
  constructor(game) {
    this.game = game;
    this.ws = null;
    this.roomId = null;
    this.playerId = null;
    this.players = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    this.lastPingTime = 0;
    this.latency = 0;
  }

  connect(serverUrl = 'wss://smashimpact-server.herokuapp.com') {
    try {
      this.ws = new WebSocket(serverUrl);
      
      this.ws.onopen = () => {
        console.log('Connected to multiplayer server');
        this.reconnectAttempts = 0;
        this.startPingInterval();
        this.sendMessage('join', { 
          playerName: this.game.playerName || 'Player',
          roomId: this.roomId 
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from multiplayer server');
        this.stopPingInterval();
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to connect to multiplayer server:', error);
    }
  }

  handleMessage(data) {
    switch (data.type) {
      case 'joined':
        this.playerId = data.playerId;
        this.roomId = data.roomId;
        console.log(`Joined room ${this.roomId} as player ${this.playerId}`);
        break;
        
      case 'playerUpdate':
        this.updatePlayer(data.playerId, data.state);
        break;
        
      case 'playerLeft':
        this.removePlayer(data.playerId);
        break;
        
      case 'gameState':
        this.syncGameState(data.state);
        break;
        
      case 'pong':
        this.latency = Date.now() - this.lastPingTime;
        break;
        
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  sendMessage(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  updatePlayer(playerId, state) {
    if (playerId === this.playerId) return;
    
    if (!this.players.has(playerId)) {
      this.players.set(playerId, {
        x: state.x,
        y: state.y,
        vx: state.vx || 0,
        vy: state.vy || 0,
        radius: state.radius || 20,
        color: state.color || '#ff0000',
        score: state.score || 0
      });
    } else {
      const player = this.players.get(playerId);
      Object.assign(player, state);
    }
  }

  removePlayer(playerId) {
    this.players.delete(playerId);
    console.log(`Player ${playerId} left the game`);
  }

  syncGameState(state) {
    // Sync obstacles, power-ups, etc.
    if (state.obstacles) {
      this.game.obstacles = state.obstacles;
    }
    if (state.powerUps) {
      this.game.powerUps = state.powerUps;
    }
  }

  broadcastPlayerState() {
    if (!this.game.player) return;
    
    this.sendMessage('playerUpdate', {
      state: {
        x: this.game.player.x,
        y: this.game.player.y,
        vx: this.game.player.vx,
        vy: this.game.player.vy,
        radius: this.game.player.radius,
        color: this.game.player.color,
        score: this.game.score
      }
    });
  }

  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.lastPingTime = Date.now();
      this.sendMessage('ping', {});
    }, 5000);
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  disconnect() {
    if (this.ws) {
      this.stopPingInterval();
      this.ws.close();
      this.ws = null;
    }
    this.players.clear();
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  getLatency() {
    return this.latency;
  }

  getRoomId() {
    return this.roomId;
  }

  getPlayerId() {
    return this.playerId;
  }

  getPlayers() {
    return Array.from(this.players.values());
  }
}

// Export for use in game
if (typeof window !== 'undefined') {
  window.MultiplayerManager = MultiplayerManager;
}