# WASM Build Fix Summary

## Problem
The Wolf AI WASM module build was failing with undefined embind symbol errors:
```
wasm-ld: error: undefined symbol: _embind_register_class
wasm-ld: error: undefined symbol: _embind_register_class_constructor
wasm-ld: error: undefined symbol: _embind_register_class_property
wasm-ld: error: undefined symbol: _embind_register_class_function
```

## Root Cause
The build was using conflicting binding methods:
1. Using `--bind` flag for embind C++ bindings
2. Also specifying `-s EXPORTED_FUNCTIONS` for C-style exports
3. Missing the `-lembind` linker flag
4. Using `emcc` instead of `em++` for C++ code with embind

## Solution Applied

### 1. Updated GitHub Actions Workflow
**File:** `.github/workflows/wasm-build.yml`

**Changes:**
- Removed `-s EXPORTED_FUNCTIONS` flag (conflicts with embind)
- Added `-lembind` flag to properly link embind library
- Kept `em++` compiler (correct for C++ with embind)

### 2. Updated Local Build Script
**File:** `build_wolf_ai.sh`

**Changes:**
- Changed `emcc` to `em++` 
- Added `-lembind` flag

### 3. Key Build Command
The corrected build command is:
```bash
em++ wolf_ai_wasm.cpp \
    -O3 \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='WolfAIModule' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s ENVIRONMENT='web,worker' \
    -s SINGLE_FILE=0 \
    -lembind \
    --bind \
    -o wasm/wolf_ai.js
```

## Important Notes

1. **Don't Mix Binding Methods:** When using embind (`--bind`), don't also use `-s EXPORTED_FUNCTIONS` for the same functions
2. **Use em++ for C++:** Always use `em++` (not `emcc`) when compiling C++ code with embind
3. **Link embind:** The `-lembind` flag ensures the embind runtime is properly linked

## Verification
The build now completes successfully and the module works correctly:
- ✅ WASM files generated (wolf_ai.js and wolf_ai.wasm)
- ✅ WolfPackManager class properly exported
- ✅ Vec2 and GameObject classes available
- ✅ All methods callable from JavaScript

## Test Files Created
- `test-wolf-build.sh` - Build test script
- `test-wolf-module-node.js` - Node.js test to verify the module works

The module is now ready for use in the GitHub Actions workflow and local development.