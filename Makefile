# Makefile for WASM Game Engine

# Variables
WASM_DIR = wasm
PUBLIC_DIR = public
DIST_DIR = dist
EMSDK_DIR = emsdk

# Emscripten compiler
EMCC = emcc

# Source files - support both monolithic and refactored versions
WASM_SOURCES_MONOLITHIC = $(WASM_DIR)/game_engine.cpp
WASM_SOURCES_REFACTORED = \
	$(WASM_DIR)/src/game_engine.cpp \
	$(WASM_DIR)/src/entities/entity.cpp \
	$(WASM_DIR)/src/entities/player.cpp \
	$(WASM_DIR)/src/entities/enemy.cpp \
	$(WASM_DIR)/src/entities/wolf.cpp \
	$(WASM_DIR)/src/entities/projectile.cpp \
	$(WASM_DIR)/src/entities/powerup.cpp \
	$(WASM_DIR)/src/entities/obstacle.cpp \
	$(WASM_DIR)/src/effects/visual_effects.cpp \
	$(WASM_DIR)/src/effects/particle.cpp \
	$(WASM_DIR)/src/systems/collision_system.cpp \
	$(WASM_DIR)/src/systems/wave_system.cpp \
	$(WASM_DIR)/src/systems/spatial_hash_grid.cpp \
	$(WASM_DIR)/src/bindings.cpp

# Include directories
INCLUDES = -I$(WASM_DIR)/include

# Compilation flags
WASM_FLAGS = -O3 \
	-s WASM=1 \
	-s ALLOW_MEMORY_GROWTH=1 \
	-s MODULARIZE=1 \
	-s EXPORT_NAME='GameEngineModule' \
	--bind \
	-std=c++17 \
	-s ENVIRONMENT='web' \
	-s EXPORT_ES6=1 \
	-s MALLOC=emmalloc \
	-s FILESYSTEM=0 \
	-s NO_EXIT_RUNTIME=1

# Output files
WASM_OUTPUT = $(PUBLIC_DIR)/game_engine

# Default target
.PHONY: all
all: build

# Build WASM module (monolithic version - default)
.PHONY: build
build: check-emscripten $(PUBLIC_DIR)
	@echo "Building WASM module (monolithic)..."
	$(EMCC) $(WASM_SOURCES_MONOLITHIC) $(INCLUDES) $(WASM_FLAGS) -o $(WASM_OUTPUT).js
	@echo "Build complete!"

# Build refactored WASM module
.PHONY: build-refactored
build-refactored: check-emscripten $(PUBLIC_DIR)
	@echo "Building WASM module (refactored)..."
	$(EMCC) $(WASM_SOURCES_REFACTORED) $(INCLUDES) $(WASM_FLAGS) -o $(WASM_OUTPUT).js
	@echo "Refactored build complete!"

# Quick build (JavaScript only)
.PHONY: quick
quick:
	@bash build-quick.sh

# Production build
.PHONY: production
production: build
	@bash build-quick.sh --production

# Check if Emscripten is installed
.PHONY: check-emscripten
check-emscripten:
	@which emcc > /dev/null 2>&1 || (echo "Error: Emscripten not found. Run 'make install-emscripten' first." && exit 1)

# Install Emscripten
.PHONY: install-emscripten
install-emscripten:
	@echo "Installing Emscripten SDK..."
	@if [ ! -d "$(EMSDK_DIR)" ]; then \
		git clone https://github.com/emscripten-core/emsdk.git $(EMSDK_DIR); \
	fi
	@cd $(EMSDK_DIR) && \
		./emsdk install latest && \
		./emsdk activate latest
	@echo "Emscripten installed! Run 'source $(EMSDK_DIR)/emsdk_env.sh' before building."

# Setup development environment
.PHONY: setup
setup:
	@echo "Setting up development environment..."
	@mkdir -p $(PUBLIC_DIR)
	@mkdir -p $(DIST_DIR)
	@if [ -f "package.json" ]; then npm install; fi
	@chmod +x build.sh build-quick.sh
	@echo "Setup complete!"

# Run tests
.PHONY: test
test:
	@echo "Running tests..."
	@node tests/test-game.js || true
	@node tests/wolf-ai-tests.js || true

# Start development server
.PHONY: serve
serve:
	@echo "Starting development server..."
	@python3 -m http.server 8000 || php -S localhost:8000 || npx http-server -p 8000

# Clean build artifacts
.PHONY: clean
clean:
	@echo "Cleaning build artifacts..."
	@rm -rf $(DIST_DIR)
	@rm -f $(PUBLIC_DIR)/game_engine.js $(PUBLIC_DIR)/game_engine.wasm
	@rm -f $(PUBLIC_DIR)/*.min.js
	@echo "Clean complete!"

# Deep clean (including dependencies)
.PHONY: distclean
distclean: clean
	@echo "Deep cleaning..."
	@rm -rf node_modules
	@rm -rf $(EMSDK_DIR)
	@echo "Deep clean complete!"

# Docker build
.PHONY: docker-build
docker-build:
	@bash build.sh --docker

# Help
.PHONY: help
help:
	@echo "WASM Game Engine Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  make              - Build WASM module (monolithic, default)"
	@echo "  make build-refactored - Build refactored WASM module"
	@echo "  make quick        - Quick build (JavaScript only)"
	@echo "  make production   - Create production build"
	@echo "  make setup        - Setup development environment"
	@echo "  make test         - Run tests"
	@echo "  make serve        - Start development server"
	@echo "  make clean        - Remove build artifacts"
	@echo "  make distclean    - Deep clean (including dependencies)"
	@echo "  make docker-build - Build using Docker"
	@echo "  make install-emscripten - Install Emscripten SDK"
	@echo "  make help         - Show this help message"