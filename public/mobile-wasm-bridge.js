/**
 * Mobile Controls to WASM Bridge
 * This module connects the mobile controls UI to the WASM game engine
 */

class MobileWASMBridge {
    constructor(canvas, wasmEngine) {
        this.canvas = canvas;
        this.engine = wasmEngine;
        this.controls = null;
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
        // Create the mobile controls UI
        this.controls = new MobileControlsUI(this.canvas);
        
        // Virtual Joystick
        this.joystick = this.controls.createJoystick({
            position: { x: 150, y: null },
            size: 120,
            onMove: (x, y) => {
                if (this.engine) {
                    this.engine.setJoystickInput(x, y);
                }
            }
        });
        
        // Attack button (main combat action)
        this.attackButton = this.controls.createButton({
            x: this.canvas.width - 100,
            y: this.canvas.height - 100,
            radius: 45,
            label: 'ATTACK',
            color: 'rgba(255, 50, 50, 0.4)',
            activeColor: 'rgba(255, 100, 100, 0.9)',
            onPress: () => {
                if (this.engine) {
                    this.engine.playerAttack();
                }
            }
        });
        
        // Block button (defensive action)
        this.blockButton = this.controls.createButton({
            x: this.canvas.width - 200,
            y: this.canvas.height - 100,
            radius: 40,
            label: 'BLOCK',
            color: 'rgba(50, 150, 255, 0.4)',
            activeColor: 'rgba(100, 200, 255, 0.9)',
            onPress: () => {
                if (this.engine && this.engine.player) {
                    this.engine.startBlock(this.engine.player.id);
                }
            },
            onRelease: () => {
                if (this.engine && this.engine.player) {
                    this.engine.endBlock(this.engine.player.id);
                }
            }
        });
        
        // Roll button (evasive action)
        this.rollButton = this.controls.createButton({
            x: this.canvas.width - 150,
            y: this.canvas.height - 180,
            radius: 40,
            label: 'ROLL',
            color: 'rgba(50, 255, 50, 0.4)',
            activeColor: 'rgba(100, 255, 100, 0.9)',
            onPress: () => {
                if (this.engine) {
                    // Roll in the direction of movement or facing
                    this.engine.playerRoll();
                }
            }
        });
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    handleResize() {
        if (!this.controls) return;
        
        // Update button positions based on new canvas size
        if (this.attackButton) {
            this.attackButton.updatePosition(this.canvas.width - 100, this.canvas.height - 100);
        }
        if (this.blockButton) {
            this.blockButton.updatePosition(this.canvas.width - 200, this.canvas.height - 100);
        }
        if (this.rollButton) {
            this.rollButton.updatePosition(this.canvas.width - 150, this.canvas.height - 180);
        }
    }
    
    render(ctx) {
        if (this.controls && this.isMobile) {
            this.controls.render(ctx);
        }
    }
    
    destroy() {
        if (this.controls) {
            this.controls.destroy();
        }
    }
}

/**
 * Mobile Controls UI Manager
 * Handles the visual representation and touch events for mobile controls
 */
class MobileControlsUI {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.controls = [];
    }
    
    createJoystick(options) {
        const joystick = new VirtualJoystick(this.canvas, options);
        this.controls.push(joystick);
        return joystick;
    }
    
    createButton(options) {
        const button = new TouchButton(this.canvas, options);
        this.controls.push(button);
        return button;
    }
    
    render(ctx) {
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
        this.controls = [];
    }
}

/**
 * Virtual Joystick Implementation
 */
class VirtualJoystick {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.config = {
            size: options.size || 120,
            baseColor: options.baseColor || 'rgba(255, 255, 255, 0.3)',
            stickColor: options.stickColor || 'rgba(255, 255, 255, 0.8)',
            position: options.position || { x: 150, y: null },
            autoHide: options.autoHide !== false,
            deadZone: options.deadZone || 0.1,
            onMove: options.onMove || (() => {})
        };
        
        this.active = false;
        this.touchId = null;
        this.basePosition = { x: 0, y: 0 };
        this.stickPosition = { x: 0, y: 0 };
        this.input = { x: 0, y: 0 };
        this.visible = !this.config.autoHide;
        
        this.updateBasePosition();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
    
    updateBasePosition() {
        this.basePosition.x = this.config.position.x;
        this.basePosition.y = this.config.position.y || (this.canvas.height - this.config.size - 50);
        this.stickPosition = { ...this.basePosition };
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
            // Check if touch is in joystick area (left third of screen)
            if (x < this.canvas.width / 3 && !this.active) {
                this.touchId = touch.identifier;
                this.active = true;
                this.visible = true;
                
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
                const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
                const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
                
                const dx = x - this.basePosition.x;
                const dy = y - this.basePosition.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const maxDistance = this.config.size / 2;
                if (distance <= maxDistance) {
                    this.stickPosition.x = x;
                    this.stickPosition.y = y;
                } else {
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
            this.config.onMove(0, 0);
            
            if (this.config.autoHide) {
                this.visible = false;
            }
        }
    }
    
    updateInput() {
        const dx = this.stickPosition.x - this.basePosition.x;
        const dy = this.stickPosition.y - this.basePosition.y;
        const maxDistance = this.config.size / 2;
        
        this.input.x = dx / maxDistance;
        this.input.y = dy / maxDistance;
        
        const magnitude = Math.sqrt(this.input.x * this.input.x + this.input.y * this.input.y);
        if (magnitude < this.config.deadZone) {
            this.input.x = 0;
            this.input.y = 0;
        } else {
            const scaledMagnitude = (magnitude - this.config.deadZone) / (1 - this.config.deadZone);
            this.input.x = (this.input.x / magnitude) * scaledMagnitude;
            this.input.y = (this.input.y / magnitude) * scaledMagnitude;
        }
        
        this.config.onMove(this.input.x, this.input.y);
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
        
        ctx.restore();
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchmove', this.handleTouchMove);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

/**
 * Touch Button Implementation
 */
class TouchButton {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
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
        
        this.pressed = false;
        this.touchId = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width);
            const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height);
            
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
    
    updatePosition(x, y) {
        this.config.x = x;
        this.config.y = y;
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
            ctx.font = `bold ${this.config.radius * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.config.label, this.config.x, this.config.y);
        }
        
        ctx.restore();
    }
    
    destroy() {
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        this.canvas.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.handleTouchEnd);
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.MobileWASMBridge = MobileWASMBridge;
    window.MobileControlsUI = MobileControlsUI;
    window.VirtualJoystick = VirtualJoystick;
    window.TouchButton = TouchButton;
}