#ifndef PROJECTILE_H
#define PROJECTILE_H

#include "entity.h"
#include "../config/game_config.h"

class Projectile : public Entity {
public:
    float damage;
    float speed;
    float lifetime;
    int ownerId;
    Vector2 direction;
    
    Projectile(const Vector2& pos, const Vector2& dir, float dmg, int owner)
        : Entity(EntityType::PROJECTILE, pos, Config::PROJECTILE_RADIUS),
          damage(dmg),
          speed(Config::PROJECTILE_SPEED),
          lifetime(Config::PROJECTILE_LIFETIME / 1000.0f),  // Convert ms to seconds
          ownerId(owner),
          direction(dir.normalized()) {
        velocity = direction * speed;
    }
    
    void update(float deltaTime) override {
        Entity::update(deltaTime);
        
        lifetime -= deltaTime;
        if (lifetime <= 0) {
            active = false;
        }
    }
    
    bool isExpired() const {
        return lifetime <= 0;
    }
};

#endif // PROJECTILE_H