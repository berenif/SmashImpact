# ⚔️ WebAssembly Isometric RPG Game

A fully-featured isometric RPG game where **ALL game logic is implemented in WebAssembly** for maximum performance. Play it live on GitHub Pages!

## 🎮 [Play Now!](https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/)

![Game Preview](https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=webassembly&logoColor=white)
![C](https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

## 🌟 Features

### Game Engine (100% WebAssembly)
- **Complete RPG mechanics** implemented in C and compiled to WASM
- **Procedural world generation** with multiple terrain types
- **Dungeon generation** using cellular automata algorithms
- **Turn-based combat system** with attack/defense calculations
- **Enemy AI** with pathfinding and different behavior patterns
- **Inventory management** with 20 slots and item stacking
- **Experience & leveling system** with stat progression
- **Fog of war** and visibility calculations

### Isometric Rendering
- **True isometric view** with proper depth sorting
- **Height-based terrain** with visual depth effects
- **Dynamic lighting** and shadow effects
- **Minimap** showing explored areas
- **Smooth animations** and visual feedback

### RPG Elements

#### 🧙 Character Stats
- Health & Mana
- Attack & Defense
- Level & Experience
- Gold currency system

#### 👹 6 Enemy Types
- **Goblin** - Fast but weak
- **Orc** - Balanced fighter
- **Skeleton** - Undead warrior
- **Dragon** - Powerful boss enemy
- **Wolf** - Quick attacker
- **Bandit** - Human adversary

#### 🎒 10 Item Types
- ⚔️ **Sword** - Increases attack power
- 🛡️ **Shield** - Boosts defense
- 🧪 **Potion** - Restores health
- 🗝️ **Key** - Opens locked areas
- 💰 **Gold** - Currency
- 🏹 **Bow** - Ranged weapon
- ➳ **Arrows** - Ammunition
- 🎽 **Armor** - Protection gear
- 📖 **Spell Book** - Magic enhancement
- 🍖 **Food** - Health restoration

#### 🗺️ 13 Terrain Types
Grass, Stone, Water, Trees, Walls, Doors, Chests, Mountains, Sand, Bridges, and more!

## 🎯 How to Play

### Controls
- **WASD** or **Arrow Keys** - Move your character in 8 directions
- **Click items** in inventory - Use or equip items
- **E key** - Enter dungeons
- **Mouse** - Interact with UI elements

### Gameplay
1. **Explore** the procedurally generated world
2. **Fight enemies** by moving into them (automatic combat)
3. **Collect items** by walking over them
4. **Level up** by gaining experience from defeated enemies
5. **Enter dungeons** for greater challenges and rewards
6. **Manage inventory** - Click items to use potions or equip gear

### Tips
- 💡 Combat is turn-based - enemies move after you
- 💡 Different enemies have different stats and behaviors
- 💡 Equip better weapons and armor to increase your stats
- 💡 Save potions for tough battles
- 💡 Explore thoroughly to find all items
- 💡 Dungeons get harder as you go deeper

## 🚀 Deployment

### GitHub Pages Setup

1. **Fork or clone this repository**
2. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: main (or master)
   - Folder: / (root)
3. **Wait a few minutes** for deployment
4. **Access your game** at `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
```

2. **Run the local server:**
```bash
python3 server.py
```

3. **Open in browser:**
```
http://localhost:8000
```

## 🛠️ Building from Source

### Prerequisites
- [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html)
- Python 3.x (for local server)

### Compile WASM Module

1. **Install Emscripten:**
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

2. **Compile the game:**
```bash
./build.sh
```

Or manually:
```bash
emcc rpg_game.c -o rpg_game.js \
  -s WASM=1 \
  -s EXPORTED_FUNCTIONS='["_init_game", "_player_move", "_use_item", "_get_render_data", "_get_player_stats", "_get_inventory", "_get_message", "_enter_dungeon", "_malloc", "_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap", "UTF8ToString"]' \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='createRPGModule' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -O2
```

## 📁 Project Structure

```
.
├── index.html          # Main game interface
├── rpg_game.c          # Game engine source (C)
├── rpg_game.js         # Compiled WASM loader
├── rpg_game.wasm       # WebAssembly binary
├── build.sh            # Build script
├── server.py           # Local development server
└── README.md           # This file
```

## 🔧 Technical Details

### WebAssembly Integration
- All game logic runs in WASM for near-native performance
- Memory-efficient data structures
- Direct memory management for optimal performance
- Minimal JavaScript bridge for rendering only

### Performance
- 60 FPS rendering on modern browsers
- Instant response to player input
- Efficient pathfinding algorithms
- Optimized visibility calculations

### Browser Compatibility
- ✅ Chrome 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ Opera 44+

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 🎨 Credits

Created with ❤️ using WebAssembly, demonstrating the power of running native code in the browser.

---

**Note:** This game runs entirely in your browser. No server-side processing required!

## 🐛 Troubleshooting

### Game not loading?
- Ensure JavaScript is enabled
- Check browser console for errors
- Try a different browser
- Clear browser cache

### Performance issues?
- Close other browser tabs
- Update your browser
- Check if hardware acceleration is enabled

### WASM not loading?
- Some browsers require HTTPS for WASM
- Local file:// URLs may not work - use the Python server
- Check browser compatibility

---

Enjoy your adventure! 🗡️🛡️🏰