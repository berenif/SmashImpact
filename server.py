#!/usr/bin/env python3
"""
Simple HTTP server for testing the WASM Snake game.
Serves files with proper MIME types for WebAssembly.
"""

import http.server
import socketserver
import os

class WASMHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP request handler with WASM MIME type support."""
    
    def end_headers(self):
        """Add CORS headers to allow WASM loading."""
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()
    
    def guess_type(self, path):
        """Add WASM MIME type support."""
        mimetype = super().guess_type(path)
        if path.endswith('.wasm'):
            return 'application/wasm'
        return mimetype

def main():
    """Start the HTTP server."""
    PORT = 8000
    
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), WASMHTTPRequestHandler) as httpd:
        print(f"🐍 WASM Snake Game Server")
        print(f"=" * 40)
        print(f"Server running at: http://localhost:{PORT}")
        print(f"Open in browser:   http://localhost:{PORT}/game.html")
        print(f"=" * 40)
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nServer stopped.")

if __name__ == "__main__":
    main()