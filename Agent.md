# Agent Guidelines

## Overview
This document provides essential guidelines for AI agents working on this WebAssembly game project. Following these guidelines ensures consistent, high-quality contributions and smooth collaboration.

## Core Principles

### 1. Always Compile Code
**CRITICAL**: Agents MUST always compile any C/C++ code changes to WebAssembly before considering a task complete.

- Never assume code will compile without testing
- Always run the build process after making changes
- Verify that generated WASM and JS files are created successfully
- Test that the compiled module loads correctly in the browser

#### Compilation Workflow:
```bash
# For RPG game
emcc rpg_game.c -o rpg_game.js -s WASM=1 \
    -s EXPORTED_FUNCTIONS='[...]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
    -s MODULARIZE=1 -s EXPORT_NAME='createRPGModule' \
    -s ALLOW_MEMORY_GROWTH=1 -O2

# For Snake game
./build.sh

# For general WASM builds
make build
```

### 2. Verify Before Completing
Before marking any task as complete:
- [ ] Code compiles without errors
- [ ] WASM files are generated
- [ ] No critical warnings in compilation
- [ ] Server can serve the files
- [ ] Module loads in browser without errors

### 3. Environment Setup
Ensure Emscripten is properly installed and configured:
```bash
# Check if Emscripten is installed
which emcc

# If not installed, set it up
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### 4. Testing Protocol
1. **Compile**: Always compile the code first
2. **Verify Files**: Check that .wasm and .js files are created
3. **Start Server**: Run `python3 server.py` (port 8000)
4. **Browser Test**: Open http://localhost:8000/game.html
5. **Console Check**: Verify no errors in browser console

### 5. Error Handling
When encountering compilation errors:
- Read error messages carefully
- Fix issues at the source
- Don't ignore warnings that could affect functionality
- Re-compile after each fix
- Document any persistent issues

### 6. Code Quality Standards
- Maintain consistent code style
- Add comments for complex logic
- Ensure all exported functions are properly declared
- Use appropriate optimization flags (-O2 for production)
- Handle memory management properly in C/C++ code

### 7. Documentation Updates
When making changes:
- Update relevant documentation
- Document new functions or features
- Update build instructions if process changes
- Keep README files current

### 8. Git Workflow
- Make atomic commits with clear messages
- Test compilation before committing
- Never commit broken builds
- Include generated WASM files when appropriate

## Common Issues and Solutions

### Issue: "Failed to load [module].js"
**Solution**: Always compile the WASM module first using the appropriate build command.

### Issue: Missing Emscripten
**Solution**: Install Emscripten SDK using the setup instructions above.

### Issue: CORS errors
**Solution**: Use the provided Python server which includes proper CORS headers.

### Issue: Module not found
**Solution**: Ensure the EXPORT_NAME matches what's expected in the HTML/JS code.

## Checklist for Agents

Before completing any task involving C/C++ code:

- [ ] Emscripten environment is set up
- [ ] Code has been compiled successfully
- [ ] WASM and JS files are generated
- [ ] No compilation errors
- [ ] Server is running
- [ ] Module loads in browser
- [ ] Basic functionality tested
- [ ] Documentation updated if needed
- [ ] Code follows project conventions

## Remember
**Compilation is not optional** - it's a mandatory step in the development workflow. An uncompiled change is an incomplete change.