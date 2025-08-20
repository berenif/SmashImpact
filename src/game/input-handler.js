/**
 * Input Handler Module
 * Manages keyboard, mouse, and mobile input
 */

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keys = {};
        this.mouse = { x: 0, y: 0 };
        this.joystick = { x: 0, y: 0, active: false };
        this.touch = { active: false, id: null };
        
        this.setupEventListeners();
    }

    /**
     * Setup all input event listeners
     */
    setupEventListeners() {
        this.setupKeyboard();
        this.setupMouse();
        this.setupMobileControls();
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    /**
     * Setup keyboard controls
     */
    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Pause game on Escape
            if (e.key === 'Escape' && this.game.running) {
                this.game.togglePause();
            }
            
            // Toggle performance stats
            if (e.key === 'F3') {
                const stats = document.getElementById('performanceStats');
                if (stats) {
                    stats.style.display = stats.style.display === 'none' ? 'block' : 'none';
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    /**
     * Setup mouse controls
     */
    setupMouse() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.keys['shoot'] = true;
            } else if (e.button === 2) { // Right click
                this.keys['special'] = true;
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.keys['shoot'] = false;
            } else if (e.button === 2) {
                this.keys['special'] = false;
            }
        });
    }

    /**
     * Setup mobile controls
     */
    setupMobileControls() {
        this.setupJoystick();
        this.setupActionButtons();
    }

    /**
     * Setup virtual joystick
     */
    setupJoystick() {
        const joystick = document.getElementById('joystick');
        const knob = document.getElementById('joystickKnob');
        
        if (!joystick || !knob) return;
        
        const handleTouch = (e, isStart = false) => {
            e.preventDefault();
            const touch = e.touches[0];
            
            if (isStart) {
                this.joystick.active = true;
                this.touch.id = touch.identifier;
            }
            
            if (this.joystick.active && touch && touch.identifier === this.touch.id) {
                const rect = joystick.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const maxRadius = rect.width / 2 - 30;
                
                let deltaX = touch.clientX - centerX;
                let deltaY = touch.clientY - centerY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                if (distance > maxRadius) {
                    deltaX = (deltaX / distance) * maxRadius;
                    deltaY = (deltaY / distance) * maxRadius;
                }
                
                knob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
                
                this.joystick.x = deltaX / maxRadius;
                this.joystick.y = deltaY / maxRadius;
            }
        };
        
        const handleTouchEnd = (e) => {
            e.preventDefault();
            const touch = e.changedTouches[0];
            
            if (touch && touch.identifier === this.touch.id) {
                this.joystick.active = false;
                this.joystick.x = 0;
                this.joystick.y = 0;
                this.touch.id = null;
                knob.style.transform = 'translate(-50%, -50%)';
            }
        };
        
        joystick.addEventListener('touchstart', (e) => handleTouch(e, true));
        joystick.addEventListener('touchmove', handleTouch);
        joystick.addEventListener('touchend', handleTouchEnd);
        joystick.addEventListener('touchcancel', handleTouchEnd);
    }

    /**
     * Setup mobile action buttons
     */
    setupActionButtons() {
        const shootBtn = document.getElementById('shootBtn');
        const boostBtn = document.getElementById('boostBtn');
        const specialBtn = document.getElementById('specialBtn');
        
        const setupButton = (btn, action) => {
            if (!btn) return;
            
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.keys[action] = true;
            });
            
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.keys[action] = false;
            });
            
            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.keys[action] = false;
            });
        };
        
        setupButton(shootBtn, 'shoot');
        setupButton(boostBtn, 'boost');
        setupButton(specialBtn, 'special');
    }

    /**
     * Process input and update game engine
     */
    processInput(engine) {
        if (!engine) return;
        
        // Movement input
        let moveX = 0;
        let moveY = 0;
        
        // Keyboard movement
        if (this.keys['w'] || this.keys['arrowup']) moveY = -1;
        if (this.keys['s'] || this.keys['arrowdown']) moveY = 1;
        if (this.keys['a'] || this.keys['arrowleft']) moveX = -1;
        if (this.keys['d'] || this.keys['arrowright']) moveX = 1;
        
        // Mobile joystick movement
        if (this.joystick.active) {
            moveX = this.joystick.x;
            moveY = this.joystick.y;
        }
        
        // Apply movement
        if (moveX !== 0 || moveY !== 0) {
            engine.movePlayer(moveX, moveY);
        }
        
        // Shooting
        if (this.keys['shoot'] || this.keys[' ']) {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const targetX = this.mouse.x;
                const targetY = this.mouse.y;
                engine.playerShoot(targetX, targetY);
            }
        }
        
        // Special ability
        if (this.keys['special'] || this.keys['e']) {
            engine.playerSpecialAbility();
        }
        
        // Boost
        if (this.keys['boost'] || this.keys['shift']) {
            engine.playerBoost();
        }
    }

    /**
     * Get current input state
     */
    getState() {
        return {
            keys: { ...this.keys },
            mouse: { ...this.mouse },
            joystick: { ...this.joystick }
        };
    }

    /**
     * Reset all input states
     */
    reset() {
        this.keys = {};
        this.joystick = { x: 0, y: 0, active: false };
        this.touch = { active: false, id: null };
    }

    /**
     * Check if mobile device
     */
    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
}

export default InputHandler;