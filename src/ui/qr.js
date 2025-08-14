// Enhanced QR implementation with fallback and error handling
export function drawQrToCanvas(text, canvas, scale) {
	try {
		// Check if QR library is available
		if (typeof window.qrcode !== 'function') {
			throw new Error('QR library not loaded');
		}

		const qr = window.qrcode(1, 'L');
		qr.addData(text);
		qr.make();
		const count = qr.getModuleCount();
		const size = count * scale;
		canvas.width = canvas.height = Math.max(240, size);
		
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			throw new Error('Canvas 2D context not available');
		}
		
		// Clear canvas with white background
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		const offset = Math.floor((canvas.width - size) / 2);
		
		// Draw QR code
		for (let r = 0; r < count; r++) {
			for (let c = 0; c < count; c++) {
				ctx.fillStyle = qr.isDark(r, c) ? '#000' : '#fff';
				ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
			}
		}
	} catch (error) {
		console.error('QR generation failed:', error);
		
		// Fallback: draw a simple error pattern
		canvas.width = canvas.height = 240;
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.fillStyle = '#f0f0f0';
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = '#666';
			ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText('QR Code Error', canvas.width / 2, canvas.height / 2 - 10);
			ctx.fillText('Text: ' + (text ? text.substring(0, 20) + '...' : 'empty'), canvas.width / 2, canvas.height / 2 + 10);
		}
	}
}