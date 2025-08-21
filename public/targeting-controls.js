/**
 * Targeting Controls for Mobile
 * Provides a special targeting button with quick press and long press functionality
 */

class TargetingButton {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
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
            longPressTime: options.longPressTime || 500, // 500ms for long press
            disableDuration: options.disableDuration || 2000, // 2 seconds disable
            onQuickPress: options.onQuickPress || (() => {}),
            onLongPress: options.onLongPress || (() => {})
        };
        
        // State
        this.active = false;
        this.disabled = false;
        this.disabledUntil = 0;
        this.touchId = null;
        this.touchStartTime = 0;
        this.longPressTriggered = false;
        this.visible = true;
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchCancel = this.handleTouchCancel.bind(this);
        this.update = this.update.bind(this);
        
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
        
        if (this.disabled) return;
        
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
                this.longPressTriggered = false;
                
                // Set up long press timer
                this.longPressTimer = setTimeout(() => {
                    if (this.active && !this.longPressTriggered) {
                        this.longPressTriggered = true;
                        this.handleLongPress();
                    }
                }, this.config.longPressTime);
                
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
            
            // Clear long press timer
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            
            // If it was a quick press and long press wasn't triggered
            if (pressDuration < this.config.longPressTime && !this.longPressTriggered) {
                this.handleQuickPress();
            }
            
            this.active = false;
            this.touchId = null;
        }
    }
    
    handleTouchCancel(e) {
        this.handleTouchEnd(e);
    }
    
    handleQuickPress() {
        // Reflect current targeting state - call the quick press callback
        this.config.onQuickPress();
    }
    
    handleLongPress() {
        // Disable targeting for specified duration
        this.disabled = true;
        this.disabledUntil = Date.now() + this.config.disableDuration;
        this.active = false;
        
        // Call the long press callback
        this.config.onLongPress();
        
        // Set timer to re-enable
        setTimeout(() => {
            this.disabled = false;
        }, this.config.disableDuration);
    }
    
    update() {
        // Check if disable period has expired
        if (this.disabled && Date.now() >= this.disabledUntil) {
            this.disabled = false;
        }
    }
    
    updatePosition(x, y) {
        this.config.x = x;
        this.config.y = y;
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        // Draw button circle
        ctx.beginPath();
        ctx.arc(this.config.x, this.config.y, this.config.radius, 0, Math.PI * 2);
        
        // Choose color based on state
        let color = this.config.color;
        if (this.disabled) {
            color = this.config.disabledColor;
        } else if (this.active) {
            color = this.config.activeColor;
        }
        
        ctx.fillStyle = color;
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = this.disabled ? 'rgba(100, 100, 100, 0.6)' : 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw label
        ctx.fillStyle = this.config.textColor;
        ctx.font = `bold ${this.config.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.disabled) {
            // Show disabled timer
            const remainingTime = Math.max(0, Math.ceil((this.disabledUntil - Date.now()) / 1000));
            ctx.fillText(`${remainingTime}s`, this.config.x, this.config.y);
        } else {
            ctx.fillText(this.config.label, this.config.x, this.config.y);
        }
        
        // Draw targeting indicator
        if (!this.disabled && !this.active) {
            // Draw crosshair icon
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 2;
            
            // Horizontal line
            ctx.beginPath();
            ctx.moveTo(this.config.x - 10, this.config.y - 20);
            ctx.lineTo(this.config.x + 10, this.config.y - 20);
            ctx.stroke();
            
            // Vertical line
            ctx.beginPath();
            ctx.moveTo(this.config.x, this.config.y - 30);
            ctx.lineTo(this.config.x, this.config.y - 10);
            ctx.stroke();
            
            // Circle in center
            ctx.beginPath();
            ctx.arc(this.config.x, this.config.y - 20, 3, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchCancel);
        
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.TargetingButton = TargetingButton;
}
