// Obstacle system for the game
// Includes walls, holes, and traps with collision detection

export const OBSTACLE_TYPES = {
  WALL: 'wall',
  HOLE: 'hole',
  TRAP: 'trap',
  SPIKE: 'spike'
};

// Obstacle effects
export const OBSTACLE_EFFECTS = {
  [OBSTACLE_TYPES.WALL]: { blocks: true, damage: 0, slowdown: 0 },
  [OBSTACLE_TYPES.HOLE]: { blocks: false, damage: 0, slowdown: 0.7 }, // Slows player down significantly
  [OBSTACLE_TYPES.TRAP]: { blocks: false, damage: 0, slowdown: 0.5, stun: 1000 }, // Stuns for 1 second
  [OBSTACLE_TYPES.SPIKE]: { blocks: false, damage: 1, slowdown: 0.3 } // Damages and slows
};

// Predefined obstacle layouts for different game modes
export const OBSTACLE_LAYOUTS = {
  simple: [
    // Central walls
    { type: OBSTACLE_TYPES.WALL, x: 700, y: 400, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 700, y: 500, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 790, y: 420, width: 20, height: 80 },
    
    // Corner walls
    { type: OBSTACLE_TYPES.WALL, x: 200, y: 200, width: 100, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 1300, y: 700, width: 100, height: 20 },
    
    // Holes
    { type: OBSTACLE_TYPES.HOLE, x: 400, y: 300, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.HOLE, x: 1200, y: 600, width: 60, height: 60 },
    { type: OBSTACLE_TYPES.HOLE, x: 800, y: 200, width: 50, height: 50 },
    
    // Traps
    { type: OBSTACLE_TYPES.TRAP, x: 600, y: 600, width: 40, height: 40 },
    { type: OBSTACLE_TYPES.TRAP, x: 1000, y: 300, width: 40, height: 40 }
  ],
  
  complex: [
    // Maze-like walls
    { type: OBSTACLE_TYPES.WALL, x: 300, y: 100, width: 20, height: 200 },
    { type: OBSTACLE_TYPES.WALL, x: 300, y: 300, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 500, y: 100, width: 20, height: 220 },
    { type: OBSTACLE_TYPES.WALL, x: 700, y: 100, width: 20, height: 300 },
    { type: OBSTACLE_TYPES.WALL, x: 700, y: 400, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 900, y: 200, width: 20, height: 220 },
    { type: OBSTACLE_TYPES.WALL, x: 1100, y: 100, width: 20, height: 200 },
    { type: OBSTACLE_TYPES.WALL, x: 1100, y: 300, width: 200, height: 20 },
    { type: OBSTACLE_TYPES.WALL, x: 1300, y: 300, width: 20, height: 200 },
    
    // Strategic holes
    { type: OBSTACLE_TYPES.HOLE, x: 400, y: 450, width: 80, height: 80 },
    { type: OBSTACLE_TYPES.HOLE, x: 800, y: 550, width: 70, height: 70 },
    { type: OBSTACLE_TYPES.HOLE, x: 1200, y: 450, width: 80, height: 80 },
    
    // Spike fields
    { type: OBSTACLE_TYPES.SPIKE, x: 600, y: 700, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 650, y: 700, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 700, y: 700, width: 30, height: 30 },
    { type: OBSTACLE_TYPES.SPIKE, x: 750, y: 700, width: 30, height: 30 },
    
    // Trap zones
    { type: OBSTACLE_TYPES.TRAP, x: 200, y: 500, width: 50, height: 50 },
    { type: OBSTACLE_TYPES.TRAP, x: 1400, y: 200, width: 50, height: 50 },
    { type: OBSTACLE_TYPES.TRAP, x: 800, y: 350, width: 40, height: 40 }
  ],
  
  random: [] // Will be generated dynamically
};

// Active obstacles in the game
export let obstacles = [];

// Initialize obstacles for a specific layout
export function initObstacles(layoutName = 'simple') {
  if (layoutName === 'random') {
    obstacles = generateRandomObstacles();
  } else {
    obstacles = [...(OBSTACLE_LAYOUTS[layoutName] || OBSTACLE_LAYOUTS.simple)];
  }
  return obstacles;
}

// Generate random obstacles
function generateRandomObstacles() {
  const obs = [];
  const minDistance = 150; // Minimum distance from spawn points
  const spawnPoints = [
    { x: 200, y: 200 }, // Player 1 spawn
    { x: 1400, y: 700 } // Player 2 spawn
  ];
  
  // Add random walls
  for (let i = 0; i < 8; i++) {
    let x, y, width, height;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 50) {
      x = Math.random() * 1400 + 100;
      y = Math.random() * 700 + 100;
      width = Math.random() * 100 + 50;
      height = Math.random() * 100 + 20;
      
      valid = spawnPoints.every(spawn => 
        Math.hypot(x + width/2 - spawn.x, y + height/2 - spawn.y) > minDistance
      );
      attempts++;
    }
    
    if (valid) {
      obs.push({ type: OBSTACLE_TYPES.WALL, x, y, width, height });
    }
  }
  
  // Add random holes
  for (let i = 0; i < 5; i++) {
    let x, y;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 50) {
      x = Math.random() * 1400 + 100;
      y = Math.random() * 700 + 100;
      
      valid = spawnPoints.every(spawn => 
        Math.hypot(x + 30 - spawn.x, y + 30 - spawn.y) > minDistance
      );
      attempts++;
    }
    
    if (valid) {
      obs.push({ type: OBSTACLE_TYPES.HOLE, x, y, width: 60, height: 60 });
    }
  }
  
  // Add random traps
  for (let i = 0; i < 4; i++) {
    let x, y;
    let valid = false;
    let attempts = 0;
    
    while (!valid && attempts < 50) {
      x = Math.random() * 1400 + 100;
      y = Math.random() * 700 + 100;
      
      valid = spawnPoints.every(spawn => 
        Math.hypot(x + 20 - spawn.x, y + 20 - spawn.y) > minDistance
      );
      attempts++;
    }
    
    if (valid) {
      obs.push({ type: OBSTACLE_TYPES.TRAP, x, y, width: 40, height: 40 });
    }
  }
  
  return obs;
}

// Check collision between a circle (player) and rectangle (obstacle)
export function checkCircleRectCollision(cx, cy, radius, rect) {
  // Find the closest point on the rectangle to the circle center
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  
  // Calculate distance between circle center and closest point
  const distX = cx - closestX;
  const distY = cy - closestY;
  const distSquared = distX * distX + distY * distY;
  
  return distSquared < radius * radius;
}

// Check if a position would collide with any blocking obstacle
export function checkObstacleCollision(x, y, radius) {
  for (const obstacle of obstacles) {
    const effect = OBSTACLE_EFFECTS[obstacle.type];
    if (effect.blocks && checkCircleRectCollision(x, y, radius, obstacle)) {
      return obstacle;
    }
  }
  return null;
}

// Get all obstacles affecting a position (non-blocking ones like holes, traps)
export function getAffectingObstacles(x, y, radius) {
  const affecting = [];
  for (const obstacle of obstacles) {
    const effect = OBSTACLE_EFFECTS[obstacle.type];
    if (!effect.blocks && checkCircleRectCollision(x, y, radius, obstacle)) {
      affecting.push(obstacle);
    }
  }
  return affecting;
}

// Calculate movement with obstacle collision
export function moveWithObstacles(currentX, currentY, targetX, targetY, radius) {
  // Check if target position would collide with blocking obstacles
  const collision = checkObstacleCollision(targetX, targetY, radius);
  
  if (!collision) {
    return { x: targetX, y: targetY, blocked: false };
  }
  
  // Try to slide along the obstacle
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  
  // Try horizontal movement only
  if (!checkObstacleCollision(targetX, currentY, radius)) {
    return { x: targetX, y: currentY, blocked: false };
  }
  
  // Try vertical movement only
  if (!checkObstacleCollision(currentX, targetY, radius)) {
    return { x: currentX, y: targetY, blocked: false };
  }
  
  // Can't move at all
  return { x: currentX, y: currentY, blocked: true };
}

// Draw obstacles on canvas
export function drawObstacles(ctx, camX, camY) {
  for (const obstacle of obstacles) {
    ctx.save();
    
    switch (obstacle.type) {
      case OBSTACLE_TYPES.WALL:
        // Dark gray walls with border
        ctx.fillStyle = '#2a2f4a';
        ctx.fillRect(obstacle.x - camX, obstacle.y - camY, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#3a4060';
        ctx.lineWidth = 2;
        ctx.strokeRect(obstacle.x - camX, obstacle.y - camY, obstacle.width, obstacle.height);
        break;
        
      case OBSTACLE_TYPES.HOLE:
        // Dark holes with gradient
        const gradient = ctx.createRadialGradient(
          obstacle.x + obstacle.width/2 - camX,
          obstacle.y + obstacle.height/2 - camY,
          0,
          obstacle.x + obstacle.width/2 - camX,
          obstacle.y + obstacle.height/2 - camY,
          obstacle.width/2
        );
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, '#0a0a0a');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(
          obstacle.x + obstacle.width/2 - camX,
          obstacle.y + obstacle.height/2 - camY,
          obstacle.width/2,
          obstacle.height/2,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        break;
        
      case OBSTACLE_TYPES.TRAP:
        // Red traps with warning pattern
        ctx.fillStyle = '#8b2020';
        ctx.fillRect(obstacle.x - camX, obstacle.y - camY, obstacle.width, obstacle.height);
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(obstacle.x - camX, obstacle.y - camY, obstacle.width, obstacle.height);
        ctx.setLineDash([]);
        break;
        
      case OBSTACLE_TYPES.SPIKE:
        // Sharp spikes
        ctx.fillStyle = '#666666';
        const spikeCenterX = obstacle.x + obstacle.width/2 - camX;
        const spikeCenterY = obstacle.y + obstacle.height/2 - camY;
        const spikeSize = Math.min(obstacle.width, obstacle.height) / 2;
        
        // Draw multiple spike triangles
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
          ctx.beginPath();
          ctx.moveTo(spikeCenterX, spikeCenterY);
          ctx.lineTo(
            spikeCenterX + Math.cos(angle) * spikeSize,
            spikeCenterY + Math.sin(angle) * spikeSize
          );
          ctx.lineTo(
            spikeCenterX + Math.cos(angle + Math.PI/6) * spikeSize * 0.7,
            spikeCenterY + Math.sin(angle + Math.PI/6) * spikeSize * 0.7
          );
          ctx.closePath();
          ctx.fill();
        }
        break;
    }
    
    ctx.restore();
  }
}

// Get a path grid for AI pathfinding (simplified grid representation)
export function getPathGrid(worldWidth, worldHeight, gridSize = 40) {
  const cols = Math.ceil(worldWidth / gridSize);
  const rows = Math.ceil(worldHeight / gridSize);
  const grid = [];
  
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      const worldX = x * gridSize + gridSize / 2;
      const worldY = y * gridSize + gridSize / 2;
      
      // Check if this grid cell is blocked by obstacles
      const blocked = checkObstacleCollision(worldX, worldY, gridSize / 2) !== null;
      grid[y][x] = blocked ? 1 : 0;
    }
  }
  
  return { grid, gridSize, cols, rows };
}