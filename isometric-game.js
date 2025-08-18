// Isometric Wave-Based Game Engine - Zelda-Style Edition
(function() {
    'use strict';

    // Game configuration
    const CONFIG = {
        TILE_WIDTH: 64,     // Larger for better 3D blocks
        TILE_HEIGHT: 32,    // Maintain 2:1 ratio
        TILE_DEPTH: 24,     // Significant depth for 3D blocks
        GRID_WIDTH: 20,     // Smaller for performance with 3D blocks
        GRID_HEIGHT: 20,    // Smaller for performance with 3D blocks
        PLAYER_SPEED: 0.15, // Slower for tile-based movement
        MOVE_SPEED: 8,      // Speed of tile-to-tile animation
        FPS: 60,
        DEBUG: false,
        CAMERA_SMOOTHING: 0.15,
        ZOOM_DEFAULT: 1.3,  // Adjusted for 3D blocks
        ZOOM_MOBILE: 1.0,   // Adjusted zoom for mobile
        VOXEL_HEIGHT: 20,   // Much higher for 3D blocks
        AMBIENT_LIGHT: 0.7, // Balanced lighting
        SHADOW_OPACITY: 0.35 // Stronger shadows for depth
    };

    // Dark Dungeon color palette
    const COLORS = {
        // Dungeon floors and walls
        stoneLight: '#9ca3af',   // Light stone
        stoneDark: '#4b5563',    // Dark stone
        stoneMid: '#6b7280',     // Medium stone
        dungeonFloor: '#374151', // Dark floor
        dungeonWall: '#1f2937',  // Very dark wall
        lava: '#ef4444',         // Bright lava/fire
        lavaDeep: '#dc2626',     // Deep lava
        
        // Dungeon decorations
        torch: '#fbbf24',        // Torch flame
        torchGlow: '#fed7aa',    // Torch glow
        chest: '#92400e',        // Treasure chest
        chestGold: '#fbbf24',    // Gold trim
        barrel: '#7c2d12',       // Wooden barrel
        rockGray: '#6b7280',     // Dungeon rocks
        rockDark: '#374151',     // Dark rocks
        bushGreen: '#15803d',    // Legacy bush green
        bushDark: '#14532d',     // Legacy bush dark
        flowerRed: '#ef4444',    // Legacy flower red
        flowerYellow: '#fde047', // Legacy flower yellow
        flowerBlue: '#60a5fa',   // Legacy flower blue
        
        // Structures
        wallStone: '#78716c',
        wallDark: '#57534e',
        wallLight: '#a8a29e',
        woodBrown: '#92400e',
        woodDark: '#78350f',
        
        // Characters - Dungeon theme
        heroArmor: '#6b7280',    // Knight armor
        heroCloak: '#1e293b',    // Dark cloak
        skeleton: '#e5e7eb',     // Skeleton white
        goblin: '#16a34a',       // Goblin green
        demon: '#dc2626',        // Demon red
        
        // Link colors
        linkGreen: '#16a34a',
        linkHat: '#dc2626',
        
        // Enemy colors
        enemyRed: '#ef4444',
        enemyBlue: '#3b82f6',
        enemyPurple: '#8b5cf6',
        
        // Effects
        heartRed: '#ef4444',
        rupeeGreen: '#10b981',
        rupeeBlue: '#3b82f6',
        magicYellow: '#fbbf24',
        fairyPink: '#ec4899',
        
        // UI
        uiGold: '#f59e0b',
        uiBrown: 'rgba(120, 53, 15, 0.95)',
        uiGreen: 'rgba(34, 197, 94, 0.95)',
        
        // Additional colors
        shieldBlue: '#3b82f6',
        healthGreen: '#10b981',
        
        // Decoration colors
        bushGreen: '#16a34a',
        bushDark: '#15803d',
        rockGray: '#6b7280',
        woodBrown: '#92400e',
        woodDark: '#78350f'
    };

    // Tile types for Dungeon map
    const TILE_TYPES = {
        STONE_FLOOR: 'stone_floor',
        WALL: 'wall',
        LAVA: 'lava',
        CRACKED_FLOOR: 'cracked_floor',
        DARK_FLOOR: 'dark_floor',
        PIT: 'pit',
        WATER: 'water'
    };

    // Dungeon decoration types
    const DECORATION_TYPES = {
        TORCH: 'torch',
        CHEST: 'chest',
        BARREL: 'barrel',
        SKULL: 'skull',
        PILLAR: 'pillar',
        SPIKES: 'spikes',
        BUSH: 'bush',
        ROCK: 'rock',
        FLOWER: 'flower',
        TREE: 'tree',
        POT: 'pot'
    };

    // Device detection
    const isMobile = () => {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (window.innerWidth <= 768) ||
               (navigator.userAgent.includes('Mobile'));
    };

    // Game state
    let canvas, ctx;
    let visualEffects = null;
    let gameState = {
        players: new Map(),
        enemies: [],
        projectiles: [],
        effects: [],
        obstacles: [],
        groundTiles: [],
        decorations: [],
        particles: [],
        mapGrid: [],
        rooms: [],
        animationTime: 0,
        camera: { 
            x: 0, 
            y: 0, 
            targetX: 0,
            targetY: 0,
            zoom: isMobile() ? CONFIG.ZOOM_MOBILE : CONFIG.ZOOM_DEFAULT,
            shake: 0,
            shakeX: 0,
            shakeY: 0
        },
        input: {
            keys: {},
            mouse: { x: 0, y: 0, isDown: false },
            touch: { active: false, x: 0, y: 0 },
            joystick: { x: 0, y: 0, active: false }
        },
        localPlayer: null,
        wave: {
            current: 0,
            enemies: [],
            spawned: 0,
            completed: false,
            preparationTime: 10,
            timer: 0,
            state: 'preparing'
        },
        score: 0,
        rupees: 0,
        hearts: 3,
        maxHearts: 5,
        maxShield: 50,
        maxHealth: 100,
        paused: false,
        gameOver: false,
        lastTime: 0,
        deltaTime: 0,
        deviceType: isMobile() ? 'mobile' : 'desktop'
    };

    // Simple Dungeon Generator for basic level creation
    class DungeonGenerator {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.grid = [];
            this.rooms = [];
        }

        generate() {
            console.log('DungeonGenerator: Starting generation for', this.width, 'x', this.height);
            
            // Initialize grid with walls
            for (let y = 0; y < this.height; y++) {
                this.grid[y] = [];
                for (let x = 0; x < this.width; x++) {
                    this.grid[y][x] = {
                        type: TILE_TYPES.WALL,
                        walkable: false,
                        room: null
                    };
                }
            }
            
            console.log('DungeonGenerator: Grid initialized with walls');

            // Create a proper dungeon layout
            const centerX = Math.floor(this.width / 2);
            const centerY = Math.floor(this.height / 2);
            
            // Main room (start room)
            const startRoom = {
                x: centerX - 2,
                y: centerY - 2,
                width: 4,
                height: 4,
                type: 'start'
            };
            this.rooms.push(startRoom);
            this.carveRoom(startRoom);
            
            console.log('DungeonGenerator: Start room created at', centerX, centerY);

            // Create connected rooms in a logical pattern
            const roomPositions = [
                // Left room
                { x: centerX - 8, y: centerY, width: 3, height: 3, type: 'normal' },
                // Right room
                { x: centerX + 5, y: centerY, width: 3, height: 3, type: 'normal' },
                // Top room
                { x: centerX, y: centerY - 8, width: 3, height: 3, type: 'treasure' },
                // Bottom room
                { x: centerX, y: centerY + 5, width: 3, height: 3, type: 'normal' },
                // Top-left room
                { x: centerX - 8, y: centerY - 8, width: 3, height: 3, type: 'normal' },
                // Top-right room
                { x: centerX + 5, y: centerY - 8, width: 3, height: 3, type: 'normal' },
                // Bottom-left room
                { x: centerX - 8, y: centerY + 5, width: 3, height: 3, type: 'normal' },
                // Bottom-right room
                { x: centerX + 5, y: centerY + 5, width: 3, height: 3, type: 'boss' }
            ];

            // Add rooms that fit within bounds
            for (const pos of roomPositions) {
                if (pos.x >= 0 && pos.y >= 0 && 
                    pos.x + pos.width < this.width && 
                    pos.y + pos.height < this.height) {
                    this.rooms.push(pos);
                    this.carveRoom(pos);
                    console.log('DungeonGenerator: Added room at', pos.x, pos.y, 'type:', pos.type);
                } else {
                    console.log('DungeonGenerator: Room at', pos.x, pos.y, 'does not fit bounds');
                }
            }
            
            console.log('DungeonGenerator: Total rooms created:', this.rooms.length);

            // Connect all rooms with corridors
            this.connectRooms();
            
            // Add some decorative elements
            this.addDecorations();
            
            console.log('DungeonGenerator: Generation complete. Grid size:', this.grid.length, 'x', this.grid[0] ? this.grid[0].length : 0);

            return {
                grid: this.grid,
                rooms: this.rooms,
                startPosition: { x: centerX, y: centerY }
            };
        }

        carveRoom(room) {
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
                        // Create floor tiles with some variation
                        if (x === room.x || x === room.x + room.width - 1 || 
                            y === room.y || y === room.y + room.height - 1) {
                            // Room edges get a different floor type
                            this.grid[y][x].type = TILE_TYPES.DARK_FLOOR;
                        } else {
                            // Room interior gets stone floor with some cracked variation
                            this.grid[y][x].type = Math.random() > 0.8 ? TILE_TYPES.CRACKED_FLOOR : TILE_TYPES.STONE_FLOOR;
                        }
                        this.grid[y][x].walkable = true;
                        this.grid[y][x].room = room;
                    }
                }
            }
        }

        connectRooms() {
            // Connect start room to all other rooms
            const startRoom = this.rooms.find(r => r.type === 'start');
            if (!startRoom) return;

            for (const room of this.rooms) {
                if (room !== startRoom) {
                    this.createCorridor(
                        Math.floor(startRoom.x + startRoom.width / 2),
                        Math.floor(startRoom.y + startRoom.height / 2),
                        Math.floor(room.x + room.width / 2),
                        Math.floor(room.y + room.height / 2)
                    );
                }
            }
        }

        createCorridor(startX, startY, endX, endY) {
            // Create L-shaped corridor
            const midX = startX;
            const midY = endY;

            // Horizontal corridor
            const minX = Math.min(startX, midX);
            const maxX = Math.max(startX, midX);
            for (let x = minX; x <= maxX; x++) {
                if (x >= 0 && startY >= 0 && x < this.width && startY < this.height) {
                    this.grid[startY][x].type = TILE_TYPES.STONE_FLOOR;
                    this.grid[startY][x].walkable = true;
                }
            }

            // Vertical corridor
            const minY = Math.min(midY, endY);
            const maxY = Math.max(midY, endY);
            for (let y = minY; y <= maxY; y++) {
                if (midX >= 0 && y >= 0 && midX < this.width && y < this.height) {
                    this.grid[y][midX].type = TILE_TYPES.STONE_FLOOR;
                    this.grid[y][midX].walkable = true;
                }
            }
        }

        addDecorations() {
            // Add some lava pits in non-room areas
            const numPits = 3;
            for (let i = 0; i < numPits; i++) {
                let attempts = 0;
                let x, y;
                do {
                    x = Math.floor(Math.random() * (this.width - 2)) + 1;
                    y = Math.floor(Math.random() * (this.height - 2)) + 1;
                    attempts++;
                } while (this.grid[y][x].room !== null && attempts < 20);

                if (attempts < 20) {
                    this.grid[y][x].type = TILE_TYPES.LAVA;
                    this.grid[y][x].walkable = false;
                }
            }
        }
    }

    // Particle system for Zelda-style effects
    class Particle {
        constructor(x, y, z, options = {}) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.vx = options.vx || (Math.random() - 0.5) * 2;
            this.vy = options.vy || (Math.random() - 0.5) * 2;
            this.vz = options.vz || Math.random() * 2;
            this.color = options.color || '#ffffff';
            this.size = options.size || 3;
            this.life = options.life || 1;
            this.decay = options.decay || 0.02;
            this.gravity = options.gravity || 0.1;
            this.glow = options.glow || false;
            this.sparkle = options.sparkle || false;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime * 60;
            this.y += this.vy * deltaTime * 60;
            this.z += this.vz * deltaTime * 60;
            this.vz -= this.gravity * deltaTime * 60;
            
            if (this.z < 0) {
                this.z = 0;
                this.vz *= -0.5;
            }
            
            this.life -= this.decay * deltaTime * 60;
            return this.life > 0;
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y, this.z);
            
            ctx.save();
            ctx.globalAlpha = this.life;
            ctx.translate(iso.x, iso.y);
            
            if (this.glow) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
            }
            
            if (this.sparkle && Math.random() > 0.5) {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = this.color;
            }
            
            ctx.beginPath();
            ctx.arc(0, 0, this.size * this.life, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Helper functions
    function shadeColor(color, percent) {
        // Handle undefined or invalid colors
        if (!color || color === undefined) {
            color = "#808080"; // Default gray
        }
        
        // Ensure color is a string
        if (typeof color !== 'string') {
            color = String(color);
        }
        
        // Remove # if present and ensure valid hex
        color = color.replace("#", "");
        if (!/^[0-9A-Fa-f]{6}$/.test(color)) {
            color = "808080"; // Default if invalid hex
        }
        
        const num = parseInt(color, 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    function cartesianToIsometric(x, y, z = 0) {
        return {
            x: (x - y) * CONFIG.TILE_WIDTH / 2,
            y: (x + y) * CONFIG.TILE_HEIGHT / 2 - z * CONFIG.VOXEL_HEIGHT
        };
    }

    function isometricToCartesian(isoX, isoY) {
        return {
            x: (isoX / (CONFIG.TILE_WIDTH / 2) + isoY / (CONFIG.TILE_HEIGHT / 2)) / 2,
            y: (isoY / (CONFIG.TILE_HEIGHT / 2) - isoX / (CONFIG.TILE_WIDTH / 2)) / 2
        };
    }

    // Draw tiles as 3D blocks with significant depth
    function drawZeldaTile(ctx, x, y, type, elevation = 0) {
        const baseZ = elevation * CONFIG.TILE_DEPTH;
        const iso = cartesianToIsometric(x, y, baseZ);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = CONFIG.TILE_WIDTH / 2;
        const h = CONFIG.TILE_HEIGHT / 2;
        const tileHeight = CONFIG.TILE_DEPTH; // Much taller 3D blocks
        
        // Draw strong shadow for 3D blocks
        ctx.save();
        ctx.translate(6, 10); // Larger shadow offset
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.filter = 'blur(4px)';
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.8);
        ctx.lineTo(w * 0.9, 0);
        ctx.lineTo(0, h * 0.8);
        ctx.lineTo(-w * 0.9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        // Draw thick 3D block sides
        let rightColor, leftColor;
        
        // Get base colors for sides based on dungeon tile type
        switch(type) {
            case TILE_TYPES.STONE_FLOOR:
                rightColor = '#374151';
                leftColor = '#1f2937';
                break;
            case TILE_TYPES.DARK_FLOOR:
                rightColor = '#111827';
                leftColor = '#030712';
                break;
            case TILE_TYPES.LAVA:
                rightColor = '#991b1b';
                leftColor = '#7f1d1d';
                break;
            case TILE_TYPES.CRACKED_FLOOR:
                rightColor = '#374151';
                leftColor = '#1f2937';
                break;
            case TILE_TYPES.PIT:
                rightColor = '#000000';
                leftColor = '#000000';
                break;
            case TILE_TYPES.WALL:
                rightColor = '#111827';
                leftColor = '#030712';
                break;
            default:
                rightColor = '#374151';
                leftColor = '#1f2937';
        }
        
        // Right side (darker) - full height block
        const rightGradient = ctx.createLinearGradient(w, -tileHeight, w, tileHeight);
        rightGradient.addColorStop(0, shadeColor(rightColor, -10));
        rightGradient.addColorStop(0.5, shadeColor(rightColor, -25));
        rightGradient.addColorStop(1, shadeColor(rightColor, -40));
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.moveTo(w, -tileHeight);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(0, h - tileHeight);
        ctx.closePath();
        ctx.fill();
        
        // Add edge line for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Left side (medium dark) - full height block
        const leftGradient = ctx.createLinearGradient(-w, -tileHeight, -w, tileHeight);
        leftGradient.addColorStop(0, shadeColor(leftColor, -15));
        leftGradient.addColorStop(0.5, shadeColor(leftColor, -30));
        leftGradient.addColorStop(1, shadeColor(leftColor, -45));
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.moveTo(-w, -tileHeight);
        ctx.lineTo(-w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(0, h - tileHeight);
        ctx.closePath();
        ctx.fill();
        
        // Add edge line for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Dungeon tile gradients with dark atmosphere
        let gradient, baseColor, lightColor, darkColor;
        switch(type) {
            case TILE_TYPES.STONE_FLOOR:
                baseColor = COLORS.stoneMid;
                lightColor = COLORS.stoneLight;
                darkColor = COLORS.stoneDark;
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, lightColor);
                gradient.addColorStop(0.3, '#94a3b8');
                gradient.addColorStop(0.7, baseColor);
                gradient.addColorStop(1, darkColor);
                break;
            case TILE_TYPES.DARK_FLOOR:
                baseColor = COLORS.dungeonFloor;
                lightColor = '#4b5563';
                darkColor = '#111827';
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, lightColor);
                gradient.addColorStop(0.5, baseColor);
                gradient.addColorStop(1, darkColor);
                break;
            case TILE_TYPES.LAVA:
                baseColor = COLORS.lava;
                lightColor = '#fbbf24';
                darkColor = COLORS.lavaDeep;
                // Animated lava glow
                const glowOffset = Math.sin(gameState.animationTime * 0.003 + x * 0.5) * 0.2;
                gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
                gradient.addColorStop(0, lightColor);
                gradient.addColorStop(0.5 + glowOffset, baseColor);
                gradient.addColorStop(1, darkColor);
                break;
            case TILE_TYPES.CRACKED_FLOOR:
                baseColor = '#6b7280';
                lightColor = '#9ca3af';
                darkColor = '#374151';
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, lightColor);
                gradient.addColorStop(0.5, baseColor);
                gradient.addColorStop(1, darkColor);
                break;
            case TILE_TYPES.PIT:
                baseColor = '#111827';
                lightColor = '#1f2937';
                darkColor = '#000000';
                gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
                gradient.addColorStop(0, darkColor);
                gradient.addColorStop(0.7, baseColor);
                gradient.addColorStop(1, lightColor);
                break;
            case TILE_TYPES.WALL:
                baseColor = COLORS.dungeonWall;
                lightColor = '#374151';
                darkColor = '#111827';
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, lightColor);
                gradient.addColorStop(0.5, baseColor);
                gradient.addColorStop(1, darkColor);
                break;
            default:
                gradient = COLORS.stoneMid;
                baseColor = COLORS.stoneMid;
                lightColor = COLORS.stoneLight;
                darkColor = COLORS.stoneDark;
        }
        
        // Draw main tile top surface (elevated on the block)
        ctx.save();
        ctx.translate(0, -tileHeight);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add inner gradient overlay for more depth
        const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.8);
        innerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        innerGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
        innerGradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = innerGradient;
        ctx.fill();
        
        // Strong tile edges for definition
        // Top-left edge (brightest)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
        
        // Top-right edge (bright)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.stroke();
        
        // Bottom edges (darker for depth)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
        
        // Add tile border for clear separation
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore(); // End of elevated top surface
        
        // Tile details for dungeon theme
        if (type === TILE_TYPES.CRACKED_FLOOR) {
            // Cracks in the floor
            const seed = x * 100 + y;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, -h * 0.2);
            ctx.lineTo(0, 0);
            ctx.lineTo(w * 0.2, h * 0.3);
            ctx.stroke();
            
            if ((seed % 3) === 0) {
                ctx.beginPath();
                ctx.moveTo(w * 0.2, -h * 0.3);
                ctx.lineTo(0, 0);
                ctx.lineTo(-w * 0.3, h * 0.2);
                ctx.stroke();
            }
        } else if (type === TILE_TYPES.LAVA) {
            // Lava glow animation
            const glow = Math.sin(gameState.animationTime * 0.003 + x * 0.5 + y * 0.5) * 0.3 + 0.7;
            
            ctx.save();
            ctx.globalAlpha = glow;
            ctx.shadowColor = COLORS.lava;
            ctx.shadowBlur = 10;
            ctx.fillStyle = COLORS.lava;
            ctx.beginPath();
            ctx.moveTo(0, -h * 0.8);
            ctx.lineTo(w * 0.8, 0);
            ctx.lineTo(0, h * 0.8);
            ctx.lineTo(-w * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            // Bubbles
            const bubble = Math.sin(gameState.animationTime * 0.004 + x + y) * 0.5 + 0.5;
            if (bubble > 0.8) {
                ctx.fillStyle = COLORS.torch;
                ctx.globalAlpha = bubble;
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        } else if (type === TILE_TYPES.DARK_FLOOR) {
            // Dark floor details
            const seed = x * 100 + y;
            if ((seed % 7) === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                ctx.beginPath();
                ctx.arc((seed % 5 - 2) * 4, (seed % 3 - 1) * 4, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === TILE_TYPES.STONE_FLOOR) {
            // Stone floor texture
            const seed = x * 100 + y;
            if ((seed % 4) === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.beginPath();
                ctx.arc((seed % 7 - 3) * 3, (seed % 5 - 2) * 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }

    // Enhanced 3D voxel drawing with proper depth and shading
    function drawZeldaVoxel(ctx, x, y, z, width, height, depth, color, options = {}) {
        const iso = cartesianToIsometric(x, y, z + depth);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = width * CONFIG.TILE_WIDTH / 2;
        const h = height * CONFIG.TILE_HEIGHT / 2;
        const d = depth * CONFIG.VOXEL_HEIGHT * 1.5; // Increased height for more 3D effect
        
        // Enhanced shadow with offset and blur
        if (!options.noShadow) {
            ctx.save();
            const shadowIso = cartesianToIsometric(x + width/2, y + height/2, 0);
            ctx.translate(shadowIso.x - iso.x + 4, shadowIso.y - iso.y + d/2 + 6);
            
            // Multi-layer shadow for better depth
            ctx.filter = 'blur(3px)';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 1.1, h * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.filter = 'blur(1px)';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 0.9, h * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.filter = 'none';
            ctx.restore();
        }
        
        // Draw voxel faces with enhanced gradients and shading
        
        // Left face - darkest with gradient
        const leftGradient = ctx.createLinearGradient(-w, -d + h/2, -w, h/2);
        leftGradient.addColorStop(0, shadeColor(color, -25));
        leftGradient.addColorStop(0.5, shadeColor(color, -35));
        leftGradient.addColorStop(1, shadeColor(color, -45));
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Add edge highlight to left face
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        // Right face - medium dark with gradient
        const rightGradient = ctx.createLinearGradient(w, -d + h/2, w, h/2);
        rightGradient.addColorStop(0, shadeColor(color, -10));
        rightGradient.addColorStop(0.5, shadeColor(color, -20));
        rightGradient.addColorStop(1, shadeColor(color, -30));
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Add edge highlight to right face
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        // Top face - brightest with radial gradient for rounded look
        const topGradient = ctx.createRadialGradient(0, -d + h/2, 0, 0, -d + h/2, w);
        topGradient.addColorStop(0, shadeColor(color, 25));
        topGradient.addColorStop(0.3, shadeColor(color, 15));
        topGradient.addColorStop(0.7, shadeColor(color, 5));
        topGradient.addColorStop(1, shadeColor(color, -5));
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        ctx.fill();
        
        // Add specular highlight on top
        const highlightGradient = ctx.createRadialGradient(-w/4, -d + h/4, 0, -w/4, -d + h/4, w/3);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        // Strong outline for better definition
        if (!options.noOutline) {
            ctx.strokeStyle = shadeColor(color, -60);
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8;
            
            // Top edges
            ctx.beginPath();
            ctx.moveTo(0, -d);
            ctx.lineTo(w, -d + h/2);
            ctx.lineTo(0, -d + h);
            ctx.lineTo(-w, -d + h/2);
            ctx.closePath();
            ctx.stroke();
            
            // Vertical edges
            ctx.beginPath();
            ctx.moveTo(0, -d + h);
            ctx.lineTo(0, h);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(w, -d + h/2);
            ctx.lineTo(w, h/2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(-w, -d + h/2);
            ctx.lineTo(-w, h/2);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // Room class for Zelda-style dungeon rooms
    class Room {
        constructor(x, y, width, height, type = 'normal') {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.type = type; // 'normal', 'treasure', 'boss', 'start'
            this.doors = { top: false, right: false, bottom: false, left: false };
            this.visited = false;
            this.cleared = false;
        }

        addDoor(direction) {
            this.doors[direction] = true;
        }

        isInside(px, py) {
            return px >= this.x && px < this.x + this.width &&
                   py >= this.y && py < this.y + this.height;
        }
    }

    // Map generation with navigation validation
    class MapGenerator {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.grid = [];
            this.rooms = [];
            this.paths = [];
        }

        generate() {
            // Initialize grid
            for (let y = 0; y < this.height; y++) {
                this.grid[y] = [];
                for (let x = 0; x < this.width; x++) {
                    this.grid[y][x] = {
                        type: TILE_TYPES.STONE_FLOOR,
                        walkable: true,
                        room: null
                    };
                }
            }

            // Generate rooms
            this.generateRooms();
            
            // Connect rooms with paths
            this.connectRooms();
            
            // Validate navigation
            if (!this.validateNavigation()) {
                // Regenerate if not navigable
                return this.generate();
            }
            
            // Add decorative elements
            this.addDecorations();
            
            return {
                grid: this.grid,
                rooms: this.rooms,
                startPosition: this.getStartPosition()
            };
        }

        generateRooms() {
            // Create main rooms in a grid pattern
            const roomSize = 6;  // Bigger rooms
            const spacing = 3;   // More spacing between rooms
            
            // Start room (center)
            const centerX = Math.floor(this.width / 2) - 3;
            const centerY = Math.floor(this.height / 2) - 3;
            const startRoom = new Room(centerX, centerY, roomSize, roomSize, 'start');
            this.rooms.push(startRoom);
            this.carveRoom(startRoom);
            
            // Generate more rooms for the bigger map
            const positions = [
                // Inner ring
                { x: centerX - roomSize - spacing, y: centerY, type: 'normal' }, // Left
                { x: centerX + roomSize + spacing, y: centerY, type: 'normal' }, // Right
                { x: centerX, y: centerY - roomSize - spacing, type: 'normal' }, // Top
                { x: centerX, y: centerY + roomSize + spacing, type: 'normal' }, // Bottom
                
                // Diagonal rooms
                { x: centerX - roomSize - spacing, y: centerY - roomSize - spacing, type: 'treasure' }, // Top-left
                { x: centerX + roomSize + spacing, y: centerY - roomSize - spacing, type: 'normal' }, // Top-right
                { x: centerX - roomSize - spacing, y: centerY + roomSize + spacing, type: 'normal' }, // Bottom-left
                { x: centerX + roomSize + spacing, y: centerY + roomSize + spacing, type: 'boss' }, // Bottom-right
                
                // Outer ring for bigger map
                { x: centerX - (roomSize + spacing) * 2, y: centerY, type: 'treasure' }, // Far left
                { x: centerX + (roomSize + spacing) * 2, y: centerY, type: 'normal' }, // Far right
                { x: centerX, y: centerY - (roomSize + spacing) * 2, type: 'normal' }, // Far top
                { x: centerX, y: centerY + (roomSize + spacing) * 2, type: 'treasure' }, // Far bottom
                
                // Additional corner rooms
                { x: centerX - (roomSize + spacing) * 2, y: centerY - roomSize - spacing, type: 'normal' },
                { x: centerX + (roomSize + spacing) * 2, y: centerY - roomSize - spacing, type: 'normal' },
                { x: centerX - (roomSize + spacing) * 2, y: centerY + roomSize + spacing, type: 'normal' },
                { x: centerX + (roomSize + spacing) * 2, y: centerY + roomSize + spacing, type: 'boss' }
            ];
            
            for (const pos of positions) {
                if (pos.x >= 0 && pos.y >= 0 && 
                    pos.x + roomSize < this.width && 
                    pos.y + roomSize < this.height) {
                    const room = new Room(pos.x, pos.y, roomSize, roomSize, pos.type);
                    this.rooms.push(room);
                    this.carveRoom(room);
                }
            }
        }

        carveRoom(room) {
            // Add bounds checking to prevent array access errors
            if (!room || typeof room.x !== 'number' || typeof room.y !== 'number' || 
                typeof room.width !== 'number' || typeof room.height !== 'number') {
                return;
            }
            
            const minX = Math.max(0, room.x);
            const maxX = Math.min(this.width - 1, room.x + room.width);
            const minY = Math.max(0, room.y);
            const maxY = Math.min(this.height - 1, room.y + room.height);
            
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
                        if (x === room.x || x === room.x + room.width - 1 || 
                            y === room.y || y === room.y + room.height - 1) {
                            this.grid[y][x].type = TILE_TYPES.DARK_FLOOR;
                        } else {
                            this.grid[y][x].type = (x + y) % 2 === 0 ? TILE_TYPES.CRACKED_FLOOR : TILE_TYPES.STONE_FLOOR;
                        }
                        this.grid[y][x].room = room;
                        this.grid[y][x].walkable = true;
                    }
                }
            }
        }

        connectRooms() {
            // Connect start room to all other rooms
            const startRoom = this.rooms.find(r => r.type === 'start');
            if (!startRoom) return;
            
            for (const room of this.rooms) {
                if (room !== startRoom) {
                    const start = {
                        x: Math.floor(startRoom.x + startRoom.width / 2),
                        y: Math.floor(startRoom.y + startRoom.height / 2)
                    };
                    const end = {
                        x: Math.floor(room.x + room.width / 2),
                        y: Math.floor(room.y + room.height / 2)
                    };
                    this.createPath(start, end);
                }
            }
            
            // Connect some rooms to each other for variety
            for (let i = 0; i < this.rooms.length - 1; i++) {
                for (let j = i + 1; j < this.rooms.length; j++) {
                    if (Math.random() > 0.7) { // 30% chance to connect
                        const start = {
                            x: Math.floor(this.rooms[i].x + this.rooms[i].width / 2),
                            y: Math.floor(this.rooms[i].y + this.rooms[i].height / 2)
                        };
                        const end = {
                            x: Math.floor(this.rooms[j].x + this.rooms[j].width / 2),
                            y: Math.floor(this.rooms[j].y + this.rooms[j].height / 2)
                        };
                        this.createPath(start, end);
                    }
                }
            }
        }

        createPath(start, end) {
            // Add bounds checking to prevent array access errors
            if (!start || !end || typeof start.x !== 'number' || typeof start.y !== 'number' || 
                typeof end.x !== 'number' || typeof end.y !== 'number') {
                return;
            }
            
            const minX = Math.min(start.x, end.x);
            const maxX = Math.max(start.x, end.x);
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            
            // Horizontal path
            for (let x = minX; x <= maxX; x++) {
                if (x >= 0 && start.y >= 0 && x < this.width && start.y < this.height) {
                    this.grid[start.y][x].type = TILE_TYPES.STONE_FLOOR;
                    this.grid[start.y][x].walkable = true;
                    
                    // Add some width to the path
                    if (start.y - 1 >= 0 && start.y - 1 < this.height) {
                        this.grid[start.y - 1][x].type = TILE_TYPES.STONE_FLOOR;
                        this.grid[start.y - 1][x].walkable = true;
                    }
                }
            }
            
            // Vertical path
            const midX = Math.floor((start.x + end.x) / 2);
            for (let y = minY; y <= maxY; y++) {
                if (midX >= 0 && y >= 0 && midX < this.width && y < this.height) {
                    this.grid[y][midX].type = TILE_TYPES.STONE_FLOOR;
                    this.grid[y][midX].walkable = true;
                    
                    // Add some width to the path
                    if (midX - 1 >= 0 && midX - 1 < this.width) {
                        this.grid[y][midX - 1].type = TILE_TYPES.STONE_FLOOR;
                        this.grid[y][midX - 1].walkable = true;
                    }
                }
            }
            
            // Connect the paths if they don't meet
            if (start.x !== end.x && start.y !== end.y) {
                const minX2 = Math.min(midX, end.x);
                const maxX2 = Math.max(midX, end.x);
                for (let x = minX2; x <= maxX2; x++) {
                    if (x >= 0 && end.y >= 0 && x < this.width && end.y < this.height) {
                        this.grid[end.y][x].type = TILE_TYPES.STONE_FLOOR;
                        this.grid[end.y][x].walkable = true;
                        
                        // Add some width to the path
                        if (end.y - 1 >= 0 && end.y - 1 < this.height) {
                            this.grid[end.y - 1][x].type = TILE_TYPES.STONE_FLOOR;
                            this.grid[end.y - 1][x].walkable = true;
                        }
                    }
                }
            }
        }

        validateNavigation() {
            // Use flood fill to check if all rooms are connected
            const visited = new Set();
            const startRoom = this.rooms.find(r => r.type === 'start');
            const queue = [{
                x: Math.floor(startRoom.x + startRoom.width / 2),
                y: Math.floor(startRoom.y + startRoom.height / 2)
            }];
            
            while (queue.length > 0) {
                const pos = queue.shift();
                const key = `${pos.x},${pos.y}`;
                
                if (visited.has(key)) continue;
                if (pos.x < 0 || pos.y < 0 || pos.x >= this.width || pos.y >= this.height) continue;
                if (!this.grid[pos.y][pos.x].walkable) continue;
                
                visited.add(key);
                
                // Check all four directions
                queue.push({ x: pos.x + 1, y: pos.y });
                queue.push({ x: pos.x - 1, y: pos.y });
                queue.push({ x: pos.x, y: pos.y + 1 });
                queue.push({ x: pos.x, y: pos.y - 1 });
            }
            
            // Check if all rooms are reachable
            for (const room of this.rooms) {
                const centerX = Math.floor(room.x + room.width / 2);
                const centerY = Math.floor(room.y + room.height / 2);
                if (!visited.has(`${centerX},${centerY}`)) {
                    return false;
                }
            }
            
            return true;
        }

        addDecorations() {
            // Add dungeon floor variations
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid[y][x].type === TILE_TYPES.STONE_FLOOR) {
                        const rand = Math.random();
                        if (rand > 0.95) {
                            this.grid[y][x].type = TILE_TYPES.CRACKED_FLOOR;
                        } else if (rand > 0.90 && rand <= 0.95) {
                            // Add some dark floor patches for variety
                            this.grid[y][x].type = TILE_TYPES.DARK_FLOOR;
                        }
                    }
                }
            }
            
            // Create lava pits for dungeon
            const numPits = 2 + Math.floor(Math.random() * 2);
            for (let i = 0; i < numPits; i++) {
                const pitX = Math.floor(Math.random() * (this.width - 4)) + 2;
                const pitY = Math.floor(Math.random() * (this.height - 4)) + 2;
                const pitSize = 1 + Math.floor(Math.random() * 2);
                
                for (let py = pitY - pitSize; py <= pitY + pitSize; py++) {
                    for (let px = pitX - pitSize; px <= pitX + pitSize; px++) {
                        if (px >= 0 && py >= 0 && px < this.width && py < this.height &&
                            py >= 0 && py < this.grid.length &&
                            px >= 0 && px < this.grid[py].length &&
                            this.grid[py] && this.grid[py][px] && this.grid[py][px].room === null) {
                            const dist = Math.sqrt(Math.pow(px - pitX, 2) + Math.pow(py - pitY, 2));
                            if (dist <= pitSize) {
                                this.grid[py][px].type = TILE_TYPES.LAVA;
                                this.grid[py][px].walkable = false;
                            }
                        }
                    }
                }
            }
            
            // Add walls at edges for dungeon
            for (let y = 0; y < this.height; y++) {
                if (y >= 0 && y < this.grid.length &&
                    this.grid[y] && this.grid[y][0] && this.grid[y][0].type === TILE_TYPES.STONE_FLOOR && Math.random() > 0.4) {
                    this.grid[y][0].type = TILE_TYPES.WALL;
                    this.grid[y][0].walkable = false;
                }
                if (y >= 0 && y < this.grid.length &&
                    this.grid[y] && this.grid[y][this.width - 1] && this.grid[y][this.width - 1].type === TILE_TYPES.STONE_FLOOR && Math.random() > 0.4) {
                    this.grid[y][this.width - 1].type = TILE_TYPES.WALL;
                    this.grid[y][this.width - 1].walkable = false;
                }
            }
            
            // Add walls to top and bottom edges
            for (let x = 0; x < this.width; x++) {
                if (this.grid[0] && this.grid[0][x] && this.grid[0][x].type === TILE_TYPES.STONE_FLOOR && Math.random() > 0.4) {
                    this.grid[0][x].type = TILE_TYPES.WALL;
                    this.grid[0][x].walkable = false;
                }
                if (this.grid[this.height - 1] && this.grid[this.height - 1][x] && this.grid[this.height - 1][x].type === TILE_TYPES.STONE_FLOOR && Math.random() > 0.4) {
                    this.grid[this.height - 1][x].type = TILE_TYPES.WALL;
                    this.grid[this.height - 1][x].walkable = false;
                }
            }
        }

        getStartPosition() {
            const startRoom = this.rooms.find(r => r.type === 'start');
            if (!startRoom) {
                return { x: this.width / 2, y: this.height / 2 };
            }
            return {
                x: startRoom.x + startRoom.width / 2,
                y: startRoom.y + startRoom.height / 2
            };
        }
    }

    // Zelda-style decoration class
    class Decoration {
        constructor(x, y, type) {
            this.x = x;
            this.y = y;
            this.type = type;
            this.z = 0;
            
            switch(type) {
                // Dungeon decorations
                case DECORATION_TYPES.TORCH:
                    this.width = 0.3;
                    this.height = 0.3;
                    this.depth = 1.2;
                    this.color = COLORS.woodBrown;
                    this.solid = true;
                    this.light = true;
                    break;
                case DECORATION_TYPES.CHEST:
                    this.width = 0.8;
                    this.height = 0.6;
                    this.depth = 0.6;
                    this.color = COLORS.chest;
                    this.solid = true;
                    this.lootable = true;
                    break;
                case DECORATION_TYPES.BARREL:
                    this.width = 0.5;
                    this.height = 0.5;
                    this.depth = 0.7;
                    this.color = COLORS.barrel;
                    this.solid = true;
                    this.breakable = true;
                    break;
                case DECORATION_TYPES.SKULL:
                    this.width = 0.3;
                    this.height = 0.3;
                    this.depth = 0.3;
                    this.color = COLORS.skeleton;
                    this.solid = false;
                    break;
                case DECORATION_TYPES.PILLAR:
                    this.width = 0.8;
                    this.height = 0.8;
                    this.depth = 2.0;
                    this.color = COLORS.stoneLight;
                    this.solid = true;
                    break;
                case DECORATION_TYPES.SPIKES:
                    this.width = 0.6;
                    this.height = 0.6;
                    this.depth = 0.4;
                    this.color = COLORS.stoneDark;
                    this.solid = false;
                    this.damaging = true;
                    break;
                    
                // Legacy decorations (kept for compatibility)
                case DECORATION_TYPES.BUSH:
                    this.width = 0.8;
                    this.height = 0.8;
                    this.depth = 0.6;
                    this.color = COLORS.bushGreen || COLORS.stoneDark;
                    this.solid = true;
                    break;
                case DECORATION_TYPES.ROCK:
                    this.width = 0.6 + Math.random() * 0.4;
                    this.height = 0.6 + Math.random() * 0.4;
                    this.depth = 0.4 + Math.random() * 0.3;
                    this.color = COLORS.rockGray;
                    this.solid = true;
                    break;
                case DECORATION_TYPES.POT:
                    this.width = 0.5;
                    this.height = 0.5;
                    this.depth = 0.6;
                    this.color = COLORS.woodBrown || COLORS.barrel;
                    this.solid = true;
                    this.breakable = true;
                    break;
                case DECORATION_TYPES.FLOWER:
                    this.width = 0.3;
                    this.height = 0.3;
                    this.depth = 0.1;
                    this.color = COLORS.torch; // Use torch color as fallback for flowers in dungeon
                    this.solid = false;
                    break;
                case DECORATION_TYPES.TREE:
                    this.width = 1.2;
                    this.height = 1.2;
                    this.depth = 2.5;
                    this.color = COLORS.bushDark || COLORS.stoneDark;
                    this.solid = true;
                    break;
                    
                // Default fallback
                default:
                    this.width = 0.5;
                    this.height = 0.5;
                    this.depth = 0.5;
                    this.color = COLORS.stoneMid;
                    this.solid = true;
                    break;
            }
        }

        draw(ctx) {
            if (this.type === DECORATION_TYPES.BUSH) {
                // Draw leafy bush
                drawZeldaVoxel(ctx, this.x, this.y, this.z, this.width, this.height, this.depth * 0.6, this.color);
                
                // Add leaves on top
                const leafPositions = [
                    { x: 0.1, y: 0.1, s: 0.3 },
                    { x: -0.1, y: 0.1, s: 0.25 },
                    { x: 0, y: -0.1, s: 0.3 }
                ];
                
                for (const leaf of leafPositions) {
                    drawZeldaVoxel(ctx, 
                        this.x + leaf.x, 
                        this.y + leaf.y, 
                        this.z + this.depth * 0.6, 
                        leaf.s, leaf.s, 0.2, 
                        COLORS.bushDark, 
                        { noShadow: true }
                    );
                }
            } else if (this.type === DECORATION_TYPES.POT) {
                // Clay pot
                drawZeldaVoxel(ctx, this.x, this.y, this.z, this.width, this.height, this.depth, this.color);
                
                // Pot rim
                drawZeldaVoxel(ctx, 
                    this.x - 0.05, this.y - 0.05, 
                    this.z + this.depth * 0.8, 
                    this.width + 0.1, this.height + 0.1, 0.1, 
                    shadeColor(this.color, -20), 
                    { noShadow: true }
                );
            } else if (this.type === DECORATION_TYPES.TREE) {
                // Tree trunk
                drawZeldaVoxel(ctx, 
                    this.x + this.width/2 - 0.2, 
                    this.y + this.height/2 - 0.2, 
                    this.z, 
                    0.4, 0.4, this.depth * 0.6, 
                    COLORS.woodDark
                );
                
                // Tree crown
                drawZeldaVoxel(ctx, this.x, this.y, this.z + this.depth * 0.5, 
                    this.width, this.height, this.depth * 0.5, this.color);
            } else {
                // Default voxel draw
                drawZeldaVoxel(ctx, this.x, this.y, this.z, this.width, this.height, this.depth, this.color);
            }
        }

        checkCollision(entity) {
            if (!this.solid) return false;
            
            // Add bounds checking to prevent crashes
            if (!entity || typeof entity.x !== 'number' || typeof entity.y !== 'number' || typeof entity.radius !== 'number') {
                return false;
            }
            
            return entity.x >= this.x - entity.radius && 
                   entity.x <= this.x + this.width + entity.radius &&
                   entity.y >= this.y - entity.radius && 
                   entity.y <= this.y + this.height + entity.radius;
        }
    }

    // Enhanced Player class with tile-based movement
    class Player {
        constructor(id, x, y) {
            this.id = id;
            // Grid position (tile coordinates)
            this.gridX = Math.floor(x);
            this.gridY = Math.floor(y);
            // Target grid position for movement
            this.targetGridX = this.gridX;
            this.targetGridY = this.gridY;
            // Actual position for smooth animation
            this.x = this.gridX;
            this.y = this.gridY;
            // Movement state
            this.isMoving = false;
            this.moveProgress = 0;
            this.moveSpeed = CONFIG.MOVE_SPEED || 8;
            // Previous position for interpolation
            this.prevX = this.x;
            this.prevY = this.y;
            // Other properties
            this.radius = 0.3;
            this.health = 100;
            this.maxHealth = 100;
            this.shield = 50;
            this.maxShield = 50;
            this.color = COLORS.linkGreen;
            this.hatColor = COLORS.linkHat;
            this.rotation = 0;
            this.targetRotation = 0;
            this.bobOffset = 0;
            this.hitFlash = 0;
            this.lastShot = 0;
            this.shotCooldown = 200;
            this.swordSwing = 0;
            this.facing = 'down';
            this.moveDelay = 0; // Delay between moves
            this.vx = 0; // Velocity for animation
            this.vy = 0; // Velocity for animation
        }

        update(deltaTime) {
            // Update move delay
            if (this.moveDelay > 0) {
                this.moveDelay -= deltaTime;
            }
            
            // Handle tile-based movement
            if (this.isMoving) {
                // Continue moving to target tile
                this.moveProgress += this.moveSpeed * (deltaTime / 1000);
                
                if (this.moveProgress >= 1) {
                    // Reached target tile
                    this.moveProgress = 1;
                    this.gridX = this.targetGridX;
                    this.gridY = this.targetGridY;
                    this.x = this.gridX;
                    this.y = this.gridY;
                    this.isMoving = false;
                    this.moveProgress = 0;
                    this.moveDelay = 0; // No delay for smoother movement
                } else {
                    // Interpolate position
                    this.x = this.prevX + (this.targetGridX - this.prevX) * this.moveProgress;
                    this.y = this.prevY + (this.targetGridY - this.prevY) * this.moveProgress;
                }
            } else if (this.moveDelay <= 0) {
                // Check for new movement input
                let dx = 0, dy = 0;
                
                if (gameState.input.joystick.active) {
                    if (Math.abs(gameState.input.joystick.x) > 0.3) {
                        dx = gameState.input.joystick.x > 0 ? 1 : -1;
                    }
                    if (Math.abs(gameState.input.joystick.y) > 0.3) {
                        dy = gameState.input.joystick.y > 0 ? 1 : -1;
                    }
                    
                    // Debug joystick input
                    if (Math.abs(gameState.input.joystick.x) > 0.1 || Math.abs(gameState.input.joystick.y) > 0.1) {
                        console.log('Joystick input:', gameState.input.joystick.x.toFixed(2), gameState.input.joystick.y.toFixed(2));
                    }
                } else {
                    if (gameState.input.keys['ArrowLeft'] || gameState.input.keys['a']) dx = -1;
                    if (gameState.input.keys['ArrowRight'] || gameState.input.keys['d']) dx = 1;
                    if (gameState.input.keys['ArrowUp'] || gameState.input.keys['w']) dy = -1;
                    if (gameState.input.keys['ArrowDown'] || gameState.input.keys['s']) dy = 1;
                }
                
                // Prevent diagonal movement - prioritize horizontal
                if (dx !== 0 && dy !== 0) {
                    dy = 0;
                }
                
                // Update facing direction and rotation
                if (dx !== 0 || dy !== 0) {
                    if (dx > 0) this.facing = 'right';
                    else if (dx < 0) this.facing = 'left';
                    else if (dy > 0) this.facing = 'down';
                    else if (dy < 0) this.facing = 'up';
                    
                    // Update target rotation for smooth rotation animation
                    this.targetRotation = Math.atan2(dy, dx);
                    
                    // Start moving to new tile
                    const newGridX = this.gridX + dx;
                    const newGridY = this.gridY + dy;
                    
                    // Check bounds
                    if (newGridX >= 0 && newGridX < CONFIG.GRID_WIDTH &&
                        newGridY >= 0 && newGridY < CONFIG.GRID_HEIGHT) {
                        // Check for collision with obstacles
                        let canMove = true;
                        for (const obstacle of gameState.obstacles) {
                            if (Math.floor(obstacle.x) === newGridX && 
                                Math.floor(obstacle.y) === newGridY) {
                                canMove = false;
                                break;
                            }
                        }
                        
                        if (canMove) {
                            this.targetGridX = newGridX;
                            this.targetGridY = newGridY;
                            this.prevX = this.x;
                            this.prevY = this.y;
                            this.isMoving = true;
                            this.moveProgress = 0;
                        }
                    }
                }
            }
            
            // Tile-based movement is handled above
            // Bounds checking is done in the tile movement logic
            
            // Walking animation
            if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
                this.bobOffset = Math.sin(Date.now() * 0.01) * 2;
            } else {
                this.bobOffset *= 0.9;
            }
            
            // Update rotation smoothly (rotation is set during movement input handling above)
            this.rotation += (this.targetRotation - this.rotation) * 0.2;
            
            // Update effects
            if (this.hitFlash > 0) this.hitFlash -= deltaTime * 5;
            if (this.swordSwing > 0) this.swordSwing -= deltaTime * 10;
            
            // Shield regeneration
            if (this.shield < this.maxShield) {
                this.shield += deltaTime * 2;
                if (this.shield > this.maxShield) this.shield = this.maxShield;
            }
        }

        takeDamage(damage) {
            if (typeof damage !== 'number' || damage <= 0) return false;
            
            // Apply damage to shield first, then health
            if (this.shield > 0) {
                const shieldDamage = Math.min(this.shield, damage);
                this.shield -= shieldDamage;
                damage -= shieldDamage;
            }
            
            if (damage > 0) {
                this.health -= damage;
            }
            
            this.hitFlash = 1;
            
            // Create hit effect
            if (gameState.particles && Array.isArray(gameState.particles)) {
                for (let i = 0; i < 8; i++) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.3,
                        {
                            vx: (Math.random() - 0.5) * 4,
                            vy: (Math.random() - 0.5) * 4,
                            vz: Math.random() * 3,
                            color: COLORS.heartRed,
                            size: 3,
                            life: 1,
                            decay: 0.05,
                            glow: true
                        }
                    ));
                }
            }
            
            // Check if player is dead
            if (this.health <= 0) {
                this.health = 0;
                if (gameState.gameOver !== undefined) {
                    gameState.gameOver = true;
                }
                return true; // Player is dead
            }
            
            return false; // Player is still alive
        }

        draw(ctx) {
            const z = 0;
            const bobZ = this.bobOffset * 0.01;
            
            // Ground shadow
            const baseIso = cartesianToIsometric(this.x, this.y, 0);
            ctx.save();
            ctx.translate(baseIso.x, baseIso.y);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 20, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Shield glow
            if (this.shield > 0) {
                const iso = cartesianToIsometric(this.x, this.y, bobZ + 0.4);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.globalAlpha = this.shield / this.maxShield * 0.3;
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.shadowColor = COLORS.shieldBlue;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Link-style character
            const bodyColor = this.hitFlash > 0 ? 
                shadeColor(this.color, this.hitFlash * 50) : this.color;
            
            // Body (tunic)
            drawZeldaVoxel(ctx, this.x - 0.25, this.y - 0.25, z + bobZ, 
                0.5, 0.5, 0.6, bodyColor, { noShadow: true });
            
            // Head
            drawZeldaVoxel(ctx, this.x - 0.15, this.y - 0.15, z + bobZ + 0.6, 
                0.3, 0.3, 0.3, '#fbbf24', { noShadow: true });
            
            // Hat
            drawZeldaVoxel(ctx, this.x - 0.2, this.y - 0.2, z + bobZ + 0.8, 
                0.4, 0.4, 0.15, this.hatColor, { noShadow: true });
            
            // Hat tip
            const iso = cartesianToIsometric(this.x, this.y - 0.3, z + bobZ + 0.95);
            ctx.save();
            ctx.translate(iso.x, iso.y);
            ctx.fillStyle = this.hatColor;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-3, -5);
            ctx.lineTo(3, -5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            
            // Sword
            if (this.swordSwing > 0) {
                const swordAngle = this.rotation + Math.sin(this.swordSwing) * Math.PI / 4;
                const swordX = this.x + Math.cos(swordAngle) * 0.5;
                const swordY = this.y + Math.sin(swordAngle) * 0.5;
                
                drawZeldaVoxel(ctx, swordX - 0.05, swordY - 0.05, z + bobZ + 0.3,
                    0.1, 0.6, 0.05, '#c0c0c0', { noShadow: true });
            }
            
            // Health bar
            this.drawHealthBar(ctx);
        }

        drawHealthBar(ctx) {
            const iso = cartesianToIsometric(this.x, this.y, 1.2);
            
            ctx.save();
            ctx.translate(iso.x, iso.y - 40);
            
            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-25, -4, 50, 8);
            
            // Health
            const healthPercent = this.health / this.maxHealth;
            ctx.fillStyle = healthPercent > 0.3 ? COLORS.healthGreen : COLORS.heartRed;
            ctx.fillRect(-24, -3, 48 * healthPercent, 6);
            
            // Shield
            if (this.shield > 0 && this.maxShield > 0) {
                const shieldPercent = this.shield / this.maxShield;
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.fillRect(-24, 4, 48 * shieldPercent, 3);
            }
            
            ctx.restore();
        }

        shoot(targetX, targetY) {
            const now = Date.now();
            if (now - this.lastShot < this.shotCooldown) return;
            
            this.lastShot = now;
            this.swordSwing = Math.PI * 2;
            
            // Create projectile
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
                    gameState.projectiles.push(new Projectile(
                        this.x, this.y, 
                        (dx / dist) * 8, 
                        (dy / dist) * 8,
                        this.id
                    ));
                }
                
                // Muzzle flash effect
                if (gameState.particles && Array.isArray(gameState.particles)) {
                    for (let i = 0; i < 5; i++) {
                        gameState.particles.push(new Particle(
                            this.x, this.y, 0.3,
                            {
                                vx: (Math.random() - 0.5) * 2,
                                vy: (Math.random() - 0.5) * 2,
                                vz: Math.random() * 2,
                                color: COLORS.magicYellow,
                                size: 2,
                                life: 0.8,
                                decay: 0.04,
                                glow: true
                            }
                        ));
                    }
                }
            }
        }
    }

    // Enemy class with Zelda-style enemies
    class Enemy {
        constructor(x, y, type = 'normal') {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.type = type;
            this.radius = 0.3;
            
            // Set properties based on type
            switch(type) {
                case 'octorok':
                    this.health = 30;
                    this.maxHealth = 30;
                    this.maxShield = 0;
                    this.shield = 0;
                    this.speed = 1.5;
                    this.damage = 10;
                    this.color = COLORS.enemyRed;
                    this.attackRate = 2000;
                    this.attackRange = 5;
                    this.score = 10;
                    break;
                case 'moblin':
                    this.health = 60;
                    this.maxHealth = 60;
                    this.maxShield = 0;
                    this.shield = 0;
                    this.speed = 1;
                    this.damage = 20;
                    this.color = COLORS.enemyBlue;
                    this.attackRate = 3000;
                    this.attackRange = 1.5;
                    this.score = 25;
                    break;
                case 'darknut':
                    this.health = 100;
                    this.maxHealth = 100;
                    this.maxShield = 20;
                    this.shield = 20;
                    this.speed = 0.8;
                    this.damage = 30;
                    this.color = COLORS.enemyPurple;
                    this.attackRate = 2500;
                    this.attackRange = 2;
                    this.score = 50;
                    break;
                default:
                    this.health = 40;
                    this.maxHealth = 40;
                    this.maxShield = 0;
                    this.shield = 0;
                    this.speed = 1.2;
                    this.damage = 15;
                    this.color = COLORS.enemyRed;
                    this.attackRate = 2500;
                    this.attackRange = 3;
                    this.score = 15;
            }
            
            this.lastAttack = 0;
            this.hitFlash = 0;
            this.bobOffset = 0;
            this.state = 'idle';
            this.stateTimer = 0;
        }

        update(deltaTime) {
            // Find nearest player with proper null checking
            let nearestPlayer = null;
            let minDist = Infinity;
            
            if (gameState.players && gameState.players.size > 0) {
                for (const [id, player] of gameState.players) {
                    if (player && typeof player.x === 'number' && typeof player.y === 'number') {
                        const dx = player.x - this.x;
                        const dy = player.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < minDist) {
                            minDist = dist;
                            nearestPlayer = player;
                        }
                    }
                }
            }
            
            if (nearestPlayer && typeof nearestPlayer.x === 'number' && typeof nearestPlayer.y === 'number') {
                const dx = nearestPlayer.x - this.x;
                const dy = nearestPlayer.y - this.y;
                
                // Different AI behaviors
                if (this.type === 'octorok') {
                    // Shoots projectiles from distance
                    if (minDist > this.attackRange * 0.8) {
                        // Move closer
                        this.vx = (dx / minDist) * this.speed;
                        this.vy = (dy / minDist) * this.speed;
                    } else {
                        // Stop and shoot
                        this.vx = 0;
                        this.vy = 0;
                        
                        const now = Date.now();
                        if (now - this.lastAttack > this.attackRate) {
                            this.lastAttack = now;
                            this.shootProjectile(nearestPlayer);
                        }
                    }
                } else {
                    // Melee enemies - chase and attack
                    if (minDist > this.attackRange) {
                        this.vx = (dx / minDist) * this.speed;
                        this.vy = (dy / minDist) * this.speed;
                    } else {
                        this.vx *= 0.5;
                        this.vy *= 0.5;
                        
                        const now = Date.now();
                        if (now - this.lastAttack > this.attackRate) {
                            this.lastAttack = now;
                            if (nearestPlayer.takeDamage && typeof nearestPlayer.takeDamage === 'function') {
                                nearestPlayer.takeDamage(this.damage);
                            }
                            
                            // Impact effect
                            if (gameState.particles && Array.isArray(gameState.particles)) {
                                for (let i = 0; i < 8; i++) {
                                    gameState.particles.push(new Particle(
                                        nearestPlayer.x, nearestPlayer.y, 0.3,
                                        {
                                            vx: (Math.random() - 0.5) * 4,
                                            vy: (Math.random() - 0.5) * 4,
                                            vz: Math.random() * 3,
                                            color: COLORS.heartRed,
                                            size: 3,
                                            life: 1,
                                            decay: 0.05,
                                            glow: true
                                        }
                                    ));
                                }
                            }
                        }
                    }
                }
            } else {
                // No valid player found, idle behavior
                this.vx *= 0.9;
                this.vy *= 0.9;
            }
            
            // Update position with bounds checking
            const newX = this.x + this.vx * deltaTime * 60;
            const newY = this.y + this.vy * deltaTime * 60;
            
            // Check bounds before updating position
            if (newX >= 0 && newX < CONFIG.GRID_WIDTH) {
                this.x = newX;
            }
            if (newY >= 0 && newY < CONFIG.GRID_HEIGHT) {
                this.y = newY;
            }
            
            // Update effects
            if (this.hitFlash > 0) {
                this.hitFlash -= deltaTime * 1000;
            }
            
            this.bobOffset = Math.sin(Date.now() * 0.003) * 0.1;
        }

        shootProjectile(target) {
            if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') return;
            
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const speed = 3;
                const vx = (dx / dist) * speed;
                const vy = (dy / dist) * speed;
                
                if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
                    gameState.projectiles.push(new EnemyProjectile(
                        this.x, this.y, vx, vy, this.damage
                    ));
                }
            }
        }

        takeDamage(damage) {
            if (typeof damage !== 'number' || damage <= 0) return false;
            
            this.health -= damage;
            this.hitFlash = 1;
            
            // Create hit effect
            if (gameState.particles && Array.isArray(gameState.particles)) {
                for (let i = 0; i < 5; i++) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.3,
                        {
                            vx: (Math.random() - 0.5) * 3,
                            vy: (Math.random() - 0.5) * 3,
                            vz: Math.random() * 2,
                            color: COLORS.heartRed,
                            size: 2,
                            life: 0.8,
                            decay: 0.04
                        }
                    ));
                }
            }
            
            // Check if enemy is dead
            if (this.health <= 0) {
                // Add score
                if (gameState.score !== undefined) {
                    gameState.score += this.score;
                }
                
                // Create death effect
                if (gameState.particles && Array.isArray(gameState.particles)) {
                    for (let i = 0; i < 10; i++) {
                        gameState.particles.push(new Particle(
                            this.x, this.y, 0.3,
                            {
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * 4,
                                vz: Math.random() * 3,
                                color: this.color,
                                size: 3,
                                life: 1,
                                decay: 0.03
                            }
                        ));
                    }
                }
                
                return true; // Enemy is dead
            }
            
            return false; // Enemy is still alive
        }

        draw(ctx) {
            const z = 0;
            const bobZ = Math.sin(Date.now() * 0.005 + this.x * 10) * 0.02;
            
            // Better ground shadow with gradient
            const baseIso = cartesianToIsometric(this.x, this.y, 0);
            ctx.save();
            ctx.translate(baseIso.x, baseIso.y);
            
            const shadowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
            shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            shadowGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
            shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = shadowGradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, 22, 11, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            const bodyColor = this.hitFlash > 0 ? 
                shadeColor(this.color, this.hitFlash * 50) : this.color;
            
            // Different shapes for different enemy types with better details
            if (this.type === 'octorok') {
                // Octopus-like enemy - rounded body
                const octoIso = cartesianToIsometric(this.x, this.y, z + bobZ + 0.3);
                ctx.save();
                ctx.translate(octoIso.x, octoIso.y);
                
                // Main body sphere
                const bodyGradient = ctx.createRadialGradient(0, -5, 0, 0, -5, 20);
                bodyGradient.addColorStop(0, shadeColor(bodyColor, 30));
                bodyGradient.addColorStop(0.5, bodyColor);
                bodyGradient.addColorStop(1, shadeColor(bodyColor, -20));
                
                ctx.fillStyle = bodyGradient;
                ctx.beginPath();
                ctx.ellipse(0, -5, 20, 15, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Eye
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(-5, -8, 4, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(-4, -8, 2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
                
                // Animated tentacles
                for (let i = 0; i < 4; i++) {
                    const angle = (Math.PI * 2 / 4) * i + Date.now() * 0.001;
                    const tx = this.x + Math.cos(angle) * 0.35;
                    const ty = this.y + Math.sin(angle) * 0.35;
                    const tentacleWave = Math.sin(Date.now() * 0.003 + i) * 0.05;
                    
                    drawZeldaVoxel(ctx, tx - 0.1, ty - 0.1, z + tentacleWave, 
                        0.2, 0.2, 0.15, shadeColor(bodyColor, -20), { noShadow: true });
                }
            } else if (this.type === 'moblin') {
                // Pig-like enemy with better details
                // Body
                drawZeldaVoxel(ctx, this.x - 0.35, this.y - 0.35, z + bobZ, 
                    0.7, 0.7, 0.7, bodyColor, { noShadow: true });
                
                // Head
                drawZeldaVoxel(ctx, this.x - 0.25, this.y - 0.25, z + bobZ + 0.7, 
                    0.5, 0.5, 0.4, shadeColor(bodyColor, 10), { noShadow: true });
                
                // Snout
                const snoutIso = cartesianToIsometric(this.x, this.y - 0.35, z + bobZ + 0.85);
                ctx.save();
                ctx.translate(snoutIso.x, snoutIso.y);
                ctx.fillStyle = shadeColor(bodyColor, 20);
                ctx.beginPath();
                ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Eyes
                const eyeIso = cartesianToIsometric(this.x, this.y, z + bobZ + 0.9);
                ctx.save();
                ctx.translate(eyeIso.x, eyeIso.y);
                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 5;
                ctx.beginPath();
                ctx.arc(-5, -2, 2, 0, Math.PI * 2);
                ctx.arc(5, -2, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
            } else if (this.type === 'darknut') {
                // Armored knight with metallic appearance
                // Body armor
                drawZeldaVoxel(ctx, this.x - 0.3, this.y - 0.3, z + bobZ, 
                    0.6, 0.6, 0.8, '#4a5568', { noShadow: true });
                
                // Shoulder pads
                drawZeldaVoxel(ctx, this.x - 0.45, this.y - 0.2, z + bobZ + 0.6, 
                    0.15, 0.4, 0.2, '#374151', { noShadow: true });
                drawZeldaVoxel(ctx, this.x + 0.3, this.y - 0.2, z + bobZ + 0.6, 
                    0.15, 0.4, 0.2, '#374151', { noShadow: true });
                
                // Helmet with visor
                drawZeldaVoxel(ctx, this.x - 0.25, this.y - 0.25, z + bobZ + 0.8, 
                    0.5, 0.5, 0.35, '#2d3748', { noShadow: true });
                
                // Glowing eyes
                const knightEyeIso = cartesianToIsometric(this.x, this.y - 0.1, z + bobZ + 0.95);
                ctx.save();
                ctx.translate(knightEyeIso.x, knightEyeIso.y);
                ctx.fillStyle = bodyColor;
                ctx.shadowColor = bodyColor;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(-4, 0, 2, 0, Math.PI * 2);
                ctx.arc(4, 0, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                
                // Shield with emblem
                const shieldIso = cartesianToIsometric(this.x - 0.35, this.y, z + bobZ + 0.4);
                ctx.save();
                ctx.translate(shieldIso.x, shieldIso.y);
                
                const shieldGradient = ctx.createLinearGradient(-5, -10, 5, 10);
                shieldGradient.addColorStop(0, '#6b7280');
                shieldGradient.addColorStop(0.5, '#9ca3af');
                shieldGradient.addColorStop(1, '#4b5563');
                
                ctx.fillStyle = shieldGradient;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(8, -5);
                ctx.lineTo(8, 5);
                ctx.lineTo(0, 10);
                ctx.lineTo(-8, 5);
                ctx.lineTo(-8, -5);
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = '#1f2937';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
                
            } else {
                // Standard enemy with better appearance
                drawZeldaVoxel(ctx, this.x - 0.25, this.y - 0.25, z + bobZ, 
                    0.5, 0.5, 0.6, bodyColor, { noShadow: true });
            }
            
            // Health bar
            const iso = cartesianToIsometric(this.x, this.y, 1);
            ctx.save();
            ctx.translate(iso.x, iso.y - 30);
            
            // Only show if damaged
            if (this.health < this.maxHealth) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-20, -3, 40, 6);
                
                const healthPercent = this.health / this.maxHealth;
                ctx.fillStyle = healthPercent > 0.3 ? COLORS.healthGreen : COLORS.heartRed;
                ctx.fillRect(-19, -2, 38 * healthPercent, 4);
            }
            
            // Shield bar (only for darknut)
            if (this.shield > 0 && this.maxShield > 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(-20, 4, 40, 3);
                
                const shieldPercent = this.shield / this.maxShield;
                ctx.fillStyle = COLORS.shieldBlue;
                ctx.fillRect(-19, 5, 38 * shieldPercent, 1);
            }
            
            ctx.restore();
        }
    }

    // Projectile classes
    class Projectile {
        constructor(x, y, vx, vy, owner) {
            this.x = x;
            this.y = y;
            this.z = 0;
            this.vx = vx;
            this.vy = vy;
            this.vz = 0;
            this.owner = owner;
            this.radius = 0.1;
            this.damage = 20;
            this.lifetime = 2;
            this.trail = [];
            this.color = COLORS.magicYellow;
        }

        update(deltaTime) {
            // Update position
            this.x += this.vx * deltaTime * 60;
            this.y += this.vy * deltaTime * 60;
            this.z += this.vz * deltaTime * 60;
            
            // Gravity effect
            this.vz -= 0.1 * deltaTime * 60;
            
            // Update trail
            if (this.trail && Array.isArray(this.trail)) {
                this.trail.push({
                    x: this.x,
                    y: this.y,
                    z: this.z,
                    life: 1
                });
                
                if (this.trail.length > 10) this.trail.shift();
                this.trail.forEach(t => t.life *= 0.9);
            }
            
            // Check collision with enemies
            if (gameState.enemies && Array.isArray(gameState.enemies)) {
                for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                    const enemy = gameState.enemies[i];
                    if (enemy && typeof enemy.x === 'number' && typeof enemy.y === 'number') {
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < enemy.radius + 0.2) {
                            // Hit enemy
                            if (enemy.takeDamage && typeof enemy.takeDamage === 'function') {
                                enemy.takeDamage(this.damage);
                            }
                            
                            // Impact effect
                            if (gameState.particles && Array.isArray(gameState.particles)) {
                                for (let i = 0; i < 6; i++) {
                                    gameState.particles.push(new Particle(
                                        enemy.x, enemy.y, 0.3,
                                        {
                                            vx: (Math.random() - 0.5) * 3,
                                            vy: (Math.random() - 0.5) * 3,
                                            vz: Math.random() * 2,
                                            color: this.color,
                                            size: 2,
                                            life: 0.8,
                                            decay: 0.04
                                        }
                                    ));
                                }
                            }
                            
                            return false; // Remove projectile
                        }
                    }
                }
            }
            
            // Check if out of bounds
            if (this.x < -1 || this.x > CONFIG.GRID_WIDTH + 1 || 
                this.y < -1 || this.y > CONFIG.GRID_HEIGHT + 1 || 
                this.z < -1) {
                return false;
            }
            
            return true;
        }

        draw(ctx) {
            // Draw trail
            for (const point of this.trail) {
                const iso = cartesianToIsometric(point.x, point.y, 0.3);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.globalAlpha = point.life * 0.5;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, 3 * point.life, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Main projectile
            const iso = cartesianToIsometric(this.x, this.y, 0.3);
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            // Glow effect
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    class EnemyProjectile extends Projectile {
        constructor(x, y, vx, vy, damage) {
            super(x, y, vx, vy, null);
            this.damage = damage;
            this.radius = 0.2;
            this.lifetime = 3;
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.lifetime -= deltaTime;
            
            // Check collision with players
            if (gameState.players && gameState.players.size > 0) {
                for (const [id, player] of gameState.players) {
                    if (player && typeof player.x === 'number' && typeof player.y === 'number' && typeof player.radius === 'number') {
                        const dx = player.x - this.x;
                        const dy = player.y - this.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < player.radius + this.radius) {
                            if (player.takeDamage && typeof player.takeDamage === 'function') {
                                player.takeDamage(this.damage);
                            }
                            return false;
                        }
                    }
                }
            }
            
            // Check bounds
            if (this.x < 0 || this.x > CONFIG.GRID_WIDTH || 
                this.y < 0 || this.y > CONFIG.GRID_HEIGHT || 
                this.lifetime <= 0) {
                return false;
            }
            
            return true;
        }

        draw(ctx) {
            const iso = cartesianToIsometric(this.x, this.y, 0.3);
            ctx.save();
            ctx.translate(iso.x, iso.y);
            
            ctx.fillStyle = COLORS.enemyRed;
            ctx.shadowColor = COLORS.enemyRed;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    }

    // Wave management
    function startWave(waveNumber) {
        gameState.wave.current = waveNumber;
        gameState.wave.state = 'active';
        gameState.wave.spawned = 0;
        gameState.wave.completed = false;
        
        // Wave composition
        const enemyTypes = [];
        const baseCount = 3 + waveNumber * 2;
        
        if (waveNumber <= 2) {
            // Early waves - mostly octoroks
            for (let i = 0; i < baseCount; i++) {
                enemyTypes.push('octorok');
            }
        } else if (waveNumber <= 5) {
            // Mid waves - mix of enemies
            for (let i = 0; i < baseCount * 0.6; i++) {
                enemyTypes.push('octorok');
            }
            for (let i = 0; i < baseCount * 0.4; i++) {
                enemyTypes.push('moblin');
            }
        } else {
            // Late waves - all enemy types
            for (let i = 0; i < baseCount * 0.4; i++) {
                enemyTypes.push('octorok');
            }
            for (let i = 0; i < baseCount * 0.4; i++) {
                enemyTypes.push('moblin');
            }
            for (let i = 0; i < baseCount * 0.2; i++) {
                enemyTypes.push('darknut');
            }
        }
        
        gameState.wave.enemies = enemyTypes;
        console.log(`Starting Wave ${waveNumber} with ${enemyTypes.length} enemies`);
    }

    function spawnEnemy() {
        // Add bounds checking to prevent crashes
        if (!gameState.wave || !gameState.wave.enemies || !Array.isArray(gameState.wave.enemies) || 
            gameState.wave.spawned >= gameState.wave.enemies.length) {
            return;
        }
        
        const type = gameState.wave.enemies[gameState.wave.spawned];
        if (!type) return;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.min(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT) * 0.4;
        
        const x = CONFIG.GRID_WIDTH / 2 + Math.cos(angle) * distance;
        const y = CONFIG.GRID_HEIGHT / 2 + Math.sin(angle) * distance;
        
        const enemy = new Enemy(
            Math.max(1, Math.min(CONFIG.GRID_WIDTH - 1, x)),
            Math.max(1, Math.min(CONFIG.GRID_HEIGHT - 1, y)),
            type
        );
        
        // Add bounds checking for gameState arrays
        if (gameState.enemies && Array.isArray(gameState.enemies)) {
            gameState.enemies.push(enemy);
        }
        
        if (gameState.wave && typeof gameState.wave.spawned === 'number') {
            gameState.wave.spawned++;
        }
        
        // Spawn effect with bounds checking
        if (gameState.particles && Array.isArray(gameState.particles)) {
            for (let i = 0; i < 10; i++) {
                gameState.particles.push(new Particle(
                    enemy.x, enemy.y, 0,
                    {
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        vz: Math.random() * 3,
                        color: enemy.color || COLORS.enemyRed,
                        size: 5,
                        life: 1,
                        decay: 0.03,
                        glow: true
                    }
                ));
            }
        }
    }

    function generateLevel() {
        console.log('Generating level...');
        const mapData = new DungeonGenerator(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT).generate();
        console.log('Map data generated:', mapData);
        
        // Add bounds checking to prevent crashes
        if (!mapData || !mapData.grid || !Array.isArray(mapData.grid)) {
            console.error('Failed to generate level data');
            return { x: CONFIG.GRID_WIDTH / 2, y: CONFIG.GRID_HEIGHT / 2 };
        }
        
        // Create ground tiles with bounds checking
        gameState.groundTiles = [];
        if (mapData.grid && Array.isArray(mapData.grid)) {
            for (let y = 0; y < mapData.grid.length && y < CONFIG.GRID_HEIGHT; y++) {
                if (mapData.grid[y] && Array.isArray(mapData.grid[y])) {
                    for (let x = 0; x < mapData.grid[y].length && x < CONFIG.GRID_WIDTH; x++) {
                        const tileType = mapData.grid[y][x] && mapData.grid[y][x].type ? mapData.grid[y][x].type : TILE_TYPES.STONE_FLOOR;
                        
                        // Create elevated platforms and terrain variation
                        let z = 0;
                        if (tileType === TILE_TYPES.STONE_FLOOR) {
                            z = Math.random() * 0.2;
                        }
                        
                        // Create raised platforms in certain areas
                        if (x > CONFIG.GRID_WIDTH * 0.3 && x < CONFIG.GRID_WIDTH * 0.7 && 
                            y > CONFIG.GRID_HEIGHT * 0.3 && y < CONFIG.GRID_HEIGHT * 0.7) {
                            z += 0.3;
                        }
                        
                        gameState.groundTiles.push({
                            x: x,
                            y: y,
                            z: z,
                            type: tileType,
                            walkable: mapData.grid[y][x] && mapData.grid[y][x].walkable !== undefined ? mapData.grid[y][x].walkable : true
                        });
                    }
                }
            }
        }
        
        console.log('Ground tiles created:', gameState.groundTiles.length);
        
        // Create decorations with bounds checking
        gameState.decorations = [];
        if (mapData.rooms && Array.isArray(mapData.rooms)) {
            for (const room of mapData.rooms) {
                if (room && typeof room.x === 'number' && typeof room.y === 'number' && 
                    typeof room.width === 'number' && typeof room.height === 'number') {
                    
                    // Add decorations to rooms
                    const decorationCount = Math.floor(Math.random() * 3) + 1;
                    for (let i = 0; i < decorationCount; i++) {
                        const x = room.x + Math.random() * room.width;
                        const y = room.y + Math.random() * room.height;
                        
                        // Check if position is walkable
                        if (x >= 0 && y >= 0 && x < CONFIG.GRID_WIDTH && y < CONFIG.GRID_HEIGHT &&
                            Math.floor(y) >= 0 && Math.floor(y) < mapData.grid.length &&
                            mapData.grid[Math.floor(y)] && 
                            Math.floor(x) >= 0 && Math.floor(x) < mapData.grid[Math.floor(y)].length &&
                            mapData.grid[Math.floor(y)][Math.floor(x)] &&
                            mapData.grid[Math.floor(y)][Math.floor(x)].type !== TILE_TYPES.WATER) {
                            
                            const types = [DECORATION_TYPES.BUSH, DECORATION_TYPES.ROCK, DECORATION_TYPES.FLOWER];
                            const type = types[Math.floor(Math.random() * types.length)];
                            
                            gameState.decorations.push(new Decoration(x, y, type));
                        }
                    }
                }
            }
        }
        
        // Add some random decorations in walkable areas
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * CONFIG.GRID_WIDTH;
            const y = Math.random() * CONFIG.GRID_HEIGHT;
            
            if (x >= 0 && y >= 0 && x < CONFIG.GRID_WIDTH && y < CONFIG.GRID_HEIGHT &&
                Math.floor(y) >= 0 && Math.floor(y) < mapData.grid.length &&
                mapData.grid[Math.floor(y)] && 
                Math.floor(x) >= 0 && Math.floor(x) < mapData.grid[Math.floor(y)].length &&
                mapData.grid[Math.floor(y)][Math.floor(x)] &&
                mapData.grid[Math.floor(y)][Math.floor(x)].type === TILE_TYPES.STONE_FLOOR) {
                
                const types = [DECORATION_TYPES.BUSH, DECORATION_TYPES.ROCK, DECORATION_TYPES.FLOWER];
                const type = types[Math.floor(Math.random() * types.length)];
                
                gameState.decorations.push(new Decoration(x, y, type));
            }
        }
        
        console.log('Decorations created:', gameState.decorations.length);
        console.log('Start position:', mapData.startPosition);
        
        return mapData.startPosition || { x: CONFIG.GRID_WIDTH / 2, y: CONFIG.GRID_HEIGHT / 2 };
    }

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function updateCamera(deltaTime) {
        if (gameState.localPlayer) {
            gameState.camera.targetX = gameState.localPlayer.x;
            gameState.camera.targetY = gameState.localPlayer.y;
        }
        
        // Smooth camera movement
        gameState.camera.x += (gameState.camera.targetX - gameState.camera.x) * CONFIG.CAMERA_SMOOTHING;
        gameState.camera.y += (gameState.camera.targetY - gameState.camera.y) * CONFIG.CAMERA_SMOOTHING;
        
        // Camera shake
        if (gameState.camera.shake > 0) {
            gameState.camera.shakeX = (Math.random() - 0.5) * gameState.camera.shake;
            gameState.camera.shakeY = (Math.random() - 0.5) * gameState.camera.shake;
            gameState.camera.shake *= 0.9;
        } else {
            gameState.camera.shakeX = 0;
            gameState.camera.shakeY = 0;
        }
    }

    function update(deltaTime) {
        // Update animation time
        gameState.animationTime += deltaTime;
        
        // Update camera
        updateCamera(deltaTime);
        
        // Update player
        if (gameState.localPlayer && typeof gameState.localPlayer.update === 'function') {
            gameState.localPlayer.update(deltaTime);
        }
        
        // Update enemies with bounds checking
        if (gameState.enemies && Array.isArray(gameState.enemies)) {
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                if (enemy && typeof enemy.update === 'function') {
                    enemy.update(deltaTime);
                }
            }
        }
        
        // Update projectiles with bounds checking
        if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
            for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
                const projectile = gameState.projectiles[i];
                if (projectile && typeof projectile.update === 'function') {
                    if (!projectile.update(deltaTime)) {
                        gameState.projectiles.splice(i, 1);
                    }
                }
            }
        }
        
        // Update particles with bounds checking
        if (gameState.particles && Array.isArray(gameState.particles)) {
            for (let i = gameState.particles.length - 1; i >= 0; i--) {
                const particle = gameState.particles[i];
                if (particle && typeof particle.update === 'function') {
                    if (!particle.update(deltaTime)) {
                        gameState.particles.splice(i, 1);
                    }
                }
            }
        }
        
        // Update visual effects
        if (visualEffects && typeof visualEffects.update === 'function') {
            visualEffects.update(deltaTime);
        }
        
        // Wave management
        if (gameState.wave && gameState.wave.state === 'preparing') {
            gameState.wave.timer -= deltaTime;
            if (gameState.wave.timer <= 0) {
                startWave(gameState.wave.current + 1);
            }
        } else if (gameState.wave && gameState.wave.state === 'active') {
            // Spawn enemies
            if (gameState.wave.spawned < gameState.wave.enemies.length) {
                if (Math.random() < 0.02) { // 2% chance per frame
                    spawnEnemy();
                }
            }
            
            // Check if wave is complete
            if (gameState.wave.spawned >= gameState.wave.enemies.length && 
                gameState.enemies.length === 0) {
                gameState.wave.state = 'preparing';
                gameState.wave.timer = 3;
                gameState.wave.current++;
            }
        }
    }

    function render() {
        // Enable better rendering quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Clean, bright background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');   // Sky blue
        gradient.addColorStop(0.4, '#ADD8E6'); // Light blue
        gradient.addColorStop(0.7, '#B8E6F5'); // Very light blue
        gradient.addColorStop(1, '#E0F6FF');   // Almost white blue
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Subtle cloud effect for cleaner look
        ctx.save();
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < 3; i++) {
            const cloudX = (gameState.animationTime * 0.00001 * (i + 1) % 1.2) * canvas.width - 100;
            const cloudY = 20 + i * 40 + Math.sin(gameState.animationTime * 0.0001 + i) * 5;
            
            // Simple cloud shapes
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
            ctx.arc(cloudX + 25, cloudY + 3, 25, 0, Math.PI * 2);
            ctx.arc(cloudX + 50, cloudY, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        
        // Apply camera transform
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
        
        const cameraIso = cartesianToIsometric(gameState.camera.x, gameState.camera.y);
        ctx.translate(
            -cameraIso.x + gameState.camera.shakeX, 
            -cameraIso.y + gameState.camera.shakeY
        );
        
        // Render order (back to front)
        const renderables = [];
        
        // Add ground tiles with elevation
        if (gameState.groundTiles && Array.isArray(gameState.groundTiles)) {
            for (const tile of gameState.groundTiles) {
                if (tile && typeof tile.x === 'number' && typeof tile.y === 'number') {
                    renderables.push({
                        x: tile.x,
                        y: tile.y,
                        z: tile.z || 0,
                        type: 'tile',
                        data: tile
                    });
                }
            }
        }
        
        // Add decorations
        if (gameState.decorations && Array.isArray(gameState.decorations)) {
            for (const decoration of gameState.decorations) {
                if (decoration && typeof decoration.x === 'number' && typeof decoration.y === 'number') {
                    renderables.push({
                        x: decoration.x,
                        y: decoration.y,
                        z: 0,
                        type: 'decoration',
                        data: decoration
                    });
                }
            }
        }
        
        // Add entities
        if (gameState.players && gameState.players.size > 0) {
            for (const [id, player] of gameState.players) {
                if (player && typeof player.x === 'number' && typeof player.y === 'number') {
                    renderables.push({
                        x: player.x,
                        y: player.y,
                        z: 0.5,
                        type: 'player',
                        data: player
                    });
                }
            }
        }
        
        if (gameState.enemies && Array.isArray(gameState.enemies)) {
            for (const enemy of gameState.enemies) {
                if (enemy && typeof enemy.x === 'number' && typeof enemy.y === 'number') {
                    renderables.push({
                        x: enemy.x,
                        y: enemy.y,
                        z: 0.5,
                        type: 'enemy',
                        data: enemy
                    });
                }
            }
        }
        
        // Sort by depth (y position in isometric)
        renderables.sort((a, b) => {
            const depthA = a.x + a.y + a.z;
            const depthB = b.x + b.y + b.z;
            return depthA - depthB;
        });
        
        // Render everything
        for (const item of renderables) {
            switch(item.type) {
                case 'tile':
                    drawZeldaTile(ctx, item.data.x, item.data.y, item.data.type, item.data.z || 0);
                    break;
                case 'decoration':
                    item.data.draw(ctx);
                    break;
                case 'player':
                    item.data.draw(ctx);
                    break;
                case 'enemy':
                    item.data.draw(ctx);
                    break;
            }
        }
        
        // Render projectiles (always on top)
        if (gameState.projectiles && Array.isArray(gameState.projectiles)) {
            for (const projectile of gameState.projectiles) {
                if (projectile && typeof projectile.draw === 'function') {
                    projectile.draw(ctx);
                }
            }
        }
        
        // Render particles
        if (gameState.particles && Array.isArray(gameState.particles)) {
            for (const particle of gameState.particles) {
                if (particle && typeof particle.draw === 'function') {
                    particle.draw(ctx);
                }
            }
        }
        
        // Render visual effects
        if (visualEffects) {
            visualEffects.render(ctx);
        }
        
        ctx.restore();
        
        // UI rendering
        renderUI();
    }

    function renderUI() {
        // Zelda-style HUD with better styling
        ctx.save();
        
        // Top bar background with gradient
        const uiGradient = ctx.createLinearGradient(0, 0, 0, 80);
        uiGradient.addColorStop(0, 'rgba(26, 31, 58, 0.95)');
        uiGradient.addColorStop(1, 'rgba(26, 31, 58, 0.8)');
        ctx.fillStyle = uiGradient;
        ctx.fillRect(0, 0, canvas.width, 80);
        
        // Add subtle border
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 80);
        ctx.lineTo(canvas.width, 80);
        ctx.stroke();
        
        // Hearts with better rendering
        const heartSize = 30;
        const heartSpacing = 35;
        let x = 20;
        let y = 20;
        
        for (let i = 0; i < gameState.maxHearts; i++) {
            ctx.save();
            ctx.translate(x + i * heartSpacing, y);
            
            // Heart shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.moveTo(15, 7);
            ctx.bezierCurveTo(15, 2, 10, 2, 10, 7);
            ctx.bezierCurveTo(10, 2, 5, 2, 5, 7);
            ctx.bezierCurveTo(5, 2, 0, 2, 0, 7);
            ctx.bezierCurveTo(0, 12, 15, 27, 15, 27);
            ctx.bezierCurveTo(15, 27, 30, 12, 30, 7);
            ctx.bezierCurveTo(30, 2, 25, 2, 25, 7);
            ctx.bezierCurveTo(25, 2, 20, 2, 15, 7);
            ctx.fill();
            
            // Heart container with gradient
            const heartGradient = ctx.createLinearGradient(0, 0, 30, 25);
            heartGradient.addColorStop(0, '#ff6b6b');
            heartGradient.addColorStop(1, '#c92a2a');
            
            ctx.strokeStyle = heartGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(15, 5);
            ctx.bezierCurveTo(15, 0, 10, 0, 10, 5);
            ctx.bezierCurveTo(10, 0, 5, 0, 5, 5);
            ctx.bezierCurveTo(5, 0, 0, 0, 0, 5);
            ctx.bezierCurveTo(0, 10, 15, 25, 15, 25);
            ctx.bezierCurveTo(15, 25, 30, 10, 30, 5);
            ctx.bezierCurveTo(30, 0, 25, 0, 25, 5);
            ctx.bezierCurveTo(25, 0, 20, 0, 15, 5);
            ctx.stroke();
            
            // Fill based on health with better gradient
            if (gameState.localPlayer) {
                const healthPerHeart = gameState.localPlayer.maxHealth / gameState.maxHearts;
                const fillAmount = Math.min(1, Math.max(0, 
                    (gameState.localPlayer.health - i * healthPerHeart) / healthPerHeart));
                
                if (fillAmount > 0) {
                    const fillGradient = ctx.createRadialGradient(15, 10, 0, 15, 10, 15);
                    fillGradient.addColorStop(0, '#ff8787');
                    fillGradient.addColorStop(0.7, COLORS.heartRed);
                    fillGradient.addColorStop(1, '#e03131');
                    
                    ctx.fillStyle = fillGradient;
                    ctx.globalAlpha = fillAmount;
                    ctx.fill();
                    
                    // Add shine effect
                    if (fillAmount === 1) {
                        ctx.globalAlpha = 0.4;
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.ellipse(8, 6, 3, 2, -Math.PI/4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            
            ctx.restore();
        }
        
        // Rupees with better styling
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = COLORS.rupeeGreen;
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`💎 ${gameState.rupees}`, 20, 60);
        
        // Score with gold gradient
        const scoreGradient = ctx.createLinearGradient(canvas.width - 150, 20, canvas.width - 50, 40);
        scoreGradient.addColorStop(0, '#fbbf24');
        scoreGradient.addColorStop(1, COLORS.uiGold);
        ctx.fillStyle = scoreGradient;
        ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`Score: ${gameState.score}`, canvas.width - 150, 35);
        
        // Wave info with better visibility
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        
        if (gameState.wave.state === 'preparing') {
            // Pulsing effect for wave timer
            const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(`Next Wave in: ${Math.ceil(gameState.wave.timer)}`, canvas.width / 2, 35);
            ctx.globalAlpha = 1;
        } else {
            ctx.fillText(`Wave ${gameState.wave.current}`, canvas.width / 2, 35);
            ctx.fillStyle = gameState.enemies.length > 5 ? '#ef4444' : '#ffffff';
            ctx.fillText(`Enemies: ${gameState.enemies.length}`, canvas.width / 2, 60);
        }
        
        ctx.textAlign = 'left';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Game over screen
        if (gameState.gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = COLORS.heartRed;
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '24px Arial';
            ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(`Waves Survived: ${gameState.wave.current}`, canvas.width / 2, canvas.height / 2 + 50);
            ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 100);
            
            ctx.textAlign = 'left';
        }
        
        ctx.restore();
    }

    function gameLoop(timestamp) {
        // Add validation for timestamp to prevent crashes
        if (typeof timestamp !== 'number' || isNaN(timestamp)) {
            console.warn('Invalid timestamp received, using fallback');
            timestamp = performance.now();
        }
        
        const deltaTime = Math.min((timestamp - gameState.lastTime) / 1000, 0.1);
        gameState.lastTime = timestamp;
        gameState.deltaTime = deltaTime;
        
        // Only update if game is properly initialized
        if (gameState && typeof update === 'function') {
            update(deltaTime);
        }
        
        // Only render if canvas and context are valid
        if (canvas && ctx && typeof render === 'function') {
            render();
        }
        
        requestAnimationFrame(gameLoop);
    }

    function handleMouseMove(e) {
        // Add validation to prevent crashes
        if (!canvas || !ctx || !gameState || !gameState.camera) {
            return;
        }
        
        const rect = canvas.getBoundingClientRect();
        if (!rect) {
            return;
        }
        
        const x = (e.clientX - rect.left - canvas.width / 2) / gameState.camera.zoom;
        const y = (e.clientY - rect.top - canvas.height / 2) / gameState.camera.zoom;
        
        const cameraIso = cartesianToIsometric(gameState.camera.x, gameState.camera.y);
        const worldIso = {
            x: x + cameraIso.x,
            y: y + cameraIso.y
        };
        
        const world = isometricToCartesian(worldIso.x, worldIso.y);
        if (world && typeof world.x === 'number' && typeof world.y === 'number') {
            gameState.input.mouse.x = world.x;
            gameState.input.mouse.y = world.y;
        }
    }

    function handleMouseDown(e) {
        if (e.button === 0) {
            // Add validation to prevent crashes
            if (!gameState || !gameState.input) {
                return;
            }
            
            gameState.input.mouse.isDown = true;
            
            if (gameState.localPlayer && typeof gameState.localPlayer.shoot === 'function' && !gameState.gameOver) {
                if (gameState.input.mouse && typeof gameState.input.mouse.x === 'number' && typeof gameState.input.mouse.y === 'number') {
                    gameState.localPlayer.shoot(gameState.input.mouse.x, gameState.input.mouse.y);
                }
            }
        }
    }

    function handleMouseUp(e) {
        if (e.button === 0) {
            gameState.input.mouse.isDown = false;
        }
    }

    function handleKeyDown(e) {
        // Add validation to prevent crashes
        if (!e || !e.key || !gameState || !gameState.input) {
            return;
        }
        
        gameState.input.keys[e.key] = true;
        
        if (e.key === 'r' && gameState.gameOver) {
            // Restart game
            if (typeof init === 'function') {
                init();
            }
        }
    }

    function handleKeyUp(e) {
        // Add validation to prevent crashes
        if (!e || !e.key || !gameState || !gameState.input) {
            return;
        }
        
        gameState.input.keys[e.key] = false;
    }

    function initControls() {
        // Create joystick for all devices
        createJoystick();
        
        // Add keyboard joystick simulation for desktop
        if (!isMobile()) {
            initKeyboardJoystick();
        }
    }

    function initKeyboardJoystick() {
        // Simulate joystick input with keyboard for desktop testing
        window.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'w':
                case 'ArrowUp':
                    gameState.input.joystick.y = -1;
                    gameState.input.joystick.active = true;
                    break;
                case 's':
                case 'ArrowDown':
                    gameState.input.joystick.y = 1;
                    gameState.input.joystick.active = true;
                    break;
                case 'a':
                case 'ArrowLeft':
                    gameState.input.joystick.x = -1;
                    gameState.input.joystick.active = true;
                    break;
                case 'd':
                case 'ArrowRight':
                    gameState.input.joystick.x = 1;
                    gameState.input.joystick.active = true;
                    break;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'w':
                case 's':
                case 'ArrowUp':
                case 'ArrowDown':
                    gameState.input.joystick.y = 0;
                    break;
                case 'a':
                case 'd':
                case 'ArrowLeft':
                case 'ArrowRight':
                    gameState.input.joystick.x = 0;
                    break;
            }
            
            // If no movement keys are pressed, deactivate joystick
            if (gameState.input.joystick.x === 0 && gameState.input.joystick.y === 0) {
                gameState.input.joystick.active = false;
            }
        });
    }

    function createJoystick() {
        // Create joystick container
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 80px;
            width: 120px;
            height: 120px;
            z-index: 1000;
            touch-action: none;
        `;
        document.body.appendChild(joystickContainer);
        
        // Create joystick base
        const joystickBase = document.createElement('div');
        joystickBase.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            border: 3px solid rgba(255, 255, 255, 0.6);
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        `;
        joystickContainer.appendChild(joystickBase);
        
        // Create joystick knob
        const joystickKnob = document.createElement('div');
        joystickKnob.style.cssText = `
            position: absolute;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.8);
            border: 2px solid rgba(255, 255, 255, 0.9);
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: none;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
        `;
        joystickContainer.appendChild(joystickKnob);
        
        // Joystick handling
        let joystickActive = false;
        let joystickStart = { x: 0, y: 0 };
        let joystickCenter = { x: 0, y: 0 };
        
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            joystickActive = true;
            const touch = e.touches[0];
            const rect = joystickContainer.getBoundingClientRect();
            joystickCenter = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            joystickStart = {
                x: touch.clientX,
                y: touch.clientY
            };
        });
        
        window.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const dx = touch.clientX - joystickCenter.x;
            const dy = touch.clientY - joystickCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 50;
            
            let x = dx;
            let y = dy;
            
            if (distance > maxDistance) {
                x = (dx / distance) * maxDistance;
                y = (dy / distance) * maxDistance;
            }
            
            // Update joystick knob position
            joystickKnob.style.left = `${50 + (x / 60) * 50}%`;
            joystickKnob.style.top = `${50 + (y / 60) * 50}%`;
            
            // Update game input with normalized values
            gameState.input.joystick.x = x / maxDistance;
            gameState.input.joystick.y = y / maxDistance;
            gameState.input.joystick.active = true;
        });
        
        window.addEventListener('touchend', (e) => {
            if (!joystickActive) return;
            joystickActive = false;
            joystickKnob.style.left = '50%';
            joystickKnob.style.top = '50%';
            gameState.input.joystick.x = 0;
            gameState.input.joystick.y = 0;
            gameState.input.joystick.active = false;
        });
        
        // Attack button
        const attackButton = document.createElement('div');
        attackButton.id = 'attack-button';
        attackButton.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 80px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.8);
            border: 3px solid rgba(239, 68, 68, 0.9);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            touch-action: none;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
        `;
        attackButton.textContent = '⚔️';
        document.body.appendChild(attackButton);
        
        // Attack button handling
        attackButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Trigger attack action
            if (gameState.localPlayer) {
                gameState.localPlayer.attack();
            }
        });
        
        // Add desktop event handlers
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Prevent context menu
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            console.error('Failed to get canvas context');
            return;
        }
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Initialize visual effects if available
        if (window.VisualEffects && typeof window.VisualEffects === 'function') {
            try {
                visualEffects = new window.VisualEffects(canvas, ctx);
            } catch (error) {
                console.warn('Failed to initialize visual effects:', error);
                visualEffects = null;
            }
        }
        
        // Reset game state with proper initialization
        if (!gameState) {
            gameState = {
                enemies: [],
                projectiles: [],
                particles: [],
                gameOver: false,
                score: 0,
                rupees: 0,
                maxHearts: 5,
                maxShield: 50,
                maxHealth: 100,
                wave: { current: 0, state: 'preparing', timer: 5, spawned: 0, enemies: [] },
                players: new Map(),
                input: { keys: {}, mouse: { x: 0, y: 0, isDown: false }, joystick: { x: 0, y: 0, active: false } },
                camera: { x: 0, y: 0, zoom: CONFIG.ZOOM_DEFAULT },
                animationTime: 0,
                deltaTime: 0,
                lastTime: 0
            };
        } else {
            // Reset existing game state
            gameState.enemies = [];
            gameState.projectiles = [];
            gameState.particles = [];
            gameState.gameOver = false;
            gameState.score = 0;
            gameState.rupees = 0;
            gameState.maxHearts = 5;
            gameState.maxShield = 50;
            gameState.maxHealth = 100;
            gameState.wave.current = 0;
            gameState.wave.state = 'preparing';
            gameState.wave.timer = 5;
            gameState.wave.spawned = 0;
            gameState.wave.enemies = [];
        }
        
        // Generate level
        const startPos = generateLevel();
        if (!startPos || typeof startPos.x !== 'number' || typeof startPos.y !== 'number') {
            console.error('Failed to generate valid start position');
            return;
        }
        
        // Create local player
        const playerId = 'player1';
        try {
            gameState.localPlayer = new Player(playerId, startPos.x, startPos.y);
            gameState.players.set(playerId, gameState.localPlayer);
        } catch (error) {
            console.error('Failed to create player:', error);
            return;
        }
        
        // Setup
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        initControls();
        
        // Start game loop
        gameState.lastTime = performance.now();
        requestAnimationFrame(gameLoop);
        
        console.log('Zelda-style isometric game initialized');
    }

    // Wait for DOM and start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();