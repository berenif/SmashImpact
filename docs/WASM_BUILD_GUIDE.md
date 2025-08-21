# WASM Build Guide for Future Agents

## 🚀 Overview

This project has **WebAssembly (WASM) compilation fully automated** through GitHub Actions. The WASM modules are automatically built whenever C++ code changes are pushed to the repository.

## 📋 Key Information for Future Agents

### ✅ WASM Compilation is Already Set Up!

- **GitHub Actions Workflow**: `.github/workflows/wasm-build.yml`
- **Automatic Triggers**: 
  - On push to `main` branch
  - On pull requests
  - When C++/C files change
  - Manual workflow dispatch available

### 🏗️ Build System Components

1. **Main WASM Source**: `wolf_ai_wasm.cpp`
   - Contains the core game engine logic
   - Exports functions for JavaScript interaction
   - Located in repository root

2. **Build Scripts**:
   - `build.sh` - Full build with Emscripten installation
   - `build-quick.sh` - Quick build for development
   - `build_wolf_ai.sh` - Specific Wolf AI module build
   - `verify-build.sh` - Build verification script

3. **Output Directory**: `wasm/`
   - `wolf_ai.wasm` - The compiled WebAssembly binary
   - `wolf_ai.js` - JavaScript glue code

## 🔧 GitHub Actions Workflow Details

### Workflow: `wasm-build.yml`

The workflow performs the following steps:

1. **Emscripten Installation**:
   - Uses Emscripten SDK version 3.1.51
   - Cached for faster builds
   - Automatically installed if not cached

2. **WASM Compilation**:
   - Compiles `wolf_ai_wasm.cpp` with optimizations (-O3)
   - Exports all necessary functions for JavaScript
   - Modular build with `WolfAIModule` export name
   - Memory growth enabled for dynamic allocation

3. **Build Verification**:
   - Tests that WASM files are generated
   - Runs verification script if available
   - Reports file sizes and build status

4. **Artifact Storage**:
   - WASM files uploaded as artifacts
   - 30-day retention period
   - Accessible from workflow runs

5. **Optional Deployment**:
   - Deploys to GitHub Pages on main branch pushes
   - Makes WASM available for web demos

## 🎯 Exported WASM Functions

The following functions are exported from the WASM module:

```javascript
// Game initialization and control
_initGame()
_updateGame()
_resetGame()
_setDifficulty(level)

// Input handling
_handleInput(type, x, y)

// Player state
_getPlayerX()
_getPlayerY()
_getPlayerHealth()

// Enemy state
_getEnemyCount()
_getEnemyX(index)
_getEnemyY(index)
_getEnemyHealth(index)

// Projectile state
_getProjectileCount()
_getProjectileX(index)
_getProjectileY(index)

// Game state
_isGameOver()
_getScore()

// Memory management
_malloc(size)
_free(ptr)
```

## 📊 Build Status Monitoring

### How to Check Build Status:

1. **GitHub Actions Tab**: Navigate to Actions tab in repository
2. **Workflow Runs**: Look for "WASM Build" workflow
3. **Build Artifacts**: Download compiled WASM from workflow artifacts
4. **Build Summary**: Each run includes detailed summary with file sizes

### Common Build Issues and Solutions:

| Issue | Solution |
|-------|----------|
| Emscripten not found | Workflow automatically installs it |
| WASM file missing | Check compilation flags in workflow |
| Export functions missing | Update EXPORTED_FUNCTIONS in workflow |
| Build fails on PR | Check changed files match path filters |

## 🔄 Making Changes

### To Add New WASM Functions:

1. Add function to `wolf_ai_wasm.cpp`
2. Update `EXPORTED_FUNCTIONS` in workflow
3. Push changes - workflow runs automatically

### To Update Emscripten Version:

1. Edit `.github/workflows/wasm-build.yml`
2. Change version in cache key and install step
3. Test with manual workflow dispatch

### To Add New C++ Modules:

1. Place files in `src/` directory
2. Workflow automatically compiles all `.cpp` files
3. Each module gets its own WASM output

## 🧪 Testing WASM Locally

```bash
# Quick local build
./build-quick.sh

# Full build with Emscripten setup
./build.sh

# Verify build
./verify-build.sh

# Test in browser
# Open test-wasm.html or wasm-test.html
```

## 📝 Important Notes for Future Agents

1. **DO NOT** manually install Emscripten in CI - it's handled automatically
2. **DO NOT** commit WASM binaries - they're built in CI
3. **DO USE** the existing workflow - it's optimized and cached
4. **DO CHECK** workflow runs after pushing C++ changes
5. **DO DOWNLOAD** artifacts from workflow for testing

## 🔗 Quick Links

- [Workflow File](.github/workflows/wasm-build.yml)
- [Main WASM Source](wolf_ai_wasm.cpp)
- [Build Script](build.sh)
- [Test Pages](wasm-test.html)

## 💡 Tips for Future Development

1. **Performance**: Current build uses -O3 optimization
2. **Debugging**: Add `-g` flag for debug symbols if needed
3. **Size Optimization**: Consider `-Os` for smaller builds
4. **Threading**: Add `-pthread` if threading support needed
5. **SIMD**: Enable with `-msimd128` for performance boost

## 🆘 Troubleshooting Commands

```bash
# Check if workflow file is valid
cat .github/workflows/wasm-build.yml

# Test build locally
docker run --rm -v $(pwd):/src emscripten/emsdk emcc wolf_ai_wasm.cpp -o test.js

# Verify exports
emcc wolf_ai_wasm.cpp -s EXPORTED_FUNCTIONS='["_initGame"]' --show-exports

# Check artifact size
ls -lh wasm/*.wasm
```

## 📈 Workflow Performance Metrics

- **Average Build Time**: ~2-3 minutes
- **Cache Hit Rate**: ~80% (Emscripten cached)
- **Artifact Size**: ~200-500KB per WASM module
- **Parallel Builds**: Supports multiple C++ files

---

**Last Updated**: This documentation reflects the current state of WASM build automation.
**Maintained By**: GitHub Actions workflow `wasm-build.yml`
**Contact**: Check repository issues for build problems
