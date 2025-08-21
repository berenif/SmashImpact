/**
 * Renderer Module
 * Handles all game rendering and visual effects
 */

export class Renderer {
    constructor(canvas, minimap) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
        });
        
        this.minimap = minimap;
        this.minimapCtx = minimap ? minimap.getContext('2d') : null;
        
        this.camera = { x: 0, y: 0 };
        this.gridSize = 50;
        this.setupCanvas();
    }

    /**
     * Setup canvas properties
     */
    setupCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    /**
     * Resize canvas to fit window
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.minimap) {
            this.minimap.width = 200;
            this.minimap.height = 200;
        }
    }

    /**
     * Main render function
     */
    render(engine, game) {
        if (!engine) return;
        
        // Clear canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update camera to follow player
        const playerState = engine.getPlayerState();
        if (playerState) {
            this.camera.x = playerState.x - this.canvas.width / 2;
            this.camera.y = playerState.y - this.canvas.height / 2;
        }
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw grid
        this.drawGrid();
        
        // Get and render entities
        const entities = engine.getEntityPositions();
        entities.forEach(entity => this.renderEntity(entity));
        
        // Draw visual effects
        const effects = engine.getVisualEffects();
        this.renderEffects(effects);
        
        // Restore context state
        this.ctx.restore();
        
        // Render minimap (doesn't need camera transform)
        this.renderMinimap(entities);
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        const startX = Math.floor(this.camera.x / this.gridSize) * this.gridSize;
        const startY = Math.floor(this.camera.y / this.gridSize) * this.gridSize;
        const endX = startX + this.canvas.width + this.gridSize;
        const endY = startY + this.canvas.height + this.gridSize;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }

    /**
     * Render a single entity
     */
    renderEntity(entity) {
        const ctx = this.ctx;
        
        ctx.save();
        ctx.translate(entity.x, entity.y);
        // Safely handle rotation with fallback to 0
        const rotation = entity.rotation !== undefined ? entity.rotation : 0;
        ctx.rotate(rotation);
        
        // Set color based on entity type
        switch(entity.type) {
            case 0: // Player
                ctx.fillStyle = '#4834d4';
                ctx.strokeStyle = '#686de0';
                break;
            case 1: // Enemy
                ctx.fillStyle = '#ee5a24';
                ctx.strokeStyle = '#ff6b6b';
                break;
            case 2: // Projectile
                ctx.fillStyle = '#f9ca24';
                ctx.strokeStyle = '#f6e58d';
                break;
            case 3: // Powerup
                ctx.fillStyle = '#6ab04c';
                ctx.strokeStyle = '#badc58';
                break;
            case 4: // Obstacle
                ctx.fillStyle = '#535c68';
                ctx.strokeStyle = '#95afc0';
                break;
            default:
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#ffffff';
        }
        
        // Draw entity shape
        ctx.lineWidth = 2;
        
        if (entity.type === 0) { // Player - triangle
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-10, -10);
            ctx.lineTo(-10, 10);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Draw health bar
            ctx.restore();
            ctx.save();
            ctx.translate(entity.x, entity.y - 25);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-20, -3, 40, 6);
            ctx.fillStyle = '#6ab04c';
            ctx.fillRect(-20, -3, 40 * (entity.health / 100), 6);
        } else if (entity.type === 1) { // Enemy - hexagon
            const sides = 6;
            const radius = 12;
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const angle = (Math.PI * 2 * i) / sides;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (entity.type === 2) { // Projectile - circle
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Add trail effect
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(-5, 0, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (entity.type === 3) { // Powerup - star
            const spikes = 5;
            const outerRadius = 15;
            const innerRadius = 7;
            ctx.beginPath();
            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI * i) / spikes;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add glow effect
            ctx.shadowBlur = 20;
            ctx.shadowColor = ctx.fillStyle;
            ctx.fill();
            ctx.shadowBlur = 0;
        } else if (entity.type === 4) { // Obstacle - rectangle
            ctx.fillRect(-15, -15, 30, 30);
            ctx.strokeRect(-15, -15, 30, 30);
        } else { // Default - circle
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }

    /**
     * Render visual effects
     */
    renderEffects(effects) {
        if (!effects || effects.length === 0) return;
        
        effects.forEach(effect => {
            this.ctx.save();
            
            switch(effect.type) {
                case 0: // Explosion
                    this.renderExplosion(effect);
                    break;
                case 1: // Trail
                    this.renderTrail(effect);
                    break;
                case 2: // Shockwave
                    this.renderShockwave(effect);
                    break;
            }
            
            this.ctx.restore();
        });
    }

    /**
     * Render explosion effect
     */
    renderExplosion(effect) {
        const progress = effect.progress;
        const radius = effect.radius * progress;
        const alpha = 1 - progress;
        
        this.ctx.globalAlpha = alpha;
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Inner bright core
        this.ctx.fillStyle = '#fff';
        this.ctx.globalAlpha = alpha * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, radius * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Render trail effect
     */
    renderTrail(effect) {
        this.ctx.strokeStyle = effect.color || '#4834d4';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = 1 - effect.progress;
        this.ctx.beginPath();
        this.ctx.moveTo(effect.x, effect.y);
        this.ctx.lineTo(effect.endX, effect.endY);
        this.ctx.stroke();
    }

    /**
     * Render shockwave effect
     */
    renderShockwave(effect) {
        const radius = effect.radius * effect.progress;
        const alpha = (1 - effect.progress) * 0.5;
        
        this.ctx.strokeStyle = '#686de0';
        this.ctx.lineWidth = 3;
        this.ctx.globalAlpha = alpha;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    /**
     * Render minimap
     */
    renderMinimap(entities) {
        if (!this.minimapCtx) return;
        
        const ctx = this.minimapCtx;
        const scale = 0.05;
        
        // Clear minimap
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 200, 200);
        
        // Draw entities on minimap
        entities.forEach(entity => {
            const x = 100 + (entity.x - this.camera.x - this.canvas.width / 2) * scale;
            const y = 100 + (entity.y - this.camera.y - this.canvas.height / 2) * scale;
            
            if (x < 0 || x > 200 || y < 0 || y > 200) return;
            
            // Set color based on type
            switch(entity.type) {
                case 0: ctx.fillStyle = '#4834d4'; break;
                case 1: ctx.fillStyle = '#ee5a24'; break;
                case 2: ctx.fillStyle = '#f9ca24'; break;
                case 3: ctx.fillStyle = '#6ab04c'; break;
                case 4: ctx.fillStyle = '#535c68'; break;
                default: ctx.fillStyle = '#ffffff';
            }
            
            ctx.fillRect(x - 2, y - 2, 4, 4);
        });
        
        // Draw view bounds
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(50, 50, 100, 100);
    }

    /**
     * Get camera position
     */
    getCamera() {
        return { ...this.camera };
    }

    /**
     * Set camera position
     */
    setCamera(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
}

export default Renderer;