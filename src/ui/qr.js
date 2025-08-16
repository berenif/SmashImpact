// Enhanced QR implementation with fallback and error handling
export function drawQrToCanvas(text, canvas, scale) {
	try {
		// Check if QR library is available
		if (typeof window.qrcode !== 'function') {
			throw new Error('QR library not loaded');
		}

		const qr = window.qrcode(0, 'L');
		qr.addData(text);
		qr.make();
                const count = qr.getModuleCount();
                const qrSize = count * scale;
                const margin = 4 * scale; // ensure quiet zone for scanners
                const canvasSize = Math.max(240, qrSize + margin * 2);
                canvas.width = canvas.height = canvasSize;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                        throw new Error('Canvas 2D context not available');
                }

                // Clear canvas with white background
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const offset = Math.floor((canvas.width - qrSize) / 2);
		
		// Draw QR code
		for (let r = 0; r < count; r++) {
			for (let c = 0; c < count; c++) {
				ctx.fillStyle = qr.isDark(r, c) ? '#000' : '#fff';
				ctx.fillRect(offset + c * scale, offset + r * scale, scale, scale);
			}
		}
	} catch (error) {
                console.error('QR generation failed:', error);

                // Clear to blank canvas so scanners do not misread errors as codes
                canvas.width = canvas.height = 240;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
	}
}