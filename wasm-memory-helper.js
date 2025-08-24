/**
 * Helper function to safely access WASM module memory
 * Handles different Emscripten versions and configurations
 */
function getWASMMemoryAccess(wasmModule) {
    // Try different ways to access the memory based on Emscripten version
    
    // Method 1: Direct HEAP arrays (modern Emscripten)
    if (wasmModule.HEAP32) {
        return {
            HEAP8: wasmModule.HEAP8,
            HEAPU8: wasmModule.HEAPU8,
            HEAP16: wasmModule.HEAP16,
            HEAPU16: wasmModule.HEAPU16,
            HEAP32: wasmModule.HEAP32,
            HEAPU32: wasmModule.HEAPU32,
            HEAPF32: wasmModule.HEAPF32,
            HEAPF64: wasmModule.HEAPF64
        };
    }
    
    // Method 2: Via wasmMemory property
    if (wasmModule.wasmMemory && wasmModule.wasmMemory.buffer) {
        const buffer = wasmModule.wasmMemory.buffer;
        return {
            HEAP8: new Int8Array(buffer),
            HEAPU8: new Uint8Array(buffer),
            HEAP16: new Int16Array(buffer),
            HEAPU16: new Uint16Array(buffer),
            HEAP32: new Int32Array(buffer),
            HEAPU32: new Uint32Array(buffer),
            HEAPF32: new Float32Array(buffer),
            HEAPF64: new Float64Array(buffer)
        };
    }
    
    // Method 3: Via asm.memory.buffer (some configurations)
    if (wasmModule.asm && wasmModule.asm.memory && wasmModule.asm.memory.buffer) {
        const buffer = wasmModule.asm.memory.buffer;
        return {
            HEAP8: new Int8Array(buffer),
            HEAPU8: new Uint8Array(buffer),
            HEAP16: new Int16Array(buffer),
            HEAPU16: new Uint16Array(buffer),
            HEAP32: new Int32Array(buffer),
            HEAPU32: new Uint32Array(buffer),
            HEAPF32: new Float32Array(buffer),
            HEAPF64: new Float64Array(buffer)
        };
    }
    
    // Method 4: Via _memory export
    if (wasmModule._memory && wasmModule._memory.buffer) {
        const buffer = wasmModule._memory.buffer;
        return {
            HEAP8: new Int8Array(buffer),
            HEAPU8: new Uint8Array(buffer),
            HEAP16: new Int16Array(buffer),
            HEAPU16: new Uint16Array(buffer),
            HEAP32: new Int32Array(buffer),
            HEAPU32: new Uint32Array(buffer),
            HEAPF32: new Float32Array(buffer),
            HEAPF64: new Float64Array(buffer)
        };
    }
    
    // Method 5: Check for Module.buffer (legacy)
    if (wasmModule.buffer) {
        const buffer = wasmModule.buffer;
        return {
            HEAP8: new Int8Array(buffer),
            HEAPU8: new Uint8Array(buffer),
            HEAP16: new Int16Array(buffer),
            HEAPU16: new Uint16Array(buffer),
            HEAP32: new Int32Array(buffer),
            HEAPU32: new Uint32Array(buffer),
            HEAPF32: new Float32Array(buffer),
            HEAPF64: new Float64Array(buffer)
        };
    }
    
    // If none of the above work, throw an error
    throw new Error('Unable to access WASM module memory. The module structure may be incompatible.');
}

// Example usage:
/*
const heaps = getWASMMemoryAccess(wasmModule);
const HEAP32 = heaps.HEAP32;
const value = HEAP32[pointer / 4];
*/