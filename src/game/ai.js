// AI system for solo mode
// Implements simple AI that chases the player and avoids obstacles

import { world, R, SPEED } from './state.js';
import { checkObstacleCollision, getAffectingObstacles, moveWithObstacles, getPathGrid, OBSTACLE_EFFECTS } from './obstacles.js';
import { clamp } from '../utils/time.js';

// AI configuration
export const AI_CONFIG = {
  REACTION_TIME: 100, // ms delay for AI reactions
  VISION_RANGE: 400, // How far AI can "see"
  CHASE_SPEED: SPEED * 0.9, // Slightly slower than player
  WANDER_SPEED: SPEED * 0.5, // Speed when wandering
  PATHFIND_UPDATE_INTERVAL: 500, // How often to recalculate path (ms)
  STUCK_THRESHOLD: 50, // Distance to consider AI stuck
  STUCK_TIME: 1000, // Time before AI tries different approach when stuck
  TRAP_MEMORY_TIME: 3000, // Remember trap locations for 3 seconds
  PREDICTION_FACTOR: 0.3 // How much to predict player movement
};

// AI state
export class AIPlayer {
  constructor(x, y, color = '#9966ff', name = 'AI') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.name = name;
    this.score = 0;
    
    // AI specific state
    this.targetX = x;
    this.targetY = y;
    this.path = [];
    this.currentPathIndex = 0;
    this.lastPathUpdate = 0;
    this.lastPosition = { x, y };
    this.stuckTime = 0;
    this.wanderTarget = null;
    this.wanderTime = 0;
    this.trapMemory = []; // Remember trap locations
    this.currentSpeed = AI_CONFIG.CHASE_SPEED;
    this.stunned = false;
    this.stunnedUntil = 0;
    this.slowdown = 1.0;
  }
  
  // Update AI behavior
  update(playerX, playerY, dt, currentTime) {
    // Check if stunned
    if (this.stunned && currentTime < this.stunnedUntil) {
      return; // Can't move while stunned
    } else if (this.stunned) {
      this.stunned = false;
      this.slowdown = 1.0;
    }
    
    // Check for trap/hole effects
    const affectingObstacles = getAffectingObstacles(this.x, this.y, R);
    for (const obstacle of affectingObstacles) {
      const effect = OBSTACLE_EFFECTS[obstacle.type];
      
      // Apply slowdown
      if (effect.slowdown) {
        this.slowdown = Math.min(this.slowdown, effect.slowdown);
      }
      
      // Apply stun
      if (effect.stun && !this.stunned) {
        this.stunned = true;
        this.stunnedUntil = currentTime + effect.stun;
        
        // Remember this trap
        this.rememberTrap(obstacle, currentTime);
      }
    }
    
    // Clean old trap memories
    this.trapMemory = this.trapMemory.filter(mem => 
      currentTime - mem.time < AI_CONFIG.TRAP_MEMORY_TIME
    );
    
    // Calculate distance to player
    const distToPlayer = Math.hypot(playerX - this.x, playerY - this.y);
    
    // Determine AI behavior based on role and distance
    if (distToPlayer < AI_CONFIG.VISION_RANGE) {
      // Player is in range - chase or flee based on who's "it"
      this.chasePlayer(playerX, playerY, dt, currentTime);
    } else {
      // Wander around when player is not in sight
      this.wander(dt, currentTime);
    }
    
    // Check if stuck
    const movedDistance = Math.hypot(this.x - this.lastPosition.x, this.y - this.lastPosition.y);
    if (movedDistance < 1) {
      this.stuckTime += dt * 1000;
      if (this.stuckTime > AI_CONFIG.STUCK_TIME) {
        // Try a random direction to get unstuck
        this.wanderTarget = {
          x: this.x + (Math.random() - 0.5) * 200,
          y: this.y + (Math.random() - 0.5) * 200
        };
        this.stuckTime = 0;
      }
    } else {
      this.stuckTime = 0;
      this.lastPosition = { x: this.x, y: this.y };
    }
  }
  
  // Chase the player using pathfinding
  chasePlayer(playerX, playerY, dt, currentTime) {
    // Predict where player will be
    const predictionTime = AI_CONFIG.PREDICTION_FACTOR;
    const predictedX = playerX; // Could add velocity prediction here
    const predictedY = playerY;
    
    // Update path periodically or when target moves significantly
    const targetMoved = Math.hypot(predictedX - this.targetX, predictedY - this.targetY) > 50;
    const timeToUpdate = currentTime - this.lastPathUpdate > AI_CONFIG.PATHFIND_UPDATE_INTERVAL;
    
    if (targetMoved || timeToUpdate || this.path.length === 0) {
      this.targetX = predictedX;
      this.targetY = predictedY;
      this.path = this.findPath(this.x, this.y, predictedX, predictedY);
      this.currentPathIndex = 0;
      this.lastPathUpdate = currentTime;
    }
    
    // Follow the path
    if (this.path.length > 0 && this.currentPathIndex < this.path.length) {
      const target = this.path[this.currentPathIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 20) {
        // Reached current waypoint, move to next
        this.currentPathIndex++;
      } else {
        // Move towards current waypoint
        this.moveTowards(target.x, target.y, dt, AI_CONFIG.CHASE_SPEED);
      }
    } else {
      // No path or end of path - move directly towards player (with obstacle avoidance)
      this.moveTowards(playerX, playerY, dt, AI_CONFIG.CHASE_SPEED);
    }
  }
  
  // Wander around randomly
  wander(dt, currentTime) {
    if (!this.wanderTarget || this.wanderTime <= 0) {
      // Pick a new random target
      this.wanderTarget = {
        x: Math.random() * (world.w - 200) + 100,
        y: Math.random() * (world.h - 200) + 100
      };
      this.wanderTime = 2000 + Math.random() * 3000; // Wander for 2-5 seconds
    }
    
    this.wanderTime -= dt * 1000;
    
    const dist = Math.hypot(this.wanderTarget.x - this.x, this.wanderTarget.y - this.y);
    if (dist < 30) {
      // Reached wander target, pick a new one
      this.wanderTarget = null;
    } else {
      this.moveTowards(this.wanderTarget.x, this.wanderTarget.y, dt, AI_CONFIG.WANDER_SPEED);
    }
  }
  
  // Move towards a target position with obstacle avoidance
  moveTowards(targetX, targetY, dt, baseSpeed) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < 1) return;
    
    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    // Apply speed with slowdown effect
    const speed = baseSpeed * this.slowdown * dt;
    
    // Calculate new position
    let newX = this.x + dirX * speed;
    let newY = this.y + dirY * speed;
    
    // Check for obstacles and adjust movement
    const result = moveWithObstacles(this.x, this.y, newX, newY, R);
    
    // Apply the movement
    this.x = clamp(result.x, R, world.w - R);
    this.y = clamp(result.y, R, world.h - R);
    
    // Reset slowdown for next frame
    this.slowdown = 1.0;
  }
  
  // Simple pathfinding using A* algorithm
  findPath(startX, startY, endX, endY) {
    const { grid, gridSize, cols, rows } = getPathGrid(world.w, world.h);
    
    // Convert world coordinates to grid coordinates
    const startCol = Math.floor(startX / gridSize);
    const startRow = Math.floor(startY / gridSize);
    const endCol = Math.floor(endX / gridSize);
    const endRow = Math.floor(endY / gridSize);
    
    // Check if start or end is out of bounds
    if (startCol < 0 || startCol >= cols || startRow < 0 || startRow >= rows ||
        endCol < 0 || endCol >= cols || endRow < 0 || endRow >= rows) {
      return [];
    }
    
    // Simple A* implementation
    const openSet = [];
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();
    
    const startNode = `${startCol},${startRow}`;
    const endNode = `${endCol},${endRow}`;
    
    openSet.push(startNode);
    gScore.set(startNode, 0);
    fScore.set(startNode, this.heuristic(startCol, startRow, endCol, endRow));
    
    while (openSet.length > 0) {
      // Get node with lowest fScore
      let current = openSet[0];
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (fScore.get(openSet[i]) < fScore.get(current)) {
          current = openSet[i];
          currentIndex = i;
        }
      }
      
      // Check if we reached the goal
      if (current === endNode) {
        return this.reconstructPath(cameFrom, current, gridSize);
      }
      
      // Move current from open to closed
      openSet.splice(currentIndex, 1);
      closedSet.add(current);
      
      // Check neighbors
      const [col, row] = current.split(',').map(Number);
      const neighbors = [
        [col - 1, row], [col + 1, row],
        [col, row - 1], [col, row + 1],
        [col - 1, row - 1], [col + 1, row - 1],
        [col - 1, row + 1], [col + 1, row + 1]
      ];
      
      for (const [nCol, nRow] of neighbors) {
        // Check bounds
        if (nCol < 0 || nCol >= cols || nRow < 0 || nRow >= rows) continue;
        
        // Check if blocked
        if (grid[nRow][nCol] === 1) continue;
        
        // Check if it's a remembered trap (avoid if possible)
        const worldX = nCol * gridSize + gridSize / 2;
        const worldY = nRow * gridSize + gridSize / 2;
        const nearTrap = this.isNearRememberedTrap(worldX, worldY, gridSize);
        
        const neighbor = `${nCol},${nRow}`;
        
        // Skip if already evaluated
        if (closedSet.has(neighbor)) continue;
        
        // Calculate tentative gScore
        const isDiagonal = Math.abs(col - nCol) + Math.abs(row - nRow) === 2;
        const moveCost = isDiagonal ? 1.414 : 1;
        const trapPenalty = nearTrap ? 5 : 0; // High cost for trap areas
        const tentativeGScore = gScore.get(current) + moveCost + trapPenalty;
        
        // Add to open set if not there
        if (!openSet.includes(neighbor)) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= gScore.get(neighbor)) {
          continue; // Not a better path
        }
        
        // This path is the best so far
        cameFrom.set(neighbor, current);
        gScore.set(neighbor, tentativeGScore);
        fScore.set(neighbor, tentativeGScore + this.heuristic(nCol, nRow, endCol, endRow));
      }
    }
    
    // No path found - return direct line (will hit obstacles but AI will slide along them)
    return [{ x: endX, y: endY }];
  }
  
  // Heuristic for A* (Euclidean distance)
  heuristic(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }
  
  // Reconstruct path from A* result
  reconstructPath(cameFrom, current, gridSize) {
    const path = [];
    while (cameFrom.has(current)) {
      const [col, row] = current.split(',').map(Number);
      path.unshift({
        x: col * gridSize + gridSize / 2,
        y: row * gridSize + gridSize / 2
      });
      current = cameFrom.get(current);
    }
    return path;
  }
  
  // Remember trap location
  rememberTrap(obstacle, currentTime) {
    // Check if we already remember this trap
    const existing = this.trapMemory.find(mem => 
      Math.abs(mem.x - obstacle.x) < 10 && Math.abs(mem.y - obstacle.y) < 10
    );
    
    if (!existing) {
      this.trapMemory.push({
        x: obstacle.x + obstacle.width / 2,
        y: obstacle.y + obstacle.height / 2,
        size: Math.max(obstacle.width, obstacle.height),
        time: currentTime
      });
    }
  }
  
  // Check if position is near a remembered trap
  isNearRememberedTrap(x, y, threshold) {
    for (const trap of this.trapMemory) {
      const dist = Math.hypot(x - trap.x, y - trap.y);
      if (dist < trap.size + threshold) {
        return true;
      }
    }
    return false;
  }
  
  // Draw AI player
  draw(ctx, camX, camY, isIT) {
    ctx.beginPath();
    ctx.arc(this.x - camX, this.y - camY, R, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    if (isIT) {
      ctx.strokeStyle = '#ffd24e';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    // Draw AI indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('AI', this.x - camX, this.y - camY - R - 5);
    
    // Draw path for debugging (optional)
    if (false && this.path.length > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x - camX, this.y - camY);
      for (let i = this.currentPathIndex; i < this.path.length; i++) {
        ctx.lineTo(this.path[i].x - camX, this.path[i].y - camY);
      }
      ctx.stroke();
    }
  }
}