export const el = (id) => document.getElementById(id);

export function setStatus(statusEl, text, good) {
	statusEl.textContent = text;
	statusEl.className = 'small mono ' + (good ? 'ok' : 'muted');
}

export function setRoleTag(tagEl, role) {
	tagEl.textContent = role ? `${role} ready` : 'not joined';
}

export function makeLogger(logEl) {
	return function log(msg) {
		const entry = `[${new Date().toLocaleTimeString()}] ${msg}\n`;
		logEl.textContent = entry + logEl.textContent;
		if (logEl.textContent.length > 8000) {
			logEl.textContent = logEl.textContent.slice(0, 8000);
		}
	};
}