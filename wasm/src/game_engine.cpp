#include "../include/game_engine.h"
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <cstdlib>
#include <ctime>
#include <cmath>
#include <vector>
#include <algorithm>

GameEngine::GameEngine(float width, float height)
    : worldWidth(width), worldHeight(height),
      player(nullptr), nextEntityId(1),
      collisionSystem(&visualEffects),
      physicsTime(0), collisionTime(0), collisionChecks(0),
      gameState(GameState::MENU), score(0), highScore(0) {
    
    // Initialize random seed
    srand(time(nullptr));
    
    // Reserve space for entities
    entities.reserve(Config::MAX_ENTITIES);
}

GameEngine::~GameEngine() {
    clearEntities();
}

// Entity management
int GameEngine::createPlayer(float x, float y) {
    auto playerEntity = std::make_unique<Player>(Vector2(x, y));
    player = playerEntity.get();
    int id = playerEntity->id;
    entities.push_back(std::move(playerEntity));
    return id;
}

int GameEngine::createEnemy(float x, float y) {
    auto enemy = std::make_unique<Enemy>(Vector2(x, y));
    
    // Set player as target if available
    if (player) {
        enemy->setTarget(player);
    }
    
    int id = enemy->id;
    entities.push_back(std::move(enemy));
    return id;
}

int GameEngine::createWolf(float x, float y, bool isAlpha) {
    auto wolf = std::make_unique<Wolf>(Vector2(x, y), isAlpha);
    
    // Set player as target if available
    if (player) {
        wolf->setTarget(player);
    }
    
    int id = wolf->id;
    entities.push_back(std::move(wolf));
    return id;
}

int GameEngine::createProjectile(float x, float y, float dirX, float dirY, float damage, int ownerId) {
    Vector2 direction(dirX, dirY);
    auto projectile = std::make_unique<Projectile>(Vector2(x, y), direction, damage, ownerId);
    int id = projectile->id;
    entities.push_back(std::move(projectile));
    return id;
}

int GameEngine::createPowerUp(float x, float y, int type) {
    auto powerUp = std::make_unique<PowerUp>(Vector2(x, y), static_cast<PowerUpType>(type));
    int id = powerUp->id;
    entities.push_back(std::move(powerUp));
    return id;
}

int GameEngine::createObstacle(float x, float y, float radius, bool destructible) {
    auto obstacle = std::make_unique<Obstacle>(Vector2(x, y), radius, destructible);
    int id = obstacle->id;
    entities.push_back(std::move(obstacle));
    return id;
}

int GameEngine::createShapedObstacle(float x, float y, int shape, float width, float height, float rotation, bool destructible) {
    auto obstacle = std::make_unique<Obstacle>(
        Vector2(x, y), 
        static_cast<ObstacleShape>(shape), 
        width, 
        height, 
        rotation, 
        destructible
    );
    int id = obstacle->id;
    entities.push_back(std::move(obstacle));
    return id;
}

void GameEngine::removeEntity(int id) {
    auto it = std::find_if(entities.begin(), entities.end(),
        [id](const std::unique_ptr<Entity>& e) {
            return e && e->id == id;
        });
    
    if (it != entities.end()) {
        if (it->get() == player) {
            player = nullptr;
        }
        entities.erase(it);
    }
}

// Player controls
void GameEngine::updatePlayerInput(float dx, float dy, float aimX, float aimY) {
    if (!player || !player->active) return;
    
    // Normalize input
    Vector2 input(dx, dy);
    float mag = input.magnitude();
    if (mag > 1.0f && mag > 0.0f) {
        input = input.normalized();
    }
    
    // Apply acceleration
    float accel = Config::PLAYER_ACCELERATION;
    if (player->boosting) {
        accel *= 2;
    }
    
    player->velocity += input * accel;
    
    // Limit speed
    float maxSpeed = player->getSpeed();
    float velocityMag = player->velocity.magnitude();
    if (velocityMag > maxSpeed && velocityMag > 0.0f) {
        player->velocity = player->velocity.normalized() * maxSpeed;
    }
    
    // Apply friction
    if (!player->boosting) {
        player->velocity *= Config::PLAYER_FRICTION;
    }
    
    // Update player rotation based on aim direction
    Vector2 aimDirection(aimX - player->position.x, aimY - player->position.y);
    if (aimDirection.magnitude() > 0.0f) {
        player->rotation = atan2(aimDirection.y, aimDirection.x);
    }
}

void GameEngine::playerShoot(float aimX, float aimY) {
    if (!player || !player->active || !player->canShoot()) return;
    
    Vector2 direction(aimX - player->position.x, aimY - player->position.y);
    float dirMag = direction.magnitude();
    if (dirMag > 0.0f) {
        direction = direction.normalized();
    } else {
        // Default to shooting right if no direction
        direction = Vector2(1.0f, 0.0f);
    }
    
    float damage = Config::PROJECTILE_DAMAGE * player->getDamageMultiplier();
    
    if (player->multiShot) {
        // Shoot 3 projectiles in a spread
        for (int i = -1; i <= 1; i++) {
            float angle = atan2(direction.y, direction.x) + (i * 0.2f);
            Vector2 shotDir(cos(angle), sin(angle));
            createProjectile(player->position.x, player->position.y,
                           shotDir.x, shotDir.y, damage, player->id);
        }
    } else {
        createProjectile(player->position.x, player->position.y,
                       direction.x, direction.y, damage, player->id);
    }
    
    player->consumeShootEnergy();
}

void GameEngine::activateBoost(int playerId) {
    if (player && player->id == playerId) {
        player->startBoost();
    }
}

void GameEngine::deactivateBoost(int playerId) {
    if (player && player->id == playerId) {
        player->boosting = false;
    }
}

void GameEngine::startBlock(int playerId) {
    if (player && player->id == playerId) {
        player->startBlock();
    }
}

void GameEngine::endBlock(int playerId) {
    if (player && player->id == playerId) {
        player->endBlock();
    }
}

void GameEngine::performAttack(int playerId, float angle) {
    if (player && player->id == playerId) {
        player->startAttack(angle);
        
        // Check for enemies in sword range
        for (auto& entity : entities) {
            if (!entity || !entity->active) continue;
            
            if (entity->type == EntityType::ENEMY || entity->type == EntityType::WOLF) {
                float distance = player->distanceTo(*entity);
                
                if (distance <= Config::SWORD_RANGE) {
                    // Check if enemy is within sword arc
                    Vector2 toEnemy = entity->position - player->position;
                    float enemyAngle = atan2(toEnemy.y, toEnemy.x);
                    float angleDiff = abs(enemyAngle - angle);
                    
                    // Normalize angle difference
                    if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;
                    
                    if (angleDiff <= Config::SWORD_ARC / 2) {
                        // Hit the enemy
                        entity->takeDamage(Config::SWORD_DAMAGE * player->getDamageMultiplier());
                        
                        // Knockback
                        Vector2 knockback = toEnemy;
                        float knockbackMag = knockback.magnitude();
                        if (knockbackMag > 0.0f) {
                            knockback = knockback.normalized() * Config::SWORD_KNOCKBACK;
                            entity->velocity += knockback;
                            
                            // Visual effect
                            visualEffects.createHitEffect(entity->position, false);
                            visualEffects.createBloodSplatter(entity->position, knockback.normalized());
                        } else {
                            // Just apply visual effect without knockback
                            visualEffects.createHitEffect(entity->position, false);
                        }
                        
                        // Score for kill
                        if (!entity->active) {
                            player->score += Config::SCORE_PER_KILL;
                            player->kills++;
                            score += Config::SCORE_PER_KILL;
                            
                            visualEffects.createExplosion(entity->position, 0.5f);
                        }
                    }
                }
            }
        }
    }
}

void GameEngine::performRoll(int playerId, float dirX, float dirY) {
    if (player && player->id == playerId) {
        Vector2 direction(dirX, dirY);
        if (direction.magnitude() < 0.1f) {
            // If no direction provided, roll in movement direction
            float velMag = player->velocity.magnitude();
            if (velMag > 0.0f) {
                direction = player->velocity.normalized();
            } else {
                // Default to rolling right if no velocity
                direction = Vector2(1.0f, 0.0f);
            }
        }
        player->startRoll(direction);
        
        // Create dust effect
        visualEffects.createDustCloud(player->position);
    }
}

// Game loop
void GameEngine::update(float deltaTime) {
    if (gameState != GameState::PLAYING) return;
    
    double startTime = emscripten_get_now();
    
    // Update physics
    updatePhysics(deltaTime);
    
    double afterPhysics = emscripten_get_now();
    physicsTime = afterPhysics - startTime;
    
    // Update AI
    updateAI(deltaTime);
    
    // Check collisions
    collisionSystem.checkCollisions(entities, player);
    collisionChecks = collisionSystem.getCollisionChecks();
    
    double afterCollisions = emscripten_get_now();
    collisionTime = afterCollisions - afterPhysics;
    
    // Update visual effects
    visualEffects.update(deltaTime);
    
    // Update wave system
    waveSystem.update(deltaTime, entities, worldWidth, worldHeight);
    
    // Check bounds
    checkBounds();
    
    // Clean up inactive entities
    cleanupInactiveEntities();
    
    // Check game over
    if (player && player->lives <= 0) {
        gameState = GameState::GAME_OVER;
        if (score > highScore) {
            highScore = score;
        }
    }
}

void GameEngine::updatePhysics(float deltaTime) {
    // Update player
    if (player && player->active) {
        player->update(deltaTime);
        
        // Create boost trail
        if (player->boosting) {
            visualEffects.createBoostTrail(player->position, "#00ffff", player->velocity);
        }
    }
    
    // Update all entities
    for (auto& entity : entities) {
        if (entity && entity->active) {
            entity->update(deltaTime);
        }
    }
}

void GameEngine::updateAI(float deltaTime) {
    // Update enemy AI targets
    updateEntityTargets();
}

void GameEngine::checkBounds() {
    // Keep player in bounds
    if (player && player->active) {
        player->position.x = std::max(player->radius, 
                                     std::min(worldWidth - player->radius, player->position.x));
        player->position.y = std::max(player->radius, 
                                     std::min(worldHeight - player->radius, player->position.y));
    }
    
    // Remove projectiles that go out of bounds
    for (auto& entity : entities) {
        if (entity && entity->type == EntityType::PROJECTILE) {
            if (entity->position.x < -50 || entity->position.x > worldWidth + 50 ||
                entity->position.y < -50 || entity->position.y > worldHeight + 50) {
                entity->active = false;
            }
        }
    }
}

// Game state
void GameEngine::startGame() {
    gameState = GameState::PLAYING;
    score = 0;
    
    // Clear existing entities
    clearEntities();
    
    // Create player at center
    createPlayer(worldWidth / 2, worldHeight / 2);
    
    // Generate enhanced obstacles with various shapes and clustering
    generateEnhancedObstacles(10, true); // Generate 10 obstacles, ensure playability
}

void GameEngine::pauseGame() {
    if (gameState == GameState::PLAYING) {
        gameState = GameState::PAUSED;
    }
}

void GameEngine::resumeGame() {
    if (gameState == GameState::PAUSED) {
        gameState = GameState::PLAYING;
    }
}

void GameEngine::endGame() {
    gameState = GameState::GAME_OVER;
    if (score > highScore) {
        highScore = score;
    }
}

void GameEngine::restartGame() {
    startGame();
}

// World management
void GameEngine::setWorldBounds(float width, float height) {
    worldWidth = width;
    worldHeight = height;
}

void GameEngine::generateObstacles(int count) {
    for (int i = 0; i < count; i++) {
        float x = rand() % (int)worldWidth;
        float y = rand() % (int)worldHeight;
        float radius = Config::OBSTACLE_MIN_RADIUS + 
                      rand() % (int)(Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS);
        
        // Make sure not too close to player spawn
        Vector2 center(worldWidth / 2, worldHeight / 2);
        Vector2 pos(x, y);
        if ((pos - center).magnitude() > radius + Config::PLAYER_RADIUS + 100) {
            createObstacle(x, y, radius, rand() % 100 < 30); // 30% chance of destructible
        }
    }
}

void GameEngine::generateEnhancedObstacles(int count, bool ensurePlayability) {
    // Clear any existing obstacles first (optional)
    // entities.erase(std::remove_if(entities.begin(), entities.end(),
    //     [](const std::unique_ptr<Entity>& e) {
    //         return e && e->type == EntityType::OBSTACLE;
    //     }), entities.end());
    
    // Create a grid to track obstacle density for playability
    const int gridSize = 100; // Size of each grid cell
    int gridWidth = (worldWidth + gridSize - 1) / gridSize;
    int gridHeight = (worldHeight + gridSize - 1) / gridSize;
    std::vector<std::vector<int>> obstacleGrid(gridHeight, std::vector<int>(gridWidth, 0));
    
    // Safe zones around spawn points
    Vector2 playerSpawn(worldWidth / 2, worldHeight / 2);
    float safeRadius = 150.0f;
    
    // Generate obstacles with various shapes and clustering
    int obstaclesCreated = 0;
    int attempts = 0;
    const int maxAttempts = count * 3; // Prevent infinite loops
    
    while (obstaclesCreated < count && attempts < maxAttempts) {
        attempts++;
        
        // Randomly decide on obstacle type and clustering
        int obstacleType = rand() % 100;
        bool createCluster = (rand() % 100) < 40; // 40% chance of clustering
        
        // Generate base position
        float baseX = 50 + rand() % (int)(worldWidth - 100);
        float baseY = 50 + rand() % (int)(worldHeight - 100);
        Vector2 basePos(baseX, baseY);
        
        // Check if too close to player spawn
        if ((basePos - playerSpawn).magnitude() < safeRadius) {
            continue;
        }
        
        // Check grid density for playability
        int gridX = baseX / gridSize;
        int gridY = baseY / gridSize;
        if (ensurePlayability && obstacleGrid[gridY][gridX] >= 2) {
            continue; // Too many obstacles in this grid cell
        }
        
        if (createCluster) {
            // Create a cluster of 2-4 obstacles that can join to form complex shapes
            int clusterSize = 2 + rand() % 3;
            float clusterRadius = 80.0f;
            
            for (int j = 0; j < clusterSize && obstaclesCreated < count; j++) {
                float angle = (j * 2 * M_PI) / clusterSize + (rand() % 100) * 0.01f;
                float distance = (rand() % 50) + 20;
                float x = baseX + cos(angle) * distance;
                float y = baseY + sin(angle) * distance;
                
                // Keep within world bounds
                x = std::max(30.0f, std::min(x, worldWidth - 30.0f));
                y = std::max(30.0f, std::min(y, worldHeight - 30.0f));
                
                // Choose shape for this cluster member
                int shapeChoice = rand() % 3;
                bool destructible = (rand() % 100) < 25; // 25% chance of destructible
                
                if (shapeChoice == 0) {
                    // Circle
                    float radius = Config::OBSTACLE_MIN_RADIUS + 
                                 rand() % (int)(Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS);
                    createObstacle(x, y, radius, destructible);
                } else if (shapeChoice == 1) {
                    // Square
                    float size = Config::OBSTACLE_MIN_RADIUS * 2 + 
                               rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 2);
                    float rotation = (rand() % 4) * M_PI / 4; // 0, 45, 90, or 135 degrees
                    createShapedObstacle(x, y, 1, size, size, rotation, destructible);
                } else {
                    // Rectangle
                    float width = Config::OBSTACLE_MIN_RADIUS * 2 + 
                                rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 2);
                    float height = Config::OBSTACLE_MIN_RADIUS * 2 + 
                                 rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 2);
                    float rotation = (rand() % 360) * M_PI / 180.0f;
                    createShapedObstacle(x, y, 2, width, height, rotation, destructible);
                }
                
                obstaclesCreated++;
                
                // Update grid
                int gx = x / gridSize;
                int gy = y / gridSize;
                if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
                    obstacleGrid[gy][gx]++;
                }
            }
        } else {
            // Create single obstacle
            bool destructible = (rand() % 100) < 30; // 30% chance of destructible
            
            if (obstacleType < 33) {
                // Circle (33% chance)
                float radius = Config::OBSTACLE_MIN_RADIUS + 
                             rand() % (int)(Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS);
                createObstacle(baseX, baseY, radius, destructible);
            } else if (obstacleType < 66) {
                // Square (33% chance)
                float size = Config::OBSTACLE_MIN_RADIUS * 1.5f + 
                           rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 1.5f);
                float rotation = (rand() % 8) * M_PI / 4; // 45-degree increments
                createShapedObstacle(baseX, baseY, 1, size, size, rotation, destructible);
            } else {
                // Rectangle (34% chance)
                float width = Config::OBSTACLE_MIN_RADIUS * 1.5f + 
                            rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 2);
                float height = Config::OBSTACLE_MIN_RADIUS * 1.5f + 
                             rand() % (int)((Config::OBSTACLE_MAX_RADIUS - Config::OBSTACLE_MIN_RADIUS) * 2);
                float rotation = (rand() % 360) * M_PI / 180.0f;
                createShapedObstacle(baseX, baseY, 2, width, height, rotation, destructible);
            }
            
            obstaclesCreated++;
            obstacleGrid[gridY][gridX]++;
        }
    }
    
    // If ensurePlayability is true, verify that there's a clear path from spawn to edges
    if (ensurePlayability) {
        // Simple check: ensure there aren't too many obstacles in any row/column
        for (int i = 0; i < gridHeight; i++) {
            int rowCount = 0;
            for (int j = 0; j < gridWidth; j++) {
                rowCount += obstacleGrid[i][j];
            }
            // If a row is too blocked, remove some obstacles
            if (rowCount > gridWidth * 0.6) {
                // This row is too blocked, we should clear some space
                // In a real implementation, we'd selectively remove obstacles
            }
        }
    }
}

void GameEngine::clearEntities() {
    entities.clear();
    player = nullptr;
    visualEffects.clear();
}

// JavaScript interface
emscripten::val GameEngine::getEntityPositions() {
    emscripten::val result = emscripten::val::array();
    int index = 0;
    
    for (const auto& entity : entities) {
        if (entity && entity->active) {
            emscripten::val entityData = emscripten::val::object();
            entityData.set("id", entity->id);
            entityData.set("type", static_cast<int>(entity->type));
            entityData.set("x", entity->position.x);
            entityData.set("y", entity->position.y);
            entityData.set("vx", entity->velocity.x);
            entityData.set("vy", entity->velocity.y);
            entityData.set("rotation", entity->rotation);
            entityData.set("radius", entity->radius);
            entityData.set("health", entity->health);
            entityData.set("maxHealth", entity->maxHealth);
            result.set(index++, entityData);
        }
    }
    
    return result;
}

emscripten::val GameEngine::getPlayerState() {
    if (!player || !player->active) {
        return emscripten::val::null();
    }
    
    emscripten::val state = emscripten::val::object();
    state.set("id", player->id);
    state.set("x", player->position.x);
    state.set("y", player->position.y);
    state.set("vx", player->velocity.x);
    state.set("vy", player->velocity.y);
    state.set("health", player->health);
    state.set("maxHealth", player->maxHealth);
    state.set("energy", player->energy);
    state.set("maxEnergy", player->maxEnergy);
    state.set("invulnerable", player->invulnerable);
    state.set("boosting", player->boosting);
    state.set("boostCooldown", player->boostCooldown);
    state.set("blocking", player->blocking);
    state.set("blockCooldown", player->blockCooldown);
    state.set("perfectParryWindow", player->perfectParryWindow);
    state.set("attacking", player->attacking);
    state.set("rolling", player->rolling);
    state.set("score", player->score);
    state.set("lives", player->lives);
    state.set("kills", player->kills);
    
    return state;
}

emscripten::val GameEngine::getGameState() {
    emscripten::val state = emscripten::val::object();
    state.set("state", static_cast<int>(gameState));
    state.set("score", score);
    state.set("highScore", highScore);
    state.set("wave", waveSystem.getCurrentWave());
    
    return state;
}

emscripten::val GameEngine::getPerformanceMetrics() {
    emscripten::val metrics = emscripten::val::object();
    metrics.set("physicsTime", physicsTime);
    metrics.set("collisionTime", collisionTime);
    metrics.set("collisionChecks", collisionChecks);
    metrics.set("entityCount", static_cast<int>(entities.size()));
    metrics.set("activeEntities", static_cast<int>(
        std::count_if(entities.begin(), entities.end(),
            [](const std::unique_ptr<Entity>& e) { return e && e->active; })
    ));
    
    return metrics;
}

emscripten::val GameEngine::getVisualEffects() {
    emscripten::val effects = emscripten::val::object();
    
    // Screen shake
    Vector2 shake = visualEffects.getScreenShakeOffset();
    effects.set("screenShakeX", shake.x);
    effects.set("screenShakeY", shake.y);
    
    // Particles
    emscripten::val particles = emscripten::val::array();
    int index = 0;
    
    for (const auto& particle : visualEffects.getParticles()) {
        if (particle && particle->active) {
            emscripten::val p = emscripten::val::object();
            p.set("x", particle->position.x);
            p.set("y", particle->position.y);
            p.set("vx", particle->velocity.x);
            p.set("vy", particle->velocity.y);
            p.set("size", particle->getSize());
            p.set("alpha", particle->getAlpha());
            p.set("color", particle->color);
            particles.set(index++, p);
        }
    }
    
    effects.set("particles", particles);
    
    return effects;
}

emscripten::val GameEngine::getWaveInfo() {
    emscripten::val info = emscripten::val::object();
    info.set("currentWave", waveSystem.getCurrentWave());
    info.set("waveActive", waveSystem.isWaveActive());
    info.set("transitionTimer", waveSystem.getWaveTransitionTimer());
    info.set("enemiesRemaining", waveSystem.getEnemiesRemaining());
    info.set("wolvesRemaining", waveSystem.getWolvesRemaining());
    
    return info;
}

// Private methods
Entity* GameEngine::findEntityById(int id) {
    auto it = std::find_if(entities.begin(), entities.end(),
        [id](const std::unique_ptr<Entity>& e) {
            return e && e->id == id;
        });
    
    return (it != entities.end()) ? it->get() : nullptr;
}

void GameEngine::updateEntityTargets() {
    for (auto& entity : entities) {
        if (!entity || !entity->active) continue;
        
        if (entity->type == EntityType::ENEMY || entity->type == EntityType::WOLF) {
            Enemy* enemy = static_cast<Enemy*>(entity.get());
            if (!enemy->target && player && player->active) {
                enemy->setTarget(player);
            }
        }
    }
}

void GameEngine::cleanupInactiveEntities() {
    // Check if player needs to be nullified before removing entities
    for (const auto& entity : entities) {
        if (entity && entity.get() == player && !entity->active) {
            player = nullptr;
        }
    }
    
    entities.erase(
        std::remove_if(entities.begin(), entities.end(),
            [](const std::unique_ptr<Entity>& e) {
                return !e || !e->active;
            }),
        entities.end()
    );
}

bool GameEngine::isBlocking(int playerId) {
    if (player && player->id == playerId) {
        return player->blocking;
    }
    return false;
}

bool GameEngine::isPerfectParryWindow(int playerId) {
    if (player && player->id == playerId) {
        return player->perfectParryWindow;
    }
    return false;
}

// Bindings for JavaScript
using namespace emscripten;

EMSCRIPTEN_BINDINGS(game_engine) {
    class_<GameEngine>("GameEngine")
        .constructor<float, float>()
        .function("createPlayer", &GameEngine::createPlayer)
        .function("createEnemy", &GameEngine::createEnemy)
        .function("createWolf", &GameEngine::createWolf)
        .function("createProjectile", &GameEngine::createProjectile)
        .function("createPowerUp", &GameEngine::createPowerUp)
        .function("createObstacle", &GameEngine::createObstacle)
        .function("createShapedObstacle", &GameEngine::createShapedObstacle)
        .function("removeEntity", &GameEngine::removeEntity)
        .function("updatePlayerInput", &GameEngine::updatePlayerInput)
        .function("playerShoot", &GameEngine::playerShoot)
        .function("activateBoost", &GameEngine::activateBoost)
        .function("deactivateBoost", &GameEngine::deactivateBoost)
        .function("startBlock", &GameEngine::startBlock)
        .function("endBlock", &GameEngine::endBlock)
        .function("performAttack", &GameEngine::performAttack)
        .function("performRoll", &GameEngine::performRoll)
        .function("update", &GameEngine::update)
        .function("startGame", &GameEngine::startGame)
        .function("pauseGame", &GameEngine::pauseGame)
        .function("resumeGame", &GameEngine::resumeGame)
        .function("endGame", &GameEngine::endGame)
        .function("restartGame", &GameEngine::restartGame)
        .function("setWorldBounds", &GameEngine::setWorldBounds)
        .function("generateObstacles", &GameEngine::generateObstacles)
        .function("generateEnhancedObstacles", &GameEngine::generateEnhancedObstacles)
        .function("clearEntities", &GameEngine::clearEntities)
        .function("getEntityPositions", &GameEngine::getEntityPositions)
        .function("getPlayerState", &GameEngine::getPlayerState)
        .function("getGameState", &GameEngine::getGameState)
        .function("getPerformanceMetrics", &GameEngine::getPerformanceMetrics)
        .function("getVisualEffects", &GameEngine::getVisualEffects)
        .function("getWaveInfo", &GameEngine::getWaveInfo)
        .function("isBlocking", &GameEngine::isBlocking)
        .function("isPerfectParryWindow", &GameEngine::isPerfectParryWindow)
        .function("getScore", &GameEngine::getScore)
        .function("getHighScore", &GameEngine::getHighScore);
}