// Sprite loader - handles loading all game sprites
import { spriteManager } from './sprite-manager.js';

export async function loadGameSprites() {
  try {
    console.log('Loading game sprites...');
    
    // Load hero sprite sheet
    const heroLoaded = await spriteManager.loadSpriteSheet('hero', '/assets/sprites/hero-spritesheet.json');
    
    if (heroLoaded) {
      console.log('✓ Hero sprites loaded successfully');
    } else {
      console.warn('⚠ Failed to load hero sprites - using fallback rendering');
    }
    
    // Add more sprite sheets here as needed
    // await spriteManager.loadSpriteSheet('enemy', '/assets/sprites/enemy-spritesheet.json');
    // await spriteManager.loadSpriteSheet('effects', '/assets/sprites/effects-spritesheet.json');
    
    return true;
  } catch (error) {
    console.error('Error loading game sprites:', error);
    return false;
  }
}

// Auto-load sprites when module is imported
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    loadGameSprites();
  });
}