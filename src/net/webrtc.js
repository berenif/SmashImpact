import { now } from '../utils/time.js';

export class Net {
	constructor(bindings){
		this.pc = null;
		this.dc = null;
		this.role = null;
		this.pingTimer = 0;
		this.rtt = null;
		this.onopen = null;
		this.onclose = null;
		this.onmessage = null;
		this.bindings = bindings;
	}
	makePC(){
		if(this.pc){ try{ this.pc.close(); }catch(e){} this.pc=null; }
		if(this.dc){ try{ this.dc.close(); }catch(e){} this.dc=null; }
		const rtcConfig = { iceServers: [] };
		this.pc = new RTCPeerConnection(rtcConfig);
		this.pc.onconnectionstatechange = () => {
			const st = this.pc.connectionState;
			this.bindings.setStatus(`State: ${st}`, st === 'connected');
			if(st==='failed') this.bindings.log('Connection failed, check network or HTTPS.');
		};
		this.pc.onicecandidateerror = (e) => this.bindings.log('ICE error: ' + (e.errorText || e.hostCandidate || ''));
		return this.pc;
	}
	bindDC(channel){
		this.dc = channel;
		this.bindings.setChatEnabled(false);
		this.dc.onopen = () => {
			this.bindings.setStatus('Connected', true);
			this.bindings.setChatEnabled(true);
			this.startPings();
			if(this.onopen) this.onopen();
		};
		this.dc.onclose = () => {
			this.bindings.setStatus('Disconnected', false);
			this.bindings.setChatEnabled(false);
			this.stopPings();
			if(this.onclose) this.onclose();
			this.bindings.resetUiForDisconnect();
		};
		this.dc.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.type === 'ping') {
					this.send({ type: 'pong', t: msg.t });
				} else if (msg.type === 'pong') {
					this.rtt = Math.round(performance.now() - msg.t);
					this.bindings.setLatency(this.rtt);
				} else {
					if (this.onmessage) this.onmessage(msg);
				}
			} catch (err) {
				this.bindings.log(`Raw: ${e.data}`);
			}
		};
	}
	startHost(){
		this.role = 'host';
		this.bindings.setRole('host');
		this.bindings.onHostStart();
		this.makePC();
		const ch = this.pc.createDataChannel('game', { ordered: true });
		this.bindDC(ch);
		return this.pc.createOffer()
			.then(offer => this.pc.setLocalDescription(offer))
			.then(() => this.waitICE())
			.then(() => {
				this.bindings.onOfferReady(JSON.stringify(this.pc.localDescription));
			});
	}
	startPeer(){
		this.role='peer';
		this.bindings.setRole('peer');
		this.bindings.onPeerStart();
	}
	async applyOfferFromText(txt){
		try{
			if(this.role!=='peer') this.startPeer();
			this.makePC();
			this.pc.ondatachannel = (e) => this.bindDC(e.channel);
			const offer = JSON.parse(this.bindings.decodeShared(txt));
			await this.pc.setRemoteDescription(offer);
			const answer = await this.pc.createAnswer();
			await this.pc.setLocalDescription(answer);
			await this.waitICE();
			this.bindings.onAnswerReady(JSON.stringify(this.pc.localDescription));
		}catch(e){ this.bindings.log('Bad offer JSON'); }
	}
	async applyAnswerFromText(txt){
		try{
			const answer = JSON.parse(this.bindings.decodeShared(txt));
			await this.pc.setRemoteDescription(answer);
			this.bindings.onAnswerApplied();
		}catch(e){ this.bindings.log('Bad answer JSON'); }
	}
	send(obj){ if(this.dc && this.dc.readyState==='open'){ try{ this.dc.send(JSON.stringify(obj)); }catch(e){} } }
	startPings(){ this.stopPings(); this.pingTimer = setInterval(()=>{ this.send({type:'ping', t:performance.now()}); }, 1000); }
	stopPings(){ if(this.pingTimer){ clearInterval(this.pingTimer); this.pingTimer=0; } }
	async waitICE(){ if(!this.pc) return; if(this.pc.iceGatheringState==='complete') return; await new Promise((res)=>{ let done=false; const cleanup=()=>{ if(done) return; done=true; this.pc && this.pc.removeEventListener('icegatheringstatechange', check); res(); }; const check=()=>{ if(!this.pc) return cleanup(); if(this.pc.iceGatheringState==='complete'){ cleanup(); } }; this.pc.addEventListener('icegatheringstatechange', check); setTimeout(cleanup, 3000); }); }
}