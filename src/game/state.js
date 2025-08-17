import { clamp, now } from '../utils/time.js';
import { moveWithObstacles, getAffectingObstacles, OBSTACLE_EFFECTS, initObstacles } from './obstacles.js';
import { AIPlayer } from './ai.js';

export const world = { w: 1600, h: 900 };
export const R = 22;
export const SPEED = 360;
export const SCORE_TO_WIN = 10;
export const ROUND_TIME = 120;
export const TAG_COOLDOWN = 800;

export const me = { x: 200, y: 200, color: '#2bd27e', score: 0, name: 'you', stunned: false, stunnedUntil: 0, slowdown: 1.0 };
export const them = { x: 600, y: 200, color: '#ff6262', score: 0, name: 'peer', tx: 600, ty: 200, lastUpdate: 0 };

export let role = null;
export let game = { started: false, it: 'me', tLeft: ROUND_TIME, lastTick: now(), lastTagAt: 0, mode: 'multiplayer', obstacleLayout: 'simple' };

// AI player for solo mode
export let aiPlayer = null;

export function resetForHostStart() {
	me.x = 200; me.y = 200; them.x = 1400; them.y = 700; them.tx = them.x; them.ty = them.y;
	me.score = 0; them.score = 0;
	game = { started: false, it: Math.random() < 0.5 ? 'me' : 'peer', tLeft: ROUND_TIME, lastTick: now(), lastTagAt: 0, mode: game.mode, obstacleLayout: game.obstacleLayout };
}

export function setRole(r){ role = r; }

export function initSoloMode(obstacleLayout = 'simple') {
	// Initialize obstacles
	initObstacles(obstacleLayout);
	
	// Reset player position
	me.x = 200; me.y = 200;
	me.score = 0;
	me.stunned = false;
	me.stunnedUntil = 0;
	me.slowdown = 1.0;
	
	// Create AI player
	aiPlayer = new AIPlayer(1400, 700);
	
	// Set game state
	game = {
		started: false,
		it: Math.random() < 0.5 ? 'me' : 'ai',
		tLeft: ROUND_TIME,
		lastTick: now(),
		lastTagAt: 0,
		mode: 'solo',
		obstacleLayout
	};
}

export function setGameMode(mode, obstacleLayout = 'simple') {
	game.mode = mode;
	game.obstacleLayout = obstacleLayout;
	
	if (mode === 'solo') {
		initSoloMode(obstacleLayout);
	} else {
		// Initialize obstacles for multiplayer too
		initObstacles(obstacleLayout);
		aiPlayer = null;
	}
}

export function moveLocal(keys, dt, send, currentTime){
	// Check if stunned
	if (me.stunned && currentTime < me.stunnedUntil) {
		return; // Can't move while stunned
	} else if (me.stunned) {
		me.stunned = false;
		me.slowdown = 1.0;
	}
	
	// Check for trap/hole effects
	const affectingObstacles = getAffectingObstacles(me.x, me.y, R);
	for (const obstacle of affectingObstacles) {
		const effect = OBSTACLE_EFFECTS[obstacle.type];
		
		// Apply slowdown
		if (effect.slowdown) {
			me.slowdown = Math.min(me.slowdown, effect.slowdown);
		}
		
		// Apply stun
		if (effect.stun && !me.stunned) {
			me.stunned = true;
			me.stunnedUntil = currentTime + effect.stun;
		}
	}
	
	let dx = 0, dy = 0;
	if (keys.has('arrowup') || keys.has('w')) dy -= 1;
	if (keys.has('arrowdown') || keys.has('s')) dy += 1;
	if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
	if (keys.has('arrowright') || keys.has('d')) dx += 1;
	if (dx || dy) {
		const m = Math.hypot(dx, dy) || 1;
		const speed = SPEED * me.slowdown * dt;
		
		// Calculate target position
		const targetX = me.x + dx / m * speed;
		const targetY = me.y + dy / m * speed;
		
		// Check for obstacle collision
		const result = moveWithObstacles(me.x, me.y, targetX, targetY, R);
		
		// Apply movement
		me.x = clamp(result.x, R, world.w - R);
		me.y = clamp(result.y, R, world.h - R);
		
		if (send) {
			send({ type: 'pos', x: me.x, y: me.y });
		}
	}
	
	// Reset slowdown for next frame
	me.slowdown = 1.0;
}

export function updateRemote(dt) {
	const lerp = (a, b, t) => a + (b - a) * t; const LERP_SPD = 10;
	them.x = lerp(them.x, them.tx, Math.min(1, LERP_SPD * dt));
	them.y = lerp(them.y, them.ty, Math.min(1, LERP_SPD * dt));
}

export function hostTick(dt, nowFn, onState){
	if (!game.started) return;
	game.tLeft = Math.max(0, game.tLeft - dt);
	if (game.tLeft === 0) endRound(onState);
	
	const canTag = (nowFn() - game.lastTagAt) > TAG_COOLDOWN;
	
	if (game.mode === 'solo' && aiPlayer) {
		// Update AI
		aiPlayer.update(me.x, me.y, dt, nowFn());
		
		// Check for tags in solo mode
		if (canTag) {
			const dx = me.x - aiPlayer.x, dy = me.y - aiPlayer.y;
			const touching = Math.hypot(dx, dy) <= R * 2;
			if (touching) {
				if (game.it === 'me') {
					me.score++;
					game.it = 'ai';
					game.lastTagAt = nowFn();
				} else if (game.it === 'ai') {
					aiPlayer.score++;
					game.it = 'me';
					game.lastTagAt = nowFn();
				}
				checkWinSolo();
			}
		}
	} else if (game.mode === 'multiplayer') {
		// Original multiplayer logic
		if (canTag) {
			const dx = me.x - them.x, dy = me.y - them.y;
			const touching = Math.hypot(dx, dy) <= R * 2;
			if (touching) {
				if (game.it === 'me') { me.score++; game.it = 'peer'; game.lastTagAt = nowFn(); broadcastState(onState); checkWin(onState); }
				else if (game.it === 'peer') { them.score++; game.it = 'me'; game.lastTagAt = nowFn(); broadcastState(onState); checkWin(onState); }
			}
		}
	}
}

export function checkWin(onState){ if (me.score >= SCORE_TO_WIN || them.score >= SCORE_TO_WIN) { endRound(onState); } }

export function checkWinSolo() {
	if (me.score >= SCORE_TO_WIN || (aiPlayer && aiPlayer.score >= SCORE_TO_WIN)) {
		game.started = false;
	}
}

export function endRound(onState){ game.started = false; if (onState) broadcastState(onState); }

export function broadcastState(onState){
	const state = { me: { x: me.x, y: me.y, score: me.score }, them: { x: them.x, y: them.y, score: them.score }, started: game.started, it: game.it, tLeft: Math.ceil(game.tLeft) };
	onState(state);
}

export function applyState(s, currentRole){
	if (currentRole === 'peer') {
		me.x = s.them.x; me.y = s.them.y; me.score = s.them.score;
		them.tx = s.me.x; them.ty = s.me.y; them.score = s.me.score;
		game.started = s.started; game.it = (s.it === 'me') ? 'peer' : 'me'; game.tLeft = s.tLeft;
	} else {
		me.x = s.me.x; me.y = s.me.y; me.score = s.me.score;
		them.tx = s.them.x; them.ty = s.them.y; them.score = s.them.score;
		game.started = s.started; game.it = s.it; game.tLeft = s.tLeft;
	}
}