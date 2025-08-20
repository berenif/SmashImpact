#ifndef PHYSICS_SYSTEM_H
#define PHYSICS_SYSTEM_H

#include <vector>
#include <thread>
#include <atomic>
#include <mutex>
#include "../entities/entity.h"
#include "../math/vector2_simd.h"

#ifdef THREADING_ENABLED
#include <emscripten/threading.h>
#endif

// Modern physics system with optional multi-threading support
class PhysicsSystem {
private:
    // Threading configuration
    static constexpr size_t MAX_THREADS = 4;
    static constexpr size_t MIN_ENTITIES_PER_THREAD = 50;
    
    struct ThreadData {
        std::vector<Entity*> entities;
        float deltaTime;
        std::atomic<bool> completed;
        
        ThreadData() : deltaTime(0), completed(false) {}
    };
    
    #ifdef THREADING_ENABLED
    std::vector<std::thread> workers;
    std::vector<ThreadData> threadData;
    std::mutex entityMutex;
    std::atomic<bool> shouldStop;
    #endif
    
    // Physics parameters
    float gravity;
    float airResistance;
    float groundFriction;
    float restitution; // Bounciness factor
    
    // World bounds
    float worldWidth;
    float worldHeight;
    
    // Performance tracking
    size_t totalUpdates;
    double totalTime;
    
public:
    PhysicsSystem(float width, float height)
        : gravity(0.0f), airResistance(0.99f), groundFriction(0.95f),
          restitution(0.8f), worldWidth(width), worldHeight(height),
          totalUpdates(0), totalTime(0) {
        
        #ifdef THREADING_ENABLED
        initializeThreading();
        #endif
    }
    
    ~PhysicsSystem() {
        #ifdef THREADING_ENABLED
        shutdownThreading();
        #endif
    }
    
    // Update all entities
    void update(std::vector<std::unique_ptr<Entity>>& entities, float deltaTime) {
        PERF_TIMER(PhysicsUpdate);
        
        #ifdef THREADING_ENABLED
        if (entities.size() >= MIN_ENTITIES_PER_THREAD * 2) {
            updateMultithreaded(entities, deltaTime);
        } else {
            updateSingleThreaded(entities, deltaTime);
        }
        #else
        updateSingleThreaded(entities, deltaTime);
        #endif
        
        totalUpdates++;
    }
    
private:
    void updateSingleThreaded(std::vector<std::unique_ptr<Entity>>& entities, float deltaTime) {
        for (auto& entity : entities) {
            if (entity && entity->active) {
                updateEntity(entity.get(), deltaTime);
            }
        }
    }
    
    #ifdef THREADING_ENABLED
    void updateMultithreaded(std::vector<std::unique_ptr<Entity>>& entities, float deltaTime) {
        size_t numThreads = std::min(MAX_THREADS, entities.size() / MIN_ENTITIES_PER_THREAD);
        size_t entitiesPerThread = entities.size() / numThreads;
        
        // Distribute entities among threads
        for (size_t i = 0; i < numThreads; ++i) {
            threadData[i].entities.clear();
            threadData[i].deltaTime = deltaTime;
            threadData[i].completed = false;
            
            size_t start = i * entitiesPerThread;
            size_t end = (i == numThreads - 1) ? entities.size() : (i + 1) * entitiesPerThread;
            
            for (size_t j = start; j < end; ++j) {
                if (entities[j] && entities[j]->active) {
                    threadData[i].entities.push_back(entities[j].get());
                }
            }
        }
        
        // Launch worker threads
        for (size_t i = 0; i < numThreads; ++i) {
            emscripten_async_call([](void* arg) {
                ThreadData* data = static_cast<ThreadData*>(arg);
                PhysicsSystem::processEntities(data);
            }, &threadData[i], 0);
        }
        
        // Wait for completion
        bool allCompleted = false;
        while (!allCompleted) {
            allCompleted = true;
            for (size_t i = 0; i < numThreads; ++i) {
                if (!threadData[i].completed) {
                    allCompleted = false;
                    break;
                }
            }
            emscripten_sleep(0); // Yield to other threads
        }
    }
    
    static void processEntities(ThreadData* data) {
        for (Entity* entity : data->entities) {
            updateEntity(entity, data->deltaTime);
        }
        data->completed = true;
    }
    
    void initializeThreading() {
        shouldStop = false;
        threadData.resize(MAX_THREADS);
    }
    
    void shutdownThreading() {
        shouldStop = true;
    }
    #endif
    
    static void updateEntity(Entity* entity, float deltaTime) {
        // Apply physics with SIMD optimization
        if (entity->hasPhysics) {
            // Convert to SIMD vectors
            Vector2SIMD pos = Vector2SIMD::fromVector2(entity->position);
            Vector2SIMD vel = Vector2SIMD::fromVector2(entity->velocity);
            
            // Apply forces
            if (entity->affectedByGravity) {
                vel += Vector2SIMD(0, entity->gravity * deltaTime);
            }
            
            // Apply air resistance
            vel *= entity->airResistance;
            
            // Update position
            pos += vel * deltaTime;
            
            // Convert back
            entity->position = pos.toVector2();
            entity->velocity = vel.toVector2();
        } else {
            // Simple update for non-physics entities
            entity->update(deltaTime);
        }
    }
    
public:
    // Setters for physics parameters
    void setGravity(float g) { gravity = g; }
    void setAirResistance(float ar) { airResistance = ar; }
    void setGroundFriction(float gf) { groundFriction = gf; }
    void setRestitution(float r) { restitution = r; }
    void setWorldBounds(float width, float height) {
        worldWidth = width;
        worldHeight = height;
    }
    
    // Apply impulse to entity
    void applyImpulse(Entity* entity, const Vector2& impulse) {
        if (entity && entity->hasPhysics) {
            entity->velocity += impulse / entity->mass;
        }
    }
    
    // Apply force to entity
    void applyForce(Entity* entity, const Vector2& force, float deltaTime) {
        if (entity && entity->hasPhysics) {
            Vector2 acceleration = force / entity->mass;
            entity->velocity += acceleration * deltaTime;
        }
    }
    
    // Check and resolve world bounds collision
    void checkWorldBounds(Entity* entity) {
        if (!entity) return;
        
        // Left boundary
        if (entity->position.x - entity->radius < 0) {
            entity->position.x = entity->radius;
            entity->velocity.x = -entity->velocity.x * restitution;
        }
        
        // Right boundary
        if (entity->position.x + entity->radius > worldWidth) {
            entity->position.x = worldWidth - entity->radius;
            entity->velocity.x = -entity->velocity.x * restitution;
        }
        
        // Top boundary
        if (entity->position.y - entity->radius < 0) {
            entity->position.y = entity->radius;
            entity->velocity.y = -entity->velocity.y * restitution;
        }
        
        // Bottom boundary
        if (entity->position.y + entity->radius > worldHeight) {
            entity->position.y = worldHeight - entity->radius;
            entity->velocity.y = -entity->velocity.y * restitution;
            
            // Apply ground friction
            entity->velocity.x *= groundFriction;
        }
    }
    
    // Get performance stats
    double getAverageUpdateTime() const {
        return totalUpdates > 0 ? totalTime / totalUpdates : 0;
    }
};

#endif // PHYSICS_SYSTEM_H