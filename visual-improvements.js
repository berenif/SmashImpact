// Visual Improvements for Isometric Game
// This file contains enhanced rendering functions for cleaner, more vibrant visuals

(function() {
    'use strict';

    // Enhanced color palette for cleaner look
    const IMPROVED_COLORS = {
        // Vibrant ground colors
        grassBright: '#5eead4',
        grassMid: '#34d399', 
        grassDark: '#10b981',
        sandLight: '#fef3c7',
        sandMid: '#fde68a',
        sandDark: '#fbbf24',
        waterLight: '#93c5fd',
        waterMid: '#60a5fa',
        waterDark: '#3b82f6',
        
        // Clean entity colors
        playerGreen: '#22c55e',
        playerDark: '#16a34a',
        enemyRed: '#f87171',
        enemyDark: '#dc2626',
        
        // UI colors
        uiWhite: 'rgba(255, 255, 255, 0.95)',
        uiShadow: 'rgba(0, 0, 0, 0.1)',
        uiAccent: '#3b82f6'
    };

    // Improved tile rendering with cleaner gradients
    window.improvedTileRenderer = function(ctx, x, y, type, config) {
        const w = config.TILE_WIDTH / 2;
        const h = config.TILE_HEIGHT / 2;
        
        // Minimal shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, -h + 1);
        ctx.lineTo(w, 1);
        ctx.lineTo(0, h + 1);
        ctx.lineTo(-w, 1);
        ctx.closePath();
        ctx.fill();
        
        // Clean gradient based on tile type
        let gradient;
        switch(type) {
            case 'grass':
                gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
                gradient.addColorStop(0, IMPROVED_COLORS.grassBright);
                gradient.addColorStop(0.6, IMPROVED_COLORS.grassMid);
                gradient.addColorStop(1, IMPROVED_COLORS.grassDark);
                break;
            case 'sand':
            case 'path':
                gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
                gradient.addColorStop(0, IMPROVED_COLORS.sandLight);
                gradient.addColorStop(0.6, IMPROVED_COLORS.sandMid);
                gradient.addColorStop(1, IMPROVED_COLORS.sandDark);
                break;
            case 'water':
                gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, w);
                gradient.addColorStop(0, IMPROVED_COLORS.waterLight);
                gradient.addColorStop(0.5, IMPROVED_COLORS.waterMid);
                gradient.addColorStop(1, IMPROVED_COLORS.waterDark);
                break;
            default:
                gradient = IMPROVED_COLORS.grassMid;
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
        
        // Subtle edge highlighting
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, -h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
        
        // Minimal edge definition
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(0, h);
        ctx.lineTo(-w, 0);
        ctx.stroke();
    };

    // Clean entity rendering
    window.improvedEntityRenderer = function(ctx, entity, config) {
        const size = entity.size || 0.8;
        const w = size * config.TILE_WIDTH / 3;
        const h = size * config.TILE_HEIGHT / 3;
        
        // Soft shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(0, h/2, w * 0.8, h * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Entity body with clean colors
        const bodyGradient = ctx.createRadialGradient(0, -h/2, 0, 0, 0, w);
        if (entity.type === 'player') {
            bodyGradient.addColorStop(0, IMPROVED_COLORS.playerGreen);
            bodyGradient.addColorStop(1, IMPROVED_COLORS.playerDark);
        } else {
            bodyGradient.addColorStop(0, IMPROVED_COLORS.enemyRed);
            bodyGradient.addColorStop(1, IMPROVED_COLORS.enemyDark);
        }
        
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.arc(0, -h/2, w, 0, Math.PI * 2);
        ctx.fill();
        
        // Clean outline
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Simple highlight for depth
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(-w/3, -h/2 - h/3, w/3, 0, Math.PI * 2);
        ctx.fill();
    };

    // Clean UI rendering
    window.improvedUIRenderer = function(ctx, canvas, gameState) {
        // Clean background for UI elements
        const padding = 15;
        const radius = 12;
        
        // Health display
        ctx.save();
        ctx.fillStyle = IMPROVED_COLORS.uiWhite;
        ctx.shadowColor = IMPROVED_COLORS.uiShadow;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        
        // Rounded rectangle for health
        ctx.beginPath();
        ctx.roundRect(20, 20, 200, 40, radius);
        ctx.fill();
        
        // Health bar
        const healthPercent = gameState.localPlayer ? 
            gameState.localPlayer.health / gameState.localPlayer.maxHealth : 1;
        
        const healthGradient = ctx.createLinearGradient(30, 30, 30 + 180 * healthPercent, 30);
        healthGradient.addColorStop(0, '#86efac');
        healthGradient.addColorStop(1, '#22c55e');
        
        ctx.fillStyle = healthGradient;
        ctx.beginPath();
        ctx.roundRect(30, 30, 180 * healthPercent, 20, radius/2);
        ctx.fill();
        
        // Score display
        ctx.fillStyle = IMPROVED_COLORS.uiWhite;
        ctx.beginPath();
        ctx.roundRect(canvas.width - 170, 20, 150, 40, radius);
        ctx.fill();
        
        ctx.fillStyle = IMPROVED_COLORS.uiAccent;
        ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Score: ${gameState.score}`, canvas.width - 95, 45);
        
        // Wave info
        if (gameState.wave) {
            ctx.fillStyle = IMPROVED_COLORS.uiWhite;
            ctx.beginPath();
            ctx.roundRect(canvas.width/2 - 100, 20, 200, 40, radius);
            ctx.fill();
            
            ctx.fillStyle = IMPROVED_COLORS.uiAccent;
            ctx.fillText(`Wave ${gameState.wave.current}`, canvas.width/2, 45);
        }
        
        ctx.restore();
    };

    // Clean background rendering
    window.improvedBackgroundRenderer = function(ctx, canvas) {
        // Clean gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.4, '#ADD8E6');
        gradient.addColorStop(0.7, '#B8E6F5');
        gradient.addColorStop(1, '#E0F6FF');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Subtle cloud effect
        ctx.save();
        ctx.globalAlpha = 0.2;
        const time = Date.now() * 0.00001;
        
        for (let i = 0; i < 3; i++) {
            const cloudX = ((time * (i + 1)) % 1.2) * canvas.width - 100;
            const cloudY = 20 + i * 40;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2);
            ctx.arc(cloudX + 25, cloudY + 3, 25, 0, Math.PI * 2);
            ctx.arc(cloudX + 50, cloudY, 30, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    };

    // Helper function for clean shadows
    window.drawCleanShadow = function(ctx, x, y, width, height, opacity = 0.15) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.beginPath();
        ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    // Helper function for clean highlights
    window.drawCleanHighlight = function(ctx, x, y, radius, opacity = 0.3) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    console.log('Visual improvements loaded successfully!');
})();