// Squad Director for coordinating enemy tactics
// Manages squad formations and tactical decisions

import { Enemy, ENEMY_TYPES } from './enemy-ai.js';

export const SQUAD_TACTICS = {
  BAIT_AND_FLANK: 'bait_and_flank',
  SHIELD_CROSSFIRE: 'shield_crossfire',
  ZONE_AND_PUNISH: 'zone_and_punish',
  SURROUND: 'surround',
  FOCUS_ISOLATED: 'focus_isolated',
  STALL: 'stall'
};

export const SQUAD_COMPOSITIONS = {
  [SQUAD_TACTICS.BAIT_AND_FLANK]: [
    ENEMY_TYPES.BRAWLER,
    ENEMY_TYPES.STALKER,
    ENEMY_TYPES.STALKER
  ],
  [SQUAD_TACTICS.SHIELD_CROSSFIRE]: [
    ENEMY_TYPES.BULWARK,
    ENEMY_TYPES.ARCHER,
    ENEMY_TYPES.ARCHER
  ],
  [SQUAD_TACTICS.ZONE_AND_PUNISH]: [
    ENEMY_TYPES.SABOTEUR,
    ENEMY_TYPES.SKIRMISHER,
    ENEMY_TYPES.SKIRMISHER
  ]
};

export class SquadDirector {
  constructor() {
    this.squads = [];
    this.influenceMap = new InfluenceMap(32, 32); // 32x32 grid
    this.lastDirectorUpdate = 0;
    this.directorUpdateRate = 500; // 2 Hz
    
    // Director AI settings
    this.aggression = 0.5; // 0 to 1
    this.tacticRepeatCount = new Map();
    this.lastTactic = null;
    this.adaptiveMode = false;
    
    // Global blackboard for all squads
    this.globalBlackboard = {
      playersSeparated: false,
      comboMeterHigh: false,
      playersLowHealth: false,
      focusTarget: null,
      retreatVector: { x: 0, y: 0 }
    };
  }
  
  update(dt, players, currentTime) {
    // Update influence map
    this.influenceMap.update(players, this.getAllEnemies());
    
    // Update director AI periodically
    if (currentTime - this.lastDirectorUpdate > this.directorUpdateRate) {
      this.updateDirectorAI(players, currentTime);
      this.lastDirectorUpdate = currentTime;
    }
    
    // Update all squads
    for (const squad of this.squads) {
      squad.update(dt, players, currentTime, this.influenceMap);
    }
    
    // Remove dead squads
    this.squads = this.squads.filter(squad => squad.members.length > 0);
  }
  
  updateDirectorAI(players, currentTime) {
    // Analyze game state
    const playerDistance = this.calculatePlayerSeparation(players);
    this.globalBlackboard.playersSeparated = playerDistance > 200;
    
    const avgPlayerHealth = this.calculateAveragePlayerHealth(players);
    this.globalBlackboard.playersLowHealth = avgPlayerHealth < 0.3;
    
    // Check combo meter (would be passed from game state)
    // this.globalBlackboard.comboMeterHigh = gameState.comboMeter > 0.7;
    
    // Decide on focus target
    this.globalBlackboard.focusTarget = this.selectFocusTarget(players);
    
    // Update squad tactics based on game state
    for (const squad of this.squads) {
      this.updateSquadTactic(squad, players);
    }
  }
  
  spawnSquad(tactic, spawnX, spawnY) {
    const composition = SQUAD_COMPOSITIONS[tactic] || [
      ENEMY_TYPES.BRAWLER,
      ENEMY_TYPES.SKIRMISHER
    ];
    
    const squad = new Squad(tactic);
    
    // Spawn enemies in formation
    const angleStep = (Math.PI * 2) / composition.length;
    const spawnRadius = 40;
    
    for (let i = 0; i < composition.length; i++) {
      const angle = angleStep * i;
      const x = spawnX + Math.cos(angle) * spawnRadius;
      const y = spawnY + Math.sin(angle) * spawnRadius;
      
      const enemy = new Enemy(composition[i], x, y, squad.id);
      enemy.blackboard = squad.blackboard;
      squad.addMember(enemy);
    }
    
    // Announce tactic
    squad.announceTactic();
    
    this.squads.push(squad);
    
    // Track tactic usage for adaptation
    if (this.adaptiveMode) {
      const count = this.tacticRepeatCount.get(tactic) || 0;
      this.tacticRepeatCount.set(tactic, count + 1);
      
      // Change tactics if repeated too much
      if (count >= 3) {
        this.rotateTactics();
      }
    }
    
    this.lastTactic = tactic;
    
    return squad;
  }
  
  updateSquadTactic(squad, players) {
    // Dynamic tactic adjustment based on game state
    if (this.globalBlackboard.playersSeparated && squad.tactic !== SQUAD_TACTICS.FOCUS_ISOLATED) {
      squad.changeTactic(SQUAD_TACTICS.FOCUS_ISOLATED);
      squad.blackboard.targetId = this.globalBlackboard.focusTarget?.playerId;
    } else if (this.globalBlackboard.comboMeterHigh && squad.tactic !== SQUAD_TACTICS.STALL) {
      squad.changeTactic(SQUAD_TACTICS.STALL);
    }
  }
  
  rotateTactics() {
    // Reset repeat counts and choose different tactics
    this.tacticRepeatCount.clear();
    
    // Signal squads to vary their approach
    for (const squad of this.squads) {
      squad.varyApproach = true;
    }
  }
  
  calculatePlayerSeparation(players) {
    if (players.length < 2) return 0;
    return Math.hypot(players[0].x - players[1].x, players[0].y - players[1].y);
  }
  
  calculateAveragePlayerHealth(players) {
    if (players.length === 0) return 1;
    
    let totalHealthRatio = 0;
    for (const player of players) {
      totalHealthRatio += player.health / player.stats.maxHealth;
    }
    
    return totalHealthRatio / players.length;
  }
  
  selectFocusTarget(players) {
    // Select weakest or isolated player
    let target = null;
    let lowestScore = Infinity;
    
    for (const player of players) {
      if (player.isDowned) continue;
      
      const healthScore = player.health / player.stats.maxHealth;
      const isolationScore = this.calculateIsolationScore(player, players);
      const totalScore = healthScore - isolationScore * 0.5;
      
      if (totalScore < lowestScore) {
        lowestScore = totalScore;
        target = player;
      }
    }
    
    return target;
  }
  
  calculateIsolationScore(player, allPlayers) {
    let minDist = Infinity;
    
    for (const other of allPlayers) {
      if (other === player) continue;
      const dist = Math.hypot(other.x - player.x, other.y - player.y);
      minDist = Math.min(minDist, dist);
    }
    
    return Math.min(minDist / 200, 1); // Normalized to 0-1
  }
  
  getAllEnemies() {
    const enemies = [];
    for (const squad of this.squads) {
      enemies.push(...squad.members);
    }
    return enemies;
  }
  
  draw(ctx, camera) {
    // Draw all squads
    for (const squad of this.squads) {
      squad.draw(ctx, camera);
    }
    
    // Debug: Draw influence map
    if (false) { // Set to true for debugging
      this.influenceMap.draw(ctx, camera);
    }
  }
}

class Squad {
  constructor(tactic) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.tactic = tactic;
    this.members = [];
    this.formation = null;
    this.varyApproach = false;
    
    // Squad-specific blackboard
    this.blackboard = {
      targetId: null,
      flankWindowOpen: false,
      reviveDenialSpot: null,
      retreatVector: { x: 0, y: 0 },
      tacticPhase: 0
    };
  }
  
  addMember(enemy) {
    this.members.push(enemy);
    enemy.squadId = this.id;
  }
  
  update(dt, players, currentTime, influenceMap) {
    // Remove dead members
    this.members = this.members.filter(enemy => enemy.health > 0);
    
    if (this.members.length === 0) return;
    
    // Execute squad tactic
    this.executeTactic(dt, players, currentTime, influenceMap);
    
    // Update all members
    for (const enemy of this.members) {
      enemy.update(dt, players, this.members, currentTime);
    }
  }
  
  executeTactic(dt, players, currentTime, influenceMap) {
    switch (this.tactic) {
      case SQUAD_TACTICS.BAIT_AND_FLANK:
        this.executeBaitAndFlank(players, currentTime);
        break;
        
      case SQUAD_TACTICS.SHIELD_CROSSFIRE:
        this.executeShieldCrossfire(players);
        break;
        
      case SQUAD_TACTICS.ZONE_AND_PUNISH:
        this.executeZoneAndPunish(players, influenceMap);
        break;
        
      case SQUAD_TACTICS.FOCUS_ISOLATED:
        this.executeFocusIsolated(players);
        break;
        
      case SQUAD_TACTICS.STALL:
        this.executeStall(players);
        break;
        
      case SQUAD_TACTICS.SURROUND:
        this.executeSurround(players);
        break;
    }
  }
  
  executeBaitAndFlank(players, currentTime) {
    // Brawler draws attention while stalkers flank
    const brawler = this.members.find(m => m.type === ENEMY_TYPES.BRAWLER);
    const stalkers = this.members.filter(m => m.type === ENEMY_TYPES.STALKER);
    
    if (brawler && players.length > 0) {
      // Brawler advances aggressively
      brawler.currentAction = 'advance';
      brawler.utilityScores.advance = 1.0; // Override utility
      
      // Stalkers circle to flank
      for (const stalker of stalkers) {
        stalker.currentAction = 'flank';
        stalker.utilityScores.flank = 1.0;
        
        // Open flank window when brawler is engaged
        const brawlerDist = Math.hypot(brawler.x - players[0].x, brawler.y - players[0].y);
        if (brawlerDist < 100) {
          this.blackboard.flankWindowOpen = true;
        }
      }
    }
  }
  
  executeShieldCrossfire(players) {
    // Bulwark advances with shield while archers maintain angles
    const bulwark = this.members.find(m => m.type === ENEMY_TYPES.BULWARK);
    const archers = this.members.filter(m => m.type === ENEMY_TYPES.ARCHER);
    
    if (bulwark && players.length > 0) {
      // Bulwark pushes forward
      bulwark.currentAction = 'advance';
      
      // Point shield at nearest player
      const nearestPlayer = this.findNearestPlayer(bulwark, players);
      if (nearestPlayer) {
        bulwark.shieldTargetAngle = Math.atan2(
          nearestPlayer.y - bulwark.y,
          nearestPlayer.x - bulwark.x
        );
      }
      
      // Archers maintain diagonal angles
      for (let i = 0; i < archers.length; i++) {
        const archer = archers[i];
        const side = i === 0 ? 1 : -1;
        
        if (nearestPlayer) {
          // Position at 45 degree angle from bulwark-player line
          const baseAngle = Math.atan2(
            nearestPlayer.y - bulwark.y,
            nearestPlayer.x - bulwark.x
          );
          const targetAngle = baseAngle + side * Math.PI / 4;
          const distance = 150;
          
          archer.targetX = bulwark.x + Math.cos(targetAngle) * distance;
          archer.targetY = bulwark.y + Math.sin(targetAngle) * distance;
        }
      }
    }
  }
  
  executeZoneAndPunish(players, influenceMap) {
    // Saboteur lays traps while skirmishers push players into them
    const saboteur = this.members.find(m => m.type === ENEMY_TYPES.SABOTEUR);
    const skirmishers = this.members.filter(m => m.type === ENEMY_TYPES.SKIRMISHER);
    
    if (saboteur && players.length > 0) {
      // Saboteur predicts escape routes using influence map
      const escapeRoutes = influenceMap.findEscapeRoutes(players[0].x, players[0].y);
      
      if (escapeRoutes.length > 0) {
        // Move to block escape route
        saboteur.targetX = escapeRoutes[0].x;
        saboteur.targetY = escapeRoutes[0].y;
      }
      
      // Skirmishers harass and push
      for (const skirmisher of skirmishers) {
        skirmisher.currentAction = 'focus';
        skirmisher.isKiting = true;
        
        // Try to push players towards mines
        if (saboteur.mines.length > 0) {
          const nearestMine = saboteur.mines[0];
          const playerAngle = Math.atan2(
            players[0].y - skirmisher.y,
            players[0].x - skirmisher.x
          );
          const mineAngle = Math.atan2(
            nearestMine.y - players[0].y,
            nearestMine.x - players[0].x
          );
          
          // Position to push player towards mine
          const pushAngle = playerAngle + Math.PI - mineAngle;
          skirmisher.targetX = players[0].x + Math.cos(pushAngle) * 100;
          skirmisher.targetY = players[0].y + Math.sin(pushAngle) * 100;
        }
      }
    }
  }
  
  executeFocusIsolated(players) {
    // All squad members focus on isolated target
    const target = this.selectIsolatedTarget(players);
    
    if (target) {
      this.blackboard.targetId = target.playerId;
      
      for (const member of this.members) {
        member.currentTarget = target;
        member.currentAction = 'focus';
        member.utilityScores.focus = 1.0;
      }
    }
  }
  
  executeStall(players) {
    // Kite and avoid engagement to reset combo meter
    for (const member of this.members) {
      member.currentAction = 'recover';
      
      // Maintain distance
      const nearestPlayer = this.findNearestPlayer(member, players);
      if (nearestPlayer) {
        const angle = Math.atan2(
          member.y - nearestPlayer.y,
          member.x - nearestPlayer.x
        );
        const distance = 200;
        
        member.targetX = nearestPlayer.x + Math.cos(angle) * distance;
        member.targetY = nearestPlayer.y + Math.sin(angle) * distance;
      }
    }
  }
  
  executeSurround(players) {
    if (players.length === 0) return;
    
    const target = players[0];
    const angleStep = (Math.PI * 2) / this.members.length;
    
    for (let i = 0; i < this.members.length; i++) {
      const member = this.members[i];
      const angle = angleStep * i;
      const distance = 100;
      
      member.targetX = target.x + Math.cos(angle) * distance;
      member.targetY = target.y + Math.sin(angle) * distance;
    }
  }
  
  changeTactic(newTactic) {
    this.tactic = newTactic;
    this.blackboard.tacticPhase = 0;
    this.announceTactic();
  }
  
  announceTactic() {
    // Visual/audio cue for tactic change
    console.log(`Squad ${this.id} executing: ${this.tactic}`);
    
    // Each squad member does a "ready" animation
    for (const member of this.members) {
      member.isAnnouncing = true;
      setTimeout(() => { member.isAnnouncing = false; }, 1000);
    }
  }
  
  findNearestPlayer(enemy, players) {
    let nearest = null;
    let minDist = Infinity;
    
    for (const player of players) {
      if (player.isDowned) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    }
    
    return nearest;
  }
  
  selectIsolatedTarget(players) {
    let mostIsolated = null;
    let maxIsolation = 0;
    
    for (const player of players) {
      if (player.isDowned) continue;
      
      let isolation = Infinity;
      for (const other of players) {
        if (other === player || other.isDowned) continue;
        const dist = Math.hypot(other.x - player.x, other.y - player.y);
        isolation = Math.min(isolation, dist);
      }
      
      if (isolation > maxIsolation) {
        maxIsolation = isolation;
        mostIsolated = player;
      }
    }
    
    return mostIsolated;
  }
  
  draw(ctx, camera) {
    // Draw squad formation lines
    if (this.members.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      for (let i = 0; i < this.members.length - 1; i++) {
        const m1 = this.members[i];
        const m2 = this.members[i + 1];
        
        ctx.beginPath();
        ctx.moveTo(m1.x - camera.x, m1.y - camera.y);
        ctx.lineTo(m2.x - camera.x, m2.y - camera.y);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Draw members
    for (const member of this.members) {
      member.draw(ctx, camera);
      
      // Draw announcement indicator
      if (member.isAnnouncing) {
        ctx.save();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(member.x - camera.x, member.y - camera.y, 
          member.stats.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

class InfluenceMap {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = new Float32Array(width * height);
    this.cellSize = 25; // World units per cell
  }
  
  update(players, enemies) {
    // Clear grid
    this.grid.fill(0);
    
    // Add player influence (negative = danger for enemies)
    for (const player of players) {
      if (player.isDowned) continue;
      this.addInfluence(player.x, player.y, -1.0, 5);
    }
    
    // Add enemy influence (positive = control)
    for (const enemy of enemies) {
      this.addInfluence(enemy.x, enemy.y, 0.5, 3);
    }
  }
  
  addInfluence(worldX, worldY, strength, radius) {
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const gx = gridX + x;
        const gy = gridY + y;
        
        if (gx >= 0 && gx < this.width && gy >= 0 && gy < this.height) {
          const dist = Math.sqrt(x * x + y * y);
          const influence = strength * Math.max(0, 1 - dist / radius);
          this.grid[gy * this.width + gx] += influence;
        }
      }
    }
  }
  
  getInfluence(worldX, worldY) {
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    
    if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
      return this.grid[gridY * this.width + gridX];
    }
    
    return 0;
  }
  
  findEscapeRoutes(worldX, worldY) {
    const routes = [];
    const checkRadius = 5;
    const gridX = Math.floor(worldX / this.cellSize);
    const gridY = Math.floor(worldY / this.cellSize);
    
    // Check 8 directions
    const directions = [
      [0, -1], [1, -1], [1, 0], [1, 1],
      [0, 1], [-1, 1], [-1, 0], [-1, -1]
    ];
    
    for (const [dx, dy] of directions) {
      const checkX = gridX + dx * checkRadius;
      const checkY = gridY + dy * checkRadius;
      
      if (checkX >= 0 && checkX < this.width && checkY >= 0 && checkY < this.height) {
        const influence = this.grid[checkY * this.width + checkX];
        
        // Low influence = good escape route
        if (influence < -0.3) {
          routes.push({
            x: checkX * this.cellSize,
            y: checkY * this.cellSize,
            safety: -influence
          });
        }
      }
    }
    
    // Sort by safety
    routes.sort((a, b) => b.safety - a.safety);
    
    return routes;
  }
  
  draw(ctx, camera) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const influence = this.grid[y * this.width + x];
        
        if (Math.abs(influence) > 0.1) {
          const worldX = x * this.cellSize;
          const worldY = y * this.cellSize;
          
          if (influence > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${Math.min(influence, 1)})`;
          } else {
            ctx.fillStyle = `rgba(0, 0, 255, ${Math.min(-influence, 1)})`;
          }
          
          ctx.fillRect(
            worldX - camera.x,
            worldY - camera.y,
            this.cellSize,
            this.cellSize
          );
        }
      }
    }
    
    ctx.restore();
  }
}