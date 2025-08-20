/**
 * Mobile Controls System for SmashImpact
 * Provides virtual joystick and touch controls for mobile devices
 */

class VirtualJoystick {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Configuration
        this.config = {
            size: options.size || 120,
            baseColor: options.baseColor || 'rgba(255, 255, 255, 0.3)',
            stickColor: options.stickColor || 'rgba(255, 255, 255, 0.8)',
            position: options.position || { x: 150, y: null }, // null y means auto-position from bottom
            autoHide: options.autoHide !== false,
            deadZone: options.deadZone || 0.1
        };
        
        // State
        this.active = false;
        this.touchId = null;
        this.basePosition = { x: 0, y: 0 };
        this.stickPosition = { x: 0, y: 0 };
        this.input = { x: 0, y: 0 };
        this.visible = !this.config.autoHide;
        
        // Initialize position
        this.updateBasePosition();
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleResize = this.handleResize.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
        window.addEventListener('resize', this.handleResize);
    }
    
    updateBasePosition() {
        this.basePosition.x = this.config.position.x;
        this.basePosition.y = this.config.position.y || (this.canvas.height - this.config.size - 50);
        this.stickPosition = { ...this.basePosition };
    }
    
    handleResize() {
        this.updateBasePosition();
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Check if touch is in joystick area (left side of screen)
            if (x < this.canvas.width / 3 && !this.active) {
                this.touchId = touch.identifier;
                this.active = true;
                this.visible = true;
                
                // Move joystick base to touch position if using dynamic positioning
                if (this.config.autoHide) {
                    this.basePosition.x = x;
                    this.basePosition.y = y;
                }
                
                this.stickPosition.x = x;
                this.stickPosition.y = y;
                this.updateInput();
                break;
            }
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (!this.active) return;
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            
            if (touch.identifier === this.touchId) {
                const rect = this.canvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                // Calculate distance from base
                const dx = x - this.basePosition.x;
                const dy = y - this.basePosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Limit stick to joystick radius
                const maxDistance = this.config.size / 2;
                if (distance <= maxDistance) {
                    this.stickPosition.x = x;
                    this.stickPosition.y = y;
                } else {
                    // Constrain to circle
                    const angle = Math.atan2(dy, dx);
                    this.stickPosition.x = this.basePosition.x + Math.cos(angle) * maxDistance;
                    this.stickPosition.y = this.basePosition.y + Math.sin(angle) * maxDistance;
                }
                
                this.updateInput();
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
            this.active = false;
            this.touchId = null;
            this.stickPosition = { ...this.basePosition };
            this.input = { x: 0, y: 0 };
            
            if (this.config.autoHide) {
                this.visible = false;
            }
        }
    }
    
    updateInput() {
        const dx = this.stickPosition.x - this.basePosition.x;
        const dy = this.stickPosition.y - this.basePosition.y;
        const maxDistance = this.config.size / 2;
        
        // Normalize to -1 to 1
        this.input.x = dx / maxDistance;
        this.input.y = dy / maxDistance;
        
        // Apply dead zone
        const magnitude = Math.sqrt(this.input.x * this.input.x + this.input.y * this.input.y);
        if (magnitude < this.config.deadZone) {
            this.input.x = 0;
            this.input.y = 0;
        } else {
            // Rescale to account for dead zone
            const scaledMagnitude = (magnitude - this.config.deadZone) / (1 - this.config.deadZone);
            this.input.x = (this.input.x / magnitude) * scaledMagnitude;
            this.input.y = (this.input.y / magnitude) * scaledMagnitude;
        }
    }
    
    getInput() {
        return { ...this.input };
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        ctx.save();
        
        // Draw base
        ctx.fillStyle = this.config.baseColor;
        ctx.strokeStyle = this.config.baseColor.replace('0.3', '0.6');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.basePosition.x, this.basePosition.y, this.config.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw stick
        ctx.fillStyle = this.config.stickColor;
        ctx.beginPath();
        ctx.arc(this.stickPosition.x, this.stickPosition.y, this.config.size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator
        if (this.active) {
            ctx.strokeStyle = this.config.stickColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.basePosition.x, this.basePosition.y);
            ctx.lineTo(this.stickPosition.x, this.stickPosition.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
        window.removeEventListener('resize', this.handleResize);
    }
}

/**
 * Touch Button for mobile controls
 */
class TouchButton {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // Configuration
        this.config = {
            x: options.x || 0,
            y: options.y || 0,
            radius: options.radius || 40,
            label: options.label || '',
            color: options.color || 'rgba(255, 255, 255, 0.3)',
            activeColor: options.activeColor || 'rgba(255, 255, 255, 0.8)',
            onPress: options.onPress || (() => {}),
            onRelease: options.onRelease || (() => {})
        };
        
        // State
        this.pressed = false;
        this.touchId = null;
        
        // Bind methods
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
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
            
            if (distance <= this.config.radius && !this.pressed) {
                this.pressed = true;
                this.touchId = touch.identifier;
                this.config.onPress();
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
        
        if (touchEnded && this.pressed) {
            this.pressed = false;
            this.touchId = null;
            this.config.onRelease();
        }
    }
    
    isPressed() {
        return this.pressed;
    }
    
    render(ctx) {
        ctx.save();
        
        // Draw button
        ctx.fillStyle = this.pressed ? this.config.activeColor : this.config.color;
        ctx.strokeStyle = this.pressed ? this.config.activeColor : this.config.color.replace('0.3', '0.6');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.config.x, this.config.y, this.config.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw label
        if (this.config.label) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.config.label, this.config.x, this.config.y);
        }
        
        ctx.restore();
    }
    
    updatePosition(x, y) {
        this.config.x = x;
        this.config.y = y;
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

/**
 * Mobile Controls Manager
 */
class MobileControls {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.controls = [];
        
        // Detect if mobile
        this.isMobile = this.detectMobile();
        
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }
    
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               ('ontouchstart' in window) ||
               (navigator.maxTouchPoints > 0);
    }
    
    setupMobileControls() {
        // Create virtual joystick
        this.joystick = new VirtualJoystick(this.canvas, {
            size: 120,
            position: { x: 150, y: null },
            autoHide: true
        });
        
        // Create attack button (main action button)
        this.attackButton = new TouchButton(this.canvas, {
            x: this.canvas.width - 100,
            y: this.canvas.height - 100,
            radius: 45,
            label: 'ATTACK',
            color: 'rgba(255, 50, 50, 0.4)',
            activeColor: 'rgba(255, 100, 100, 0.9)',
            onPress: () => {
                if (this.game) {
                    this.game.handleAttack();
                }
            },
            onRelease: () => {
                if (this.game) {
                    this.game.handleAttackRelease();
                }
            }
        });
        
        // Create block button (defensive action)
        this.blockButton = new TouchButton(this.canvas, {
            x: this.canvas.width - 200,
            y: this.canvas.height - 100,
            radius: 40,
            label: 'BLOCK',
            color: 'rgba(50, 150, 255, 0.4)',
            activeColor: 'rgba(100, 200, 255, 0.9)',
            onPress: () => {
                if (this.game) {
                    this.game.handleBlock();
                }
            },
            onRelease: () => {
                if (this.game) {
                    this.game.handleBlockRelease();
                }
            }
        });
        
        // Create roll button (evasive action)
        this.rollButton = new TouchButton(this.canvas, {
            x: this.canvas.width - 150,
            y: this.canvas.height - 180,
            radius: 40,
            label: 'ROLL',
            color: 'rgba(50, 255, 50, 0.4)',
            activeColor: 'rgba(100, 255, 100, 0.9)',
            onPress: () => {
                if (this.game) {
                    this.game.handleRoll();
                }
            }
        });
        
        // Create boost button (optional, for movement speed)
        this.boostButton = new TouchButton(this.canvas, {
            x: this.canvas.width - 250,
            y: this.canvas.height - 180,
            radius: 35,
            label: 'BOOST',
            color: 'rgba(255, 255, 50, 0.4)',
            activeColor: 'rgba(255, 255, 100, 0.9)',
            onPress: () => {
                if (this.game) {
                    this.game.handleBoost();
                }
            }
        });
        
        // Create shoot button (ranged attack if needed)
        this.shootButton = new TouchButton(this.canvas, {
            x: this.canvas.width - 100,
            y: this.canvas.height - 200,
            radius: 35,
            label: 'FIRE',
            color: 'rgba(255, 150, 50, 0.4)',
            activeColor: 'rgba(255, 200, 100, 0.9)',
            onPress: () => {
                if (this.game) {
                    this.game.handleShoot();
                }
            }
        });
        
        // Register controls with game
        if (this.game) {
            this.game.setJoystick(this.joystick);
            this.game.setButton('attack', this.attackButton);
            this.game.setButton('block', this.blockButton);
            this.game.setButton('roll', this.rollButton);
            this.game.setButton('boost', this.boostButton);
            this.game.setButton('shoot', this.shootButton);
        }
        
        // Handle resize
        window.addEventListener('resize', () => this.handleResize());
        
        this.controls = [this.joystick, this.attackButton, this.blockButton, this.rollButton, this.boostButton, this.shootButton];
    }
    
    handleResize() {
        // Update button positions
        if (this.attackButton) {
            this.attackButton.updatePosition(this.canvas.width - 100, this.canvas.height - 100);
        }
        if (this.blockButton) {
            this.blockButton.updatePosition(this.canvas.width - 200, this.canvas.height - 100);
        }
        if (this.rollButton) {
            this.rollButton.updatePosition(this.canvas.width - 150, this.canvas.height - 180);
        }
        if (this.boostButton) {
            this.boostButton.updatePosition(this.canvas.width - 250, this.canvas.height - 180);
        }
        if (this.shootButton) {
            this.shootButton.updatePosition(this.canvas.width - 100, this.canvas.height - 200);
        }
    }
    
    render(ctx) {
        if (!this.isMobile) return;
        
        // Render all controls
        this.controls.forEach(control => {
            if (control.render) {
                control.render(ctx);
            }
        });
    }
    
    destroy() {
        this.controls.forEach(control => {
            if (control.destroy) {
                control.destroy();
            }
        });
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.VirtualJoystick = VirtualJoystick;
    window.TouchButton = TouchButton;
    window.MobileControls = MobileControls;
}