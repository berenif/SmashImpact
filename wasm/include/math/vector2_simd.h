#ifndef VECTOR2_SIMD_H
#define VECTOR2_SIMD_H

#include <cmath>
#include <wasm_simd128.h>
#include "vector2.h"  // Include Vector2 for conversion functions
// Removed emmintrin.h - not needed for WebAssembly SIMD

// SIMD-optimized Vector2 class for WebAssembly
// Uses WASM SIMD128 instructions for better performance
class Vector2SIMD {
private:
    // Use v128 for SIMD operations (contains 4 floats, we use first 2)
    v128_t data;
    
public:
    // Constructors
    Vector2SIMD() : data(wasm_f32x4_const(0.0f, 0.0f, 0.0f, 0.0f)) {}
    
    Vector2SIMD(float x, float y) : data(wasm_f32x4_make(x, y, 0.0f, 0.0f)) {}
    
    Vector2SIMD(v128_t v) : data(v) {}
    
    // Getters
    float x() const { return wasm_f32x4_extract_lane(data, 0); }
    float y() const { return wasm_f32x4_extract_lane(data, 1); }
    
    // Setters
    void setX(float x) { 
        data = wasm_f32x4_replace_lane(data, 0, x); 
    }
    
    void setY(float y) { 
        data = wasm_f32x4_replace_lane(data, 1, y); 
    }
    
    // SIMD-optimized operators
    Vector2SIMD operator+(const Vector2SIMD& other) const {
        return Vector2SIMD(wasm_f32x4_add(data, other.data));
    }
    
    Vector2SIMD operator-(const Vector2SIMD& other) const {
        return Vector2SIMD(wasm_f32x4_sub(data, other.data));
    }
    
    Vector2SIMD operator*(float scalar) const {
        v128_t scalarVec = wasm_f32x4_splat(scalar);
        return Vector2SIMD(wasm_f32x4_mul(data, scalarVec));
    }
    
    Vector2SIMD operator/(float scalar) const {
        v128_t scalarVec = wasm_f32x4_splat(scalar);
        return Vector2SIMD(wasm_f32x4_div(data, scalarVec));
    }
    
    Vector2SIMD& operator+=(const Vector2SIMD& other) {
        data = wasm_f32x4_add(data, other.data);
        return *this;
    }
    
    Vector2SIMD& operator-=(const Vector2SIMD& other) {
        data = wasm_f32x4_sub(data, other.data);
        return *this;
    }
    
    Vector2SIMD& operator*=(float scalar) {
        v128_t scalarVec = wasm_f32x4_splat(scalar);
        data = wasm_f32x4_mul(data, scalarVec);
        return *this;
    }
    
    // SIMD-optimized math operations
    float magnitudeSquared() const {
        v128_t squared = wasm_f32x4_mul(data, data);
        float x2 = wasm_f32x4_extract_lane(squared, 0);
        float y2 = wasm_f32x4_extract_lane(squared, 1);
        return x2 + y2;
    }
    
    float magnitude() const {
        return std::sqrt(magnitudeSquared());
    }
    
    Vector2SIMD normalized() const {
        float mag = magnitude();
        if (mag > 0.0f) {
            return *this / mag;
        }
        return Vector2SIMD();
    }
    
    float dot(const Vector2SIMD& other) const {
        v128_t product = wasm_f32x4_mul(data, other.data);
        float dx = wasm_f32x4_extract_lane(product, 0);
        float dy = wasm_f32x4_extract_lane(product, 1);
        return dx + dy;
    }
    
    float distanceTo(const Vector2SIMD& other) const {
        Vector2SIMD diff = *this - other;
        return diff.magnitude();
    }
    
    float distanceSquaredTo(const Vector2SIMD& other) const {
        Vector2SIMD diff = *this - other;
        return diff.magnitudeSquared();
    }
    
    // Batch operations for multiple vectors (useful for particle systems)
    static void batchAdd(Vector2SIMD* result, const Vector2SIMD* a, 
                         const Vector2SIMD* b, size_t count) {
        for (size_t i = 0; i < count; i++) {
            result[i].data = wasm_f32x4_add(a[i].data, b[i].data);
        }
    }
    
    static void batchScale(Vector2SIMD* result, const Vector2SIMD* vectors,
                           float scalar, size_t count) {
        v128_t scalarVec = wasm_f32x4_splat(scalar);
        for (size_t i = 0; i < count; i++) {
            result[i].data = wasm_f32x4_mul(vectors[i].data, scalarVec);
        }
    }
    
    // Interpolation
    static Vector2SIMD lerp(const Vector2SIMD& a, const Vector2SIMD& b, float t) {
        v128_t tVec = wasm_f32x4_splat(t);
        v128_t oneMinusT = wasm_f32x4_splat(1.0f - t);
        v128_t aScaled = wasm_f32x4_mul(a.data, oneMinusT);
        v128_t bScaled = wasm_f32x4_mul(b.data, tVec);
        return Vector2SIMD(wasm_f32x4_add(aScaled, bScaled));
    }
    
    // Conversion to regular Vector2 for compatibility
    Vector2 toVector2() const {
        return Vector2(x(), y());
    }
    
    // Create from regular Vector2
    static Vector2SIMD fromVector2(const Vector2& v) {
        return Vector2SIMD(v.x, v.y);
    }
};

// Type alias for easier use
using Vec2 = Vector2SIMD;

#endif // VECTOR2_SIMD_H