// Enhanced 3D Tile System with Tile-Based Movement
// This file provides functions to make tiles look like actual 3D blocks

(function() {
    'use strict';

    // Enhanced configuration for 3D blocks
    window.ENHANCED_CONFIG = {
        TILE_WIDTH: 64,
        TILE_HEIGHT: 32,
        TILE_DEPTH: 32,  // Significant depth for 3D blocks
        BLOCK_HEIGHT: 24, // Height of the 3D block
        SHADOW_OFFSET_X: 8,
        SHADOW_OFFSET_Y: 12,
        SHADOW_BLUR: 6,
        SHADOW_OPACITY: 0.4
    };

    // Draw a 3D block tile with significant depth
    window.draw3DBlockTile = function(ctx, x, y, z, type, config) {
        const cfg = config || window.ENHANCED_CONFIG;
        const w = cfg.TILE_WIDTH / 2;
        const h = cfg.TILE_HEIGHT / 2;
        const blockHeight = cfg.BLOCK_HEIGHT;
        
        // Calculate isometric position
        const isoX = (x - y) * w;
        const isoY = (x + y) * h - z * blockHeight;
        
        ctx.save();
        ctx.translate(isoX, isoY);
        
        // Get colors based on tile type
        let topColor, sideColor1, sideColor2;
        switch(type) {
            case 'grass':
                topColor = '#4ade80';
                sideColor1 = '#16a34a';
                sideColor2 = '#15803d';
                break;
            case 'path':
            case 'sand':
                topColor = '#fde68a';
                sideColor1 = '#fbbf24';
                sideColor2 = '#f59e0b';
                break;
            case 'water':
                topColor = '#60a5fa';
                sideColor1 = '#3b82f6';
                sideColor2 = '#2563eb';
                break;
            case 'stone':
                topColor = '#9ca3af';
                sideColor1 = '#6b7280';
                sideColor2 = '#4b5563';
                break;
            default:
                topColor = '#4ade80';
                sideColor1 = '#16a34a';
                sideColor2 = '#15803d';
        }
        
        // Draw shadow first (underneath everything)
        ctx.save();
        ctx.translate(cfg.SHADOW_OFFSET_X, cfg.SHADOW_OFFSET_Y + blockHeight);
        ctx.fillStyle = `rgba(0, 0, 0, ${cfg.SHADOW_OPACITY})`;
        ctx.filter = `blur(${cfg.SHADOW_BLUR}px)`;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.7);
        ctx.lineTo(w * 0.8, 0);
        ctx.lineTo(0, h * 0.7);
        ctx.lineTo(-w * 0.8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.filter = 'none';
        ctx.restore();
        
        // Draw the 3D block faces
        
        // Right face (darkest)
        const rightGradient = ctx.createLinearGradient(w, 0, w, blockHeight);
        rightGradient.addColorStop(0, sideColor2);
        rightGradient.addColorStop(0.5, shadeColor(sideColor2, -10));
        rightGradient.addColorStop(1, shadeColor(sideColor2, -20));
        
        ctx.fillStyle = rightGradient;
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w, blockHeight);
        ctx.lineTo(0, h + blockHeight);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Add edge line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Left face (medium dark)
        const leftGradient = ctx.createLinearGradient(-w, 0, -w, blockHeight);
        leftGradient.addColorStop(0, sideColor1);
        leftGradient.addColorStop(0.5, shadeColor(sideColor1, -10));
        leftGradient.addColorStop(1, shadeColor(sideColor1, -20));
        
        ctx.fillStyle = leftGradient;
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.lineTo(-w, blockHeight);
        ctx.lineTo(0, h + blockHeight);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();
        
        // Add edge line
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Top face (brightest)
        const topGradient = ctx.createLinearGradient(-w, -h, w, h);
        topGradient.addColorStop(0, shadeColor(topColor, 15));
        topGradient.addColorStop(0.3, topColor);
        topGradient.addColorStop(0.7, shadeColor(topColor, -5));
        topGradient.addColorStop(1, shadeColor(topColor, -10));
        
        ctx.fillStyle = topGradient;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.fill();
        
        // Add highlight on top
        const highlightGradient = ctx.createRadialGradient(-w/3, -h/3, 0, -w/3, -h/3, w/2);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        // Strong outline for definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.closePath();
        ctx.stroke();
        
        // Add tile details
        if (type === 'grass') {
            // Small grass patches
            ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
            for (let i = 0; i < 3; i++) {
                const gx = (Math.random() - 0.5) * w * 0.6;
                const gy = (Math.random() - 0.5) * h * 0.6;
                ctx.beginPath();
                ctx.arc(gx, gy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'water') {
            // Water ripples
            const time = Date.now() * 0.001;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, Math.sin(time) * 5 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    };

    // Shade color helper
    function shadeColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    }

    // Tile-based movement controller
    window.TileMovementController = class {
        constructor(entity) {
            this.entity = entity;
            this.gridX = Math.floor(entity.x);
            this.gridY = Math.floor(entity.y);
            this.targetGridX = this.gridX;
            this.targetGridY = this.gridY;
            this.isMoving = false;
            this.moveProgress = 0;
            this.moveSpeed = 5; // tiles per second
            this.prevX = this.gridX;
            this.prevY = this.gridY;
            this.inputBuffer = { x: 0, y: 0 };
            this.moveDelay = 0;
        }

        update(deltaTime, input) {
            const dt = deltaTime / 1000; // Convert to seconds
            
            // Update delay
            if (this.moveDelay > 0) {
                this.moveDelay -= deltaTime;
            }

            if (this.isMoving) {
                // Continue moving to target tile
                this.moveProgress += this.moveSpeed * dt;
                
                if (this.moveProgress >= 1) {
                    // Reached target tile
                    this.gridX = this.targetGridX;
                    this.gridY = this.targetGridY;
                    this.entity.x = this.gridX;
                    this.entity.y = this.gridY;
                    this.isMoving = false;
                    this.moveProgress = 0;
                    this.moveDelay = 50; // Small delay between moves
                } else {
                    // Smooth interpolation
                    const t = this.easeInOutQuad(this.moveProgress);
                    this.entity.x = this.prevX + (this.targetGridX - this.prevX) * t;
                    this.entity.y = this.prevY + (this.targetGridY - this.prevY) * t;
                }
            } else if (this.moveDelay <= 0) {
                // Check for movement input
                let dx = 0, dy = 0;
                
                if (Math.abs(input.x) > 0.5) {
                    dx = input.x > 0 ? 1 : -1;
                }
                if (Math.abs(input.y) > 0.5) {
                    dy = input.y > 0 ? 1 : -1;
                }
                
                // Prevent diagonal movement
                if (dx !== 0 && dy !== 0) {
                    if (Math.abs(input.x) > Math.abs(input.y)) {
                        dy = 0;
                    } else {
                        dx = 0;
                    }
                }
                
                if (dx !== 0 || dy !== 0) {
                    const newGridX = this.gridX + dx;
                    const newGridY = this.gridY + dy;
                    
                    // Check if move is valid (you can add collision detection here)
                    if (this.isValidMove(newGridX, newGridY)) {
                        this.targetGridX = newGridX;
                        this.targetGridY = newGridY;
                        this.prevX = this.entity.x;
                        this.prevY = this.entity.y;
                        this.isMoving = true;
                        this.moveProgress = 0;
                        
                        // Update facing direction
                        if (dx > 0) this.entity.facing = 'right';
                        else if (dx < 0) this.entity.facing = 'left';
                        else if (dy > 0) this.entity.facing = 'down';
                        else if (dy < 0) this.entity.facing = 'up';
                    }
                }
            }
        }

        isValidMove(gridX, gridY) {
            // Add your collision detection logic here
            // For now, just check bounds
            return gridX >= 0 && gridX < 20 && gridY >= 0 && gridY < 20;
        }

        easeInOutQuad(t) {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }

        snapToGrid() {
            this.entity.x = this.gridX;
            this.entity.y = this.gridY;
            this.isMoving = false;
            this.moveProgress = 0;
        }
    };

    console.log('Enhanced 3D tile system loaded!');
})();