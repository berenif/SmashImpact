/**
 * Input Handler Module
 * Manages keyboard, mouse, and mobile input for the game
 */

export class InputHandler {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            down: false
        };
        this.joystick = {
            x: 0,
            y: 0,
            active: false
        };
        this.buttons = {
            attack: false,
            block: false,
            roll: false,
            special: false
        };
        
        this.listeners = new Map();
        this.initialized = false;
    }
    
    /**
     * Initialize input handlers
     * @param {HTMLElement} canvas - The game canvas element
     */
    initialize(canvas) {
        if (this.initialized) return;
        
        this.canvas = canvas;
        
        // Keyboard events
        this.keyDownHandler = (e) => this.handleKeyDown(e);
        this.keyUpHandler = (e) => this.handleKeyUp(e);
        
        // Mouse events
        this.mouseMoveHandler = (e) => this.handleMouseMove(e);
        this.mouseDownHandler = (e) => this.handleMouseDown(e);
        this.mouseUpHandler = (e) => this.handleMouseUp(e);
        
        // Touch events for mobile
        this.touchStartHandler = (e) => this.handleTouchStart(e);
        this.touchMoveHandler = (e) => this.handleTouchMove(e);
        this.touchEndHandler = (e) => this.handleTouchEnd(e);
        
        // Add event listeners
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);
        
        canvas.addEventListener('mousemove', this.mouseMoveHandler);
        canvas.addEventListener('mousedown', this.mouseDownHandler);
        canvas.addEventListener('mouseup', this.mouseUpHandler);
        
        canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
        canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
        canvas.addEventListener('touchend', this.touchEndHandler, { passive: false });
        
        // Prevent context menu
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        this.initialized = true;
    }
    
    /**
     * Handle key down event
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = true;
        
        // Trigger registered callbacks
        this.triggerCallbacks('keydown', { key, event: e });
        
        // Prevent default for game keys
        if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
            e.preventDefault();
        }
    }
    
    /**
     * Handle key up event
     * @param {KeyboardEvent} e
     */
    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        this.keys[key] = false;
        
        // Trigger registered callbacks
        this.triggerCallbacks('keyup', { key, event: e });
    }
    
    /**
     * Handle mouse move event
     * @param {MouseEvent} e
     */
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        // Trigger registered callbacks
        this.triggerCallbacks('mousemove', { x: this.mouse.x, y: this.mouse.y, event: e });
    }
    
    /**
     * Handle mouse down event
     * @param {MouseEvent} e
     */
    handleMouseDown(e) {
        this.mouse.down = true;
        
        // Trigger registered callbacks
        this.triggerCallbacks('mousedown', { button: e.button, event: e });
    }
    
    /**
     * Handle mouse up event
     * @param {MouseEvent} e
     */
    handleMouseUp(e) {
        this.mouse.down = false;
        
        // Trigger registered callbacks
        this.triggerCallbacks('mouseup', { button: e.button, event: e });
    }
    
    /**
     * Handle touch start event
     * @param {TouchEvent} e
     */
    handleTouchStart(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
            this.mouse.down = true;
        }
        
        // Trigger registered callbacks
        this.triggerCallbacks('touchstart', { touches: e.touches, event: e });
        e.preventDefault();
    }
    
    /**
     * Handle touch move event
     * @param {TouchEvent} e
     */
    handleTouchMove(e) {
        if (e.touches.length > 0) {
            const rect = this.canvas.getBoundingClientRect();
            const touch = e.touches[0];
            this.mouse.x = touch.clientX - rect.left;
            this.mouse.y = touch.clientY - rect.top;
        }
        
        // Trigger registered callbacks
        this.triggerCallbacks('touchmove', { touches: e.touches, event: e });
        e.preventDefault();
    }
    
    /**
     * Handle touch end event
     * @param {TouchEvent} e
     */
    handleTouchEnd(e) {
        if (e.touches.length === 0) {
            this.mouse.down = false;
        }
        
        // Trigger registered callbacks
        this.triggerCallbacks('touchend', { touches: e.touches, event: e });
        e.preventDefault();
    }
    
    /**
     * Set joystick input (for mobile controls)
     * @param {number} x - X input (-1 to 1)
     * @param {number} y - Y input (-1 to 1)
     * @param {boolean} active - Whether joystick is active
     */
    setJoystickInput(x, y, active = true) {
        this.joystick.x = Math.max(-1, Math.min(1, x));
        this.joystick.y = Math.max(-1, Math.min(1, y));
        this.joystick.active = active;
    }
    
    /**
     * Set button state (for mobile controls)
     * @param {string} button - Button name
     * @param {boolean} pressed - Whether button is pressed
     */
    setButtonState(button, pressed) {
        if (this.buttons.hasOwnProperty(button)) {
            this.buttons[button] = pressed;
        }
    }
    
    /**
     * Get movement input
     * @returns {Object} Movement vector { x, y }
     */
    getMovementInput() {
        let x = 0, y = 0;
        
        // Keyboard input
        if (this.keys['w'] || this.keys['arrowup']) y = -1;
        if (this.keys['s'] || this.keys['arrowdown']) y = 1;
        if (this.keys['a'] || this.keys['arrowleft']) x = -1;
        if (this.keys['d'] || this.keys['arrowright']) x = 1;
        
        // Override with joystick input if active
        if (this.joystick.active) {
            x = this.joystick.x;
            y = this.joystick.y;
        }
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const magnitude = Math.sqrt(x * x + y * y);
            x /= magnitude;
            y /= magnitude;
        }
        
        return { x, y };
    }
    
    /**
     * Get aim direction
     * @param {number} centerX - Center X position (player position)
     * @param {number} centerY - Center Y position (player position)
     * @returns {Object} Aim vector { x, y }
     */
    getAimDirection(centerX, centerY) {
        const dx = this.mouse.x - centerX;
        const dy = this.mouse.y - centerY;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (magnitude === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / magnitude,
            y: dy / magnitude
        };
    }
    
    /**
     * Check if a key is pressed
     * @param {string} key - Key to check
     * @returns {boolean}
     */
    isKeyPressed(key) {
        return this.keys[key.toLowerCase()] === true;
    }
    
    /**
     * Check if mouse/touch is down
     * @returns {boolean}
     */
    isMouseDown() {
        return this.mouse.down || this.buttons.attack;
    }
    
    /**
     * Check if a button is pressed (mobile)
     * @param {string} button - Button name
     * @returns {boolean}
     */
    isButtonPressed(button) {
        return this.buttons[button] === true;
    }
    
    /**
     * Register a callback for an event
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }
    
    /**
     * Trigger callbacks for an event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    triggerCallbacks(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }
    
    /**
     * Get current input state
     * @returns {Object} Complete input state
     */
    getState() {
        return {
            keys: { ...this.keys },
            mouse: { ...this.mouse },
            joystick: { ...this.joystick },
            buttons: { ...this.buttons },
            movement: this.getMovementInput()
        };
    }
    
    /**
     * Reset all input states
     */
    reset() {
        this.keys = {};
        this.mouse.down = false;
        this.joystick.active = false;
        this.buttons = {
            attack: false,
            block: false,
            roll: false,
            special: false
        };
    }
    
    /**
     * Cleanup and remove event listeners
     */
    cleanup() {
        if (!this.initialized) return;
        
        // Remove event listeners
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        
        if (this.canvas) {
            this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
            this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
            this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
            
            this.canvas.removeEventListener('touchstart', this.touchStartHandler);
            this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
            this.canvas.removeEventListener('touchend', this.touchEndHandler);
        }
        
        // Clear listeners
        this.listeners.clear();
        
        // Reset state
        this.reset();
        
        this.initialized = false;
    }
}

// Export singleton instance
export const inputHandler = new InputHandler();