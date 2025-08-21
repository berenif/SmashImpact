# GitHub Actions Workflows

## 🎯 Important for Future Agents

**WASM compilation is FULLY AUTOMATED** through GitHub Actions. The workflows handle:
- Automatic WASM builds on code changes
- Caching for fast builds
- Testing and verification
- Artifact storage
- Optional deployment to GitHub Pages

## 📋 Workflow Overview

### 1. `wasm-build.yml` - **WASM Compilation** ✅
- **Purpose**: Compiles C++ code to WebAssembly
- **Triggers**: 
  - Push to main branch (when C++ files change)
  - Pull requests with C++ changes
  - Manual dispatch
- **Key Features**:
  - Emscripten SDK installation (cached)
  - Compiles `wolf_ai_wasm.cpp` to WASM
  - Uploads artifacts for 30 days
  - Optional GitHub Pages deployment
- **Build Time**: ~2-3 minutes

### 2. `test-matrix.yml` - **Comprehensive Testing**
- **Purpose**: Runs all test suites
- **Triggers**: Push, PR, manual
- **Test Suites**:
  - Unit tests
  - Integration tests
  - Browser tests
  - **WASM tests** (Node 18+ only)
- **Matrix**: Node 16, 18, 20 on Ubuntu

### 3. `deploy-pages.yml` - **GitHub Pages Deployment**
- **Purpose**: Deploys demo to GitHub Pages
- **Triggers**: Push to main, manual
- **Deploys**: HTML demos with WASM modules

### 4. `update-cache.yml` - **Cache Management**
- **Purpose**: Updates dependency caches
- **Triggers**: Schedule, manual
- **Caches**: npm, Emscripten SDK

## 🚀 WASM Build Details

### Automatic WASM Compilation

The `wasm-build.yml` workflow automatically:

1. **Installs Emscripten** (version 3.1.51)
2. **Compiles** `wolf_ai_wasm.cpp` with:
   - O3 optimization
   - Modular output
   - All game functions exported
3. **Verifies** the build
4. **Stores** artifacts for download
5. **Deploys** to GitHub Pages (main branch only)

### Exported Functions

```javascript
// All these functions are automatically exported:
_initGame, _updateGame, _resetGame, _setDifficulty,
_handleInput, _getPlayerX, _getPlayerY, _getPlayerHealth,
_getEnemyCount, _getEnemyX, _getEnemyY, _getEnemyHealth,
_getProjectileCount, _getProjectileX, _getProjectileY,
_isGameOver, _getScore, _malloc, _free
```

## 📦 Artifacts

Each WASM build produces:
- `wasm/wolf_ai.wasm` - Binary module
- `wasm/wolf_ai.js` - JavaScript glue code
- Available for 30 days in Actions tab

## 🔧 Making Changes

### Adding New WASM Functions

1. Edit `wolf_ai_wasm.cpp`
2. Add function name to `EXPORTED_FUNCTIONS` in `wasm-build.yml`
3. Push changes - workflow runs automatically

### Updating Emscripten Version

1. Edit `wasm-build.yml`
2. Change version in:
   - Cache key: `${{ runner.os }}-emsdk-NEW_VERSION`
   - Install step: `./emsdk install NEW_VERSION`

### Adding New C++ Files

Place in `src/` directory - workflow compiles all `.cpp` files automatically

## 🧪 Testing Workflows Locally

```bash
# Install act (GitHub Actions local runner)
brew install act  # or: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Test WASM build workflow
act -W .github/workflows/wasm-build.yml

# Test with specific event
act push -W .github/workflows/wasm-build.yml

# List all workflows
act -l
```

## 📊 Monitoring Builds

1. **GitHub UI**: Actions tab → Select workflow
2. **Status Badge**: Add to README:
   ```markdown
   ![WASM Build](https://github.com/USER/REPO/workflows/WASM%20Build/badge.svg)
   ```
3. **API**: Query workflow runs:
   ```bash
   gh run list --workflow=wasm-build.yml
   ```

## 🚨 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| WASM build fails | Check Emscripten installation logs |
| Artifacts missing | Verify compilation succeeded |
| Cache not working | Check cache key matches |
| Tests timeout | Increase timeout in workflow |

### Debug Commands

```yaml
# Add to workflow for debugging:
- name: Debug Info
  run: |
    emcc --version
    ls -la wasm/
    file wasm/*.wasm
```

## 📈 Performance

- **Cache Hit Rate**: ~80% for Emscripten
- **Build Time**: 2-3 minutes (cached), 5-7 minutes (cold)
- **Artifact Size**: 200-500KB per WASM module
- **Parallel Jobs**: Up to 20 concurrent

## 🔐 Secrets & Variables

No secrets required for WASM builds. Optional:
- `GITHUB_TOKEN`: Auto-provided for Pages deployment
- Custom variables in Settings → Secrets

## 📚 Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Emscripten in CI](https://emscripten.org/docs/compiling/Travis.html)
- [act - Local Runner](https://github.com/nektos/act)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)

## ⚡ Quick Commands

```bash
# Trigger manual build
gh workflow run wasm-build.yml

# View recent runs
gh run list --workflow=wasm-build.yml --limit 5

# Download artifacts
gh run download RUN_ID

# View logs
gh run view RUN_ID --log
```

---

**Remember**: WASM compilation is AUTOMATIC. Just push C++ changes and the workflow handles everything!