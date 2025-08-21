#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <vector>
#include <string>
#include <cmath>

using namespace emscripten;

// Simple Vector2 class
struct Vector2 {
    float x, y;
    Vector2(float x = 0, float y = 0) : x(x), y(y) {}
};

// Simple Entity class
class Entity {
public:
    int id;
    Vector2 position;
    Vector2 velocity;
    float radius;
    float health;
    bool active;
    std::string type;
    
    Entity() : id(0), position(0, 0), velocity(0, 0), radius(10), health(100), active(true), type("entity") {}
};

// Simple GameEngine class with minimal functionality
class GameEngine {
private:
    int width;
    int height;
    std::vector<Entity> entities;
    int nextId;
    bool running;
    
public:
    GameEngine(int w, int h) : width(w), height(h), nextId(1), running(false) {
        entities.reserve(100);
    }
    
    ~GameEngine() {}
    
    void init() {
        running = true;
    }
    
    void update(float deltaTime) {
        // Simple physics update
        for (auto& entity : entities) {
            if (entity.active) {
                entity.position.x += entity.velocity.x * deltaTime;
                entity.position.y += entity.velocity.y * deltaTime;
                
                // Simple boundary check
                if (entity.position.x < 0 || entity.position.x > width) {
                    entity.velocity.x *= -1;
                }
                if (entity.position.y < 0 || entity.position.y > height) {
                    entity.velocity.y *= -1;
                }
            }
        }
    }
    
    int addEntity(float x, float y, float vx, float vy, float radius, const std::string& type) {
        Entity entity;
        entity.id = nextId++;
        entity.position = Vector2(x, y);
        entity.velocity = Vector2(vx, vy);
        entity.radius = radius;
        entity.type = type;
        entity.active = true;
        entity.health = 100;
        entities.push_back(entity);
        return entity.id;
    }
    
    void removeEntity(int id) {
        for (auto& entity : entities) {
            if (entity.id == id) {
                entity.active = false;
                break;
            }
        }
    }
    
    void setPlayerInput(float moveX, float moveY, bool shooting, float targetX, float targetY) {
        // Simple input handling
    }
    
    val getGameState() {
        val state = val::object();
        state.set("running", running);
        state.set("entityCount", (int)entities.size());
        
        val entitiesArray = val::array();
        int index = 0;
        for (const auto& entity : entities) {
            if (entity.active) {
                val entityObj = val::object();
                entityObj.set("id", entity.id);
                entityObj.set("x", entity.position.x);
                entityObj.set("y", entity.position.y);
                entityObj.set("vx", entity.velocity.x);
                entityObj.set("vy", entity.velocity.y);
                entityObj.set("radius", entity.radius);
                entityObj.set("health", entity.health);
                entityObj.set("type", entity.type);
                entitiesArray.set(index++, entityObj);
            }
        }
        state.set("entities", entitiesArray);
        
        val particles = val::array();
        state.set("particles", particles);
        
        return state;
    }
    
    val getPerformanceMetrics() {
        val metrics = val::object();
        metrics.set("fps", 60.0f);
        metrics.set("updateTime", 1.0f);
        metrics.set("renderTime", 1.0f);
        metrics.set("entityCount", (int)entities.size());
        return metrics;
    }
    
    void cleanup() {
        entities.clear();
        running = false;
    }
    
    void reset() {
        entities.clear();
        nextId = 1;
        running = true;
    }
    
    void spawnWave(int waveNumber) {
        // Spawn some enemies
        for (int i = 0; i < waveNumber * 2; i++) {
            float angle = (i * 3.14159f * 2) / (waveNumber * 2);
            float x = width/2 + cos(angle) * 300;
            float y = height/2 + sin(angle) * 300;
            addEntity(x, y, cos(angle) * -50, sin(angle) * -50, 15, "enemy");
        }
    }
    
    void applyDamage(int entityId, float damage) {
        for (auto& entity : entities) {
            if (entity.id == entityId) {
                entity.health -= damage;
                if (entity.health <= 0) {
                    entity.active = false;
                }
                break;
            }
        }
    }
    
    void createExplosion(float x, float y, float radius, float damage) {
        // Simple explosion effect
    }
    
    void activatePowerUp(const std::string& type) {
        // Simple power-up activation
    }
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(game_engine) {
    class_<GameEngine>("GameEngine")
        .constructor<int, int>()
        .function("init", &GameEngine::init)
        .function("update", &GameEngine::update)
        .function("addEntity", &GameEngine::addEntity)
        .function("removeEntity", &GameEngine::removeEntity)
        .function("setPlayerInput", &GameEngine::setPlayerInput)
        .function("getGameState", &GameEngine::getGameState)
        .function("getPerformanceMetrics", &GameEngine::getPerformanceMetrics)
        .function("cleanup", &GameEngine::cleanup)
        .function("reset", &GameEngine::reset)
        .function("spawnWave", &GameEngine::spawnWave)
        .function("applyDamage", &GameEngine::applyDamage)
        .function("createExplosion", &GameEngine::createExplosion)
        .function("activatePowerUp", &GameEngine::activatePowerUp);
}