/**
 * Renderer Module
 * Handles all game rendering operations
 */

export class Renderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.initialized = false;
        this.config = {
            gridSize: 50,
            gridColor: 'rgba(100, 100, 200, 0.1)',
            backgroundColor: '#0a0a0a',
            minimapSize: 150,
            minimapAlpha: 0.7
        };
    }
    
    /**
     * Initialize the renderer
     * @param {HTMLCanvasElement} canvas - The game canvas
     */
    initialize(canvas) {
        if (this.initialized) return;
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Set canvas properties
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        this.initialized = true;
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw background grid
     */
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.config.gridColor;
        ctx.lineWidth = 1;
        
        const gridSize = this.config.gridSize;
        
        // Vertical lines
        for (let x = 0; x <= this.canvas.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.canvas.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
    }
    
    /**
     * Render an entity
     * @param {Object} entity - Entity to render
     */
    renderEntity(entity) {
        const ctx = this.ctx;
        ctx.save();
        
        // Position
        ctx.translate(entity.x, entity.y);
        
        // Rotation if available
        if (entity.rotation !== undefined) {
            ctx.rotate(entity.rotation);
        }
        
        // Render based on entity type
        switch (entity.type) {
            case 'player':
                this.renderPlayer(entity);
                break;
            case 'enemy':
                this.renderEnemy(entity);
                break;
            case 'wolf':
                this.renderWolf(entity);
                break;
            case 'projectile':
                this.renderProjectile(entity);
                break;
            case 'obstacle':
                this.renderObstacle(entity);
                break;
            case 'powerup':
                this.renderPowerUp(entity);
                break;
            case 'particle':
                this.renderParticle(entity);
                break;
            default:
                this.renderGenericEntity(entity);
        }
        
        // Draw health bar if entity has health
        if (entity.health !== undefined && entity.maxHealth !== undefined && entity.type !== 'player') {
            this.renderHealthBar(entity);
        }
        
        ctx.restore();
    }
    
    /**
     * Render player entity
     * @param {Object} player
     */
    renderPlayer(player) {
        const ctx = this.ctx;
        
        // Body
        ctx.fillStyle = '#4CAF50';
        ctx.strokeStyle = '#81C784';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, player.radius || 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Direction indicator
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.stroke();
        
        // Shield if blocking
        if (player.isBlocking) {
            ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, (player.radius || 20) + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    /**
     * Render enemy entity
     * @param {Object} enemy
     */
    renderEnemy(enemy) {
        const ctx = this.ctx;
        
        // Body
        ctx.fillStyle = '#f44336';
        ctx.strokeStyle = '#ef5350';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius || 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-5, -3, 3, 0, Math.PI * 2);
        ctx.arc(5, -3, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render wolf entity
     * @param {Object} wolf
     */
    renderWolf(wolf) {
        const ctx = this.ctx;
        const isAlpha = wolf.isAlpha || wolf.health > 150;
        
        // Body
        ctx.fillStyle = isAlpha ? '#9C27B0' : '#673AB7';
        ctx.strokeStyle = isAlpha ? '#BA68C8' : '#9575CD';
        ctx.lineWidth = 2;
        
        // Wolf shape (triangle-ish)
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-10, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Eyes
        ctx.fillStyle = isAlpha ? '#ffeb3b' : '#fff';
        ctx.beginPath();
        ctx.arc(0, -3, 2, 0, Math.PI * 2);
        ctx.arc(0, 3, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render projectile
     * @param {Object} projectile
     */
    renderProjectile(projectile) {
        const ctx = this.ctx;
        
        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, projectile.radius || 5);
        gradient.addColorStop(0, 'rgba(255, 255, 100, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 200, 50, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 150, 0, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, (projectile.radius || 5) * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, projectile.radius || 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Render obstacle
     * @param {Object} obstacle
     */
    renderObstacle(obstacle) {
        const ctx = this.ctx;
        const isDestructible = obstacle.health !== undefined && obstacle.health < 999999;
        
        // Body
        ctx.fillStyle = isDestructible ? '#8D6E63' : '#616161';
        ctx.strokeStyle = isDestructible ? '#A1887F' : '#757575';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(0, 0, obstacle.radius || 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Cracks if damaged
        if (isDestructible && obstacle.health < obstacle.maxHealth * 0.5) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-10, -10);
            ctx.lineTo(10, 10);
            ctx.moveTo(-10, 10);
            ctx.lineTo(10, -10);
            ctx.stroke();
        }
    }
    
    /**
     * Render power-up
     * @param {Object} powerUp
     */
    renderPowerUp(powerUp) {
        const ctx = this.ctx;
        const time = Date.now() / 1000;
        const pulse = Math.sin(time * 3) * 0.2 + 1;
        
        // Determine color based on type
        const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
        const color = colors[powerUp.subType || 0] || colors[0];
        
        // Glow effect
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * pulse);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = color;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        
        // Star shape
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * 10;
            const y = Math.sin(angle) * 10;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    
    /**
     * Render particle effect
     * @param {Object} particle
     */
    renderParticle(particle) {
        const ctx = this.ctx;
        
        ctx.globalAlpha = particle.alpha || 1;
        ctx.fillStyle = particle.color || '#fff';
        
        ctx.beginPath();
        ctx.arc(0, 0, particle.radius || 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = 1;
    }
    
    /**
     * Render generic entity
     * @param {Object} entity
     */
    renderGenericEntity(entity) {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#999';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.arc(0, 0, entity.radius || 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    /**
     * Render health bar above entity
     * @param {Object} entity
     */
    renderHealthBar(entity) {
        const ctx = this.ctx;
        const barWidth = 40;
        const barHeight = 4;
        const yOffset = -(entity.radius || 15) - 15;
        
        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-barWidth / 2, yOffset, barWidth, barHeight);
        
        // Health
        const healthPercent = Math.max(0, Math.min(1, entity.health / entity.maxHealth));
        const healthColor = healthPercent > 0.5 ? '#4CAF50' : 
                          healthPercent > 0.25 ? '#FF9800' : '#f44336';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, yOffset, barWidth * healthPercent, barHeight);
        
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, yOffset, barWidth, barHeight);
    }
    
    /**
     * Render minimap
     * @param {Array} entities - Array of entities to show on minimap
     * @param {Object} player - Player entity for centering
     */
    renderMinimap(entities, player) {
        const ctx = this.ctx;
        const size = this.config.minimapSize;
        const x = this.canvas.width - size - 20;
        const y = 20;
        const scale = 0.1;
        
        ctx.save();
        
        // Minimap background
        ctx.globalAlpha = this.config.minimapAlpha;
        ctx.fillStyle = '#000';
        ctx.fillRect(x, y, size, size);
        
        // Border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);
        
        // Center on player or center of canvas
        const centerX = player ? player.x : this.canvas.width / 2;
        const centerY = player ? player.y : this.canvas.height / 2;
        
        // Render entities on minimap
        entities.forEach(entity => {
            const relX = (entity.x - centerX) * scale + size / 2;
            const relY = (entity.y - centerY) * scale + size / 2;
            
            // Skip if outside minimap bounds
            if (relX < 0 || relX > size || relY < 0 || relY > size) return;
            
            ctx.fillStyle = this.getMinimapColor(entity.type);
            ctx.beginPath();
            ctx.arc(x + relX, y + relY, 2, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // Player indicator (always center)
        if (player) {
            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Get color for entity type on minimap
     * @param {string} type - Entity type
     * @returns {string} Color
     */
    getMinimapColor(type) {
        const colors = {
            'player': '#4CAF50',
            'enemy': '#f44336',
            'wolf': '#9C27B0',
            'projectile': '#ffeb3b',
            'obstacle': '#666',
            'powerup': '#2196F3'
        };
        return colors[type] || '#999';
    }
    
    /**
     * Render text
     * @param {string} text - Text to render
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text options
     */
    renderText(text, x, y, options = {}) {
        const ctx = this.ctx;
        
        ctx.font = options.font || '16px Arial';
        ctx.fillStyle = options.color || '#fff';
        ctx.textAlign = options.align || 'left';
        ctx.textBaseline = options.baseline || 'top';
        
        if (options.shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
        }
        
        ctx.fillText(text, x, y);
        
        if (options.shadow) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
    }
    
    /**
     * Render the complete frame
     * @param {Object} gameState - Current game state
     */
    render(gameState) {
        if (!this.initialized) return;
        
        // Clear canvas
        this.clear();
        
        // Draw grid
        this.drawGrid();
        
        // Render entities
        if (gameState.entities && Array.isArray(gameState.entities)) {
            gameState.entities.forEach(entity => {
                this.renderEntity(entity);
            });
        }
        
        // Render minimap
        if (gameState.showMinimap !== false) {
            this.renderMinimap(gameState.entities || [], gameState.player);
        }
        
        // Render any additional overlays
        if (gameState.paused) {
            this.renderPauseOverlay();
        }
    }
    
    /**
     * Render pause overlay
     */
    renderPauseOverlay() {
        const ctx = this.ctx;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pause text
        this.renderText('PAUSED', this.canvas.width / 2, this.canvas.height / 2, {
            font: 'bold 48px Arial',
            color: '#fff',
            align: 'center',
            baseline: 'middle',
            shadow: true
        });
    }
    
    /**
     * Update configuration
     * @param {Object} config - New configuration values
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        this.canvas = null;
        this.ctx = null;
        this.initialized = false;
    }
}

// Export singleton instance
export const renderer = new Renderer();