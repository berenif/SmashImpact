#ifndef COLLISION_SYSTEM_H
#define COLLISION_SYSTEM_H

#include "../entities/entity.h"
#include "../entities/player.h"
#include "../entities/enemy.h"
#include "../entities/wolf.h"
#include "../entities/projectile.h"
#include "../entities/powerup.h"
#include "../entities/obstacle.h"
#include "../effects/visual_effects.h"
#include <vector>
#include <memory>

class CollisionSystem {
private:
    VisualEffects* vfx;
    int collisionChecks;
    
public:
    CollisionSystem(VisualEffects* effects = nullptr)
        : vfx(effects), collisionChecks(0) {}
    
    void checkCollisions(std::vector<std::unique_ptr<Entity>>& entities, Player* player) {
        collisionChecks = 0;
        
        // Check player collisions
        if (player && player->active) {
            for (auto& entity : entities) {
                if (!entity || !entity->active || entity.get() == player) continue;
                
                if (player->collidesWith(*entity)) {
                    handleCollision(player, entity.get());
                    collisionChecks++;
                }
            }
        }
        
        // Check entity-entity collisions
        for (size_t i = 0; i < entities.size(); i++) {
            if (!entities[i] || !entities[i]->active) continue;
            
            for (size_t j = i + 1; j < entities.size(); j++) {
                if (!entities[j] || !entities[j]->active) continue;
                
                if (entities[i]->collidesWith(*entities[j])) {
                    handleCollision(entities[i].get(), entities[j].get());
                    collisionChecks++;
                }
            }
        }
    }
    
    void handleCollision(Entity* a, Entity* b) {
        // Player-Enemy collision
        if (a->type == EntityType::PLAYER && b->type == EntityType::ENEMY) {
            handlePlayerEnemyCollision(static_cast<Player*>(a), static_cast<Enemy*>(b));
        }
        else if (b->type == EntityType::PLAYER && a->type == EntityType::ENEMY) {
            handlePlayerEnemyCollision(static_cast<Player*>(b), static_cast<Enemy*>(a));
        }
        
        // Player-Wolf collision
        else if (a->type == EntityType::PLAYER && b->type == EntityType::WOLF) {
            handlePlayerWolfCollision(static_cast<Player*>(a), static_cast<Wolf*>(b));
        }
        else if (b->type == EntityType::PLAYER && a->type == EntityType::WOLF) {
            handlePlayerWolfCollision(static_cast<Player*>(b), static_cast<Wolf*>(a));
        }
        
        // Projectile collisions
        else if (a->type == EntityType::PROJECTILE) {
            handleProjectileCollision(static_cast<Projectile*>(a), b);
        }
        else if (b->type == EntityType::PROJECTILE) {
            handleProjectileCollision(static_cast<Projectile*>(b), a);
        }
        
        // Player-PowerUp collision
        else if (a->type == EntityType::PLAYER && b->type == EntityType::POWERUP) {
            handlePlayerPowerUpCollision(static_cast<Player*>(a), static_cast<PowerUp*>(b));
        }
        else if (b->type == EntityType::PLAYER && a->type == EntityType::POWERUP) {
            handlePlayerPowerUpCollision(static_cast<Player*>(b), static_cast<PowerUp*>(a));
        }
        
        // Obstacle collisions
        else if (a->type == EntityType::OBSTACLE || b->type == EntityType::OBSTACLE) {
            handleObstacleCollision(a, b);
        }
        
        // Enemy-Enemy separation
        else if (a->type == EntityType::ENEMY && b->type == EntityType::ENEMY) {
            separateEntities(a, b);
        }
    }
    
private:
    void handlePlayerEnemyCollision(Player* player, Enemy* enemy) {
        if (player->invulnerable || player->rolling) return;
        
        float damage = enemy->damage;
        
        // Check if blocking
        if (player->blocking) {
            bool perfectParry = player->perfectParryWindow;
            
            if (perfectParry) {
                // Perfect parry - no damage, stun enemy
                damage = 0;
                enemy->stun(Config::PERFECT_PARRY_STUN_DURATION);
                player->energy = std::min(player->energy + Config::PERFECT_PARRY_ENERGY_RESTORE, 
                                        player->maxEnergy);
                
                if (vfx) {
                    vfx->createHitEffect(player->position, true);
                }
            } else {
                // Normal block - reduced damage
                damage *= (1.0f - Config::SHIELD_DAMAGE_REDUCTION);
                
                if (vfx) {
                    vfx->createHitEffect(player->position, false);
                }
            }
        }
        
        // Apply damage
        if (damage > 0) {
            player->takeDamage(damage);
            player->invulnerable = true;
            player->invulnerabilityTimer = Config::INVULNERABILITY_DURATION;
            
            // Knockback
            Vector2 knockback = (player->position - enemy->position).normalized() * 10;
            player->velocity += knockback;
            
            if (vfx) {
                vfx->createBloodSplatter(player->position, knockback.normalized());
                vfx->addScreenShake(3);
            }
        }
    }
    
    void handlePlayerWolfCollision(Player* player, Wolf* wolf) {
        // Similar to enemy collision but with wolf-specific behavior
        handlePlayerEnemyCollision(player, static_cast<Enemy*>(wolf));
    }
    
    void handleProjectileCollision(Projectile* projectile, Entity* target) {
        // Don't hit the owner
        if (projectile->ownerId == target->id) return;
        
        // Hit enemy or wolf
        if (target->type == EntityType::ENEMY || target->type == EntityType::WOLF) {
            target->takeDamage(projectile->damage);
            projectile->active = false;
            
            // Knockback
            Vector2 knockback = projectile->direction * 5;
            target->velocity += knockback;
            
            if (vfx) {
                vfx->createHitEffect(target->position, false);
                vfx->createBloodSplatter(target->position, projectile->direction);
            }
            
            // Check if killed
            if (!target->active) {
                if (vfx) {
                    vfx->createExplosion(target->position, 0.5f);
                }
            }
        }
        // Hit obstacle
        else if (target->type == EntityType::OBSTACLE) {
            Obstacle* obstacle = static_cast<Obstacle*>(target);
            if (obstacle->destructible) {
                obstacle->takeDamage(projectile->damage);
                if (!obstacle->active && vfx) {
                    vfx->createExplosion(obstacle->position, 0.3f);
                }
            }
            projectile->active = false;
            
            if (vfx) {
                vfx->createHitEffect(projectile->position, false);
            }
        }
    }
    
    void handlePlayerPowerUpCollision(Player* player, PowerUp* powerup) {
        player->applyPowerUp(powerup->powerType);
        powerup->active = false;
        
        if (vfx) {
            switch (powerup->powerType) {
                case PowerUpType::HEALTH:
                    vfx->createHealEffect(player->position);
                    break;
                case PowerUpType::ENERGY:
                    vfx->createEnergyEffect(player->position);
                    break;
                default:
                    vfx->createHitEffect(player->position, true);
                    break;
            }
        }
        
        player->score += Config::SCORE_PER_POWERUP;
    }
    
    void handleObstacleCollision(Entity* a, Entity* b) {
        // Push entities away from obstacles
        Entity* movable = (a->type == EntityType::OBSTACLE) ? b : a;
        Entity* obstacle = (a->type == EntityType::OBSTACLE) ? a : b;
        
        if (movable->type == EntityType::PROJECTILE) {
            // Projectiles are destroyed by obstacles
            movable->active = false;
            if (vfx) {
                vfx->createHitEffect(movable->position, false);
            }
        } else {
            // Push entity away
            Vector2 separation = (movable->position - obstacle->position).normalized();
            float overlap = (movable->radius + obstacle->radius) - movable->distanceTo(*obstacle);
            
            if (overlap > 0) {
                movable->position += separation * overlap;
                movable->velocity = movable->velocity - separation * (movable->velocity.dot(separation));
            }
        }
    }
    
    void separateEntities(Entity* a, Entity* b) {
        Vector2 separation = (a->position - b->position).normalized();
        float overlap = (a->radius + b->radius) - a->distanceTo(*b);
        
        if (overlap > 0) {
            a->position += separation * (overlap * 0.5f);
            b->position = b->position - (separation * (overlap * 0.5f));
        }
    }
    
public:
    int getCollisionChecks() const { return collisionChecks; }
};

#endif // COLLISION_SYSTEM_H