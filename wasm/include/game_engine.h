#ifndef GAME_ENGINE_H
#define GAME_ENGINE_H

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <vector>
#include <memory>
#include <algorithm>

#include "config/game_config.h"
#include "math/vector2.h"
#include "entities/entity.h"
#include "entities/player.h"
#include "entities/enemy.h"
#include "entities/wolf.h"
#include "entities/projectile.h"
#include "entities/powerup.h"
#include "entities/obstacle.h"
#include "effects/visual_effects.h"
#include "systems/collision_system.h"
#include "systems/wave_system.h"

class GameEngine {
private:
    // World
    float worldWidth;
    float worldHeight;
    
    // Entities
    std::vector<std::unique_ptr<Entity>> entities;
    Player* player;
    int nextEntityId;
    
    // Systems
    CollisionSystem collisionSystem;
    WaveSystem waveSystem;
    VisualEffects visualEffects;
    
    // Performance metrics
    float physicsTime;
    float collisionTime;
    int collisionChecks;
    
    // Game state
    enum class GameState {
        MENU,
        PLAYING,
        PAUSED,
        GAME_OVER,
        VICTORY
    };
    
    GameState gameState;
    int score;
    int highScore;
    
public:
    GameEngine(float width, float height);
    ~GameEngine();
    
    // Entity management
    int createPlayer(float x, float y);
    int createEnemy(float x, float y);
    int createWolf(float x, float y, bool isAlpha);
    int createProjectile(float x, float y, float dirX, float dirY, float damage, int ownerId);
    int createPowerUp(float x, float y, int type);
    int createObstacle(float x, float y, float radius, bool destructible);
    int createShapedObstacle(float x, float y, int shape, float width, float height, float rotation, bool destructible);
    void removeEntity(int id);
    
    // Player controls
    void updatePlayerInput(float dx, float dy, float aimX, float aimY);
    void playerShoot(float aimX, float aimY);
    void playerBoost();
    void playerSpecialAbility();
    void activateBoost(int playerId);
    void deactivateBoost(int playerId);
    void startBlock(int playerId);
    void endBlock(int playerId);
    void performAttack(int playerId, float angle);
    void performRoll(int playerId, float dirX, float dirY);
    
    // Game loop
    void update(float deltaTime);
    void updatePhysics(float deltaTime);
    void updateAI(float deltaTime);
    void checkCollisions();
    void checkBounds();
    
    // Game state
    void startGame();
    void pauseGame();
    void resumeGame();
    void endGame();
    void restartGame();
    
    // World management
    void setWorldBounds(float width, float height);
    void generateObstacles(int count);
    void generateEnhancedObstacles(int count, bool ensurePlayability = true);
    void clearEntities();
    
    // JavaScript interface
    emscripten::val getEntityPositions();
    emscripten::val getAllEntities();
    emscripten::val getPlayerState();
    emscripten::val getGameState();
    emscripten::val getPerformanceMetrics();
    emscripten::val getVisualEffects();
    emscripten::val getWaveInfo();
    
    // Getters
    bool isBlocking(int playerId);
    bool isPerfectParryWindow(int playerId);
    int getScore() const { return score; }
    int getHighScore() const { return highScore; }
    
private:
    Entity* findEntityById(int id);
    void updateEntityTargets();
    void cleanupInactiveEntities();
};

#endif // GAME_ENGINE_H