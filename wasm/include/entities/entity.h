#ifndef ENTITY_H
#define ENTITY_H

#include "../math/vector2.h"

// Entity types in the game
enum class EntityType {
    PLAYER,
    ENEMY,
    WOLF,
    PROJECTILE,
    POWERUP,
    OBSTACLE,
    PARTICLE
};

// Power-up types
enum class PowerUpType {
    HEALTH,
    ENERGY,
    SHIELD,
    SPEED,
    DAMAGE,
    RAPID_FIRE,
    MULTI_SHOT
};

// Base Entity class
class Entity {
public:
    int id;
    EntityType type;
    Vector2 position;
    Vector2 velocity;
    float radius;
    float health;
    float maxHealth;
    bool active;
    bool invulnerable;
    float invulnerabilityTimer;
    
    Entity(EntityType type, const Vector2& pos, float radius)
        : id(nextId++), type(type), position(pos), velocity(0, 0),
          radius(radius), health(100), maxHealth(100), active(true),
          invulnerable(false), invulnerabilityTimer(0) {}
    
    virtual ~Entity() = default;
    
    virtual void update(float deltaTime) {
        position += velocity * (deltaTime / 16.0f);
        
        if (invulnerabilityTimer > 0) {
            invulnerabilityTimer -= deltaTime;
            if (invulnerabilityTimer <= 0) {
                invulnerable = false;
            }
        }
    }
    
    bool collidesWith(const Entity& other) const {
        if (!active || !other.active) return false;
        float distance = position.distanceTo(other.position);
        return distance < (radius + other.radius);
    }
    
    float distanceTo(const Entity& other) const {
        return position.distanceTo(other.position);
    }
    
    void takeDamage(float damage) {
        if (!invulnerable && active) {
            health -= damage;
            if (health <= 0) {
                health = 0;
                active = false;
            }
        }
    }
    
    void heal(float amount) {
        health = std::min(health + amount, maxHealth);
    }
    
protected:
    static int nextId;
};

#endif // ENTITY_H