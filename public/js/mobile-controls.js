/**
 * Mobile Controls Module
 * Handles touch controls for mobile devices
 */

import { inputHandler } from '../input-handler.js';

export class MobileControls {
    constructor(game) {
        this.game = game;
        this.joystick = {
            element: null,
            knob: null,
            active: false,
            touchId: null,
            baseX: 0,
            baseY: 0,
            inputX: 0,
            inputY: 0
        };
        this.buttons = new Map();
        this.activeButtons = new Set();
    }
    
    /**
     * Setup mobile controls
     */
    setup() {
        this.setupJoystick();
        this.setupButtons();
    }
    
    /**
     * Setup joystick control
     */
    setupJoystick() {
        this.joystick.element = document.getElementById('joystick');
        this.joystick.knob = document.getElementById('joystickKnob');
        
        if (!this.joystick.element || !this.joystick.knob) {
            console.warn('Joystick elements not found');
            return;
        }
        
        // Touch start
        this.joystick.element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleJoystickStart(e.touches[0]);
        });
        
        // Touch move
        window.addEventListener('touchmove', (e) => {
            for (let touch of e.touches) {
                if (touch.identifier === this.joystick.touchId) {
                    e.preventDefault();
                    this.handleJoystickMove(touch);
                }
            }
        });
        
        // Touch end
        window.addEventListener('touchend', (e) => {
            for (let touch of e.changedTouches) {
                if (touch.identifier === this.joystick.touchId) {
                    this.handleJoystickEnd();
                }
            }
        });
    }
    
    /**
     * Handle joystick touch start
     */
    handleJoystickStart(touch) {
        this.joystick.active = true;
        this.joystick.touchId = touch.identifier;
        
        const rect = this.joystick.element.getBoundingClientRect();
        this.joystick.baseX = rect.left + rect.width / 2;
        this.joystick.baseY = rect.top + rect.height / 2;
        
        this.handleJoystickMove(touch);
    }
    
    /**
     * Handle joystick movement
     */
    handleJoystickMove(touch) {
        if (!this.joystick.active) return;
        
        const deltaX = touch.clientX - this.joystick.baseX;
        const deltaY = touch.clientY - this.joystick.baseY;
        
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDistance = 60; // Maximum joystick movement radius
        
        let normalizedX = deltaX;
        let normalizedY = deltaY;
        
        if (distance > maxDistance) {
            normalizedX = (deltaX / distance) * maxDistance;
            normalizedY = (deltaY / distance) * maxDistance;
        }
        
        // Update knob position
        this.joystick.knob.style.transform = 
            `translate(calc(-50% + ${normalizedX}px), calc(-50% + ${normalizedY}px))`;
        
        // Calculate input values (-1 to 1)
        this.joystick.inputX = normalizedX / maxDistance;
        this.joystick.inputY = normalizedY / maxDistance;
        
        // Update input handler
        inputHandler.setJoystickInput(this.joystick.inputX, this.joystick.inputY, true);
        
        // Update WASM engine directly
        if (this.game.state.engine) {
            this.game.state.engine.setJoystickInput(this.joystick.inputX, this.joystick.inputY);
        }
    }
    
    /**
     * Handle joystick touch end
     */
    handleJoystickEnd() {
        this.joystick.active = false;
        this.joystick.touchId = null;
        this.joystick.inputX = 0;
        this.joystick.inputY = 0;
        
        // Reset knob position
        this.joystick.knob.style.transform = 'translate(-50%, -50%)';
        
        // Update input handler
        inputHandler.setJoystickInput(0, 0, false);
        
        // Update WASM engine
        if (this.game.state.engine) {
            this.game.state.engine.setJoystickInput(0, 0);
        }
    }
    
    /**
     * Setup action buttons
     */
    setupButtons() {
        const buttons = document.querySelectorAll('.mobile-button');
        
        buttons.forEach(button => {
            const action = button.dataset.action;
            if (!action) return;
            
            this.buttons.set(action, button);
            
            // Touch start
            button.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.handleButtonStart(action);
            });
            
            // Touch end
            button.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.handleButtonEnd(action);
            });
            
            // Touch cancel
            button.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                this.handleButtonEnd(action);
            });
        });
    }
    
    /**
     * Handle button press start
     */
    handleButtonStart(action) {
        const button = this.buttons.get(action);
        if (!button) return;
        
        button.classList.add('pressed');
        this.activeButtons.add(action);
        
        // Update input handler
        inputHandler.setButtonState(action, true);
        
        // Perform action
        this.performAction(action, true);
    }
    
    /**
     * Handle button press end
     */
    handleButtonEnd(action) {
        const button = this.buttons.get(action);
        if (!button) return;
        
        button.classList.remove('pressed');
        this.activeButtons.delete(action);
        
        // Update input handler
        inputHandler.setButtonState(action, false);
        
        // Perform action
        this.performAction(action, false);
    }
    
    /**
     * Perform button action
     */
    performAction(action, pressed) {
        if (!this.game.state.engine) return;
        
        switch (action) {
            case 'attack':
                if (pressed) {
                    this.game.state.engine.playerAttack();
                }
                break;
                
            case 'block':
                if (pressed) {
                    this.game.state.engine.startBlock(1);
                } else {
                    this.game.state.engine.endBlock(1);
                }
                break;
                
            case 'roll':
                if (pressed) {
                    const movement = inputHandler.getMovementInput();
                    this.game.state.engine.playerRoll(movement.x, movement.y);
                }
                break;
                
            case 'special':
                if (pressed) {
                    this.game.state.engine.playerSpecialAbility();
                }
                break;
        }
    }
    
    /**
     * Get current input state
     */
    getInput() {
        return {
            joystick: {
                x: this.joystick.inputX,
                y: this.joystick.inputY,
                active: this.joystick.active
            },
            buttons: {
                attack: this.activeButtons.has('attack'),
                block: this.activeButtons.has('block'),
                roll: this.activeButtons.has('roll'),
                special: this.activeButtons.has('special')
            }
        };
    }
    
    /**
     * Show controls
     */
    show() {
        const container = document.getElementById('mobileControls');
        if (container) {
            container.style.display = 'block';
        }
    }
    
    /**
     * Hide controls
     */
    hide() {
        const container = document.getElementById('mobileControls');
        if (container) {
            container.style.display = 'none';
        }
    }
    
    /**
     * Update control layout for orientation change
     */
    updateLayout() {
        // Adjust control positions based on screen orientation
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (this.joystick.element) {
            if (isLandscape) {
                this.joystick.element.style.bottom = '30px';
                this.joystick.element.style.left = '30px';
            } else {
                this.joystick.element.style.bottom = '50px';
                this.joystick.element.style.left = '50px';
            }
        }
        
        const buttonsContainer = document.querySelector('.mobile-buttons');
        if (buttonsContainer) {
            if (isLandscape) {
                buttonsContainer.style.bottom = '30px';
                buttonsContainer.style.right = '30px';
            } else {
                buttonsContainer.style.bottom = '50px';
                buttonsContainer.style.right = '50px';
            }
        }
    }
    
    /**
     * Cleanup
     */
    cleanup() {
        // Reset state
        this.handleJoystickEnd();
        this.activeButtons.clear();
        
        // Remove pressed states
        this.buttons.forEach(button => {
            button.classList.remove('pressed');
        });
    }
}