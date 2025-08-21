/**
 * WASM Targeting Button Renderer
 * This is a thin wrapper that forwards touch events to WASM and renders the button
 * All logic is handled in the WASM game engine
 */

class WASMTargetingButton {
    constructor(canvas, gameEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameEngine = gameEngine; // WASM game engine instance
        
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
        if (!this.gameEngine) return;
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Forward to WASM engine
            this.gameEngine.onTargetButtonTouchStart(x, y, touch.identifier);
        }
    }
    
    handleTouchEnd(e) {
        if (!this.gameEngine) return;
        
        // Check all ended touches
        const activeTouches = Array.from(e.touches).map(t => t.identifier);
        
        // For each changed touch, if it's not in active touches, it ended
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touchId = e.changedTouches[i].identifier;
            if (!activeTouches.includes(touchId)) {
                // Forward to WASM engine
                this.gameEngine.onTargetButtonTouchEnd(touchId);
            }
        }
    }
    
    handleTouchCancel(e) {
        this.handleTouchEnd(e);
    }
    
    updatePosition(x, y) {
        if (this.gameEngine && this.gameEngine.setTargetButtonPosition) {
            this.gameEngine.setTargetButtonPosition(x, y);
        }
    }
    
    render(ctx) {
        if (!this.gameEngine || !this.gameEngine.getTargetButtonState) return;
        
        // Get button state from WASM
        const state = this.gameEngine.getTargetButtonState();
        
        if (!state.visible) return;
        
        ctx.save();
        
        // Draw button circle
        ctx.beginPath();
        ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
        
        // Choose color based on state
        let color = 'rgba(255, 50, 255, 0.4)'; // Default purple
        if (state.disabled) {
            color = 'rgba(100, 100, 100, 0.4)'; // Gray when disabled
        } else if (state.active) {
            color = 'rgba(255, 100, 255, 0.9)'; // Bright purple when pressed
        } else if (state.hasTarget) {
            color = 'rgba(255, 100, 200, 0.5)'; // Pink when target locked
        }
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = state.disabled ? 'rgba(100, 100, 100, 0.6)' : 
            (state.hasTarget ? 'rgba(255, 100, 200, 0.9)' : 'rgba(255, 255, 255, 0.8)');
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (state.disabled && state.disableTimeRemaining > 0) {
            // Show countdown
            ctx.fillText(Math.ceil(state.disableTimeRemaining) + 's', state.x, state.y);
        } else if (!state.targetingEnabled) {
            ctx.fillText('OFF', state.x, state.y);
        } else {
            ctx.fillText('TARGET', state.x, state.y);
        }
        
        // Draw targeting indicator if has target
        if (state.targetingEnabled && state.hasTarget) {
            // Draw lock-on corners
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            
            const cornerSize = 8;
            const offset = state.radius - 5;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(state.x - offset, state.y - offset + cornerSize);
            ctx.lineTo(state.x - offset, state.y - offset);
            ctx.lineTo(state.x - offset + cornerSize, state.y - offset);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(state.x + offset - cornerSize, state.y - offset);
            ctx.lineTo(state.x + offset, state.y - offset);
            ctx.lineTo(state.x + offset, state.y - offset + cornerSize);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(state.x - offset, state.y + offset - cornerSize);
            ctx.lineTo(state.x - offset, state.y + offset);
            ctx.lineTo(state.x - offset + cornerSize, state.y + offset);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(state.x + offset - cornerSize, state.y + offset);
            ctx.lineTo(state.x + offset, state.y + offset);
            ctx.lineTo(state.x + offset, state.y + offset - cornerSize);
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
    window.WASMTargetingButton = WASMTargetingButton;
}