#ifndef PARTICLE_H
#define PARTICLE_H

#include "../math/vector2.h"
#include <string>

class Particle {
public:
    Vector2 position;
    Vector2 velocity;
    float lifetime;
    float maxLifetime;
    float size;
    float alpha;
    std::string color;
    bool active;
    
    enum class ParticleType {
        EXPLOSION,
        BLOOD,
        SPARK,
        SMOKE,
        BOOST_TRAIL,
        HIT_EFFECT,
        HEAL,
        ENERGY,
        DUST
    };
    
    ParticleType type;
    
    Particle()
        : position(0, 0), velocity(0, 0),
          lifetime(0), maxLifetime(60),
          size(5), alpha(1.0f),
          color("#ffffff"), active(false),
          type(ParticleType::SPARK) {}
    
    void init(const Vector2& pos, const Vector2& vel, float life, 
              float particleSize, const std::string& col, ParticleType t) {
        position = pos;
        velocity = vel;
        lifetime = life;
        maxLifetime = life;
        size = particleSize;
        color = col;
        type = t;
        alpha = 1.0f;
        active = true;
    }
    
    void update(float deltaTime) {
        if (!active) return;
        
        lifetime -= deltaTime;
        if (lifetime <= 0) {
            active = false;
            return;
        }
        
        // Update position
        position += velocity * (deltaTime / 16.0f);
        
        // Apply physics based on type
        switch (type) {
            case ParticleType::SMOKE:
                velocity.y -= 0.1f; // Float upward
                velocity *= 0.98f; // Air resistance
                break;
                
            case ParticleType::BLOOD:
            case ParticleType::SPARK:
                velocity.y += 0.3f; // Gravity
                velocity *= 0.95f; // Friction
                break;
                
            case ParticleType::BOOST_TRAIL:
                velocity *= 0.9f; // Quick fade
                break;
                
            case ParticleType::EXPLOSION:
                velocity *= 0.92f; // Explosion slowdown
                size *= 1.02f; // Expand
                break;
                
            default:
                velocity *= 0.98f;
                break;
        }
        
        // Update alpha based on lifetime
        alpha = lifetime / maxLifetime;
        
        // Special effects for certain types
        if (type == ParticleType::HEAL || type == ParticleType::ENERGY) {
            // Pulsing effect
            alpha = 0.5f + 0.5f * sin((maxLifetime - lifetime) * 0.1f);
        }
    }
    
    float getAlpha() const {
        return alpha;
    }
    
    float getSize() const {
        if (type == ParticleType::EXPLOSION) {
            return size * (1.0f + (1.0f - lifetime / maxLifetime));
        }
        return size;
    }
};

#endif // PARTICLE_H