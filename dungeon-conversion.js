// Dungeon Conversion for Isometric Game
// This file converts the game to a dark dungeon theme

(function() {
    'use strict';

    // Override the map generation to create dungeon layouts
    window.generateDungeonMap = function(width, height) {
        const grid = [];
        
        // Initialize with stone floor
        for (let y = 0; y < height; y++) {
            grid[y] = [];
            for (let x = 0; x < width; x++) {
                // Create walls around edges
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    grid[y][x] = {
                        type: 'wall',
                        walkable: false,
                        elevation: 0.5
                    };
                } else {
                    grid[y][x] = {
                        type: 'stone_floor',
                        walkable: true,
                        elevation: 0
                    };
                }
            }
        }
        
        // Create dungeon rooms
        const rooms = [];
        const roomCount = 5 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < roomCount; i++) {
            const roomWidth = 4 + Math.floor(Math.random() * 4);
            const roomHeight = 4 + Math.floor(Math.random() * 4);
            const roomX = 2 + Math.floor(Math.random() * (width - roomWidth - 4));
            const roomY = 2 + Math.floor(Math.random() * (height - roomHeight - 4));
            
            rooms.push({ x: roomX, y: roomY, width: roomWidth, height: roomHeight });
            
            // Carve out room
            for (let y = roomY; y < roomY + roomHeight; y++) {
                for (let x = roomX; x < roomX + roomWidth; x++) {
                    // Room edges are walls
                    if (x === roomX || x === roomX + roomWidth - 1 || 
                        y === roomY || y === roomY + roomHeight - 1) {
                        grid[y][x] = {
                            type: 'wall',
                            walkable: false,
                            elevation: 0.5
                        };
                    } else {
                        // Room interior
                        const rand = Math.random();
                        if (rand < 0.7) {
                            grid[y][x] = {
                                type: 'stone_floor',
                                walkable: true,
                                elevation: 0
                            };
                        } else if (rand < 0.85) {
                            grid[y][x] = {
                                type: 'dark_floor',
                                walkable: true,
                                elevation: -0.1
                            };
                        } else if (rand < 0.95) {
                            grid[y][x] = {
                                type: 'cracked_floor',
                                walkable: true,
                                elevation: 0
                            };
                        } else {
                            grid[y][x] = {
                                type: 'lava',
                                walkable: false,
                                elevation: -0.2
                            };
                        }
                    }
                }
            }
        }
        
        // Create corridors between rooms
        for (let i = 0; i < rooms.length - 1; i++) {
            const room1 = rooms[i];
            const room2 = rooms[i + 1];
            
            const startX = Math.floor(room1.x + room1.width / 2);
            const startY = Math.floor(room1.y + room1.height / 2);
            const endX = Math.floor(room2.x + room2.width / 2);
            const endY = Math.floor(room2.y + room2.height / 2);
            
            // Horizontal corridor
            const minX = Math.min(startX, endX);
            const maxX = Math.max(startX, endX);
            for (let x = minX; x <= maxX; x++) {
                if (grid[startY][x].type === 'wall') {
                    grid[startY][x] = {
                        type: 'dark_floor',
                        walkable: true,
                        elevation: 0
                    };
                }
            }
            
            // Vertical corridor
            const minY = Math.min(startY, endY);
            const maxY = Math.max(startY, endY);
            for (let y = minY; y <= maxY; y++) {
                if (grid[y][endX].type === 'wall') {
                    grid[y][endX] = {
                        type: 'dark_floor',
                        walkable: true,
                        elevation: 0
                    };
                }
            }
        }
        
        // Add some pits for danger
        for (let i = 0; i < 5; i++) {
            const pitX = 1 + Math.floor(Math.random() * (width - 2));
            const pitY = 1 + Math.floor(Math.random() * (height - 2));
            if (grid[pitY][pitX].walkable) {
                grid[pitY][pitX] = {
                    type: 'pit',
                    walkable: false,
                    elevation: -0.5
                };
            }
        }
        
        return {
            grid: grid,
            rooms: rooms,
            startPosition: { x: rooms[0].x + 2, y: rooms[0].y + 2 }
        };
    };

    // Dungeon decorations
    window.DungeonDecoration = class {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.radius = 0.3;
            this.solid = true;
            
            switch(type) {
                case 'torch':
                    this.color = '#fbbf24';
                    this.glowRadius = 3;
                    this.solid = false;
                    break;
                case 'chest':
                    this.color = '#92400e';
                    this.radius = 0.4;
                    break;
                case 'barrel':
                    this.color = '#7c2d12';
                    this.radius = 0.35;
                    break;
                case 'skull':
                    this.color = '#e5e7eb';
                    this.radius = 0.2;
                    this.solid = false;
                    break;
                case 'pillar':
                    this.color = '#374151';
                    this.radius = 0.5;
                    break;
                case 'spikes':
                    this.color = '#6b7280';
                    this.radius = 0.3;
                    this.damage = true;
                    break;
            }
        }
        
        draw(ctx, config) {
            const w = config.TILE_WIDTH / 2;
            const h = config.TILE_HEIGHT / 2;
            
            // Draw decoration as 3D object
            if (this.type === 'torch') {
                // Draw torch stand
                ctx.fillStyle = '#374151';
                ctx.fillRect(-2, -10, 4, 10);
                
                // Draw flame with animation
                const flicker = Math.sin(Date.now() * 0.01) * 0.2 + 1;
                const flameGradient = ctx.createRadialGradient(0, -15, 0, 0, -15, 5 * flicker);
                flameGradient.addColorStop(0, '#fef3c7');
                flameGradient.addColorStop(0.5, '#fbbf24');
                flameGradient.addColorStop(1, '#dc2626');
                
                ctx.fillStyle = flameGradient;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.quadraticCurveTo(-3 * flicker, -15, 0, -20 * flicker);
                ctx.quadraticCurveTo(3 * flicker, -15, 0, -10);
                ctx.fill();
                
                // Draw glow effect
                ctx.globalAlpha = 0.3;
                const glowGradient = ctx.createRadialGradient(0, -15, 0, 0, -15, 30);
                glowGradient.addColorStop(0, '#fbbf24');
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.fillRect(-30, -45, 60, 60);
                ctx.globalAlpha = 1;
                
            } else if (this.type === 'chest') {
                // Draw 3D chest
                ctx.fillStyle = this.color;
                ctx.fillRect(-8, -6, 16, 12);
                
                // Chest lid
                ctx.fillStyle = '#a16207';
                ctx.fillRect(-8, -8, 16, 4);
                
                // Gold trim
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 1;
                ctx.strokeRect(-8, -8, 16, 12);
                
                // Lock
                ctx.fillStyle = '#374151';
                ctx.fillRect(-2, -3, 4, 4);
                
            } else if (this.type === 'barrel') {
                // Draw 3D barrel
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, 6, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillRect(-6, -8, 12, 8);
                
                ctx.fillStyle = '#92400e';
                ctx.beginPath();
                ctx.ellipse(0, -8, 6, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Metal bands
                ctx.strokeStyle = '#374151';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.ellipse(0, -2, 6, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.ellipse(0, -6, 6, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                
            } else if (this.type === 'skull') {
                // Draw skull
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, -3, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Eye sockets
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(-2, -3, 1, 0, Math.PI * 2);
                ctx.arc(2, -3, 1, 0, Math.PI * 2);
                ctx.fill();
                
            } else if (this.type === 'pillar') {
                // Draw stone pillar
                ctx.fillStyle = this.color;
                ctx.fillRect(-6, -20, 12, 20);
                
                // Pillar top
                ctx.fillStyle = '#4b5563';
                ctx.fillRect(-8, -22, 16, 4);
                
                // Cracks
                ctx.strokeStyle = '#1f2937';
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(-3, -18);
                ctx.lineTo(-2, -5);
                ctx.stroke();
                
            } else if (this.type === 'spikes') {
                // Draw metal spikes
                ctx.fillStyle = this.color;
                for (let i = -2; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 3, 0);
                    ctx.lineTo(i * 3 - 1, -8);
                    ctx.lineTo(i * 3 + 1, -8);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
    };

    // Dungeon enemies
    window.DungeonEnemy = class {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.health = 100;
            this.speed = 0.02;
            
            switch(type) {
                case 'skeleton':
                    this.color = '#e5e7eb';
                    this.health = 50;
                    this.speed = 0.015;
                    this.damage = 10;
                    break;
                case 'goblin':
                    this.color = '#16a34a';
                    this.health = 75;
                    this.speed = 0.025;
                    this.damage = 15;
                    break;
                case 'demon':
                    this.color = '#dc2626';
                    this.health = 150;
                    this.speed = 0.02;
                    this.damage = 25;
                    break;
                case 'bat':
                    this.color = '#1f2937';
                    this.health = 30;
                    this.speed = 0.04;
                    this.damage = 5;
                    break;
                default:
                    this.color = '#6b7280';
                    this.health = 100;
                    this.damage = 20;
            }
        }
        
        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, -5, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Add enemy-specific details
            if (this.type === 'skeleton') {
                // Skull
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, -8, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = '#dc2626';
                ctx.beginPath();
                ctx.arc(-1, -8, 0.5, 0, Math.PI * 2);
                ctx.arc(1, -8, 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.type === 'demon') {
                // Horns
                ctx.fillStyle = '#7f1d1d';
                ctx.beginPath();
                ctx.moveTo(-3, -8);
                ctx.lineTo(-4, -12);
                ctx.lineTo(-2, -9);
                ctx.moveTo(3, -8);
                ctx.lineTo(4, -12);
                ctx.lineTo(2, -9);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(-1, -6, 0.5, 0, Math.PI * 2);
                ctx.arc(1, -6, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    };

    console.log('Dungeon conversion loaded!');
})();