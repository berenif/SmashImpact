#ifndef PLAYER_H
#define PLAYER_H

#include "entity.h"
#include "../config/game_config.h"
#include <emscripten/emscripten.h>

class Player : public Entity {
public:
    float energy;
    float maxEnergy;
    
    // Movement states
    bool boosting;
    float boostCooldown;
    float boostDuration;
    
    // Combat states
    bool blocking;
    float blockCooldown;
    float blockDuration;
    float blockStartTime;
    bool perfectParryWindow;
    
    bool attacking;
    float attackCooldown;
    float attackAngle;
    
    bool rolling;
    float rollCooldown;
    float rollDuration;
    Vector2 rollDirection;
    
    // Power-ups
    float speedMultiplier;
    float damageMultiplier;
    bool hasShield;
    float shieldDuration;
    bool rapidFire;
    float rapidFireDuration;
    bool multiShot;
    float multiShotDuration;
    
    // Stats
    int score;
    int lives;
    int kills;
    
    Player(const Vector2& pos) 
        : Entity(EntityType::PLAYER, pos, Config::PLAYER_RADIUS),
          energy(Config::PLAYER_MAX_ENERGY),
          maxEnergy(Config::PLAYER_MAX_ENERGY),
          boosting(false), boostCooldown(0), boostDuration(0),
          blocking(false), blockCooldown(0), blockDuration(0),
          blockStartTime(0), perfectParryWindow(false),
          attacking(false), attackCooldown(0), attackAngle(0),
          rolling(false), rollCooldown(0), rollDuration(0),
          speedMultiplier(1.0f), damageMultiplier(1.0f),
          hasShield(false), shieldDuration(0),
          rapidFire(false), rapidFireDuration(0),
          multiShot(false), multiShotDuration(0),
          score(0), lives(Config::INITIAL_LIVES), kills(0) {
        health = Config::PLAYER_MAX_HEALTH;
        maxHealth = Config::PLAYER_MAX_HEALTH;
    }
    
    void update(float deltaTime) override {
        Entity::update(deltaTime);
        
        // Update boost
        if (boosting) {
            boostDuration -= deltaTime;
            if (boostDuration <= 0) {
                boosting = false;
                boostCooldown = Config::PLAYER_BOOST_COOLDOWN;
            }
        } else if (boostCooldown > 0) {
            boostCooldown -= deltaTime;
        }
        
        // Update block
        if (blocking) {
            blockDuration -= deltaTime;
            perfectParryWindow = (emscripten_get_now() - blockStartTime) <= Config::PERFECT_PARRY_WINDOW;
            
            if (blockDuration <= 0) {
                endBlock();
            }
        } else if (blockCooldown > 0) {
            blockCooldown -= deltaTime;
        }
        
        // Update attack
        if (attacking) {
            attackCooldown -= deltaTime;
            if (attackCooldown <= 0) {
                attacking = false;
                attackCooldown = Config::SWORD_COOLDOWN;
            }
        } else if (attackCooldown > 0) {
            attackCooldown -= deltaTime;
        }
        
        // Update roll
        if (rolling) {
            rollDuration -= deltaTime;
            if (rollDuration <= 0) {
                rolling = false;
                invulnerable = false;
                rollCooldown = Config::ROLL_COOLDOWN;
            } else {
                // Move in roll direction
                position += rollDirection * Config::ROLL_SPEED_MULTIPLIER * (deltaTime / 16.0f);
            }
        } else if (rollCooldown > 0) {
            rollCooldown -= deltaTime;
        }
        
        // Update power-up durations
        if (hasShield) {
            shieldDuration -= deltaTime;
            if (shieldDuration <= 0) {
                hasShield = false;
            }
        }
        
        if (rapidFire) {
            rapidFireDuration -= deltaTime;
            if (rapidFireDuration <= 0) {
                rapidFire = false;
            }
        }
        
        if (multiShot) {
            multiShotDuration -= deltaTime;
            if (multiShotDuration <= 0) {
                multiShot = false;
            }
        }
        
        // Regenerate energy
        if (energy < maxEnergy && !boosting && !rolling) {
            energy = std::min(energy + 0.1f * (deltaTime / 16.0f), maxEnergy);
        }
    }
    
    void startBoost() {
        if (!boosting && boostCooldown <= 0 && energy >= 20) {
            boosting = true;
            boostDuration = Config::PLAYER_BOOST_DURATION;
            energy -= 20;
        }
    }
    
    void startBlock() {
        if (!blocking && blockCooldown <= 0 && !rolling) {
            blocking = true;
            blockDuration = Config::SHIELD_DURATION;
            blockStartTime = emscripten_get_now();
            perfectParryWindow = true;
        }
    }
    
    void endBlock() {
        blocking = false;
        perfectParryWindow = false;
        blockCooldown = Config::SHIELD_COOLDOWN;
    }
    
    void startAttack(float angle) {
        if (!attacking && attackCooldown <= 0 && energy >= Config::SWORD_ENERGY_COST) {
            attacking = true;
            attackAngle = angle;
            attackCooldown = Config::SWORD_ANIMATION_TIME;
            energy -= Config::SWORD_ENERGY_COST;
        }
    }
    
    void startRoll(const Vector2& direction) {
        if (!rolling && rollCooldown <= 0 && energy >= Config::ROLL_ENERGY_COST) {
            rolling = true;
            rollDirection = direction.normalized();
            rollDuration = Config::ROLL_DURATION;
            invulnerable = true;
            energy -= Config::ROLL_ENERGY_COST;
        }
    }
    
    void applyPowerUp(PowerUpType type) {
        switch (type) {
            case PowerUpType::HEALTH:
                heal(30);
                break;
            case PowerUpType::ENERGY:
                energy = std::min(energy + 30, maxEnergy);
                break;
            case PowerUpType::SHIELD:
                hasShield = true;
                shieldDuration = Config::POWERUP_DURATION;
                break;
            case PowerUpType::SPEED:
                speedMultiplier = 1.5f;
                break;
            case PowerUpType::DAMAGE:
                damageMultiplier = 2.0f;
                break;
            case PowerUpType::RAPID_FIRE:
                rapidFire = true;
                rapidFireDuration = Config::POWERUP_DURATION;
                break;
            case PowerUpType::MULTI_SHOT:
                multiShot = true;
                multiShotDuration = Config::POWERUP_DURATION;
                break;
        }
    }
    
    float getSpeed() const {
        float speed = Config::PLAYER_MAX_SPEED * speedMultiplier;
        if (boosting) {
            speed = Config::PLAYER_BOOST_SPEED;
        }
        return speed;
    }
    
    float getDamageMultiplier() const {
        return damageMultiplier;
    }
    
    bool canShoot() const {
        return energy >= 5;
    }
    
    void consumeShootEnergy() {
        energy = std::max(0.0f, energy - 5);
    }
};

#endif // PLAYER_H