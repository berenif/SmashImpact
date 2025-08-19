# SmashImpact - Project Structure

## Directory Organization

```
SmashImpact/
├── config/                 # Configuration files
│   └── _config.yml        # Jekyll configuration
│
├── docs/                   # Documentation
│   ├── BUG_REPORT_COMPLETE.md
│   ├── fix-visual-effects.patch
│   └── wolf-demo-created.txt
│
├── public/                 # Public static files (served to browser)
│   ├── index.html         # Main entry point
│   ├── game.html          # Main game page
│   ├── game-backup.html   # Backup version
│   ├── game-wolf.html     # Wolf variant
│   ├── menu.html          # Game menu
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker for offline support
│
├── scripts/                # Build and utility scripts
│   ├── fix-bugs.sh
│   └── update-cache-version.sh
│
├── src/                    # Source code
│   ├── ai/                # AI and enemy logic
│   │   ├── wolf-ai.js
│   │   ├── wolf-integration.js
│   │   └── wolf-integration-fix.js
│   │
│   ├── core/              # Core game engine
│   │   ├── EventBus.js    # Event system
│   │   └── GameState.js   # Game state management
│   │
│   ├── debug/             # Debug tools
│   │   └── debug-panel.js
│   │
│   ├── game/              # Game mechanics and rendering
│   │   ├── control-config.js
│   │   ├── dungeon-conversion.js
│   │   ├── fix-walkability.js
│   │   ├── visual-effects.js
│   │   └── visual-improvements.js
│   │
│   ├── multiplayer/       # Multiplayer functionality
│   │   ├── connect.html
│   │   ├── multiplayer.js
│   │   └── multiplayer-backup.js
│   │
│   ├── testing/           # Testing framework
│   │   ├── balance-config.js
│   │   ├── metrics-collector.js
│   │   └── test-framework.js
│   │
│   ├── ui/                # User interface components
│   │   └── (UI components will go here)
│   │
│   └── utils/             # Utility functions
│       └── (Utility modules will go here)
│
├── tests/                  # Test files
│   ├── run-balance-tests.js
│   ├── test-controls.html
│   ├── test-fixes.html
│   ├── test-game-fixed.html
│   ├── test-game.js
│   └── test-rendering.html
│
├── vendor/                 # Third-party libraries
│   ├── jsqr.js            # QR code reader
│   └── qrcode.js          # QR code generator
│
├── .github/               # GitHub specific files
├── .git/                  # Git repository
├── .nojekyll             # Disable Jekyll processing
├── package.json          # NPM configuration
└── README.md             # Project documentation
```

## Module Organization

### Core Systems (`src/core/`)
- **EventBus.js**: Central event system for component communication
- **GameState.js**: Global game state management

### AI System (`src/ai/`)
- Wolf enemy AI implementation
- Integration layers for AI behaviors

### Game Logic (`src/game/`)
- Control configuration
- Dungeon generation and conversion
- Visual effects and improvements
- Movement and collision detection

### Multiplayer (`src/multiplayer/`)
- WebRTC-based peer-to-peer multiplayer
- Connection management

### Testing (`src/testing/`, `tests/`)
- Balance testing framework
- Performance metrics collection
- Unit and integration tests

### Debug Tools (`src/debug/`)
- In-game debug panel for development

## Key Features

1. **Progressive Web App (PWA)**: Service worker for offline play
2. **Multiplayer Support**: WebRTC-based peer-to-peer connections
3. **Modular Architecture**: Clear separation of concerns
4. **Testing Framework**: Built-in balance and performance testing
5. **Debug Tools**: Comprehensive debugging capabilities

## Development Scripts

- `npm run test`: Run balance tests
- `npm run update-cache`: Update service worker cache version
- `npm run deploy`: Deploy with cache update to GitHub Pages

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas
- **Multiplayer**: WebRTC
- **PWA**: Service Workers
- **Deployment**: GitHub Pages
- **Version Control**: Git