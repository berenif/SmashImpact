# WASM Build System Guide

## 🚀 Quick Start

The WASM build system has been enhanced with automated tools for easier building and recompilation.

### One-Command Build

```bash
# Quick build (uses existing environment)
make -f Makefile.wasm wasm

# Or use the helper script directly
./scripts/wasm-build-helper.sh build
```

### Auto-Rebuild on Changes

```bash
# Start file watcher (rebuilds automatically when files change)
make -f Makefile.wasm wasm-watch

# Or with advanced monitoring
python3 scripts/wasm-build-monitor.py watch
```

## 📦 Installation

### Option 1: Local Build Environment

```bash
# One-time setup (installs Emscripten and dependencies)
make -f Makefile.wasm wasm-init

# This will:
# 1. Install Emscripten SDK
# 2. Build Docker image
# 3. Install Python monitoring tools
```

### Option 2: Docker-Based Build (Recommended)

```bash
# Build using Docker (no local setup required)
docker-compose run wasm-builder

# Or use the Makefile
make -f Makefile.wasm wasm-docker
```

## 🛠️ Build Commands

### Basic Commands

| Command | Description |
|---------|-------------|
| `make -f Makefile.wasm wasm` | Build in release mode |
| `make -f Makefile.wasm wasm-debug` | Build with debug symbols |
| `make -f Makefile.wasm wasm-watch` | Auto-rebuild on file changes |
| `make -f Makefile.wasm wasm-clean` | Clean build artifacts |

### Advanced Commands

| Command | Description |
|---------|-------------|
| `make -f Makefile.wasm wasm-profile` | Build with profiling enabled |
| `make -f Makefile.wasm wasm-stats` | Show build statistics |
| `make -f Makefile.wasm wasm-benchmark` | Benchmark build performance |
| `make -f Makefile.wasm wasm-monitor` | Advanced monitoring with Python |

### Docker Commands

| Command | Description |
|---------|-------------|
| `make -f Makefile.wasm wasm-docker` | Build in Docker container |
| `make -f Makefile.wasm wasm-docker-watch` | Watch mode in Docker |
| `make -f Makefile.wasm wasm-serve` | Start dev server on port 8080 |
| `make -f Makefile.wasm wasm-dev` | Full dev environment |

## 🔧 Configuration

### Build Configuration File

Edit `wasm-build.config.json` to customize:

- Source files and paths
- Build flags and optimizations
- Watch patterns and ignore rules
- Cache and performance settings

```json
{
  "build_modes": {
    "custom": {
      "optimization": "-O2",
      "flags": ["-s ASSERTIONS=1", "-g2"]
    }
  }
}
```

### Build Modes

- **release**: Maximum optimization, smallest size
- **debug**: Full debugging, assertions, stack traces
- **profile**: Optimized with profiling support

```bash
# Use custom build mode
make -f Makefile.wasm wasm MODE=debug
```

## 📊 Build Monitoring

### Real-Time Monitoring

The Python monitor provides:
- File change detection
- Build time tracking
- Success/failure statistics
- Error reporting
- Build history

```bash
# Start monitor
python3 scripts/wasm-build-monitor.py watch

# View statistics
python3 scripts/wasm-build-monitor.py stats
```

### Build Logs

Logs are saved to:
- `build.log` - Latest build output
- `logs/build-monitor.log` - Monitor activity
- `logs/build_history.json` - Build history

## 🐳 Docker Workflow

### Using Docker Compose

```bash
# Build WASM module
docker-compose run wasm-builder

# Watch for changes
docker-compose run wasm-watcher

# Start dev server
docker-compose up wasm-dev-server

# Full development environment
docker-compose up
```

### Custom Docker Build

```bash
# Build with custom mode
docker-compose run -e BUILD_MODE=debug wasm-builder
```

## 🔍 Troubleshooting

### Check Environment

```bash
make -f Makefile.wasm wasm-check
```

This shows:
- Installed tools and versions
- Source files
- Output files

### Common Issues

1. **Emscripten not found**
   ```bash
   make -f Makefile.wasm wasm-setup
   ```

2. **Build fails with memory error**
   ```bash
   # Increase memory limit
   export EMCC_MEMORY_LIMIT=4096
   ```

3. **File watcher not working**
   ```bash
   # Install watchdog for better performance
   pip3 install watchdog
   ```

4. **Docker build fails**
   ```bash
   # Rebuild Docker image
   docker-compose build --no-cache
   ```

## 📈 Performance Tips

### Faster Builds

1. **Use build cache**: Enabled by default
2. **Parallel compilation**: Set in config
3. **Incremental builds**: Only changed files
4. **Docker volumes**: Mount cache directory

### Optimize Output

```bash
# Production build (smallest size)
make -f Makefile.wasm wasm MODE=release

# Quick iteration (fastest build)
make -f Makefile.wasm wasm MODE=debug
```

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
- name: Build WASM
  run: |
    make -f Makefile.wasm wasm-docker
    
- name: Run Tests
  run: |
    make -f Makefile.wasm wasm-test
```

## 📝 Development Workflow

### Recommended Setup

1. **Initial Setup**
   ```bash
   make -f Makefile.wasm wasm-init
   ```

2. **Start Watcher**
   ```bash
   # Terminal 1: File watcher
   make -f Makefile.wasm wasm-watch
   
   # Terminal 2: Dev server
   make -f Makefile.wasm wasm-serve
   ```

3. **Edit Code**
   - Modify C++ files in `wasm/`
   - Changes trigger automatic rebuild
   - Refresh browser to see changes

### VSCode Integration

Add to `.vscode/tasks.json`:

```json
{
  "label": "Build WASM",
  "type": "shell",
  "command": "make -f Makefile.wasm wasm",
  "group": {
    "kind": "build",
    "isDefault": true
  }
}
```

## 🎯 Best Practices

1. **Use Docker for consistency** across different environments
2. **Enable file watching** during development
3. **Check build stats** regularly to monitor performance
4. **Clean periodically** to avoid stale cache issues
5. **Use debug mode** when troubleshooting
6. **Profile before optimizing** performance issues

## 📚 Additional Resources

- [Emscripten Documentation](https://emscripten.org/docs/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [WASM API Documentation](./WASM_API.md)
- [Project Structure](./PROJECT_STRUCTURE.md)