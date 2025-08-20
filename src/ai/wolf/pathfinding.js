/**
 * Pathfinding Module for Wolf AI
 * @module wolf/pathfinding
 */

/**
 * Pathfinding node for A* algorithm
 * @class
 */
export class PathNode {
    /**
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} g - Cost from start
     * @param {number} h - Heuristic to goal
     * @param {PathNode|null} parent - Parent node in path
     */
    constructor(x, y, g = 0, h = 0, parent = null) {
        this.x = x;
        this.y = y;
        this.g = g; // Cost from start
        this.h = h; // Heuristic to goal
        this.f = g + h; // Total cost
        this.parent = parent;
    }
}

/**
 * Advanced Pathfinding with maze awareness
 * @class
 */
export class MazePathfinder {
    /**
     * @param {number} gridWidth - Width of the grid
     * @param {number} gridHeight - Height of the grid
     * @param {Array} obstacles - Array of obstacle objects
     */
    constructor(gridWidth, gridHeight, obstacles = []) {
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.obstacles = obstacles;
        this.grid = this.buildGrid();
        this.shortcuts = this.findShortcuts();
        this.pathCache = new Map();
    }

    /**
     * Build walkability grid
     * @returns {Array<Array<number>>} 2D grid where 0 is walkable, 1 is obstacle
     */
    buildGrid() {
        const grid = [];
        for (let y = 0; y < this.gridHeight; y++) {
            grid[y] = [];
            for (let x = 0; x < this.gridWidth; x++) {
                grid[y][x] = this.isWalkable(x, y) ? 0 : 1;
            }
        }
        return grid;
    }

    /**
     * Check if a position is walkable
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if position is walkable
     */
    isWalkable(x, y) {
        // Boundary check
        if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
            return false;
        }

        // Check if position collides with obstacles
        for (const obstacle of this.obstacles) {
            if (this.collidesWith(x, y, obstacle)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check collision with obstacle
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} obstacle - Obstacle object
     * @returns {boolean} True if collision detected
     */
    collidesWith(x, y, obstacle) {
        const halfWidth = obstacle.width / 2;
        const halfHeight = obstacle.height / 2;
        
        return x >= obstacle.x - halfWidth && 
               x <= obstacle.x + halfWidth &&
               y >= obstacle.y - halfHeight && 
               y <= obstacle.y + halfHeight;
    }

    /**
     * Find shortcuts in the maze for intelligent navigation
     * @returns {Array} Array of shortcut paths
     */
    findShortcuts() {
        const shortcuts = [];
        // Analyze grid for corridors and junctions
        for (let y = 1; y < this.gridHeight - 1; y++) {
            for (let x = 1; x < this.gridWidth - 1; x++) {
                if (this.isJunction(x, y)) {
                    shortcuts.push({ x, y, type: 'junction' });
                } else if (this.isCorridor(x, y)) {
                    shortcuts.push({ x, y, type: 'corridor' });
                }
            }
        }
        return shortcuts;
    }

    /**
     * Check if position is a junction (3+ open directions)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if junction
     */
    isJunction(x, y) {
        if (!this.isWalkable(x, y)) return false;
        
        let openDirections = 0;
        const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        
        for (const [dx, dy] of directions) {
            if (this.isWalkable(x + dx, y + dy)) {
                openDirections++;
            }
        }
        
        return openDirections >= 3;
    }

    /**
     * Check if position is in a corridor (2 opposite open directions)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if corridor
     */
    isCorridor(x, y) {
        if (!this.isWalkable(x, y)) return false;
        
        const vertical = this.isWalkable(x, y - 1) && this.isWalkable(x, y + 1) &&
                        !this.isWalkable(x - 1, y) && !this.isWalkable(x + 1, y);
        const horizontal = this.isWalkable(x - 1, y) && this.isWalkable(x + 1, y) &&
                          !this.isWalkable(x, y - 1) && !this.isWalkable(x, y + 1);
        
        return vertical || horizontal;
    }

    /**
     * Find path using A* algorithm with caching
     * @param {Object} start - Start position {x, y}
     * @param {Object} goal - Goal position {x, y}
     * @param {Object} options - Pathfinding options
     * @returns {Array|null} Path array or null if no path found
     */
    findPath(start, goal, options = {}) {
        // Check cache
        const cacheKey = `${start.x},${start.y}-${goal.x},${goal.y}`;
        if (this.pathCache.has(cacheKey)) {
            const cached = this.pathCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 5000) { // 5 second cache
                return cached.path;
            }
        }

        // Validate positions
        if (!this.isWalkable(Math.floor(start.x), Math.floor(start.y)) ||
            !this.isWalkable(Math.floor(goal.x), Math.floor(goal.y))) {
            return null;
        }

        const path = this.aStarSearch(start, goal, options);
        
        // Cache the result
        this.pathCache.set(cacheKey, {
            path: path,
            timestamp: Date.now()
        });

        // Limit cache size
        if (this.pathCache.size > 100) {
            const firstKey = this.pathCache.keys().next().value;
            this.pathCache.delete(firstKey);
        }

        return path;
    }

    /**
     * A* pathfinding algorithm
     * @param {Object} start - Start position
     * @param {Object} goal - Goal position
     * @param {Object} options - Search options
     * @returns {Array|null} Path or null
     */
    aStarSearch(start, goal, options = {}) {
        const maxIterations = options.maxIterations || 1000;
        const allowDiagonal = options.allowDiagonal !== false;
        
        const openSet = [];
        const closedSet = new Set();
        const startNode = new PathNode(
            Math.floor(start.x), 
            Math.floor(start.y), 
            0, 
            this.heuristic(start, goal)
        );
        
        openSet.push(startNode);
        let iterations = 0;

        while (openSet.length > 0 && iterations < maxIterations) {
            iterations++;
            
            // Get node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < openSet[currentIndex].f) {
                    currentIndex = i;
                }
            }
            
            const current = openSet.splice(currentIndex, 1)[0];
            
            // Check if we reached the goal
            if (current.x === Math.floor(goal.x) && 
                current.y === Math.floor(goal.y)) {
                return this.reconstructPath(current);
            }
            
            closedSet.add(`${current.x},${current.y}`);
            
            // Check neighbors
            const neighbors = this.getNeighbors(current.x, current.y, allowDiagonal);
            
            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(key)) continue;
                
                const g = current.g + neighbor.cost;
                const h = this.heuristic(neighbor, goal);
                
                // Check if this path to neighbor is better
                const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                
                if (!existingNode) {
                    openSet.push(new PathNode(neighbor.x, neighbor.y, g, h, current));
                } else if (g < existingNode.g) {
                    existingNode.g = g;
                    existingNode.f = g + existingNode.h;
                    existingNode.parent = current;
                }
            }
        }
        
        return null; // No path found
    }

    /**
     * Get walkable neighbors of a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} allowDiagonal - Allow diagonal movement
     * @returns {Array} Array of neighbor positions with costs
     */
    getNeighbors(x, y, allowDiagonal = true) {
        const neighbors = [];
        const cardinalDirs = [
            { x: 0, y: -1, cost: 1 },  // North
            { x: 1, y: 0, cost: 1 },   // East
            { x: 0, y: 1, cost: 1 },    // South
            { x: -1, y: 0, cost: 1 }    // West
        ];
        
        const diagonalDirs = [
            { x: -1, y: -1, cost: 1.414 },  // NW
            { x: 1, y: -1, cost: 1.414 },   // NE
            { x: 1, y: 1, cost: 1.414 },    // SE
            { x: -1, y: 1, cost: 1.414 }    // SW
        ];
        
        const directions = allowDiagonal ? 
            [...cardinalDirs, ...diagonalDirs] : cardinalDirs;
        
        for (const dir of directions) {
            const nx = x + dir.x;
            const ny = y + dir.y;
            
            if (this.isWalkable(nx, ny)) {
                neighbors.push({ x: nx, y: ny, cost: dir.cost });
            }
        }
        
        return neighbors;
    }

    /**
     * Calculate heuristic distance (Euclidean)
     * @param {Object} a - First position
     * @param {Object} b - Second position
     * @returns {number} Heuristic distance
     */
    heuristic(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Reconstruct path from goal node
     * @param {PathNode} node - Goal node
     * @returns {Array} Path array
     */
    reconstructPath(node) {
        const path = [];
        let current = node;
        
        while (current) {
            path.unshift({ x: current.x, y: current.y });
            current = current.parent;
        }
        
        return this.smoothPath(path);
    }

    /**
     * Smooth path by removing unnecessary waypoints
     * @param {Array} path - Raw path
     * @returns {Array} Smoothed path
     */
    smoothPath(path) {
        if (path.length <= 2) return path;
        
        const smoothed = [path[0]];
        let current = 0;
        
        for (let i = 2; i < path.length; i++) {
            if (!this.hasLineOfSight(path[current], path[i])) {
                smoothed.push(path[i - 1]);
                current = i - 1;
            }
        }
        
        smoothed.push(path[path.length - 1]);
        return smoothed;
    }

    /**
     * Check if there's a clear line of sight between two points
     * @param {Object} start - Start position
     * @param {Object} end - End position
     * @returns {boolean} True if clear line of sight
     */
    hasLineOfSight(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        
        if (steps === 0) return true;
        
        const xStep = dx / steps;
        const yStep = dy / steps;
        
        for (let i = 1; i <= steps; i++) {
            const x = Math.floor(start.x + xStep * i);
            const y = Math.floor(start.y + yStep * i);
            
            if (!this.isWalkable(x, y)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Find nearest walkable position to target
     * @param {Object} position - Target position
     * @returns {Object|null} Nearest walkable position
     */
    findNearestWalkable(position) {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        
        if (this.isWalkable(x, y)) {
            return { x, y };
        }
        
        // Search in expanding circles
        for (let radius = 1; radius < 10; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / (4 * radius)) {
                const nx = Math.floor(x + Math.cos(angle) * radius);
                const ny = Math.floor(y + Math.sin(angle) * radius);
                
                if (this.isWalkable(nx, ny)) {
                    return { x: nx, y: ny };
                }
            }
        }
        
        return null;
    }

    /**
     * Update obstacles (for dynamic environments)
     * @param {Array} obstacles - New obstacles array
     */
    updateObstacles(obstacles) {
        this.obstacles = obstacles;
        this.grid = this.buildGrid();
        this.shortcuts = this.findShortcuts();
        this.pathCache.clear(); // Clear cache when obstacles change
    }
}