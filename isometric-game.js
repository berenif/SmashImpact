// Isometric Wave-Based Game Engine - Zelda-Style Edition
(function() {
    'use strict';

    // Game configuration
    const CONFIG = {
        TILE_WIDTH: 64,
        TILE_HEIGHT: 32,
        GRID_WIDTH: 30,  // Increased map size
        GRID_HEIGHT: 30,  // Increased map size
        PLAYER_SPEED: 4,
        FPS: 60,
        DEBUG: false,
        CAMERA_SMOOTHING: 0.15,
        ZOOM_DEFAULT: 1.2,  // Adjusted zoom for bigger map
        ZOOM_MOBILE: 1.0,   // Adjusted zoom for mobile
        VOXEL_HEIGHT: 16,
        AMBIENT_LIGHT: 0.7,  // Brighter ambient light
        SHADOW_OPACITY: 0.2  // Softer shadows
    };

    // Enhanced Zelda-inspired color palette
    const COLORS = {
        // Ground and terrain
        grassLight: '#5eead4',  // Brighter teal-green
        grassDark: '#059669',   // Rich forest green
        grassMid: '#10b981',    // Vibrant emerald
        pathSand: '#fde047',    // Bright golden sand
        pathDirt: '#92400e',    // Warm brown
        water: '#38bdf8',       // Crystal blue
        waterDeep: '#0284c7',   // Deep ocean blue
        
        // Decorations
        bushGreen: '#15803d',
        bushDark: '#14532d',
        flowerRed: '#ef4444',
        flowerYellow: '#fde047',
        flowerBlue: '#60a5fa',
        rockGray: '#6b7280',
        rockDark: '#374151',
        
        // Structures
        wallStone: '#78716c',
        wallDark: '#57534e',
        wallLight: '#a8a29e',
        woodBrown: '#92400e',
        woodDark: '#78350f',
        
        // Characters
        linkGreen: '#22c55e',
        linkHat: '#16a34a',
        enemyRed: '#dc2626',
        enemyBlue: '#2563eb',
        enemyPurple: '#9333ea',
        
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
        healthGreen: '#10b981'
    };

    // Tile types for Zelda-style map
    const TILE_TYPES = {
        GRASS: 'grass',
        PATH: 'path',
        WATER: 'water',
        FLOWER: 'flower',
        SAND: 'sand'
    };

    // Decoration types
    const DECORATION_TYPES = {
        BUSH: 'bush',
        ROCK: 'rock',
        POT: 'pot',
        FLOWER: 'flower',
        TREE: 'tree'
    };

    // Device detection
    const isMobile = () => {
        return ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0) || 
               (window.innerWidth <= 768);
    };

    // Game state
    let canvas, ctx;
    let visualEffects = null;
    let animationTime = 0;
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
        paused: false,
        gameOver: false,
        lastTime: 0,
        deltaTime: 0,
        deviceType: isMobile() ? 'mobile' : 'desktop'
    };

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
        const num = parseInt(color.replace("#",""), 16);
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

    // Zelda-style tile drawing
    function drawZeldaTile(ctx, x, y, type) {
        const iso = cartesianToIsometric(x, y, 0);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = CONFIG.TILE_WIDTH / 2;
        const h = CONFIG.TILE_HEIGHT / 2;
        
        // Add subtle elevation for tiles
        const elevation = 2;
        
        // Draw enhanced tile shadow/depth with gradient
        const shadowGradient = ctx.createLinearGradient(0, -h + elevation, 0, h + elevation);
        shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = shadowGradient;
        ctx.beginPath();
        ctx.moveTo(0, -h + elevation);
        ctx.lineTo(w, elevation);
        ctx.lineTo(0, h + elevation);
        ctx.lineTo(-w, elevation);
        ctx.closePath();
        ctx.fill();
        
        // Base tile with better gradients
        let gradient;
        switch(type) {
            case TILE_TYPES.GRASS:
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, COLORS.grassLight);
                gradient.addColorStop(0.5, COLORS.grassMid);
                gradient.addColorStop(1, COLORS.grassDark);
                break;
            case TILE_TYPES.PATH:
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, '#fde68a');
                gradient.addColorStop(0.5, COLORS.pathSand);
                gradient.addColorStop(1, COLORS.pathDirt);
                break;
            case TILE_TYPES.WATER:
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, '#67e8f9');
                gradient.addColorStop(0.3, COLORS.water);
                gradient.addColorStop(0.7, COLORS.waterDeep);
                gradient.addColorStop(1, '#0e7490');
                break;
            case TILE_TYPES.FLOWER:
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, '#86efac');
                gradient.addColorStop(0.5, COLORS.grassLight);
                gradient.addColorStop(1, COLORS.grassMid);
                break;
            case TILE_TYPES.SAND:
                gradient = ctx.createLinearGradient(-w, -h, w, h);
                gradient.addColorStop(0, '#fef3c7');
                gradient.addColorStop(0.5, '#fed7aa');
                gradient.addColorStop(1, COLORS.pathSand);
                break;
            default:
                gradient = COLORS.grassMid;
        }
        
        // Draw main tile
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add enhanced tile edge highlight for better depth perception
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
        
        // Add subtle bottom edge shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
        
        // Tile details with better visuals
        if (type === TILE_TYPES.GRASS) {
            // Random grass texture
            const seed = x * 100 + y;
            if ((seed % 5) === 0) {
                // Grass blades
                ctx.strokeStyle = COLORS.grassDark;
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.6;
                for (let i = 0; i < 3; i++) {
                    const gx = (Math.sin(seed + i) * 0.5) * w * 0.6;
                    const gy = (Math.cos(seed + i) * 0.5) * h * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(gx, gy);
                    ctx.lineTo(gx - 2, gy - 5);
                    ctx.stroke();
                }
                ctx.globalAlpha = 1;
            }
        } else if (type === TILE_TYPES.FLOWER) {
            // Small flowers with better placement
            const seed = x * 100 + y;
            const flowerColors = [COLORS.flowerRed, COLORS.flowerYellow, COLORS.flowerBlue];
            const color = flowerColors[seed % flowerColors.length];
            
            // Flower shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.ellipse(0, 2, 4, 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Flower petals
            ctx.fillStyle = color;
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const px = Math.cos(angle) * 3;
                const py = Math.sin(angle) * 3;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Flower center
            ctx.fillStyle = COLORS.flowerYellow;
            ctx.beginPath();
            ctx.arc(0, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === TILE_TYPES.WATER) {
            // Better water animation
            const wave = Math.sin(animationTime * 0.002 + x * 0.5 + y * 0.5) * 0.5 + 0.5;
            const wave2 = Math.cos(animationTime * 0.003 - x * 0.3 + y * 0.3) * 0.5 + 0.5;
            
            // Water ripples
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (wave * 0.4) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, w * wave * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + (wave2 * 0.3) + ')';
            ctx.beginPath();
            ctx.arc(w * 0.2, h * 0.2, w * wave2 * 0.3, 0, Math.PI * 2);
            ctx.stroke();
        } else if (type === TILE_TYPES.PATH) {
            // Path texture
            const seed = x * 100 + y;
            if ((seed % 3) === 0) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.beginPath();
                ctx.arc((seed % 7 - 3) * 3, (seed % 5 - 2) * 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }

    // Zelda-style voxel drawing for 3D objects
    function drawZeldaVoxel(ctx, x, y, z, width, height, depth, color, options = {}) {
        const iso = cartesianToIsometric(x, y, z + depth);
        
        ctx.save();
        ctx.translate(iso.x, iso.y);
        
        const w = width * CONFIG.TILE_WIDTH / 2;
        const h = height * CONFIG.TILE_HEIGHT / 2;
        const d = depth * CONFIG.VOXEL_HEIGHT;
        
        // Better shadow at ground level
        if (!options.noShadow) {
            ctx.save();
            const shadowIso = cartesianToIsometric(x + width/2, y + height/2, 0);
            ctx.translate(shadowIso.x - iso.x, shadowIso.y - iso.y + d/2);
            
            // Multi-layer shadow for better depth
            const shadowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
            shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
            shadowGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
            shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = shadowGradient;
            ctx.beginPath();
            ctx.ellipse(0, 0, w * 1.2, h * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw voxel faces with better shading
        
        // Left face - darker shade with gradient
        const leftGradient = ctx.createLinearGradient(-w, -d + h/2, -w, h/2);
        leftGradient.addColorStop(0, shadeColor(color, -15));
        leftGradient.addColorStop(1, shadeColor(color, -35));
        
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.lineTo(-w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Right face - medium shade with gradient
        const rightGradient = ctx.createLinearGradient(w, -d + h/2, w, h/2);
        rightGradient.addColorStop(0, shadeColor(color, -5));
        rightGradient.addColorStop(1, shadeColor(color, -20));
        
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d + h);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(w, h/2);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Top face - brighter with better gradient
        const topGradient = ctx.createRadialGradient(0, -d + h/2, 0, 0, -d + h/2, w);
        topGradient.addColorStop(0, shadeColor(color, 30));
        topGradient.addColorStop(0.5, shadeColor(color, 15));
        topGradient.addColorStop(1, shadeColor(color, 5));
        
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(w, -d + h/2);
        ctx.lineTo(0, -d + h);
        ctx.lineTo(-w, -d + h/2);
        ctx.closePath();
        ctx.fill();
        
        // Better outline for Zelda style with anti-aliasing
        if (!options.noOutline) {
            ctx.strokeStyle = shadeColor(color, -50);
            ctx.lineWidth = 1;
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
                        type: TILE_TYPES.GRASS,
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
            for (let y = room.y; y < room.y + room.height; y++) {
                for (let x = room.x; x < room.x + room.width; x++) {
                    if (x >= 0 && y >= 0 && x < this.width && y < this.height) {
                        // Different tile types for different room types
                        if (room.type === 'treasure') {
                            this.grid[y][x].type = TILE_TYPES.SAND;
                        } else if (room.type === 'boss') {
                            this.grid[y][x].type = (x + y) % 2 === 0 ? TILE_TYPES.PATH : TILE_TYPES.GRASS;
                        } else {
                            this.grid[y][x].type = TILE_TYPES.PATH;
                        }
                        this.grid[y][x].room = room;
                        this.grid[y][x].walkable = true;
                    }
                }
            }
        }

        connectRooms() {
            // Connect all rooms to the start room
            const startRoom = this.rooms.find(r => r.type === 'start');
            
            for (const room of this.rooms) {
                if (room !== startRoom) {
                    this.createPath(startRoom, room);
                }
            }
            
            // Add some extra connections for variety
            for (let i = 0; i < this.rooms.length - 1; i++) {
                for (let j = i + 1; j < this.rooms.length; j++) {
                    if (Math.random() > 0.6) {
                        this.createPath(this.rooms[i], this.rooms[j]);
                    }
                }
            }
        }

        createPath(room1, room2) {
            const start = {
                x: Math.floor(room1.x + room1.width / 2),
                y: Math.floor(room1.y + room1.height / 2)
            };
            const end = {
                x: Math.floor(room2.x + room2.width / 2),
                y: Math.floor(room2.y + room2.height / 2)
            };
            
            // Create L-shaped path
            const midX = Math.random() > 0.5 ? start.x : end.x;
            
            // Horizontal segment
            const minX = Math.min(start.x, midX);
            const maxX = Math.max(start.x, midX);
            for (let x = minX; x <= maxX; x++) {
                if (x >= 0 && start.y >= 0 && x < this.width && start.y < this.height) {
                    this.grid[start.y][x].type = TILE_TYPES.PATH;
                    this.grid[start.y][x].walkable = true;
                    if (start.y > 0) {
                        this.grid[start.y - 1][x].type = TILE_TYPES.PATH;
                        this.grid[start.y - 1][x].walkable = true;
                    }
                }
            }
            
            // Vertical segment
            const minY = Math.min(start.y, end.y);
            const maxY = Math.max(start.y, end.y);
            for (let y = minY; y <= maxY; y++) {
                if (midX >= 0 && y >= 0 && midX < this.width && y < this.height) {
                    this.grid[y][midX].type = TILE_TYPES.PATH;
                    this.grid[y][midX].walkable = true;
                    if (midX > 0) {
                        this.grid[y][midX - 1].type = TILE_TYPES.PATH;
                        this.grid[y][midX - 1].walkable = true;
                    }
                }
            }
            
            // Final horizontal segment
            const minX2 = Math.min(midX, end.x);
            const maxX2 = Math.max(midX, end.x);
            for (let x = minX2; x <= maxX2; x++) {
                if (x >= 0 && end.y >= 0 && x < this.width && end.y < this.height) {
                    this.grid[end.y][x].type = TILE_TYPES.PATH;
                    this.grid[end.y][x].walkable = true;
                    if (end.y > 0) {
                        this.grid[end.y - 1][x].type = TILE_TYPES.PATH;
                        this.grid[end.y - 1][x].walkable = true;
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
            // Add grass variations and flowers with better distribution
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (this.grid[y][x].type === TILE_TYPES.GRASS) {
                        const rand = Math.random();
                        if (rand > 0.92) {
                            this.grid[y][x].type = TILE_TYPES.FLOWER;
                        } else if (rand > 0.88 && rand <= 0.92) {
                            // Add some sand patches for variety
                            this.grid[y][x].type = TILE_TYPES.SAND;
                        }
                    }
                }
            }
            
            // Create water features (ponds and streams)
            const numPonds = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < numPonds; i++) {
                const pondX = Math.floor(Math.random() * (this.width - 4)) + 2;
                const pondY = Math.floor(Math.random() * (this.height - 4)) + 2;
                const pondSize = 2 + Math.floor(Math.random() * 2);
                
                for (let py = pondY - pondSize; py <= pondY + pondSize; py++) {
                    for (let px = pondX - pondSize; px <= pondX + pondSize; px++) {
                        if (px >= 0 && py >= 0 && px < this.width && py < this.height) {
                            const dist = Math.sqrt(Math.pow(px - pondX, 2) + Math.pow(py - pondY, 2));
                            if (dist <= pondSize && this.grid[py][px].room === null) {
                                this.grid[py][px].type = TILE_TYPES.WATER;
                                this.grid[py][px].walkable = false;
                            }
                        }
                    }
                }
            }
            
            // Add decorative water edges
            for (let y = 0; y < this.height; y++) {
                if (this.grid[y][0].type === TILE_TYPES.GRASS && Math.random() > 0.6) {
                    this.grid[y][0].type = TILE_TYPES.WATER;
                    this.grid[y][0].walkable = false;
                }
                if (this.grid[y][this.width - 1].type === TILE_TYPES.GRASS && Math.random() > 0.6) {
                    this.grid[y][this.width - 1].type = TILE_TYPES.WATER;
                    this.grid[y][this.width - 1].walkable = false;
                }
            }
            
            // Add water to top and bottom edges for atmosphere
            for (let x = 0; x < this.width; x++) {
                if (this.grid[0][x].type === TILE_TYPES.GRASS && Math.random() > 0.6) {
                    this.grid[0][x].type = TILE_TYPES.WATER;
                    this.grid[0][x].walkable = false;
                }
                if (this.grid[this.height - 1][x].type === TILE_TYPES.GRASS && Math.random() > 0.6) {
                    this.grid[this.height - 1][x].type = TILE_TYPES.WATER;
                    this.grid[this.height - 1][x].walkable = false;
                }
            }
        }

        getStartPosition() {
            const startRoom = this.rooms.find(r => r.type === 'start');
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
                case DECORATION_TYPES.BUSH:
                    this.width = 0.8;
                    this.height = 0.8;
                    this.depth = 0.6;
                    this.color = COLORS.bushGreen;
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
                    this.color = COLORS.woodBrown;
                    this.solid = true;
                    this.breakable = true;
                    break;
                case DECORATION_TYPES.FLOWER:
                    this.width = 0.3;
                    this.height = 0.3;
                    this.depth = 0.1;
                    const flowerColors = [COLORS.flowerRed, COLORS.flowerYellow, COLORS.flowerBlue];
                    this.color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
                    this.solid = false;
                    break;
                case DECORATION_TYPES.TREE:
                    this.width = 1.2;
                    this.height = 1.2;
                    this.depth = 2.5;
                    this.color = COLORS.bushDark;
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
            
            return entity.x >= this.x - entity.radius && 
                   entity.x <= this.x + this.width + entity.radius &&
                   entity.y >= this.y - entity.radius && 
                   entity.y <= this.y + this.height + entity.radius;
        }
    }

    // Enhanced Player class with Zelda style
    class Player {
        constructor(id, x, y) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
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
        }

        update(deltaTime) {
            // Movement with joystick or keyboard
            let dx = 0, dy = 0;
            
            if (gameState.input.joystick.active) {
                dx = gameState.input.joystick.x;
                dy = gameState.input.joystick.y;
            } else {
                if (gameState.input.keys['ArrowLeft'] || gameState.input.keys['a']) dx = -1;
                if (gameState.input.keys['ArrowRight'] || gameState.input.keys['d']) dx = 1;
                if (gameState.input.keys['ArrowUp'] || gameState.input.keys['w']) dy = -1;
                if (gameState.input.keys['ArrowDown'] || gameState.input.keys['s']) dy = 1;
            }
            
            // Update facing direction
            if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.facing = dx > 0 ? 'right' : 'left';
                } else {
                    this.facing = dy > 0 ? 'down' : 'up';
                }
            }
            
            // Normalize diagonal movement
            if (dx !== 0 && dy !== 0) {
                const mag = Math.sqrt(dx * dx + dy * dy);
                dx /= mag;
                dy /= mag;
            }
            
            this.vx = dx * CONFIG.PLAYER_SPEED;
            this.vy = dy * CONFIG.PLAYER_SPEED;
            
            // Apply movement
            const newX = this.x + this.vx * deltaTime;
            const newY = this.y + this.vy * deltaTime;
            
            // Check bounds and collisions
            if (newX >= this.radius && newX <= CONFIG.GRID_WIDTH - this.radius) {
                let collision = false;
                for (const decoration of gameState.decorations) {
                    if (decoration.checkCollision({ x: newX, y: this.y, radius: this.radius })) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) this.x = newX;
            }
            
            if (newY >= this.radius && newY <= CONFIG.GRID_HEIGHT - this.radius) {
                let collision = false;
                for (const decoration of gameState.decorations) {
                    if (decoration.checkCollision({ x: this.x, y: newY, radius: this.radius })) {
                        collision = true;
                        break;
                    }
                }
                if (!collision) this.y = newY;
            }
            
            // Walking animation
            if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
                this.bobOffset = Math.sin(Date.now() * 0.01) * 2;
            } else {
                this.bobOffset *= 0.9;
            }
            
            // Update rotation smoothly
            if (dx !== 0 || dy !== 0) {
                this.targetRotation = Math.atan2(dy, dx);
            }
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
            // Shield absorbs damage first
            if (this.shield > 0) {
                const shieldDamage = Math.min(damage, this.shield);
                this.shield -= shieldDamage;
                damage -= shieldDamage;
            }
            
            this.health -= damage;
            this.hitFlash = 1;
            
            // Screen shake on hit
            gameState.camera.shake = 5;
            
            // Damage particles
            for (let i = 0; i < 10; i++) {
                gameState.particles.push(new Particle(
                    this.x, this.y, 0.5,
                    {
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 3,
                        color: COLORS.heartRed,
                        size: 4,
                        life: 1,
                        decay: 0.03
                    }
                ));
            }
            
            return this.health <= 0;
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
            if (this.shield > 0) {
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
                gameState.projectiles.push(new Projectile(
                    this.x, this.y, 
                    (dx / dist) * 8, 
                    (dy / dist) * 8,
                    this.id
                ));
                
                // Muzzle flash effect
                for (let i = 0; i < 5; i++) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.3,
                        {
                            vx: (Math.random() - 0.5) * 2,
                            vy: (Math.random() - 0.5) * 2,
                            vz: Math.random() * 2,
                            color: COLORS.magicYellow,
                            size: 3,
                            life: 0.5,
                            decay: 0.05,
                            glow: true
                        }
                    ));
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
            // Find nearest player
            let nearestPlayer = null;
            let minDist = Infinity;
            
            for (const [id, player] of gameState.players) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < minDist) {
                    minDist = dist;
                    nearestPlayer = player;
                }
            }
            
            if (nearestPlayer) {
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
                            nearestPlayer.takeDamage(this.damage);
                            
                            // Impact effect
                            for (let i = 0; i < 8; i++) {
                                gameState.particles.push(new Particle(
                                    nearestPlayer.x, nearestPlayer.y, 0.3,
                                    {
                                        vx: (Math.random() - 0.5) * 4,
                                        vy: (Math.random() - 0.5) * 4,
                                        vz: Math.random() * 3,
                                        color: COLORS.heartRed,
                                        size: 3,
                                        life: 0.8,
                                        decay: 0.04
                                    }
                                ));
                            }
                        }
                    }
                }
            }
            
            // Apply movement
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            
            // Keep in bounds
            this.x = Math.max(this.radius, Math.min(CONFIG.GRID_WIDTH - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(CONFIG.GRID_HEIGHT - this.radius, this.y));
            
            // Walking animation
            if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
                this.bobOffset = Math.sin(Date.now() * 0.008) * 2;
            }
            
            // Update effects
            if (this.hitFlash > 0) this.hitFlash -= deltaTime * 5;
        }

        shootProjectile(target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                gameState.projectiles.push(new EnemyProjectile(
                    this.x, this.y,
                    (dx / dist) * 5,
                    (dy / dist) * 5,
                    this.damage
                ));
            }
        }

        takeDamage(damage) {
            this.health -= damage;
            this.hitFlash = 1;
            
            // Damage number
            if (visualEffects) {
                visualEffects.createDamageNumber(this.x, this.y, damage);
            }
            
            // Hit particles
            for (let i = 0; i < 5; i++) {
                gameState.particles.push(new Particle(
                    this.x, this.y, 0.3,
                    {
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        vz: Math.random() * 2,
                        color: this.color,
                        size: 3,
                        life: 0.6,
                        decay: 0.04
                    }
                ));
            }
            
            if (this.health <= 0) {
                // Death effect
                for (let i = 0; i < 15; i++) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.5,
                        {
                            vx: (Math.random() - 0.5) * 5,
                            vy: (Math.random() - 0.5) * 5,
                            vz: Math.random() * 4,
                            color: this.color,
                            size: 5,
                            life: 1,
                            decay: 0.02,
                            glow: true
                        }
                    ));
                }
                
                // Drop rupee
                if (Math.random() > 0.5) {
                    gameState.particles.push(new Particle(
                        this.x, this.y, 0.5,
                        {
                            vx: 0,
                            vy: 0,
                            vz: 2,
                            color: COLORS.rupeeGreen,
                            size: 8,
                            life: 2,
                            decay: 0.005,
                            sparkle: true
                        }
                    ));
                    gameState.rupees += 1;
                }
                
                gameState.score += this.score;
                return true;
            }
            return false;
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
            
            ctx.restore();
        }
    }

    // Projectile classes
    class Projectile {
        constructor(x, y, vx, vy, owner) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.owner = owner;
            this.radius = 0.1;
            this.damage = 20;
            this.lifetime = 2;
            this.trail = [];
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.lifetime -= deltaTime;
            
            // Trail effect
            this.trail.push({ x: this.x, y: this.y, life: 1 });
            if (this.trail.length > 10) this.trail.shift();
            this.trail.forEach(t => t.life *= 0.9);
            
            // Check collision with enemies
            for (let i = gameState.enemies.length - 1; i >= 0; i--) {
                const enemy = gameState.enemies[i];
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < enemy.radius + this.radius) {
                    if (enemy.takeDamage(this.damage)) {
                        gameState.enemies.splice(i, 1);
                    }
                    return false;
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
            // Draw trail
            for (const point of this.trail) {
                const iso = cartesianToIsometric(point.x, point.y, 0.3);
                ctx.save();
                ctx.translate(iso.x, iso.y);
                ctx.globalAlpha = point.life * 0.5;
                ctx.fillStyle = COLORS.magicYellow;
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
            ctx.shadowColor = COLORS.magicYellow;
            ctx.shadowBlur = 10;
            ctx.fillStyle = COLORS.magicYellow;
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
        }

        update(deltaTime) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.lifetime -= deltaTime;
            
            // Check collision with players
            for (const [id, player] of gameState.players) {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < player.radius + this.radius) {
                    player.takeDamage(this.damage);
                    return false;
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
        if (gameState.wave.spawned >= gameState.wave.enemies.length) return;
        
        const type = gameState.wave.enemies[gameState.wave.spawned];
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.min(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT) * 0.4;
        
        const x = CONFIG.GRID_WIDTH / 2 + Math.cos(angle) * distance;
        const y = CONFIG.GRID_HEIGHT / 2 + Math.sin(angle) * distance;
        
        const enemy = new Enemy(
            Math.max(1, Math.min(CONFIG.GRID_WIDTH - 1, x)),
            Math.max(1, Math.min(CONFIG.GRID_HEIGHT - 1, y)),
            type
        );
        
        gameState.enemies.push(enemy);
        gameState.wave.spawned++;
        
        // Spawn effect
        for (let i = 0; i < 10; i++) {
            gameState.particles.push(new Particle(
                enemy.x, enemy.y, 0,
                {
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    vz: Math.random() * 3,
                    color: enemy.color,
                    size: 5,
                    life: 1,
                    decay: 0.03,
                    glow: true
                }
            ));
        }
    }

    function generateLevel() {
        // Generate Zelda-style map
        const mapGen = new MapGenerator(CONFIG.GRID_WIDTH, CONFIG.GRID_HEIGHT);
        const mapData = mapGen.generate();
        
        gameState.mapGrid = mapData.grid;
        gameState.rooms = mapData.rooms;
        
        // Convert grid to tiles
        gameState.groundTiles = [];
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                gameState.groundTiles.push({
                    x, y,
                    type: mapData.grid[y][x].type
                });
            }
        }
        
        // Add decorations
        gameState.decorations = [];
        for (const room of mapData.rooms) {
            // Add decorations around room edges
            if (room.type === 'treasure') {
                // Treasure room - add pots
                for (let i = 0; i < 4; i++) {
                    gameState.decorations.push(new Decoration(
                        room.x + 0.5 + Math.random() * (room.width - 1),
                        room.y + 0.5 + Math.random() * (room.height - 1),
                        DECORATION_TYPES.POT
                    ));
                }
            } else if (room.type === 'boss') {
                // Boss room - add rocks
                for (let i = 0; i < 3; i++) {
                    gameState.decorations.push(new Decoration(
                        room.x + 0.5 + Math.random() * (room.width - 1),
                        room.y + 0.5 + Math.random() * (room.height - 1),
                        DECORATION_TYPES.ROCK
                    ));
                }
            } else if (room.type !== 'start') {
                // Normal rooms - mixed decorations
                for (let i = 0; i < 2; i++) {
                    const types = [DECORATION_TYPES.BUSH, DECORATION_TYPES.ROCK, DECORATION_TYPES.FLOWER];
                    const type = types[Math.floor(Math.random() * types.length)];
                    gameState.decorations.push(new Decoration(
                        room.x + 0.5 + Math.random() * (room.width - 1),
                        room.y + 0.5 + Math.random() * (room.height - 1),
                        type
                    ));
                }
            }
        }
        
        // Add more trees at map edges for the bigger map
        for (let i = 0; i < 12; i++) {
            const edge = Math.floor(Math.random() * 4);
            let x, y;
            
            switch(edge) {
                case 0: // Top
                    x = Math.random() * CONFIG.GRID_WIDTH;
                    y = 0.5 + Math.random() * 2;
                    break;
                case 1: // Right
                    x = CONFIG.GRID_WIDTH - 0.5 - Math.random() * 2;
                    y = Math.random() * CONFIG.GRID_HEIGHT;
                    break;
                case 2: // Bottom
                    x = Math.random() * CONFIG.GRID_WIDTH;
                    y = CONFIG.GRID_HEIGHT - 0.5 - Math.random() * 2;
                    break;
                case 3: // Left
                    x = 0.5 + Math.random() * 2;
                    y = Math.random() * CONFIG.GRID_HEIGHT;
                    break;
            }
            
            if (Math.floor(y) >= 0 && Math.floor(y) < CONFIG.GRID_HEIGHT &&
                Math.floor(x) >= 0 && Math.floor(x) < CONFIG.GRID_WIDTH &&
                mapData.grid[Math.floor(y)][Math.floor(x)].type !== TILE_TYPES.WATER) {
                gameState.decorations.push(new Decoration(x, y, DECORATION_TYPES.TREE));
            }
        }
        
        // Add scattered decorations throughout the map
        for (let i = 0; i < 20; i++) {
            const x = Math.random() * CONFIG.GRID_WIDTH;
            const y = Math.random() * CONFIG.GRID_HEIGHT;
            const types = [DECORATION_TYPES.BUSH, DECORATION_TYPES.ROCK, DECORATION_TYPES.FLOWER];
            const type = types[Math.floor(Math.random() * types.length)];
            
            if (Math.floor(y) >= 0 && Math.floor(y) < CONFIG.GRID_HEIGHT &&
                Math.floor(x) >= 0 && Math.floor(x) < CONFIG.GRID_WIDTH &&
                mapData.grid[Math.floor(y)][Math.floor(x)].type === TILE_TYPES.GRASS) {
                gameState.decorations.push(new Decoration(x, y, type));
            }
        }
        
        return mapData.startPosition;
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
        if (gameState.paused || gameState.gameOver) return;
        
        // Update animation time
        animationTime += deltaTime * 1000;
        
        // Update camera
        updateCamera(deltaTime);
        
        // Update player
        if (gameState.localPlayer) {
            gameState.localPlayer.update(deltaTime);
            
            // Check game over
            if (gameState.localPlayer.health <= 0) {
                gameState.gameOver = true;
            }
        }
        
        // Update enemies
        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            gameState.enemies[i].update(deltaTime);
        }
        
        // Update projectiles
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            if (!gameState.projectiles[i].update(deltaTime)) {
                gameState.projectiles.splice(i, 1);
            }
        }
        
        // Update particles
        for (let i = gameState.particles.length - 1; i >= 0; i--) {
            if (!gameState.particles[i].update(deltaTime)) {
                gameState.particles.splice(i, 1);
            }
        }
        
        // Update visual effects
        if (visualEffects) {
            visualEffects.update(deltaTime);
        }
        
        // Wave management
        if (gameState.wave.state === 'preparing') {
            gameState.wave.timer -= deltaTime;
            if (gameState.wave.timer <= 0) {
                startWave(gameState.wave.current + 1);
            }
        } else if (gameState.wave.state === 'active') {
            // Spawn enemies gradually
            if (gameState.wave.spawned < gameState.wave.enemies.length) {
                if (Math.random() < 0.02) {
                    spawnEnemy();
                }
            }
            
            // Check wave completion
            if (gameState.wave.spawned >= gameState.wave.enemies.length && 
                gameState.enemies.length === 0) {
                gameState.wave.state = 'preparing';
                gameState.wave.timer = 10;
                gameState.wave.completed = true;
                console.log(`Wave ${gameState.wave.current} completed!`);
            }
        }
    }

    function render() {
        // Enable better rendering quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Better background gradient with sky effect
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#5DADE2');  // Deeper sky blue
        gradient.addColorStop(0.3, '#85C1E9'); // Mid blue
        gradient.addColorStop(0.6, '#AED6F1'); // Light blue
        gradient.addColorStop(0.9, '#D6EAF8'); // Very light blue
        gradient.addColorStop(1, '#EBF5FB');   // Almost white
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add enhanced cloud effect with better visuals
        ctx.save();
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 5; i++) {
            const cloudX = (animationTime * 0.00001 * (i + 1) % 1.2) * canvas.width - 100;
            const cloudY = 30 + i * 60 + Math.sin(animationTime * 0.0001 + i) * 10;
            
            // Create gradient for clouds
            const cloudGradient = ctx.createRadialGradient(cloudX + 30, cloudY, 0, cloudX + 30, cloudY, 50);
            cloudGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            cloudGradient.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
            ctx.fillStyle = cloudGradient;
            
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, 45, 0, Math.PI * 2);
            ctx.arc(cloudX + 35, cloudY + 5, 40, 0, Math.PI * 2);
            ctx.arc(cloudX + 70, cloudY, 45, 0, Math.PI * 2);
            ctx.arc(cloudX + 30, cloudY - 15, 35, 0, Math.PI * 2);
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
        
        // Add ground tiles
        for (const tile of gameState.groundTiles) {
            renderables.push({
                x: tile.x,
                y: tile.y,
                z: 0,
                type: 'tile',
                data: tile
            });
        }
        
        // Add decorations
        for (const decoration of gameState.decorations) {
            renderables.push({
                x: decoration.x,
                y: decoration.y,
                z: 0,
                type: 'decoration',
                data: decoration
            });
        }
        
        // Add entities
        for (const [id, player] of gameState.players) {
            renderables.push({
                x: player.x,
                y: player.y,
                z: 0.5,
                type: 'player',
                data: player
            });
        }
        
        for (const enemy of gameState.enemies) {
            renderables.push({
                x: enemy.x,
                y: enemy.y,
                z: 0.5,
                type: 'enemy',
                data: enemy
            });
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
                    drawZeldaTile(ctx, item.data.x, item.data.y, item.data.type);
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
        for (const projectile of gameState.projectiles) {
            projectile.draw(ctx);
        }
        
        // Render particles
        for (const particle of gameState.particles) {
            particle.draw(ctx);
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
        const deltaTime = Math.min((timestamp - gameState.lastTime) / 1000, 0.1);
        gameState.lastTime = timestamp;
        gameState.deltaTime = deltaTime;
        
        update(deltaTime);
        render();
        
        requestAnimationFrame(gameLoop);
    }

    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - canvas.width / 2) / gameState.camera.zoom;
        const y = (e.clientY - rect.top - canvas.height / 2) / gameState.camera.zoom;
        
        const cameraIso = cartesianToIsometric(gameState.camera.x, gameState.camera.y);
        const worldIso = {
            x: x + cameraIso.x,
            y: y + cameraIso.y
        };
        
        const world = isometricToCartesian(worldIso.x, worldIso.y);
        gameState.input.mouse.x = world.x;
        gameState.input.mouse.y = world.y;
    }

    function handleMouseDown(e) {
        if (e.button === 0) {
            gameState.input.mouse.isDown = true;
            
            if (gameState.localPlayer && !gameState.gameOver) {
                gameState.localPlayer.shoot(gameState.input.mouse.x, gameState.input.mouse.y);
            }
        }
    }

    function handleMouseUp(e) {
        if (e.button === 0) {
            gameState.input.mouse.isDown = false;
        }
    }

    function handleKeyDown(e) {
        gameState.input.keys[e.key] = true;
        
        if (e.key === 'r' && gameState.gameOver) {
            init();
        }
    }

    function handleKeyUp(e) {
        gameState.input.keys[e.key] = false;
    }

    function initControls() {
        // Desktop controls
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        // Mobile controls
        if (isMobile()) {
            initMobileControls();
        }
        
        // Prevent context menu
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function initMobileControls() {
        // Create joystick
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'joystick-container';
        joystickContainer.style.cssText = `
            position: fixed;
            bottom: 50px;
            left: 50px;
            width: 120px;
            height: 120px;
            z-index: 1000;
        `;
        document.body.appendChild(joystickContainer);
        
        const joystickBase = document.createElement('div');
        joystickBase.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.5);
        `;
        joystickContainer.appendChild(joystickBase);
        
        const joystickKnob = document.createElement('div');
        joystickKnob.style.cssText = `
            position: absolute;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.7);
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            transition: none;
        `;
        joystickContainer.appendChild(joystickKnob);
        
        // Joystick handling
        let joystickActive = false;
        let joystickStart = { x: 0, y: 0 };
        
        joystickContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            joystickActive = true;
            const touch = e.touches[0];
            const rect = joystickContainer.getBoundingClientRect();
            joystickStart = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        });
        
        window.addEventListener('touchmove', (e) => {
            if (!joystickActive) return;
            
            const touch = e.touches[0];
            const dx = touch.clientX - joystickStart.x;
            const dy = touch.clientY - joystickStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 40;
            
            let x = dx;
            let y = dy;
            
            if (distance > maxDistance) {
                x = (dx / distance) * maxDistance;
                y = (dy / distance) * maxDistance;
            }
            
            joystickKnob.style.left = `${50 + (x / 60) * 50}%`;
            joystickKnob.style.top = `${50 + (y / 60) * 50}%`;
            
            gameState.input.joystick.x = x / maxDistance;
            gameState.input.joystick.y = y / maxDistance;
            gameState.input.joystick.active = true;
        });
        
        window.addEventListener('touchend', () => {
            joystickActive = false;
            joystickKnob.style.left = '50%';
            joystickKnob.style.top = '50%';
            gameState.input.joystick.x = 0;
            gameState.input.joystick.y = 0;
            gameState.input.joystick.active = false;
        });
        
        // Attack button
        const attackButton = document.createElement('div');
        attackButton.style.cssText = `
            position: fixed;
            bottom: 50px;
            right: 50px;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(255, 100, 100, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 30px;
            color: white;
            z-index: 1000;
            user-select: none;
        `;
        attackButton.innerHTML = '⚔️';
        document.body.appendChild(attackButton);
        
        attackButton.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState.localPlayer && !gameState.gameOver) {
                // Shoot in facing direction
                const dirs = {
                    'up': { x: 0, y: -1 },
                    'down': { x: 0, y: 1 },
                    'left': { x: -1, y: 0 },
                    'right': { x: 1, y: 0 }
                };
                const dir = dirs[gameState.localPlayer.facing];
                gameState.localPlayer.shoot(
                    gameState.localPlayer.x + dir.x * 5,
                    gameState.localPlayer.y + dir.y * 5
                );
            }
        });
    }

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            console.error('Canvas not found');
            return;
        }
        
        ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Initialize visual effects if available
        if (window.VisualEffects) {
            visualEffects = new window.VisualEffects(canvas, ctx);
        }
        
        // Reset game state
        gameState.enemies = [];
        gameState.projectiles = [];
        gameState.particles = [];
        gameState.gameOver = false;
        gameState.score = 0;
        gameState.rupees = 0;
        gameState.wave.current = 0;
        gameState.wave.state = 'preparing';
        gameState.wave.timer = 5;
        
        // Generate level
        const startPos = generateLevel();
        
        // Create local player
        const playerId = 'player1';
        gameState.localPlayer = new Player(playerId, startPos.x, startPos.y);
        gameState.players.set(playerId, gameState.localPlayer);
        
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