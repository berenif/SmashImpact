/**
 * Targeting Button for Mobile Controls
 * Integrates with WASM game engine targeting system
 */

class TargetingButton {
    constructor(canvas, gameEngine, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameEngine = gameEngine; // WASM game engine instance
        
        // Configuration
        this.config = {
            x: options.x || canvas.width - 50,
            y: options.y || canvas.height - 280,
            radius: options.radius || 40,
            label: options.label || 'TARGET',
            color: options.color || 'rgba(255, 50, 255, 0.4)',
            activeColor: options.activeColor || 'rgba(255, 100, 255, 0.9)',
            disabledColor: options.disabledColor || 'rgba(100, 100, 100, 0.4)',
            textColor: options.textColor || '#FFFFFF',
            fontSize: options.fontSize || 12,
            longPressThreshold: options.longPressThreshold || 500 // 500ms for long press
        };
        
        // State
        this.active = false;
        this.touchId = null;
        this.touchStartTime = 0;
        this.visible = true;
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchCancel = this.handleTouchCancel.bind(this);
        this.render = this.render.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Check if touch is on button
            const dx = x - this.config.x;
            const dy = y - this.config.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.config.radius && !this.active) {
                this.touchId = touch.identifier;
                this.active = true;
                this.touchStartTime = Date.now();
                break;
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        // Check if our touch ended
        let touchEnded = true;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === this.touchId) {
                touchEnded = false;
                break;
            }
        }
        
        if (touchEnded && this.active) {
            const pressDuration = Date.now() - this.touchStartTime;
            
            // Call WASM game engine's handleTargetingButton with press duration
            if (this.gameEngine && this.gameEngine.handleTargetingButton) {
                this.gameEngine.handleTargetingButton(pressDuration);
            }
            
            this.active = false;
            this.touchId = null;
        }
    }
    
    handleTouchCancel(e) {
        this.handleTouchEnd(e);
    }
    
    updatePosition(x, y) {
        this.config.x = x;
        this.config.y = y;
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        // Check if targeting is enabled from WASM engine
        const targetingEnabled = this.gameEngine && this.gameEngine.isTargetingEnabled ? 
            this.gameEngine.isTargetingEnabled() : true;
        
        // Get current target from WASM engine
        const currentTargetId = this.gameEngine && this.gameEngine.getCurrentTargetId ? 
            this.gameEngine.getCurrentTargetId() : -1;
        
        // Draw button circle
        ctx.beginPath();
        ctx.arc(this.config.x, this.config.y, this.config.radius, 0, Math.PI * 2);
        
        // Choose color based on state
        let color = this.config.color;
        if (!targetingEnabled) {
            color = this.config.disabledColor;
        } else if (this.active) {
            color = this.config.activeColor;
        } else if (currentTargetId >= 0) {
            // Has active target - show different color
            color = 'rgba(255, 100, 200, 0.5)';
        }
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = !targetingEnabled ? 'rgba(100, 100, 100, 0.6)' : 
            (currentTargetId >= 0 ? 'rgba(255, 100, 200, 0.9)' : 'rgba(255, 255, 255, 0.8)');
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = this.config.textColor;
        ctx.font = `bold ${this.config.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (!targetingEnabled) {
            // Show disabled state
            ctx.fillText('OFF', this.config.x, this.config.y);
        } else {
            ctx.fillText(this.config.label, this.config.x, this.config.y);
        }
        
        // Draw targeting indicator
        if (targetingEnabled && currentTargetId >= 0) {
            // Draw lock-on indicator
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            
            // Draw corners of a square around the button to indicate lock
            const cornerSize = 8;
            const offset = this.config.radius - 5;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(this.config.x - offset, this.config.y - offset + cornerSize);
            ctx.lineTo(this.config.x - offset, this.config.y - offset);
            ctx.lineTo(this.config.x - offset + cornerSize, this.config.y - offset);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(this.config.x + offset - cornerSize, this.config.y - offset);
            ctx.lineTo(this.config.x + offset, this.config.y - offset);
            ctx.lineTo(this.config.x + offset, this.config.y - offset + cornerSize);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(this.config.x - offset, this.config.y + offset - cornerSize);
            ctx.lineTo(this.config.x - offset, this.config.y + offset);
            ctx.lineTo(this.config.x - offset + cornerSize, this.config.y + offset);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(this.config.x + offset - cornerSize, this.config.y + offset);
            ctx.lineTo(this.config.x + offset, this.config.y + offset);
            ctx.lineTo(this.config.x + offset, this.config.y + offset - cornerSize);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.TargetingButton = TargetingButton;
}