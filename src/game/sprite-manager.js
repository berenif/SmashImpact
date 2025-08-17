// Sprite Manager for handling sprite sheets and animations

export class SpriteManager {
  constructor() {
    this.sprites = new Map();
    this.loaded = false;
  }

  async loadSpriteSheet(name, configPath) {
    try {
      // Load the configuration
      const response = await fetch(configPath);
      const config = await response.json();
      
      // Load the image
      const image = new Image();
      image.src = config.imagePath;
      
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      
      // Store the sprite data
      this.sprites.set(name, {
        image,
        config,
        animations: new Map()
      });
      
      // Initialize animations
      if (config.animations) {
        const sprite = this.sprites.get(name);
        for (const [animName, animData] of Object.entries(config.animations)) {
          sprite.animations.set(animName, {
            ...animData,
            currentFrame: 0,
            elapsedTime: 0
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to load sprite sheet ${name}:`, error);
      return false;
    }
  }

  createAnimationState(spriteName) {
    const sprite = this.sprites.get(spriteName);
    if (!sprite) return null;
    
    return {
      currentAnimation: 'idle',
      currentFrame: 0,
      elapsedTime: 0,
      flipped: false
    };
  }

  updateAnimation(spriteName, animationState, dt) {
    const sprite = this.sprites.get(spriteName);
    if (!sprite) return;
    
    const animation = sprite.config.animations[animationState.currentAnimation];
    if (!animation) return;
    
    // Update elapsed time
    animationState.elapsedTime += dt * 1000; // Convert to milliseconds
    
    // Check if we need to advance frame
    if (animationState.elapsedTime >= animation.duration) {
      animationState.elapsedTime = 0;
      animationState.currentFrame++;
      
      // Handle looping
      if (animationState.currentFrame >= animation.frames.length) {
        if (animation.loop) {
          animationState.currentFrame = 0;
        } else {
          animationState.currentFrame = animation.frames.length - 1;
        }
      }
    }
  }

  setAnimation(animationState, animationName) {
    if (animationState.currentAnimation !== animationName) {
      animationState.currentAnimation = animationName;
      animationState.currentFrame = 0;
      animationState.elapsedTime = 0;
    }
  }

  draw(ctx, spriteName, animationState, x, y, scale = 1, angle = 0) {
    const sprite = this.sprites.get(spriteName);
    if (!sprite || !sprite.image.complete) return;
    
    const animation = sprite.config.animations[animationState.currentAnimation];
    if (!animation) return;
    
    const frameIndex = animation.frames[animationState.currentFrame];
    const frame = sprite.config.frames[frameIndex];
    
    if (!frame) return;
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    if (animationState.flipped) {
      ctx.scale(-scale, scale);
    } else {
      ctx.scale(scale, scale);
    }
    
    // Draw the sprite frame
    ctx.drawImage(
      sprite.image,
      frame.x, frame.y, frame.w, frame.h,
      -frame.w / 2, -frame.h / 2, frame.w, frame.h
    );
    
    ctx.restore();
  }

  drawFrame(ctx, spriteName, frameIndex, x, y, scale = 1, angle = 0, flipped = false) {
    const sprite = this.sprites.get(spriteName);
    if (!sprite || !sprite.image.complete) return;
    
    const frame = sprite.config.frames[frameIndex];
    if (!frame) return;
    
    ctx.save();
    
    // Apply transformations
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    if (flipped) {
      ctx.scale(-scale, scale);
    } else {
      ctx.scale(scale, scale);
    }
    
    // Draw the sprite frame
    ctx.drawImage(
      sprite.image,
      frame.x, frame.y, frame.w, frame.h,
      -frame.w / 2, -frame.h / 2, frame.w, frame.h
    );
    
    ctx.restore();
  }
}

// Singleton instance
export const spriteManager = new SpriteManager();