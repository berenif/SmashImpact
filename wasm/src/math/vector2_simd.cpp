#include "../../include/math/vector2_simd.h"
#include "../../include/math/vector2.h"

// Implementation file for SIMD vector operations
// Most methods are inline in the header, but we can add specialized batch operations here

namespace VectorMath {
    
    // Batch normalize vectors (useful for particle systems)
    void batchNormalize(Vector2SIMD* vectors, size_t count) {
        for (size_t i = 0; i < count; i++) {
            vectors[i] = vectors[i].normalized();
        }
    }
    
    // Batch distance calculation
    void batchDistance(float* results, const Vector2SIMD* from, 
                       const Vector2SIMD* to, size_t count) {
        for (size_t i = 0; i < count; i++) {
            results[i] = from[i].distanceTo(to[i]);
        }
    }
    
    // Batch collision check (returns bitmask of collisions)
    uint32_t batchCollisionCheck(const Vector2SIMD* positions1, float radius1,
                                 const Vector2SIMD* positions2, float radius2,
                                 size_t count) {
        uint32_t collisionMask = 0;
        float radiusSum = radius1 + radius2;
        float radiusSumSq = radiusSum * radiusSum;
        
        for (size_t i = 0; i < count && i < 32; i++) {
            if (positions1[i].distanceSquaredTo(positions2[i]) < radiusSumSq) {
                collisionMask |= (1 << i);
            }
        }
        
        return collisionMask;
    }
    
    // Apply gravity to multiple entities
    void applyGravity(Vector2SIMD* velocities, float gravity, 
                      float deltaTime, size_t count) {
        Vector2SIMD gravityVec(0, gravity * deltaTime);
        for (size_t i = 0; i < count; i++) {
            velocities[i] += gravityVec;
        }
    }
    
    // Apply air resistance to multiple entities
    void applyAirResistance(Vector2SIMD* velocities, float resistance, size_t count) {
        for (size_t i = 0; i < count; i++) {
            velocities[i] *= resistance;
        }
    }
}