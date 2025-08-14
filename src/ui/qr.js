// Minimal QR implementation (reusing global from index for brevity would be ideal; here we assume qrcode is available on window)
export function drawQrToCanvas(text, canvas, scale) {
	const qr = window.qrcode(0, 'L');
	qr.addData(text);
	qr.make();
	const count = qr.getModuleCount();
	const size = count * scale;
	canvas.width = canvas.height = Math.max(240, size);
	const ctx = canvas.getContext('2d');
	ctx.fillStyle = '#fff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	const offset = Math.floor((canvas.width - size) / 2);
	for (let r = 0; r < count; r++) {
		for (let c = 0; c < count; c++) {
			ctx.fillStyle = qr.isDark(r, c) ? '#000' : '#fff';
			ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
		}
	}
}