# Smash Impact - P2P Multiplayer Battle Game

A mobile-first multiplayer battle arena game with WebRTC peer-to-peer connectivity. No server required - connect directly with another player on the same network!

## 🎮 Features

- **Mobile-First Design** - Optimized touch controls with virtual joystick
- **P2P Multiplayer** - Direct connection via WebRTC (no server needed)
- **QR Code Connection** - Easy pairing with QR codes or text codes
- **Real-time Sync** - 60Hz state synchronization for smooth gameplay
- **Cross-Platform** - Works on mobile and desktop browsers
- **PWA Support** - Install as an app on your device

## 🚀 Quick Start

1. **Host a Game:**
   - Open the game → Select "Multiplayer"
   - Choose "Host" → Share the QR/text code
   - Wait for player → Start the game

2. **Join a Game:**
   - Open the game → Select "Multiplayer"
   - Choose "Join" → Scan QR or paste code
   - Wait for host to start

## 🎯 Controls

**Mobile:**
- Left joystick for movement
- Attack button (💥) 
- Boost button (⚡)

**Desktop:**
- WASD or Arrow keys to move
- Space to attack
- Shift to boost

## 📁 Project Structure

```
/
├── index.html      # Auto-redirect to menu
├── menu.html       # Main menu / landing page
├── connect.html    # P2P connection interface
├── game.html       # Game interface
├── multiplayer.js  # Multiplayer synchronization
├── sw.js          # Service worker for PWA
├── manifest.json  # PWA manifest
└── vendor/        # External libraries (QR code)
```

## 🌐 Live Demo

Visit: https://berenif.github.io/SmashImpact/

## 🛠️ Technologies

- **WebRTC** - Peer-to-peer connectivity
- **Canvas API** - Game rendering
- **Touch API** - Mobile controls
- **Service Worker** - Offline support
- **QR Code** - Easy connection sharing

## 📱 Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 14+ (iOS/macOS)
- Chrome Android
- Samsung Internet

## 🎨 Game Modes

- **Solo Play** - Practice against AI
- **P2P Multiplayer** - Connect with another player

## 🔧 Development

The game is built with vanilla JavaScript and requires no build process. Simply serve the files with any HTTP server.

```bash
# Local development
python3 -m http.server 8000
# Visit http://localhost:8000
```

## 📄 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for mobile gaming
