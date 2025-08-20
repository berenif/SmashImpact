#ifndef OBSTACLE_H
#define OBSTACLE_H

#include "entity.h"
#include "../config/game_config.h"

class Obstacle : public Entity {
public:
    bool destructible;
    float durability;
    
    Obstacle(const Vector2& pos, float rad, bool canDestroy = false)
        : Entity(EntityType::OBSTACLE, pos, rad),
          destructible(canDestroy),
          durability(100) {
        health = destructible ? 100 : 999999;
        maxHealth = health;
    }
    
    void update(float deltaTime) override {
        // Obstacles don't move
        velocity = Vector2(0, 0);
        
        if (destructible && health <= 0) {
            active = false;
        }
    }
    
    void takeDamage(float damage) override {
        if (destructible) {
            Entity::takeDamage(damage);
        }
    }
};

#endif // OBSTACLE_H