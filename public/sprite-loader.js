/**
 * Sprite Loader and Animation System
 * Handles loading sprite sheets and managing sprite animations
 */

export class SpriteLoader {
    constructor() {
        this.sprites = new Map();
        this.loadedImages = new Map();
    }

    /**
     * Load a sprite sheet image
     * @param {string} name - Identifier for the sprite
     * @param {string} src - Path to the sprite sheet image
     * @returns {Promise<HTMLImageElement>}
     */
    async loadSpriteSheet(name, src) {
        return new Promise((resolve, reject) => {
            if (this.loadedImages.has(name)) {
                resolve(this.loadedImages.get(name));
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.loadedImages.set(name, img);
                console.log(`Sprite sheet loaded: ${name}`);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`Failed to load sprite sheet: ${name} from ${src}`);
                reject(new Error(`Failed to load sprite sheet: ${src}`));
            };
            img.src = src;
        });
    }

    /**
     * Load sprite configuration from JSON
     * @param {string} configPath - Path to the sprite configuration JSON
     * @returns {Promise<Object>}
     */
    async loadSpriteConfig(configPath) {
        try {
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.statusText}`);
            }
            const config = await response.json();
            return config;
        } catch (error) {
            console.error(`Error loading sprite config from ${configPath}:`, error);
            throw error;
        }
    }

    /**
     * Create a sprite instance from configuration
     * @param {string} name - Sprite identifier
     * @param {Object} config - Sprite configuration object
     * @param {HTMLImageElement} image - Sprite sheet image
     * @returns {Sprite}
     */
    createSprite(name, config, image) {
        const sprite = new Sprite(name, config, image);
        this.sprites.set(name, sprite);
        return sprite;
    }

    /**
     * Get a sprite by name
     * @param {string} name - Sprite identifier
     * @returns {Sprite|undefined}
     */
    getSprite(name) {
        return this.sprites.get(name);
    }

    /**
     * Load and initialize a complete sprite with config and image
     * @param {string} name - Sprite identifier
     * @param {string} configPath - Path to configuration JSON
     * @param {string} imagePath - Path to sprite sheet image
     * @returns {Promise<Sprite>}
     */
    async loadSprite(name, configPath, imagePath) {
        try {
            const [config, image] = await Promise.all([
                this.loadSpriteConfig(configPath),
                this.loadSpriteSheet(name, imagePath || config.spriteSheet)
            ]);
            
            return this.createSprite(name, config, image);
        } catch (error) {
            console.error(`Error loading sprite ${name}:`, error);
            throw error;
        }
    }
}

/**
 * Sprite class for managing individual sprite animations
 */
export class Sprite {
    constructor(name, config, image) {
        this.name = name;
        this.config = config;
        this.image = image;
        this.frameWidth = config.frameWidth || 32;
        this.frameHeight = config.frameHeight || 32;
        this.scale = config.scale || 1;
        this.animations = config.animations || {};
        this.directions = config.directions || { down: 0, left: 1, right: 2, up: 3 };
        
        // Animation state
        this.currentAnimation = 'idle';
        this.currentDirection = 'down';
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.animationComplete = false;
    }

    /**
     * Set the current animation
     * @param {string} animationName - Name of the animation to play
     * @param {string} direction - Direction to face (down, left, right, up)
     */
    setAnimation(animationName, direction = this.currentDirection) {
        if (this.currentAnimation !== animationName || this.currentDirection !== direction) {
            this.currentAnimation = animationName;
            this.currentDirection = direction;
            this.currentFrame = 0;
            this.frameTimer = 0;
            this.animationComplete = false;
        }
    }

    /**
     * Update animation frame based on delta time
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        const animation = this.animations[this.currentAnimation];
        if (!animation) return;

        this.frameTimer += deltaTime;

        if (this.frameTimer >= animation.frameDuration) {
            this.frameTimer = 0;
            
            if (animation.loop) {
                this.currentFrame = (this.currentFrame + 1) % animation.frames.length;
            } else {
                if (this.currentFrame < animation.frames.length - 1) {
                    this.currentFrame++;
                } else {
                    this.animationComplete = true;
                }
            }
        }
    }

    /**
     * Get the current frame's source rectangle
     * @returns {{x: number, y: number, width: number, height: number}}
     */
    getSourceRect() {
        const animation = this.animations[this.currentAnimation];
        if (!animation) {
            return { x: 0, y: 0, width: this.frameWidth, height: this.frameHeight };
        }

        const frameIndex = animation.frames[this.currentFrame];
        const directionOffset = this.directions[this.currentDirection] || 0;
        
        // Calculate position in sprite sheet
        // Assumes frames are arranged horizontally, directions vertically
        const framesPerRow = Math.floor(this.image.width / this.frameWidth);
        const col = frameIndex % framesPerRow;
        const row = Math.floor(frameIndex / framesPerRow) + directionOffset;

        return {
            x: col * this.frameWidth,
            y: row * this.frameHeight,
            width: this.frameWidth,
            height: this.frameHeight
        };
    }

    /**
     * Draw the sprite to a canvas context
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} x - X position to draw at
     * @param {number} y - Y position to draw at
     * @param {Object} options - Additional drawing options
     */
    draw(ctx, x, y, options = {}) {
        const source = this.getSourceRect();
        const scale = options.scale || this.scale;
        const width = this.frameWidth * scale;
        const height = this.frameHeight * scale;
        
        // Center the sprite at the given position
        const drawX = x - width / 2;
        const drawY = y - height / 2;

        // Apply any transformations
        ctx.save();
        
        if (options.rotation) {
            ctx.translate(x, y);
            ctx.rotate(options.rotation);
            ctx.translate(-x, -y);
        }

        if (options.opacity !== undefined) {
            ctx.globalAlpha = options.opacity;
        }

        // Draw the sprite
        ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
        ctx.drawImage(
            this.image,
            source.x, source.y, source.width, source.height,
            drawX, drawY, width, height
        );

        ctx.restore();
    }

    /**
     * Check if current animation is complete (for non-looping animations)
     * @returns {boolean}
     */
    isAnimationComplete() {
        return this.animationComplete;
    }

    /**
     * Reset the current animation
     */
    resetAnimation() {
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.animationComplete = false;
    }

    /**
     * Get animation state for serialization
     * @returns {Object}
     */
    getState() {
        return {
            animation: this.currentAnimation,
            direction: this.currentDirection,
            frame: this.currentFrame,
            frameTimer: this.frameTimer
        };
    }

    /**
     * Set animation state from serialized data
     * @param {Object} state
     */
    setState(state) {
        this.currentAnimation = state.animation || 'idle';
        this.currentDirection = state.direction || 'down';
        this.currentFrame = state.frame || 0;
        this.frameTimer = state.frameTimer || 0;
    }
}

/**
 * Animation controller for managing multiple sprites
 */
export class AnimationController {
    constructor() {
        this.sprites = new Map();
        this.loader = new SpriteLoader();
    }

    /**
     * Load a sprite and add it to the controller
     * @param {string} name - Sprite identifier
     * @param {string} configPath - Path to sprite configuration
     * @param {string} imagePath - Path to sprite image (optional if in config)
     * @returns {Promise<Sprite>}
     */
    async addSprite(name, configPath, imagePath) {
        const sprite = await this.loader.loadSprite(name, configPath, imagePath);
        this.sprites.set(name, sprite);
        return sprite;
    }

    /**
     * Update all sprites
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        this.sprites.forEach(sprite => {
            sprite.update(deltaTime);
        });
    }

    /**
     * Get a sprite by name
     * @param {string} name - Sprite identifier
     * @returns {Sprite|undefined}
     */
    getSprite(name) {
        return this.sprites.get(name);
    }

    /**
     * Remove a sprite
     * @param {string} name - Sprite identifier
     */
    removeSprite(name) {
        this.sprites.delete(name);
    }

    /**
     * Clear all sprites
     */
    clear() {
        this.sprites.clear();
    }
}

// Export default instance for convenience
export const spriteLoader = new SpriteLoader();
export const animationController = new AnimationController();