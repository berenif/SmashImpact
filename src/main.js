import { el, setStatus as setStatusDom, setRoleTag, makeLogger } from './utils/dom.js';
import { clamp, now } from './utils/time.js';
import { encodeForShare, decodeShared } from './net/codec.js';
import { Net } from './net/webrtc.js';
import { world, R, SPEED, SCORE_TO_WIN, ROUND_TIME, TAG_COOLDOWN, me, them, role as roleRef, game, setRole, moveLocal, updateRemote, hostTick, broadcastState, applyState, resetForHostStart } from './game/state.js';
import { drawQrToCanvas } from './ui/qr.js';

// Cross-browser camera access compatibility
function getUserMedia(constraints) {
  const mediaDevices = navigator.mediaDevices || 
                       navigator.getUserMedia || 
                       navigator.webkitGetUserMedia || 
                       navigator.mozGetUserMedia || 
                       navigator.msGetUserMedia;
  
  if (mediaDevices && mediaDevices.getUserMedia) {
    return mediaDevices.getUserMedia(constraints);
  }
  
  // Fallback for older browsers
  if (navigator.getUserMedia) {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia(constraints, resolve, reject);
    });
  }
  
  if (navigator.webkitGetUserMedia) {
    return new Promise((resolve, reject) => {
      navigator.webkitGetUserMedia(constraints, resolve, reject);
    });
  }
  
  if (navigator.mozGetUserMedia) {
    return new Promise((resolve, reject) => {
      navigator.mozGetUserMedia(constraints, resolve, reject);
    });
  }
  
  throw new Error('Camera access not supported in this browser');
}

const hostState = el('hostState');
const peerState = el('peerState');
const statusEl = el('status');
const latencyEl = el('latency');
const logEl = el('log');
const meTag = el('meTag');
const btnHostStart   = el('btnHostStart');
const btnCopyOffer   = el('btnCopyOffer');
const btnQrOffer     = el('btnQrOffer');
const offerOut       = el('offerOut');
const answerIn       = el('answerIn');
const btnApplyAnswer = el('btnApplyAnswer');
const btnScanAnswer  = el('btnScanAnswer');
const btnPeerStart   = el('btnPeerStart');
const offerIn        = el('offerIn');
const btnApplyOffer  = el('btnApplyOffer');
const btnScanOffer   = el('btnScanOffer');
const answerOut      = el('answerOut');
const btnCopyAnswer  = el('btnCopyAnswer');
const btnQrAnswer    = el('btnQrAnswer');
const qrModal  = el('qrModal');
const qrCanvas = el('qrCanvas');
const qrClose  = el('qrClose');
const scanModal = el('scanModal');
const scanVideo = el('scanVideo');
const scanClose = el('scanClose');
const chatInput = el('chatInput');
const chatSend  = el('chatSend');
const btnRunTests = el('btnRunTests');
const btnStartGame = el('btnStartGame');
const btnResetGame = el('btnResetGame');

const log = makeLogger(logEl);
function setStatus(text, good){ setStatusDom(statusEl, text, good); }
function setLatency(ms){ latencyEl.textContent = `RTT ~ ${ms} ms`; }
function setChatEnabled(enabled){ chatSend.disabled = !enabled; }
function resetUiForDisconnect(){ btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); hostState.textContent='idle'; peerState.textContent='idle'; }

const net = new Net({
	setStatus,
	setChatEnabled,
	resetUiForDisconnect,
	setLatency,
	log,
	setRole: (r) => setRoleTag(meTag, r),
	onHostStart: () => { btnHostStart.disabled = true; btnPeerStart.disabled = true; hostState.textContent = 'creating'; },
	onOfferReady: (offerJson) => { offerOut.value = offerJson; btnCopyOffer.disabled = false; btnApplyAnswer.disabled = false; btnQrOffer.disabled = false; hostState.textContent='offer ready'; setStatus('Share offer with peer', false); },
	onPeerStart: () => { btnPeerStart.disabled = true; btnHostStart.disabled = true; peerState.textContent='ready'; btnApplyOffer.disabled = false; },
	onAnswerReady: (answerJson) => { answerOut.value = answerJson; btnCopyAnswer.disabled = false; btnQrAnswer.disabled = false; peerState.textContent ='answer ready'; setStatus('Send answer back to host', false); },
	onAnswerApplied: () => { hostState.textContent = 'answer applied'; setStatus('Waiting for channel open', false); },
	decodeShared,
});

// Game canvas
const canvas = el('game');
const ctx = canvas.getContext('2d');
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
let W = 960, H = 600;
function resize(){ const rect = canvas.getBoundingClientRect(); W=Math.floor(rect.width*DPR); H=Math.floor(rect.height*DPR); canvas.width=W; canvas.height=H; }
window.addEventListener('resize', resize); resize();

const keys = new Set();
window.addEventListener('keydown', e => { if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','W','A','S','D'].includes(e.key)) { keys.add(e.key.toLowerCase()); e.preventDefault(); } });
window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); });

function line(x1,y1,x2,y2){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
function drawPlayer(p, camX, camY, isIT){ ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, R, 0, Math.PI*2); ctx.fillStyle = p.color; ctx.fill(); if(isIT){ ctx.strokeStyle='#ffd24e'; ctx.lineWidth=3; ctx.stroke(); } }

function draw(){ const cx=(me.x+them.x)/2, cy=(me.y+them.y)/2; const scale = Math.min(W/world.w, H/world.h); const vw=W/scale, vh=H/scale; const camX=Math.min(Math.max(cx - vw/2, 0), Math.max(0, world.w - vw)); const camY=Math.min(Math.max(cy - vh/2, 0), Math.max(0, world.h - vh)); ctx.save(); ctx.scale(scale, scale); ctx.clearRect(0,0,vw,vh); ctx.fillStyle='#0b0e1a'; ctx.fillRect(0,0,vw,vh);
	ctx.strokeStyle='#1e2447'; ctx.lineWidth=1; for(let x=0;x<world.w;x+=80){ line(x - camX, 0 - camY, x - camX, world.h - camY); } for(let y=0;y<world.h;y+=80){ line(0 - camX, y - camY, world.w - camX, y - camY); }
	drawPlayer(me, camX, camY, game.it==='me');
	drawPlayer(them, camX, camY, game.it==='peer');
	ctx.fillStyle='#e8ecff'; ctx.font='16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'; ctx.textAlign='left';
	const tText = `Time ${Math.ceil(game.tLeft)}s`; ctx.fillText(tText, 12 - camX, 24 - camY);
	ctx.fillText(`You ${me.score}`, 12 - camX, 46 - camY);
	ctx.fillText(`Peer ${them.score}`, 12 - camX, 68 - camY);
	ctx.textAlign='center'; ctx.font='18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
	const roleText = game.started ? (game.it==='me' ? 'You are IT' : 'You are running') : 'Press Start';
	ctx.fillText(roleText, (vw/2), 28 - camY);
	ctx.restore(); }

let lastTS = now(); let snapshotTimer = 0.2; let lastSend = 0;
function sendThrottled(obj){ const t=now(); if(t - lastSend > 33){ net.send(obj); lastSend = t; } }

function loop(ts){ const dt = Math.min(0.05, (ts - lastTS)/1000); lastTS = ts; moveLocal(keys, dt, sendThrottled); updateRemote(dt); if(net.role==='host'){ hostTick(dt, now, (state)=> net.send({ type:'state', state })); snapshotTimer -= dt; if(snapshotTimer<=0){ snapshotTimer=0.2; const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) }; net.send({ type:'state', state }); } } draw(); requestAnimationFrame(loop); }
requestAnimationFrame(loop);

net.onopen = () => { btnStartGame.disabled = (net.role!=='host'); btnResetGame.disabled = (net.role!=='host'); if(net.role==='host'){ resetForHostStart(); const state = { started:false, it: Math.random()<0.5? 'me':'peer', tLeft: ROUND_TIME, lastTick: now(), lastTagAt: 0 }; net.send({ type:'state', state }); }
};
net.onclose = () => { btnStartGame.disabled = true; btnResetGame.disabled = true; setChatEnabled(false); };
net.onmessage = (msg) => { if(msg.type==='pos'){ them.tx = Math.min(Math.max(msg.x, R), world.w-R); them.ty = Math.min(Math.max(msg.y, R), world.h-R); them.lastUpdate = now(); }
	else if(msg.type==='state'){ applyState(msg.state, net.role); }
	else if(msg.type==='chat'){ log(`Peer: ${msg.text}`); }
};

btnHostStart.onclick = async () => { try { setRole('host'); net.role='host'; await net.startHost(); } catch (e) { log('Host failed: ' + (e && e.message ? e.message : e)); btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); hostState.textContent='idle'; } };
btnPeerStart.onclick = () => { try { setRole('peer'); net.startPeer(); } catch (e) { log('Peer init failed: ' + (e && e.message ? e.message : e)); btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); peerState.textContent='idle'; } };
btnCopyOffer.onclick = async () => { await navigator.clipboard.writeText(encodeForShare(offerOut.value)); btnCopyOffer.textContent='Copied'; setTimeout(()=>btnCopyOffer.textContent='Copy', 800); };
btnCopyAnswer.onclick = async () => { await navigator.clipboard.writeText(encodeForShare(answerOut.value)); btnCopyAnswer.textContent='Copied'; setTimeout(()=>btnCopyAnswer.textContent='Copy', 800); };

async function applyAnswerFromText(txt){ await net.applyAnswerFromText(txt); }
async function applyOfferFromText(txt){ await net.applyOfferFromText(txt); }
btnApplyAnswer.onclick = async ()=>{ await applyAnswerFromText(answerIn.value); };
btnApplyOffer.onclick  = async ()=>{ await applyOfferFromText(offerIn.value); };

btnStartGame.onclick = () => { if(net.role!=='host') return; game.started=true; game.tLeft = ROUND_TIME; game.lastTagAt = 0; const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) }; net.send({ type:'state', state }); };
btnResetGame.onclick = () => { if(net.role!=='host') return; resetForHostStart(); const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) }; net.send({ type:'state', state }); };

chatSend.onclick = () => { const text = chatInput.value.trim(); if(!text) return; net.send({ type:'chat', text }); log('You: ' + text); chatInput.value=''; };
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') chatSend.click(); });

let scanStream=null; let scanRunning=false; let detector=null;
async function startScan(targetField){ try{
		if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') { alert('Camera requires HTTPS or localhost. Use copy paste if not available.'); return; }
		
		// Try modern BarcodeDetector first, then fallback to jsQR
		let useBarcodeDetector = false;
		if ('BarcodeDetector' in window) {
			try {
				detector = new BarcodeDetector({ formats:['qr_code'] });
				useBarcodeDetector = true;
			} catch (e) {
				console.warn('BarcodeDetector failed, using jsQR fallback');
			}
		}
		
		scanModal.classList.add('show');
		
		// Use cross-browser compatible camera access
		scanStream = await getUserMedia({ video:{ facingMode:'environment' }, audio:false }); 
		scanVideo.srcObject = scanStream; 
		await scanVideo.play(); 
		scanRunning=true;
		
		const loop = async ()=>{
			if(!scanRunning) return; 
			try{
				let raw = '';
				
				if (useBarcodeDetector && detector) {
					// Use modern BarcodeDetector
					const codes = await detector.detect(scanVideo); 
					if(codes && codes.length){ 
						raw = codes[0].rawValue || ''; 
					}
				} else {
					// Use jsQR fallback for Firefox and other browsers
					const canvas = document.createElement('canvas');
					const ctx = canvas.getContext('2d');
					canvas.width = scanVideo.videoWidth;
					canvas.height = scanVideo.videoHeight;
			ctx.drawImage(scanVideo, 0, 0, canvas.width, canvas.height);
			const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
			
			if (window.jsQR) {
				const code = window.jsQR(imageData.data, imageData.width, imageData.height);
				if (code) {
					raw = code.data;
				}
			}
		}
		
		if(raw){
			targetField.value = raw; 
			stopScan(); 
			if (targetField === offerIn) { 
				await applyOfferFromText(raw); 
			} else if (targetField === answerIn) { 
				await applyAnswerFromText(raw); 
			} 
			return; 
		} 
	} catch (err) {
		console.warn('QR detection error:', err);
	} 
	requestAnimationFrame(loop); 
};
requestAnimationFrame(loop);
}catch(e){ log('Camera error: ' + e.message); alert('Camera access failed. Check permissions.'); stopScan(); }
}
function stopScan(){ scanRunning=false; if(scanStream){ scanStream.getTracks().forEach(t=>t.stop()); scanStream=null; } scanModal.classList.remove('show'); }
btnScanOffer.onclick  = () => startScan(offerIn);
btnScanAnswer.onclick = () => startScan(answerIn);
scanClose.onclick     = () => stopScan();

function showQR(text){ try{ drawQrToCanvas(encodeForShare(text), qrCanvas, 8); qrModal.classList.add('show'); } catch(e){ log('QR error: ' + e.message); } }
btnQrOffer.onclick  = () => { if(!offerOut.value) return; showQR(offerOut.value); };
btnQrAnswer.onclick = () => { if(!answerOut.value) return; showQR(answerOut.value); };
qrClose.onclick     = () => { qrModal.classList.remove('show'); };

btnRunTests.onclick = () => {
	const results = []; const ok=(name,cond)=>results.push(`${cond? '✅':'❌'} ${name}`);
	    try { const q = window.qrcode(1, 'L'); q.addData('test'); q.make(); ok('QR encode short text', q.getModuleCount() > 0); } catch(e){ ok('QR encode short text', false); log('QR test error: '+e.message); }
	try { const tmp = document.createElement('canvas'); drawQrToCanvas(encodeForShare('hello'), tmp, 4); ok('drawQrToCanvas runs', tmp.width > 0); } catch(e){ ok('drawQrToCanvas runs', false); log('drawQrToCanvas error: '+e.message); }
	ok('RTCPeerConnection present', !!window.RTCPeerConnection);
	ok('BarcodeDetector present (optional)', 'BarcodeDetector' in window);
	ok('jsQR fallback present (optional)', 'jsQR' in window);
	ok('#btnQrOffer single element', document.querySelectorAll('#btnQrOffer').length === 1);
	ok('#btnQrAnswer single element', document.querySelectorAll('#btnQrAnswer').length === 1);
	try { const s='{"a":1}'; const enc=encodeForShare(s); const dec=decodeShared(enc); ok('Compression roundtrip', dec===s && enc.startsWith('z')); } catch(e){ ok('Compression roundtrip', false); }
	try { const s2='{"b":2}'; ok('decodeShared raw passthrough', decodeShared(s2)===s2); } catch(e){ ok('decodeShared raw passthrough', false); }
	try { ok('RS table present', typeof window.RS_BLOCK_TABLE==='object' && !!window.RS_BLOCK_TABLE[(window.QRErrorCorrectLevel.L<<8)+40]); } catch(e){ ok('RS table present', false); }
	try { const big = JSON.stringify({ s: 'x'.repeat(2000) }); const enc=encodeForShare(big); const dec=decodeShared(enc); ok('Large compression roundtrip', dec===big); ok('Large compression shrinks', enc.length < big.length); } catch(e){ ok('Large compression roundtrip', false); }
	try { const s3=''; const enc3=encodeForShare(s3); const dec3=decodeShared(enc3); ok('Empty string roundtrip', dec3===s3 && enc3.startsWith('z')); } catch(e){ ok('Empty string roundtrip', false); }
	try { const st={ started:false, it:'me', tLeft:60, lastTick:0, lastTagAt:0 }; ok('Game state shape', typeof st.it==='string' && typeof st.tLeft==='number'); } catch(e){ ok('Game state shape', false); }
	try { const snap={ me:{x:1,y:2,score:0}, them:{x:3,y:4,score:0}, started:true, it:'me', tLeft:100 }; ok('State snapshot object', !!snap.me && !!snap.them && typeof snap.started==='boolean'); } catch(e){ ok('State snapshot object', false); }
	ok('Secure origin for camera', location.protocol==='https:' || location.hostname==='localhost' || location.hostname==='127.0.0.1');
	try { const t='{"t":"é😊"}'; const enc=encodeForShare(t); const dec=decodeShared(enc); ok('Unicode roundtrip', dec===t); } catch(e){ ok('Unicode roundtrip', false); }
	try { const enc=encodeForShare('{"k":1}'); ok('Share prefix', enc[0]==='z'); ok('Base64 charset', /^[A-Za-z0-9+/=]+$/.test(enc.slice(1))); } catch(e){ ok('Base64 charset', false); }
	try { const state={ me:{x:1,y:2,score:0}, them:{x:3,y:4,score:0}, started:false, it:'me', tLeft:10 }; const copy=JSON.parse(JSON.stringify(state)); ok('State JSON roundtrip', copy.me.x===1 && copy.it==='me'); } catch(e){ ok('State JSON roundtrip', false); }
	try { const obj = { type:'x', state:{ n:1 } }; const s = JSON.stringify(obj); ok('Object literal serializes', /\{"type":"x","state":\{"n":1\}\}/.test(s)); } catch(e){ ok('Object literal serializes', false); }
	log(results.join('\n'));
};