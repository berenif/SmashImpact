#ifndef POWERUP_H
#define POWERUP_H

#include "entity.h"
#include "../config/game_config.h"

class PowerUp : public Entity {
public:
    PowerUpType powerType;
    float lifetime;
    float bobOffset;
    float bobSpeed;
    
    PowerUp(const Vector2& pos, PowerUpType type)
        : Entity(EntityType::POWERUP, pos, Config::POWERUP_RADIUS),
          powerType(type),
          lifetime(30000), // 30 seconds before despawn
          bobOffset(0),
          bobSpeed(2.0f) {
    }
    
    void update(float deltaTime) override {
        // Bobbing animation
        bobOffset += bobSpeed * (deltaTime / 1000.0f);
        
        // Update lifetime
        lifetime -= deltaTime;
        if (lifetime <= 0) {
            active = false;
        }
    }
    
    float getBobHeight() const {
        return sin(bobOffset) * 5.0f;
    }
    
    const char* getPowerUpName() const {
        switch (powerType) {
            case PowerUpType::HEALTH: return "Health";
            case PowerUpType::ENERGY: return "Energy";
            case PowerUpType::SHIELD: return "Shield";
            case PowerUpType::SPEED: return "Speed";
            case PowerUpType::DAMAGE: return "Damage";
            case PowerUpType::RAPID_FIRE: return "Rapid Fire";
            case PowerUpType::MULTI_SHOT: return "Multi Shot";
            default: return "Unknown";
        }
    }
    
    const char* getPowerUpColor() const {
        switch (powerType) {
            case PowerUpType::HEALTH: return "#ff0000";
            case PowerUpType::ENERGY: return "#0099ff";
            case PowerUpType::SHIELD: return "#00ff00";
            case PowerUpType::SPEED: return "#ffff00";
            case PowerUpType::DAMAGE: return "#ff00ff";
            case PowerUpType::RAPID_FIRE: return "#ff9900";
            case PowerUpType::MULTI_SHOT: return "#9900ff";
            default: return "#ffffff";
        }
    }
};

#endif // POWERUP_H