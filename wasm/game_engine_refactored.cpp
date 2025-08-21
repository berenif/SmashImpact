// Refactored Game Engine - Main compilation unit
// This file includes all the necessary components for the WASM build

// Core includes
#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <emscripten/html5.h>

// Standard library includes
#include <cmath>
#include <vector>
#include <memory>
#include <algorithm>
#include <unordered_map>
#include <limits>
#include <cstdlib>
#include <ctime>

// Include all header files
#include "include/config/game_config.h"
#include "include/math/vector2.h"
#include "include/entities/entity.h"
#include "include/entities/player.h"
#include "include/entities/enemy.h"
#include "include/entities/wolf.h"
#include "include/entities/projectile.h"
#include "include/entities/powerup.h"
#include "include/entities/obstacle.h"
#include "include/effects/visual_effects.h"
#include "include/systems/collision_system.h"
#include "include/systems/wave_system.h"
#include "include/systems/spatial_hash_grid.h"
#include "include/game_engine.h"

// Note: Implementation files should be compiled separately in a proper build system
// For now, we'll rely on the existing modular structure being compiled

// Bindings for JavaScript
using namespace emscripten;

EMSCRIPTEN_BINDINGS(game_engine_module) {
    // Export Vector2 as Vec2
    class_<Vector2>("Vec2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vector2::x)
        .property("y", &Vector2::y)
        .function("magnitude", &Vector2::magnitude)
        .function("magnitudeSquared", &Vector2::magnitudeSquared)
        .function("normalized", &Vector2::normalized)
        .function("dot", &Vector2::dot)
        .function("distanceTo", &Vector2::distanceTo)
        .class_function("lerp", &Vector2::lerp);
    
    // Export EntityType enum
    enum_<EntityType>("EntityType")
        .value("PLAYER", EntityType::PLAYER)
        .value("ENEMY", EntityType::ENEMY)
        .value("WOLF", EntityType::WOLF)
        .value("PROJECTILE", EntityType::PROJECTILE)
        .value("POWERUP", EntityType::POWERUP)
        .value("OBSTACLE", EntityType::OBSTACLE);
    
    // Export Entity as GameObject
    class_<Entity>("GameObject")
        .property("id", &Entity::id)
        .property("type", &Entity::type)
        .property("position", &Entity::position)
        .property("velocity", &Entity::velocity)
        .property("radius", &Entity::radius)
        .property("rotation", &Entity::rotation)
        .property("health", &Entity::health)
        .property("maxHealth", &Entity::maxHealth)
        .property("active", &Entity::active)
        .function("update", &Entity::update)
        .function("takeDamage", &Entity::takeDamage)
        .function("collidesWith", &Entity::collidesWith)
        .function("distanceTo", &Entity::distanceTo);
    
    // Export Player class
    class_<Player, base<Entity>>("Player")
        .property("energy", &Player::energy)
        .property("maxEnergy", &Player::maxEnergy)
        .property("invulnerable", &Player::invulnerable)
        .property("boosting", &Player::boosting)
        .property("blocking", &Player::blocking)
        .property("attacking", &Player::attacking)
        .property("rolling", &Player::rolling)
        .property("score", &Player::score)
        .property("lives", &Player::lives)
        .property("kills", &Player::kills)
        .function("canShoot", &Player::canShoot)
        .function("consumeShootEnergy", &Player::consumeShootEnergy)
        .function("startBoost", &Player::startBoost)
        .function("startBlock", &Player::startBlock)
        .function("endBlock", &Player::endBlock)
        .function("startAttack", &Player::startAttack)
        .function("startRoll", &Player::startRoll)
        .function("applyPowerUp", &Player::applyPowerUp)
        .function("getSpeed", &Player::getSpeed)
        .function("getDamageMultiplier", &Player::getDamageMultiplier);
    
    // Export Enemy class
    class_<Enemy, base<Entity>>("Enemy")
        .property("speed", &Enemy::speed)
        .property("damage", &Enemy::damage)
        .property("target", &Enemy::target, allow_raw_pointers())
        .property("stunned", &Enemy::stunned)
        .function("setTarget", &Enemy::setTarget, allow_raw_pointers())
        .function("stun", &Enemy::stun);
    
    // Export Wolf class
    class_<Wolf, base<Enemy>>("Wolf")
        .property("alertRadius", &Wolf::alertRadius)
        .property("attackRadius", &Wolf::attackRadius)
        .property("isAlpha", &Wolf::isAlpha)
        .function("howl", &Wolf::howl);
    
    // Export Projectile class
    class_<Projectile, base<Entity>>("Projectile")
        .property("damage", &Projectile::damage)
        .property("ownerId", &Projectile::ownerId)
        .property("direction", &Projectile::direction)
        .property("lifetime", &Projectile::lifetime);
    
    // Export PowerUpType enum
    enum_<PowerUpType>("PowerUpType")
        .value("HEALTH", PowerUpType::HEALTH)
        .value("ENERGY", PowerUpType::ENERGY)
        .value("DAMAGE_BOOST", PowerUpType::DAMAGE_BOOST)
        .value("SPEED_BOOST", PowerUpType::SPEED_BOOST)
        .value("MULTI_SHOT", PowerUpType::MULTI_SHOT)
        .value("SHIELD", PowerUpType::SHIELD);
    
    // Export PowerUp class
    class_<PowerUp, base<Entity>>("PowerUp")
        .property("powerType", &PowerUp::powerType);
    
    // Export Obstacle class
    class_<Obstacle, base<Entity>>("Obstacle")
        .property("destructible", &Obstacle::destructible);
    
    // Export CollisionSystem
    class_<CollisionSystem>("CollisionSystem")
        .constructor<VisualEffects*>(allow_raw_pointers())
        .function("checkCollisions", &CollisionSystem::checkCollisions, allow_raw_pointers())
        .function("getCollisionChecks", &CollisionSystem::getCollisionChecks);
    
    // Export WaveSystem
    class_<WaveSystem>("WaveSystem")
        .constructor<>()
        .function("update", &WaveSystem::update, allow_raw_pointers())
        .function("getCurrentWave", &WaveSystem::getCurrentWave)
        .function("isWaveActive", &WaveSystem::isWaveActive)
        .function("getWaveTransitionTimer", &WaveSystem::getWaveTransitionTimer)
        .function("getEnemiesRemaining", &WaveSystem::getEnemiesRemaining)
        .function("getWolvesRemaining", &WaveSystem::getWolvesRemaining)
        .function("startNextWave", &WaveSystem::startNextWave)
        .function("reset", &WaveSystem::reset);
    
    // Export VisualEffects
    class_<VisualEffects>("VisualEffects")
        .constructor<>()
        .function("update", &VisualEffects::update)
        .function("clear", &VisualEffects::clear)
        .function("createExplosion", &VisualEffects::createExplosion)
        .function("createHitEffect", &VisualEffects::createHitEffect)
        .function("createBloodSplatter", &VisualEffects::createBloodSplatter)
        .function("createBoostTrail", &VisualEffects::createBoostTrail)
        .function("createDustCloud", &VisualEffects::createDustCloud)
        .function("createHealEffect", &VisualEffects::createHealEffect)
        .function("createEnergyEffect", &VisualEffects::createEnergyEffect)
        .function("addScreenShake", &VisualEffects::addScreenShake)
        .function("getScreenShakeOffset", &VisualEffects::getScreenShakeOffset);
    
    // Export main GameEngine class
    class_<GameEngine>("GameEngine")
        .constructor<float, float>()
        // Entity management
        .function("createPlayer", &GameEngine::createPlayer)
        .function("createEnemy", &GameEngine::createEnemy)
        .function("createWolf", &GameEngine::createWolf)
        .function("createProjectile", &GameEngine::createProjectile)
        .function("createPowerUp", &GameEngine::createPowerUp)
        .function("createObstacle", &GameEngine::createObstacle)
        .function("removeEntity", &GameEngine::removeEntity)
        // Player controls
        .function("updatePlayerInput", &GameEngine::updatePlayerInput)
        .function("playerShoot", &GameEngine::playerShoot)
        .function("playerBoost", &GameEngine::playerBoost)
        .function("playerSpecialAbility", &GameEngine::playerSpecialAbility)
        .function("activateBoost", &GameEngine::activateBoost)
        .function("deactivateBoost", &GameEngine::deactivateBoost)
        .function("startBlock", &GameEngine::startBlock)
        .function("endBlock", &GameEngine::endBlock)
        .function("performAttack", &GameEngine::performAttack)
        .function("performRoll", &GameEngine::performRoll)
        // Game loop
        .function("update", &GameEngine::update)
        .function("updatePhysics", &GameEngine::updatePhysics)
        .function("updateAI", &GameEngine::updateAI)
        .function("checkCollisions", &GameEngine::checkCollisions)
        .function("checkBounds", &GameEngine::checkBounds)
        // Game state
        .function("startGame", &GameEngine::startGame)
        .function("pauseGame", &GameEngine::pauseGame)
        .function("resumeGame", &GameEngine::resumeGame)
        .function("endGame", &GameEngine::endGame)
        .function("restartGame", &GameEngine::restartGame)
        // World management
        .function("setWorldBounds", &GameEngine::setWorldBounds)
        .function("generateObstacles", &GameEngine::generateObstacles)
        .function("clearEntities", &GameEngine::clearEntities)
        // JavaScript interface
        .function("getEntityPositions", &GameEngine::getEntityPositions)
        .function("getAllEntities", &GameEngine::getAllEntities)
        .function("getPlayerState", &GameEngine::getPlayerState)
        .function("getGameState", &GameEngine::getGameState)
        .function("getPerformanceMetrics", &GameEngine::getPerformanceMetrics)
        .function("getVisualEffects", &GameEngine::getVisualEffects)
        .function("getWaveInfo", &GameEngine::getWaveInfo)
        // Getters
        .function("isBlocking", &GameEngine::isBlocking)
        .function("isPerfectParryWindow", &GameEngine::isPerfectParryWindow)
        .function("getScore", &GameEngine::getScore)
        .function("getHighScore", &GameEngine::getHighScore);
    
    // Register vector types for convenience
    register_vector<Entity*>("EntityPointerVector");
    register_vector<std::unique_ptr<Entity>>("EntityVector");
}