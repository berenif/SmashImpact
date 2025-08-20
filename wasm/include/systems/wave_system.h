#ifndef WAVE_SYSTEM_H
#define WAVE_SYSTEM_H

#include "../entities/enemy.h"
#include "../entities/wolf.h"
#include "../entities/powerup.h"
#include "../config/game_config.h"
#include <vector>
#include <memory>
#include <cstdlib>

class WaveSystem {
private:
    int currentWave;
    int enemiesSpawnedThisWave;
    int enemiesRequiredThisWave;
    int wolvesSpawnedThisWave;
    int wolvesRequiredThisWave;
    bool waveActive;
    float waveTransitionTimer;
    float enemySpawnTimer;
    float wolfSpawnTimer;
    float powerUpSpawnTimer;
    
public:
    WaveSystem()
        : currentWave(1),
          enemiesSpawnedThisWave(0),
          enemiesRequiredThisWave(5),
          wolvesSpawnedThisWave(0),
          wolvesRequiredThisWave(0),
          waveActive(true),
          waveTransitionTimer(0),
          enemySpawnTimer(0),
          wolfSpawnTimer(0),
          powerUpSpawnTimer(0) {}
    
    void update(float deltaTime, std::vector<std::unique_ptr<Entity>>& entities,
                float worldWidth, float worldHeight) {
        
        // Update spawn timers
        enemySpawnTimer -= deltaTime;
        wolfSpawnTimer -= deltaTime;
        powerUpSpawnTimer -= deltaTime;
        
        if (waveActive) {
            // Spawn enemies
            if (enemySpawnTimer <= 0 && enemiesSpawnedThisWave < enemiesRequiredThisWave) {
                spawnEnemy(entities, worldWidth, worldHeight);
                enemiesSpawnedThisWave++;
                enemySpawnTimer = Config::ENEMY_SPAWN_RATE / 1000.0f;  // Convert ms to seconds
            }
            
            // Spawn wolves (after wave 3)
            if (currentWave > 3 && wolfSpawnTimer <= 0 && 
                wolvesSpawnedThisWave < wolvesRequiredThisWave) {
                spawnWolf(entities, worldWidth, worldHeight);
                wolvesSpawnedThisWave++;
                wolfSpawnTimer = Config::WOLF_WAVE_SPAWN_DELAY / 1000.0f;  // Convert ms to seconds
            }
            
            // Spawn power-ups
            if (powerUpSpawnTimer <= 0) {
                spawnPowerUp(entities, worldWidth, worldHeight);
                powerUpSpawnTimer = Config::POWERUP_SPAWN_RATE / 1000.0f;  // Convert ms to seconds
            }
            
            // Check if wave is complete
            if (enemiesSpawnedThisWave >= enemiesRequiredThisWave &&
                wolvesSpawnedThisWave >= wolvesRequiredThisWave) {
                
                // Count remaining enemies
                int remainingEnemies = 0;
                for (const auto& entity : entities) {
                    if (entity && entity->active && 
                        (entity->type == EntityType::ENEMY || entity->type == EntityType::WOLF)) {
                        remainingEnemies++;
                    }
                }
                
                if (remainingEnemies == 0) {
                    startNextWave();
                }
            }
        } else {
            // Wave transition
            waveTransitionTimer -= deltaTime;
            if (waveTransitionTimer <= 0) {
                waveActive = true;
            }
        }
    }
    
    void startNextWave() {
        currentWave++;
        waveActive = false;
        waveTransitionTimer = Config::WAVE_TRANSITION_TIME / 1000.0f;  // Convert ms to seconds
        
        // Calculate enemies for next wave
        enemiesRequiredThisWave = 5 + currentWave * 2;
        enemiesSpawnedThisWave = 0;
        
        // Calculate wolves for next wave (after wave 3)
        if (currentWave > 3) {
            wolvesRequiredThisWave = (currentWave - 3) * 2;
            wolvesSpawnedThisWave = 0;
        }
    }
    
    void spawnEnemy(std::vector<std::unique_ptr<Entity>>& entities,
                    float worldWidth, float worldHeight) {
        // Random spawn position at edge of screen
        Vector2 spawnPos = getRandomEdgePosition(worldWidth, worldHeight);
        
        auto enemy = std::make_unique<Enemy>(spawnPos);
        entities.push_back(std::move(enemy));
    }
    
    void spawnWolf(std::vector<std::unique_ptr<Entity>>& entities,
                   float worldWidth, float worldHeight) {
        Vector2 spawnPos = getRandomEdgePosition(worldWidth, worldHeight);
        
        // 20% chance for alpha wolf
        bool isAlpha = (rand() % 100) < 20;
        auto wolf = std::make_unique<Wolf>(spawnPos, isAlpha);
        
        // If alpha, try to form a pack
        if (isAlpha) {
            std::vector<Wolf*> pack;
            pack.push_back(wolf.get());
            
            // Spawn 2-4 additional wolves for the pack
            int packSize = 2 + rand() % 3;
            for (int i = 0; i < packSize; i++) {
                Vector2 packPos = spawnPos;
                packPos.x += (rand() % 100 - 50);
                packPos.y += (rand() % 100 - 50);
                
                auto packWolf = std::make_unique<Wolf>(packPos, false);
                pack.push_back(packWolf.get());
                entities.push_back(std::move(packWolf));
            }
            
            // Set pack for all wolves
            for (auto* w : pack) {
                w->joinPack(pack);
            }
        }
        
        entities.push_back(std::move(wolf));
    }
    
    void spawnPowerUp(std::vector<std::unique_ptr<Entity>>& entities,
                      float worldWidth, float worldHeight) {
        // Count existing power-ups
        int powerUpCount = 0;
        for (const auto& entity : entities) {
            if (entity && entity->active && entity->type == EntityType::POWERUP) {
                powerUpCount++;
            }
        }
        
        if (powerUpCount >= Config::MAX_POWERUPS) return;
        
        // Random position (not at edges)
        Vector2 spawnPos(
            100 + rand() % (int)(worldWidth - 200),
            100 + rand() % (int)(worldHeight - 200)
        );
        
        // Random power-up type
        PowerUpType types[] = {
            PowerUpType::HEALTH,
            PowerUpType::ENERGY,
            PowerUpType::SHIELD,
            PowerUpType::SPEED,
            PowerUpType::DAMAGE,
            PowerUpType::RAPID_FIRE,
            PowerUpType::MULTI_SHOT
        };
        
        PowerUpType type = types[rand() % 7];
        
        auto powerUp = std::make_unique<PowerUp>(spawnPos, type);
        entities.push_back(std::move(powerUp));
    }
    
    Vector2 getRandomEdgePosition(float worldWidth, float worldHeight) {
        int edge = rand() % 4;
        Vector2 pos;
        
        switch (edge) {
            case 0: // Top
                pos.x = rand() % (int)worldWidth;
                pos.y = -50;
                break;
            case 1: // Right
                pos.x = worldWidth + 50;
                pos.y = rand() % (int)worldHeight;
                break;
            case 2: // Bottom
                pos.x = rand() % (int)worldWidth;
                pos.y = worldHeight + 50;
                break;
            case 3: // Left
                pos.x = -50;
                pos.y = rand() % (int)worldHeight;
                break;
        }
        
        return pos;
    }
    
    int getCurrentWave() const { return currentWave; }
    bool isWaveActive() const { return waveActive; }
    float getWaveTransitionTimer() const { return waveTransitionTimer; }
    
    int getEnemiesRemaining() const {
        return enemiesRequiredThisWave - enemiesSpawnedThisWave;
    }
    
    int getWolvesRemaining() const {
        return wolvesRequiredThisWave - wolvesSpawnedThisWave;
    }
};

#endif // WAVE_SYSTEM_H