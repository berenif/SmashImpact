import { el, setStatus as setStatusDom, setRoleTag, makeLogger } from './utils/dom.js';
import { clamp, now } from './utils/time.js';
import { encodeForShare, decodeShared } from './net/codec.js';
import { Net } from './net/webrtc.js';
import { world, R, SPEED, SCORE_TO_WIN, ROUND_TIME, TAG_COOLDOWN, me, them, role as roleRef, game, setRole, moveLocal, updateRemote, hostTick, broadcastState, applyState, resetForHostStart, aiPlayer, setGameMode, initSoloMode } from './game/state.js';
import { drawQrToCanvas } from './ui/qr.js';
import { drawObstacles, initObstacles } from './game/obstacles.js';

// Cross-browser camera access compatibility
function getMediaDevices() {
  return navigator.mediaDevices ||
         navigator.getUserMedia ||
         navigator.webkitGetUserMedia ||
         navigator.mozGetUserMedia ||
         navigator.msGetUserMedia;
}

function getUserMedia(constraints) {
  const mediaDevices = getMediaDevices();
  
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
const quickConnectModal = el('quickConnectModal');
const quickConnectOfferQR = el('quickConnectOfferQR');
const quickConnectScanVideo = el('quickConnectScanVideo');
const quickConnectClose = el('quickConnectClose');
const quickConnectStatus = el('quickConnectStatus');
const chatInput = el('chatInput');
const chatSend  = el('chatSend');
const btnRunTests = el('btnRunTests');
const btnTestScan = el('btnTestScan');
const btnStartGame = el('btnStartGame');
const btnResetGame = el('btnResetGame');
const btnQuickConnect = el('btnQuickConnect');
const btnScanHost = el('btnScanHost');
const roleModal = el('roleModal');
const chooseHost = el('chooseHost');
const choosePlayer = el('choosePlayer');
const btnSoloMode = el('btnSoloMode');
const obstacleLayout = el('obstacleLayout');
const gameModeEl = el('gameMode');

const log = makeLogger(logEl);
function setStatus(text, good){ setStatusDom(statusEl, text, good); }
function setLatency(ms){ latencyEl.textContent = `RTT ~ ${ms} ms`; }
function setChatEnabled(enabled){ chatSend.disabled = !enabled; }
function resetUiForDisconnect(){ btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); hostState.textContent='idle'; peerState.textContent='idle'; }

let nextAction = null;

const net = new Net({
        setStatus,
        setChatEnabled,
        resetUiForDisconnect,
	setLatency,
	log,
	setRole: (r) => setRoleTag(meTag, r),
	onHostStart: () => { btnHostStart.disabled = true; btnPeerStart.disabled = true; hostState.textContent = 'creating'; },
        onOfferReady: (offerJson) => { offerOut.value = offerJson; btnCopyOffer.disabled = false; btnApplyAnswer.disabled = false; btnQrOffer.disabled = false; hostState.textContent='offer ready'; setStatus('Share offer with peer', false); showQR(offerJson); nextAction='scanAnswer'; },
        onPeerStart: () => { btnPeerStart.disabled = true; btnHostStart.disabled = true; peerState.textContent='ready'; btnApplyOffer.disabled = false; },
        onAnswerReady: (answerJson) => { answerOut.value = answerJson; btnCopyAnswer.disabled = false; btnQrAnswer.disabled = false; peerState.textContent ='answer ready'; setStatus('Send answer back to host', false); showQR(answerJson); },
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

function draw(){ 
	let cx, cy;
	if (game.mode === 'solo' && aiPlayer) {
		cx = (me.x + aiPlayer.x) / 2;
		cy = (me.y + aiPlayer.y) / 2;
	} else {
		cx = (me.x + them.x) / 2;
		cy = (me.y + them.y) / 2;
	}
	
	const scale = Math.min(W/world.w, H/world.h); 
	const vw=W/scale, vh=H/scale; 
	const camX=Math.min(Math.max(cx - vw/2, 0), Math.max(0, world.w - vw)); 
	const camY=Math.min(Math.max(cy - vh/2, 0), Math.max(0, world.h - vh)); 
	
	ctx.save(); 
	ctx.scale(scale, scale); 
	ctx.clearRect(0,0,vw,vh); 
	ctx.fillStyle='#0b0e1a'; 
	ctx.fillRect(0,0,vw,vh);
	
	// Draw grid
	ctx.strokeStyle='#1e2447'; 
	ctx.lineWidth=1; 
	for(let x=0;x<world.w;x+=80){ 
		line(x - camX, 0 - camY, x - camX, world.h - camY); 
	} 
	for(let y=0;y<world.h;y+=80){ 
		line(0 - camX, y - camY, world.w - camX, y - camY); 
	}
	
	// Draw obstacles - DISABLED for now
	// drawObstacles(ctx, camX, camY);
	
	// Draw players
	drawPlayer(me, camX, camY, game.it==='me');
	
	// Always draw peer player, never AI
	// if (game.mode === 'solo' && aiPlayer) {
	// 	// Draw AI player
	// 	aiPlayer.draw(ctx, camX, camY, game.it==='ai');
	// } else {
		// Draw peer player
		drawPlayer(them, camX, camY, game.it==='peer');
	// }
	
	// Draw UI text
	ctx.fillStyle='#e8ecff'; 
	ctx.font='16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'; 
	ctx.textAlign='left';
	const tText = `Time ${Math.ceil(game.tLeft)}s`; 
	ctx.fillText(tText, 12 - camX, 24 - camY);
	ctx.fillText(`You ${me.score}`, 12 - camX, 46 - camY);
	
	if (game.mode === 'solo' && aiPlayer) {
		ctx.fillText(`AI ${aiPlayer.score}`, 12 - camX, 68 - camY);
	} else {
		ctx.fillText(`Peer ${them.score}`, 12 - camX, 68 - camY);
	}
	
	ctx.textAlign='center'; 
	ctx.font='18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
	
	let roleText;
	if (game.started) {
		if (game.it === 'me') {
			roleText = 'You are IT';
		} else if (game.it === 'ai') {
			roleText = 'AI is IT - Run!';
		} else {
			roleText = 'You are running';
		}
	} else {
		roleText = game.mode === 'solo' ? 'Press Start (Solo Mode)' : 'Press Start';
	}
	
	ctx.fillText(roleText, (vw/2), 28 - camY);
	ctx.restore(); 
}

let lastTS = now(); let snapshotTimer = 0.2; let lastSend = 0;
function sendThrottled(obj){ const t=now(); if(t - lastSend > 33){ net.send(obj); lastSend = t; } }

function loop(ts){ 
	const dt = Math.min(0.05, (ts - lastTS)/1000); 
	lastTS = ts; 
	
	// Always use multiplayer mode for now - disable solo AI
	// if (game.mode === 'solo') {
	// 	// Solo mode - no network communication
	// 	moveLocal(keys, dt, null, now()); 
	// 	hostTick(dt, now, null);
	// } else {
		// Multiplayer mode
		moveLocal(keys, dt, sendThrottled, now()); 
		updateRemote(dt); 
		if(net.role==='host'){ 
			hostTick(dt, now, (state)=> net.send({ type:'state', state })); 
			snapshotTimer -= dt; 
			if(snapshotTimer<=0){ 
				snapshotTimer=0.2; 
				const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) }; 
				net.send({ type:'state', state }); 
			} 
		} 
	// }
	
	draw(); 
	requestAnimationFrame(loop); 
}
requestAnimationFrame(loop);

net.onopen = () => { 
	btnStartGame.disabled = (net.role!=='host'); 
	btnResetGame.disabled = (net.role!=='host'); 
	if(net.role==='host'){ 
		// Initialize obstacles for multiplayer
		setGameMode('multiplayer', 'simple');
		resetForHostStart(); 
		const state = { started:false, it: Math.random()<0.5? 'me':'peer', tLeft: ROUND_TIME, lastTick: now(), lastTagAt: 0 }; 
		net.send({ type:'state', state }); 
		gameModeEl.textContent = 'Mode: Multiplayer';
	}
};
net.onclose = () => { btnStartGame.disabled = true; btnResetGame.disabled = true; setChatEnabled(false); };
net.onmessage = (msg) => { if(msg.type==='pos'){ them.tx = Math.min(Math.max(msg.x, R), world.w-R); them.ty = Math.min(Math.max(msg.y, R), world.h-R); them.lastUpdate = now(); }
	else if(msg.type==='state'){ applyState(msg.state, net.role); }
	else if(msg.type==='chat'){ log(`Peer: ${msg.text}`); }
};

btnHostStart.onclick = async () => { try { setRole('host'); net.role='host'; await net.startHost(); } catch (e) { log('Host failed: ' + (e && e.message ? e.message : e)); btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); hostState.textContent='idle'; } };
btnPeerStart.onclick = () => { try { setRole('peer'); net.startPeer(); } catch (e) { log('Peer init failed: ' + (e && e.message ? e.message : e)); btnHostStart.disabled=false; btnPeerStart.disabled=false; setRoleTag(meTag, null); peerState.textContent='idle'; } };

async function applyAnswerFromText(txt){ await net.applyAnswerFromText(txt); }
async function applyOfferFromText(txt){ await net.applyOfferFromText(txt); }
btnApplyAnswer.onclick = async ()=>{ await applyAnswerFromText(answerIn.value); };
btnApplyOffer.onclick  = async ()=>{ await applyOfferFromText(offerIn.value); };

btnStartGame.onclick = () => { 
	if (game.mode === 'solo') {
		// Solo mode start
		game.started = true;
		game.tLeft = ROUND_TIME;
		game.lastTagAt = 0;
	} else if (net.role === 'host') {
		// Multiplayer mode start
		game.started = true;
		game.tLeft = ROUND_TIME;
		game.lastTagAt = 0;
		const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) };
		net.send({ type:'state', state });
	}
};

btnResetGame.onclick = () => { 
	if (game.mode === 'solo') {
		// Solo mode reset
		initSoloMode(game.obstacleLayout);
	} else if (net.role === 'host') {
		// Multiplayer mode reset
		resetForHostStart();
		const state = { me:{x:me.x,y:me.y,score:me.score}, them:{x:them.x,y:them.y,score:them.score}, started:game.started, it:game.it, tLeft:Math.ceil(game.tLeft) };
		net.send({ type:'state', state });
	}
};

// Solo mode button
btnSoloMode.onclick = () => {
	const layout = obstacleLayout.value || 'simple';
	setGameMode('solo', layout);
	btnStartGame.disabled = false;
	btnResetGame.disabled = false;
	setStatus('Solo Mode - Playing against AI', true);
	gameModeEl.textContent = 'Mode: Solo vs AI';
	setRoleTag(meTag, 'solo');
	log(`Solo mode started with ${layout} layout`);
};

chatSend.onclick = () => { const text = chatInput.value.trim(); if(!text) return; net.send({ type:'chat', text }); log('You: ' + text); chatInput.value=''; };
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') chatSend.click(); });

// QR Code functionality
function showQR(text){ 
  try{ 
    drawQrToCanvas(encodeForShare(text), qrCanvas, 8); 
    qrModal.classList.add('show'); 
  } catch(e){ 
    log('QR error: ' + e.message); 
  } 
}

btnQrOffer.onclick  = () => { if(!offerOut.value) return; showQR(offerOut.value); };
btnQrAnswer.onclick = () => { if(!answerOut.value) return; showQR(answerOut.value); };
qrClose.onclick     = () => { qrModal.classList.remove('show'); if(nextAction==='scanAnswer'){ nextAction=null; startScan(answerIn); } };

// QR Scanning functionality
let scanStream=null; let scanRunning=false; let detector=null;

async function startScan(targetField){ 
  try{
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      alert('Camera requires HTTPS or localhost. Use copy paste if not available.'); 
      return; 
    }
    
    // Try modern BarcodeDetector first, then fallback to jsQR
    let useBarcodeDetector = false;
    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({ formats:['qr_code'] });
        useBarcodeDetector = true;
        console.log('Using BarcodeDetector API');
      } catch (e) {
        console.warn('BarcodeDetector failed, using jsQR fallback');
      }
    } else {
      console.log('BarcodeDetector not available, using jsQR fallback');
    }
    
    scanModal.classList.add('show');
    
    // Reset scan UI
    const scanFrame = document.querySelector('.scan-frame');
    const scanStatus = document.querySelector('.scan-status');
    if (scanFrame) scanFrame.classList.remove('detected');
    if (scanStatus) {
      scanStatus.textContent = 'Point camera at QR code';
      scanStatus.className = 'scan-status';
    }
    
    // Use cross-browser compatible camera access
    scanStream = await getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    }); 
    
    scanVideo.srcObject = scanStream; 
    await scanVideo.play(); 
    scanRunning = true;
    
    let detectionCount = 0;
    let lastDetectionTime = 0;
    
    const loop = async ()=>{
      if(!scanRunning) return; 
      
      try{
        let raw = '';
        let detected = false;
        
        if (useBarcodeDetector && detector) {
          // Use modern BarcodeDetector
          try {
            const codes = await detector.detect(scanVideo); 
            if(codes && codes.length > 0){ 
              raw = codes[0].rawValue || ''; 
              detected = true;
              console.log('BarcodeDetector found QR:', raw.substring(0, 50) + '...');
            }
          } catch (e) {
            console.warn('BarcodeDetector detection error:', e);
          }
        } else {
          // Use jsQR fallback for Firefox and other browsers
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Ensure video has valid dimensions
            if (scanVideo.videoWidth > 0 && scanVideo.videoHeight > 0) {
              canvas.width = scanVideo.videoWidth;
              canvas.height = scanVideo.videoHeight;
              ctx.drawImage(scanVideo, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              if (window.jsQR) {
                const code = window.jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                  raw = code.data;
                  detected = true;
                  console.log('jsQR found QR:', raw.substring(0, 50) + '...');
                }
              } else {
                console.warn('jsQR library not available for fallback scanning');
              }
            } else {
              // Debug video dimensions
              if (detectionCount % 30 === 0) { // Log every 30 frames to avoid spam
                console.log('Video dimensions:', scanVideo.videoWidth, 'x', scanVideo.videoHeight);
              }
            }
          } catch (e) {
            console.warn('jsQR detection error:', e);
          }
        }
        
        // Update UI based on detection
        if (detected) {
          detectionCount++;
          lastDetectionTime = Date.now();
          
          // Highlight the scan frame
          if (scanFrame) {
            scanFrame.classList.add('detected');
          }
          
          // Update status
          if (scanStatus) {
            scanStatus.textContent = `QR Code Detected! (${detectionCount})`;
            scanStatus.className = 'scan-status detecting';
          }
          
          // Wait a bit to show the detection feedback
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Process the detected QR code
          if(raw && raw.trim()){
            console.log('Processing detected QR code:', raw.substring(0, 100) + '...');
            
            // Show success status
            if (scanStatus) {
              scanStatus.textContent = 'QR Code Processed Successfully!';
              scanStatus.className = 'scan-status success';
            }
            
            // Wait for success animation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Fill the target field and stop scanning
            targetField.value = raw; 
            stopScan(); 
            
            // Apply the detected data
            if (targetField === offerIn) { 
              await applyOfferFromText(raw); 
            } else if (targetField === answerIn) { 
              await applyAnswerFromText(raw); 
            } 
            return; 
          }
        } else {
          // No QR detected, reset UI if enough time has passed
          if (Date.now() - lastDetectionTime > 2000) {
            if (scanFrame) scanFrame.classList.remove('detected');
            if (scanStatus && scanStatus.textContent !== 'Point camera at QR code') {
              scanStatus.textContent = 'Point camera at QR code';
              scanStatus.className = 'scan-status';
            }
          }
        }
        
      } catch (err) {
        console.warn('QR detection error:', err);
        if (scanStatus) {
          scanStatus.textContent = 'Detection error - retrying...';
          scanStatus.className = 'scan-status';
        }
      } 
      
      requestAnimationFrame(loop); 
    };
    
    requestAnimationFrame(loop);
    
  }catch(e){ 
    log('Camera error: ' + e.message); 
    alert('Camera access failed. Check permissions.'); 
    stopScan(); 
  }
}

function stopScan(){
  scanRunning = false; 
  
  // Reset scan UI
  const scanFrame = document.querySelector('.scan-frame');
  const scanStatus = document.querySelector('.scan-status');
  if (scanFrame) scanFrame.classList.remove('detected');
  if (scanStatus) {
    scanStatus.textContent = 'Point camera at QR code';
    scanStatus.className = 'scan-status';
  }
  
  // Stop camera stream
  if(scanStream){
    scanStream.getTracks().forEach(track => track.stop()); 
    scanStream = null; 
  } 
  
  // Hide modal
  scanModal.classList.remove('show'); 
}

btnScanOffer.onclick  = () => startScan(offerIn);
btnScanAnswer.onclick = () => startScan(answerIn);
scanClose.onclick     = () => stopScan();

// Quick Connect functionality
async function startQuickConnect() {
  try {
    log('🚀 Starting Quick Connect...');
    
    // Start as host
    net.role = 'host';
    setRoleTag(meTag, 'host');
    btnHostStart.disabled = true;
    btnPeerStart.disabled = true;
    hostState.textContent = 'creating';
    
    // Create the peer connection and offer
    net.makePC();
    const ch = net.pc.createDataChannel('game', { ordered: true });
    net.bindDC(ch);
    
    const offer = await net.pc.createOffer();
    await net.pc.setLocalDescription(offer);
    await net.waitICE();
    
    const offerJson = JSON.stringify(net.pc.localDescription);
    offerOut.value = offerJson;
    
    // Show Quick Connect modal
    quickConnectModal.classList.add('show');
    
    // Generate and display the offer QR
    drawQrToCanvas(encodeForShare(offerJson), quickConnectOfferQR, 8);
    
    // Update status to step 1
    updateQuickConnectStatus(1);
    
    // Start scanning for answer automatically
    await startQuickConnectScan();
    
  } catch (e) {
    log('Quick Connect failed: ' + e.message);
    alert('Quick Connect failed. Check console for details.');
    stopQuickConnect();
  }
}

async function startQuickConnectScan() {
  try {
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      alert('Camera requires HTTPS or localhost for Quick Connect.');
      return;
    }
    
    // Update status to step 2
    updateQuickConnectStatus(2);
    
    // Start camera for scanning answer
    const stream = await getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    });
    
    quickConnectScanVideo.srcObject = stream;
    await quickConnectScanVideo.play();
    
    // Update status to step 3
    updateQuickConnectStatus(3);
    
    // Start scanning loop
    let scanRunning = true;
    let detector = null;
    
    // Try to use BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector failed, using jsQR fallback');
      }
    }
    
    const scanLoop = async () => {
      if (!scanRunning) return;
      
      try {
        let raw = '';
        
        if (detector) {
          // Use BarcodeDetector
          const codes = await detector.detect(quickConnectScanVideo);
          if (codes && codes.length > 0) {
            raw = codes[0].rawValue || '';
          }
        } else {
          // Use jsQR fallback
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (quickConnectScanVideo.videoWidth > 0 && quickConnectScanVideo.videoHeight > 0) {
            canvas.width = quickConnectScanVideo.videoWidth;
            canvas.height = quickConnectScanVideo.videoHeight;
            ctx.drawImage(quickConnectScanVideo, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            if (window.jsQR) {
              const code = window.jsQR(imageData.data, imageData.width, imageData.height);
              if (code) {
                raw = code.data;
              }
            }
          }
        }
        
        if (raw && raw.trim()) {
          console.log('Quick Connect: Answer detected!');
          
          // Update status to step 4
          updateQuickConnectStatus(4);
          
          // Stop scanning
          scanRunning = false;
          stream.getTracks().forEach(track => track.stop());
          
          // Process the answer
          try {
            await net.applyAnswerFromText(raw);
            log('✅ Quick Connect successful! Answer applied automatically.');
            
            // Close modal and show success
            setTimeout(() => {
              quickConnectModal.classList.remove('show');
              alert('🎉 Quick Connect successful! You are now connected.');
            }, 1000);
            
          } catch (e) {
            log('❌ Failed to apply answer: ' + e.message);
            alert('Answer detected but failed to apply. Please try manual connection.');
            stopQuickConnect();
          }
          
          return;
        }
        
      } catch (err) {
        console.warn('Quick Connect scan error:', err);
      }
      
      requestAnimationFrame(scanLoop);
    };
    
    requestAnimationFrame(scanLoop);
    
  } catch (e) {
    log('Quick Connect scan failed: ' + e.message);
    alert('Failed to start camera for Quick Connect scanning.');
    stopQuickConnect();
  }
}

function updateQuickConnectStatus(step) {
  const steps = quickConnectStatus.querySelectorAll('.status-step');
  steps.forEach((stepEl, index) => {
    if (index < step) {
      stepEl.classList.add('completed');
      stepEl.classList.remove('active');
    } else if (index === step - 1) {
      stepEl.classList.add('active');
      stepEl.classList.remove('completed');
    } else {
      stepEl.classList.remove('active', 'completed');
    }
  });
}

function stopQuickConnect() {
  // Reset UI
  btnHostStart.disabled = false;
  btnPeerStart.disabled = false;
  hostState.textContent = 'idle';
  setRoleTag(meTag, null);
  
  // Close modal
  quickConnectModal.classList.remove('show');
  
  // Stop any active streams
  if (quickConnectScanVideo.srcObject) {
    quickConnectScanVideo.srcObject.getTracks().forEach(track => track.stop());
    quickConnectScanVideo.srcObject = null;
  }
  
  // Reset status
  updateQuickConnectStatus(1);
}

// Quick Connect button handlers
btnQuickConnect.onclick = startQuickConnect;
quickConnectClose.onclick = stopQuickConnect;

// Role selection handlers
chooseHost.onclick = async () => { 
  roleModal.classList.remove('show'); 
  await btnHostStart.onclick(); 
};

choosePlayer.onclick = () => { 
  roleModal.classList.remove('show'); 
  btnPeerStart.onclick(); 
  startScan(offerIn); 
};

// Quick Connect from role selection
const btnQuickConnectFromRole = el('btnQuickConnectFromRole');
btnQuickConnectFromRole.onclick = () => { 
  roleModal.classList.remove('show'); 
  startQuickConnect(); 
};

// Copy button handlers
btnCopyOffer.onclick = async () => { 
  await navigator.clipboard.writeText(encodeForShare(offerOut.value)); 
  btnCopyOffer.textContent='Copied'; 
  setTimeout(()=>btnCopyOffer.textContent='Copy', 800); 
};

btnCopyAnswer.onclick = async () => { 
  await navigator.clipboard.writeText(encodeForShare(answerOut.value)); 
  btnCopyAnswer.textContent='Copied'; 
  setTimeout(()=>btnCopyAnswer.textContent='Copy', 800); 
};

// Scan Host functionality for peer
async function scanHost() {
  try {
    log('📱 Starting host scan...');
    
    // Start as peer
    net.role = 'peer';
    setRoleTag(meTag, 'peer');
    btnPeerStart.disabled = true;
    btnHostStart.disabled = true;
    peerState.textContent = 'scanning';
    
    // Open scanning modal
    scanModal.classList.add('show');
    
    // Start scanning for offer
    const stream = await getUserMedia({ 
      video: { 
        facingMode: 'environment',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    });
    
    scanVideo.srcObject = stream;
    await scanVideo.play();
    
    let scanRunning = true;
    let detector = null;
    
    // Try to use BarcodeDetector if available
    if ('BarcodeDetector' in window) {
      try {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector failed, using jsQR fallback');
      }
    }
    
    const scanLoop = async () => {
      if (!scanRunning) return;
      
      try {
        let raw = '';
        
        if (detector) {
          // Use BarcodeDetector
          const codes = await detector.detect(scanVideo);
          if (codes && codes.length > 0) {
            raw = codes[0].rawValue || '';
          }
        } else {
          // Use jsQR fallback
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (scanVideo.videoWidth > 0 && scanVideo.videoHeight > 0) {
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
        }
        
        if (raw && raw.trim()) {
          console.log('Host scan: Offer detected!');
          
          // Stop scanning
          scanRunning = false;
          stream.getTracks().forEach(track => track.stop());
          scanModal.classList.remove('show');
          
          // Apply the offer
          try {
            await net.applyOfferFromText(raw);
            log('✅ Offer applied successfully!');
            
            // Auto-create and show answer QR
            const answerJson = JSON.stringify(net.pc.localDescription);
            answerOut.value = answerJson;
            
            // Show answer QR modal
            qrModal.classList.add('show');
            drawQrToCanvas(encodeForShare(answerJson), qrCanvas, 8);
            
            log('📱 Show this QR to the host to complete Quick Connect!');
            
          } catch (e) {
            log('❌ Failed to apply offer: ' + e.message);
            alert('Offer detected but failed to apply. Please try manual connection.');
            peerState.textContent = 'idle';
            btnPeerStart.disabled = false;
            btnHostStart.disabled = false;
          }
          
          return;
        }
        
      } catch (err) {
        console.warn('Host scan error:', err);
      }
      
      requestAnimationFrame(scanLoop);
    };
    
    requestAnimationFrame(scanLoop);
    
  } catch (e) {
    log('Host scan failed: ' + e.message);
    alert('Failed to start camera for host scanning.');
    peerState.textContent = 'idle';
    btnPeerStart.disabled = false;
    btnHostStart.disabled = false;
  }
}

btnScanHost.onclick = scanHost;

// Test scanning setup
btnTestScan.onclick = async () => {
  log('Testing scan setup...');
  
  try {
    // Check if we're on a secure origin
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      log('❌ Camera requires HTTPS or localhost', 'error');
      return;
    }
    
    // Check if getUserMedia is available
    if (!getMediaDevices()) {
      log('❌ Camera access not supported', 'error');
      return;
    }
    
    log('✅ Camera access supported');
    
    // Check if jsQR is available
    if (typeof window.jsQR === 'function') {
      log('✅ jsQR library available');
    } else {
      log('❌ jsQR library not available', 'error');
    }
    
    // Check if BarcodeDetector is available
    if ('BarcodeDetector' in window) {
      log('✅ BarcodeDetector API available');
    } else {
      log('⚠️ BarcodeDetector API not available (will use jsQR fallback)');
    }
    
    // Test camera permissions
    try {
      const stream = await getUserMedia({ video: true, audio: false });
      log('✅ Camera permission granted');
      
      // Get video track info
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities();
        log(`📹 Camera: ${videoTrack.label || 'Unknown'}`);
        log(`📐 Max resolution: ${capabilities.width?.max || 'Unknown'}x${capabilities.height?.max || 'Unknown'}`);
      }
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
    } catch (e) {
      log(`❌ Camera permission denied: ${e.message}`, 'error');
    }
    
  } catch (e) {
    log(`❌ Scan setup test failed: ${e.message}`, 'error');
  }
};

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
	try { const enc=encodeForShare('{"k":1}'); ok('Share prefix', enc[0]==='z'); ok('Base64 charset', /^[A-Za-z0-9\+\/\=]+$/.test(enc.slice(1))); } catch(e){ ok('Base64 charset', false); }
	try { const state={ me:{x:1,y:2,score:0}, them:{x:3,y:4,score:0}, started:false, it:'me', tLeft:10 }; const copy=JSON.parse(JSON.stringify(state)); ok('State JSON roundtrip', copy.me.x===1 && copy.it==='me'); } catch(e){ ok('State JSON roundtrip', false); }
        try { const obj = { type:'x', state:{ n:1 } }; const s = JSON.stringify(obj); ok('Object literal serializes', /\{"type":"x","state":\{"n":1\}\}/.test(s)); } catch(e){ ok('Object literal serializes', false); }
        log(results.join('\n'));
};

// Expose game state to window for UI updates
window.gameState = {
  me: me,
  them: them,
  game: game,
  roundStart: null,
  get connected() { return net.pc && net.pc.connectionState === 'connected'; }
};

// Update game state periodically
setInterval(() => {
  if (window.gameState) {
    window.gameState.roundStart = game.roundStart;
    // Trigger header update if in game-only mode
    if (document.body.classList.contains('game-only') && window.updateGameHeader) {
      window.updateGameHeader();
    }
  }
}, 100);
