#ifndef WOLF_H
#define WOLF_H

#include "enemy.h"
#include "../config/game_config.h"
#include <cstdlib>
#include <vector>

class Wolf : public Enemy {
public:
    // Wolf-specific states
    enum class WolfState {
        PATROLLING,
        STALKING,
        LUNGING,
        RECOVERING,
        HOWLING,
        PACK_HUNTING
    };
    
    WolfState wolfState;
    Vector2 patrolTarget;
    float lungeCooldown;
    float lungeSpeed;
    bool isAlpha;
    std::vector<Wolf*> packMembers;
    
    // Advanced behaviors
    float howlCooldown;
    float packCoordinationTimer;
    Vector2 circlePosition; // For pack circling behavior
    
    Wolf(const Vector2& pos, bool alpha = false)
        : Enemy(pos),
          wolfState(WolfState::PATROLLING),
          lungeCooldown(0),
          lungeSpeed(Config::WOLF_LUNGE_SPEED),
          isAlpha(alpha),
          howlCooldown(0),
          packCoordinationTimer(0) {
        
        type = EntityType::WOLF;
        radius = Config::WOLF_RADIUS;
        health = Config::WOLF_HEALTH;
        maxHealth = Config::WOLF_HEALTH;
        damage = Config::WOLF_DAMAGE;
        speed = Config::WOLF_SPEED;
        
        if (isAlpha) {
            health *= 1.5f;
            maxHealth *= 1.5f;
            damage *= 1.2f;
            radius *= 1.2f;
        }
        
        generatePatrolTarget();
    }
    
    void update(float deltaTime) override {
        Enemy::update(deltaTime);
        
        if (stunned) return;
        
        // Update wolf-specific cooldowns
        if (lungeCooldown > 0) {
            lungeCooldown -= deltaTime;
        }
        
        if (howlCooldown > 0) {
            howlCooldown -= deltaTime;
        }
        
        if (packCoordinationTimer > 0) {
            packCoordinationTimer -= deltaTime;
        }
        
        // Update wolf AI
        updateWolfAI(deltaTime);
    }
    
    void updateWolfAI(float deltaTime) {
        if (!target) {
            patrol(deltaTime);
            return;
        }
        
        float distanceToTarget = distanceTo(*target);
        
        switch (wolfState) {
            case WolfState::PATROLLING:
                patrol(deltaTime);
                if (distanceToTarget < Config::WOLF_ALERT_RADIUS) {
                    wolfState = WolfState::STALKING;
                    if (isAlpha && howlCooldown <= 0) {
                        howl();
                    }
                }
                break;
                
            case WolfState::STALKING:
                stalk(deltaTime);
                if (distanceToTarget < Config::WOLF_LUNGE_DISTANCE && lungeCooldown <= 0) {
                    startLunge();
                } else if (distanceToTarget > Config::WOLF_ALERT_RADIUS * 1.5f) {
                    wolfState = WolfState::PATROLLING;
                }
                break;
                
            case WolfState::LUNGING:
                performLunge(deltaTime);
                break;
                
            case WolfState::RECOVERING:
                recover(deltaTime);
                break;
                
            case WolfState::HOWLING:
                // Animation state, wait for howl to complete
                if (howlCooldown <= 8000) { // Howl lasts 2 seconds
                    wolfState = WolfState::STALKING;
                }
                break;
                
            case WolfState::PACK_HUNTING:
                packHunt(deltaTime);
                break;
        }
    }
    
    void patrol(float deltaTime) {
        // Move towards patrol target
        Vector2 toPatrol = patrolTarget - position;
        if (toPatrol.magnitude() < 10) {
            generatePatrolTarget();
        } else {
            velocity = toPatrol.normalized() * (speed * 0.5f);
        }
    }
    
    void stalk(float deltaTime) {
        if (!target) return;
        
        // Circle around the target
        Vector2 toTarget = target->position - position;
        float distance = toTarget.magnitude();
        
        if (distance > Config::WOLF_ATTACK_RADIUS * 2) {
            // Move closer
            velocity = toTarget.normalized() * speed;
        } else {
            // Circle around
            Vector2 perpendicular(-toTarget.y, toTarget.x);
            perpendicular = perpendicular.normalized();
            
            // Randomly change circling direction
            if (rand() % 100 < 2) {
                perpendicular = perpendicular * -1;
            }
            
            velocity = (toTarget.normalized() * 0.3f + perpendicular * 0.7f) * speed;
        }
    }
    
    void startLunge() {
        if (!target || lungeCooldown > 0) return;
        
        wolfState = WolfState::LUNGING;
        Vector2 toTarget = (target->position - position).normalized();
        velocity = toTarget * lungeSpeed;
        lungeCooldown = 2000; // 2 second cooldown
    }
    
    void performLunge(float deltaTime) {
        // Lunge continues for a short duration
        static float lungeDuration = 300; // 300ms lunge
        lungeDuration -= deltaTime;
        
        if (lungeDuration <= 0) {
            wolfState = WolfState::RECOVERING;
            lungeDuration = 300; // Reset for next lunge
            velocity = velocity * 0.2f; // Slow down after lunge
        }
    }
    
    void recover(float deltaTime) {
        static float recoveryTime = 500; // 500ms recovery
        recoveryTime -= deltaTime;
        
        velocity = velocity * 0.9f; // Gradual slowdown
        
        if (recoveryTime <= 0) {
            wolfState = WolfState::STALKING;
            recoveryTime = 500; // Reset for next recovery
        }
    }
    
    void howl() {
        wolfState = WolfState::HOWLING;
        howlCooldown = 10000; // 10 second cooldown
        
        // Alert nearby wolves
        // This would be handled by the game engine to call other wolves
    }
    
    void packHunt(float deltaTime) {
        if (!target || packMembers.empty()) {
            wolfState = WolfState::STALKING;
            return;
        }
        
        // Coordinate with pack members to surround target
        int packIndex = 0;
        for (int i = 0; i < packMembers.size(); i++) {
            if (packMembers[i] == this) {
                packIndex = i;
                break;
            }
        }
        
        // Position in a circle around target
        float angle = (2 * M_PI * packIndex) / packMembers.size();
        float circleRadius = Config::WOLF_ATTACK_RADIUS * 2;
        
        Vector2 idealPosition = target->position + 
            Vector2(cos(angle) * circleRadius, sin(angle) * circleRadius);
        
        Vector2 toIdeal = idealPosition - position;
        if (toIdeal.magnitude() > 5) {
            velocity = toIdeal.normalized() * speed;
        } else {
            // In position, prepare to attack
            if (packCoordinationTimer <= 0) {
                startLunge();
                packCoordinationTimer = 1000; // Coordinate attacks every second
            }
        }
    }
    
    void joinPack(std::vector<Wolf*>& pack) {
        packMembers = pack;
        if (!packMembers.empty()) {
            wolfState = WolfState::PACK_HUNTING;
        }
    }
    
    void generatePatrolTarget() {
        // Generate a random patrol point within a reasonable distance
        float angle = (rand() % 360) * M_PI / 180.0f;
        float distance = 100 + (rand() % 200);
        patrolTarget = position + Vector2(cos(angle) * distance, sin(angle) * distance);
    }
};

#endif // WOLF_H