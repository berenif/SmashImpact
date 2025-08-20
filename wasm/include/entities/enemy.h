#ifndef ENEMY_H
#define ENEMY_H

#include "entity.h"
#include "../config/game_config.h"

class Enemy : public Entity {
public:
    float damage;
    float speed;
    float attackCooldown;
    bool stunned;
    float stunDuration;
    
    // AI states
    enum class AIState {
        IDLE,
        CHASING,
        ATTACKING,
        FLEEING,
        STUNNED
    };
    
    AIState aiState;
    Entity* target;
    
    Enemy(const Vector2& pos)
        : Entity(EntityType::ENEMY, pos, Config::ENEMY_RADIUS),
          damage(Config::ENEMY_DAMAGE),
          speed(Config::ENEMY_SPEED),
          attackCooldown(0),
          stunned(false),
          stunDuration(0),
          aiState(AIState::IDLE),
          target(nullptr) {
        health = Config::ENEMY_HEALTH;
        maxHealth = Config::ENEMY_HEALTH;
    }
    
    void update(float deltaTime) override {
        Entity::update(deltaTime);
        
        // Update stun
        if (stunned) {
            stunDuration -= deltaTime;
            if (stunDuration <= 0) {
                stunned = false;
                aiState = AIState::IDLE;
            }
            return; // Don't update AI while stunned
        }
        
        // Update attack cooldown
        if (attackCooldown > 0) {
            attackCooldown -= deltaTime;
        }
        
        // Update AI based on state
        updateAI(deltaTime);
    }
    
    void updateAI(float deltaTime) {
        if (!target || !target->active) {
            aiState = AIState::IDLE;
            return;
        }
        
        float distanceToTarget = distanceTo(*target);
        
        switch (aiState) {
            case AIState::IDLE:
                // Look for player
                if (distanceToTarget < Config::WOLF_ALERT_RADIUS) {
                    aiState = AIState::CHASING;
                }
                break;
                
            case AIState::CHASING:
                // Move towards target
                if (distanceToTarget > Config::WOLF_ATTACK_RADIUS) {
                    Vector2 direction = (target->position - position).normalized();
                    velocity = direction * speed;
                } else {
                    aiState = AIState::ATTACKING;
                    velocity = Vector2(0, 0);
                }
                break;
                
            case AIState::ATTACKING:
                // Attack if in range and cooldown is ready
                if (distanceToTarget > Config::WOLF_ATTACK_RADIUS * 1.5f) {
                    aiState = AIState::CHASING;
                } else if (attackCooldown <= 0) {
                    // Attack logic handled in collision system
                    attackCooldown = Config::WOLF_ATTACK_COOLDOWN;
                }
                break;
                
            case AIState::FLEEING:
                // Move away from target
                if (distanceToTarget > Config::WOLF_ALERT_RADIUS * 2) {
                    aiState = AIState::IDLE;
                    velocity = Vector2(0, 0);
                } else {
                    Vector2 direction = (position - target->position).normalized();
                    velocity = direction * speed * 1.5f;
                }
                break;
                
            case AIState::STUNNED:
                velocity = Vector2(0, 0);
                break;
        }
    }
    
    void setTarget(Entity* newTarget) {
        target = newTarget;
        if (target && aiState == AIState::IDLE) {
            aiState = AIState::CHASING;
        }
    }
    
    void stun(float duration) {
        stunned = true;
        stunDuration = duration;
        aiState = AIState::STUNNED;
        velocity = Vector2(0, 0);
    }
    
    bool canAttack() const {
        return !stunned && attackCooldown <= 0;
    }
};

#endif // ENEMY_H