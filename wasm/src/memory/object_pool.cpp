#include "../../include/memory/object_pool.h"
#include "../../include/entities/projectile.h"
#include "../../include/effects/particle.h"
#include <emscripten/val.h>

// Global object pools for commonly created/destroyed entities
namespace Pools {
    // Initialize pools with reasonable default sizes
    ObjectPool<Projectile> projectilePool(50, 200);
    ObjectPool<Particle> particlePool(100, 500);
    
    // Fast pool for collision pairs (POD type)
    struct CollisionPair {
        int entityId1;
        int entityId2;
        float distance;
        float overlapAmount;
    };
    
    FastObjectPool<CollisionPair> collisionPool(100, 1000);
    
    // Initialize pools
    void initializePools() {
        // Pre-allocate objects for better performance
        projectilePool.reserve(50);
        particlePool.reserve(100);
        collisionPool.reserve(100);
        
        // Set reset functions
        projectilePool.setResetFunction([](Projectile* p) {
            p->active = false;
            p->position = Vector2(0, 0);
            p->velocity = Vector2(0, 0);
            p->damage = 0;
            p->ownerId = -1;
            p->lifetime = 0;
        });
        
        particlePool.setResetFunction([](Particle* p) {
            p->active = false;
            p->position = Vector2(0, 0);
            p->velocity = Vector2(0, 0);
            p->color = "#ffffff";
            p->size = 1.0f;
            p->lifetime = 0;
            p->maxLifetime = 0;
        });
    }
    
    // Get pool statistics for debugging
    void getPoolStatistics(emscripten::val& stats) {
        emscripten::val poolStats = emscripten::val::object();
        
        emscripten::val projectileStats = emscripten::val::object();
        projectileStats.set("available", projectilePool.getAvailableCount());
        projectileStats.set("total", projectilePool.getTotalCount());
        projectileStats.set("inUse", projectilePool.getInUseCount());
        poolStats.set("projectiles", projectileStats);
        
        emscripten::val particleStats = emscripten::val::object();
        particleStats.set("available", particlePool.getAvailableCount());
        particleStats.set("total", particlePool.getTotalCount());
        particleStats.set("inUse", particlePool.getInUseCount());
        poolStats.set("particles", particleStats);
        
        emscripten::val collisionStats = emscripten::val::object();
        collisionStats.set("available", collisionPool.getAvailableCount());
        collisionStats.set("total", collisionPool.getTotalCount());
        poolStats.set("collisions", collisionStats);
        
        stats.set("pools", poolStats);
    }
    
    // Clear all pools (for game reset)
    void clearAllPools() {
        projectilePool.clear();
        particlePool.clear();
        // Note: FastObjectPool doesn't have a clear method, 
        // but we can reinitialize if needed
    }
}