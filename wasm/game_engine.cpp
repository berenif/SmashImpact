// High-performance game engine in WebAssembly
// This module handles physics, collision detection, and entity management

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <memory>
#include <algorithm>
#include <unordered_map>

// Constants for game configuration
namespace Config {
    constexpr float PLAYER_RADIUS = 20.0f;
    constexpr float PLAYER_MAX_SPEED = 10.0f;
    constexpr float PLAYER_ACCELERATION = 0.5f;
    constexpr float PLAYER_FRICTION = 0.9f;
    constexpr float ENEMY_RADIUS = 15.0f;
    constexpr float WOLF_RADIUS = 18.0f;
    constexpr float POWERUP_RADIUS = 15.0f;
    constexpr float PROJECTILE_RADIUS = 5.0f;
    constexpr int MAX_ENTITIES = 1000;
}

// Vector2 class for 2D math operations
struct Vector2 {
    float x, y;
    
    Vector2() : x(0), y(0) {}
    Vector2(float x, float y) : x(x), y(y) {}
    
    Vector2 operator+(const Vector2& other) const {
        return Vector2(x + other.x, y + other.y);
    }
    
    Vector2 operator-(const Vector2& other) const {
        return Vector2(x - other.x, y - other.y);
    }
    
    Vector2 operator*(float scalar) const {
        return Vector2(x * scalar, y * scalar);
    }
    
    Vector2& operator+=(const Vector2& other) {
        x += other.x;
        y += other.y;
        return *this;
    }
    
    Vector2& operator*=(float scalar) {
        x *= scalar;
        y *= scalar;
        return *this;
    }
    
    float magnitude() const {
        return std::sqrt(x * x + y * y);
    }
    
    float magnitudeSquared() const {
        return x * x + y * y;
    }
    
    Vector2 normalized() const {
        float mag = magnitude();
        if (mag > 0) {
            return Vector2(x / mag, y / mag);
        }
        return Vector2(0, 0);
    }
    
    float dot(const Vector2& other) const {
        return x * other.x + y * other.y;
    }
};

// Entity types
enum class EntityType {
    PLAYER,
    ENEMY,
    WOLF,
    PROJECTILE,
    POWERUP,
    OBSTACLE
};

// Base entity class
class Entity {
public:
    int id;
    EntityType type;
    Vector2 position;
    Vector2 velocity;
    float radius;
    float health;
    float maxHealth;
    bool active;
    
    Entity(int id, EntityType type, float x, float y, float radius)
        : id(id), type(type), position(x, y), velocity(0, 0),
          radius(radius), health(100), maxHealth(100), active(true) {}
    
    virtual ~Entity() = default;
    
    virtual void update(float deltaTime) {
        position += velocity * deltaTime;
    }
    
    bool isColliding(const Entity& other) const {
        if (!active || !other.active) return false;
        float distSq = (position - other.position).magnitudeSquared();
        float radiusSum = radius + other.radius;
        return distSq < radiusSum * radiusSum;
    }
    
    float distanceTo(const Entity& other) const {
        return (position - other.position).magnitude();
    }
};

// Player entity with special properties
class Player : public Entity {
public:
    float energy;
    float maxEnergy;
    bool invulnerable;
    float boostCooldown;
    bool boosting;
    
    Player(int id, float x, float y)
        : Entity(id, EntityType::PLAYER, x, y, Config::PLAYER_RADIUS),
          energy(100), maxEnergy(100), invulnerable(false),
          boostCooldown(0), boosting(false) {}
    
    void applyInput(float dx, float dy, float deltaTime) {
        Vector2 input(dx, dy);
        
        // Normalize diagonal movement
        if (input.magnitude() > 1) {
            input = input.normalized();
        }
        
        // Apply acceleration
        velocity += input * Config::PLAYER_ACCELERATION;
        
        // Limit speed
        if (velocity.magnitude() > Config::PLAYER_MAX_SPEED) {
            velocity = velocity.normalized() * Config::PLAYER_MAX_SPEED;
        }
        
        // Apply friction
        velocity *= Config::PLAYER_FRICTION;
    }
    
    void update(float deltaTime) override {
        Entity::update(deltaTime);
        
        // Update cooldowns
        if (boostCooldown > 0) {
            boostCooldown -= deltaTime;
        }
        
        // Energy regeneration
        if (energy < maxEnergy) {
            energy = std::min(maxEnergy, energy + 0.1f * deltaTime);
        }
    }
};

// Enemy entity with AI behavior
class Enemy : public Entity {
public:
    float speed;
    float damage;
    Entity* target;
    
    Enemy(int id, float x, float y, float speed = 2.0f)
        : Entity(id, EntityType::ENEMY, x, y, Config::ENEMY_RADIUS),
          speed(speed), damage(10), target(nullptr) {}
    
    void update(float deltaTime) override {
        if (target && target->active) {
            // Simple AI: move towards target
            Vector2 direction = (target->position - position).normalized();
            velocity = direction * speed;
        }
        
        Entity::update(deltaTime);
    }
};

// Wolf entity with pack behavior
class Wolf : public Enemy {
public:
    float alertRadius;
    float attackRadius;
    float attackCooldown;
    std::vector<Wolf*> packMembers;
    
    Wolf(int id, float x, float y)
        : Enemy(id, x, y, 3.0f), alertRadius(150), attackRadius(30),
          attackCooldown(0) {
        type = EntityType::WOLF;
        radius = Config::WOLF_RADIUS;
        health = 75;
        maxHealth = 75;
        damage = 15;
    }
    
    void update(float deltaTime) override {
        if (attackCooldown > 0) {
            attackCooldown -= deltaTime;
        }
        
        if (target && target->active) {
            float dist = distanceTo(*target);
            
            if (dist < attackRadius && attackCooldown <= 0) {
                // Attack
                attackCooldown = 1000; // 1 second cooldown
            } else if (dist < alertRadius) {
                // Pack hunting behavior
                Vector2 direction = (target->position - position).normalized();
                
                // Add pack coordination
                if (!packMembers.empty()) {
                    Vector2 packCenter(0, 0);
                    for (auto* member : packMembers) {
                        if (member != this && member->active) {
                            packCenter += member->position;
                        }
                    }
                    packCenter = packCenter * (1.0f / packMembers.size());
                    
                    // Balance between target and pack cohesion
                    Vector2 packDirection = (packCenter - position).normalized();
                    direction = (direction * 0.7f + packDirection * 0.3f).normalized();
                }
                
                velocity = direction * speed;
            }
        }
        
        Entity::update(deltaTime);
    }
};

// Projectile entity
class Projectile : public Entity {
public:
    float damage;
    float lifetime;
    int ownerId;
    
    Projectile(int id, float x, float y, float vx, float vy, float damage, int ownerId)
        : Entity(id, EntityType::PROJECTILE, x, y, Config::PROJECTILE_RADIUS),
          damage(damage), lifetime(2000), ownerId(ownerId) {
        velocity = Vector2(vx, vy);
    }
    
    void update(float deltaTime) override {
        Entity::update(deltaTime);
        lifetime -= deltaTime;
        if (lifetime <= 0) {
            active = false;
        }
    }
};

// Spatial hash grid for efficient collision detection
class SpatialHashGrid {
private:
    static constexpr int CELL_SIZE = 100;
    std::unordered_map<int, std::vector<Entity*>> grid;
    
    int hashPosition(float x, float y) const {
        int gridX = static_cast<int>(x / CELL_SIZE);
        int gridY = static_cast<int>(y / CELL_SIZE);
        return gridX * 73856093 ^ gridY * 19349663; // Large primes for hashing
    }
    
public:
    void clear() {
        grid.clear();
    }
    
    void insert(Entity* entity) {
        if (!entity->active) return;
        
        // Insert into all cells the entity overlaps
        float minX = entity->position.x - entity->radius;
        float maxX = entity->position.x + entity->radius;
        float minY = entity->position.y - entity->radius;
        float maxY = entity->position.y + entity->radius;
        
        int startX = static_cast<int>(minX / CELL_SIZE);
        int endX = static_cast<int>(maxX / CELL_SIZE);
        int startY = static_cast<int>(minY / CELL_SIZE);
        int endY = static_cast<int>(maxY / CELL_SIZE);
        
        for (int x = startX; x <= endX; x++) {
            for (int y = startY; y <= endY; y++) {
                int hash = x * 73856093 ^ y * 19349663;
                grid[hash].push_back(entity);
            }
        }
    }
    
    std::vector<Entity*> getNearby(Entity* entity) {
        std::vector<Entity*> nearby;
        std::unordered_map<int, bool> checked;
        
        float minX = entity->position.x - entity->radius;
        float maxX = entity->position.x + entity->radius;
        float minY = entity->position.y - entity->radius;
        float maxY = entity->position.y + entity->radius;
        
        int startX = static_cast<int>(minX / CELL_SIZE) - 1;
        int endX = static_cast<int>(maxX / CELL_SIZE) + 1;
        int startY = static_cast<int>(minY / CELL_SIZE) - 1;
        int endY = static_cast<int>(maxY / CELL_SIZE) + 1;
        
        for (int x = startX; x <= endX; x++) {
            for (int y = startY; y <= endY; y++) {
                int hash = x * 73856093 ^ y * 19349663;
                auto it = grid.find(hash);
                if (it != grid.end()) {
                    for (Entity* other : it->second) {
                        if (other != entity && other->active && !checked[other->id]) {
                            nearby.push_back(other);
                            checked[other->id] = true;
                        }
                    }
                }
            }
        }
        
        return nearby;
    }
};

// Main game engine class
class GameEngine {
private:
    std::vector<std::unique_ptr<Entity>> entities;
    std::unordered_map<int, Entity*> entityMap;
    SpatialHashGrid spatialGrid;
    Player* player;
    int nextEntityId;
    float worldWidth;
    float worldHeight;
    
    // Performance metrics
    float physicsTime;
    float collisionTime;
    int collisionChecks;
    
public:
    GameEngine(float width, float height)
        : player(nullptr), nextEntityId(1), worldWidth(width), worldHeight(height),
          physicsTime(0), collisionTime(0), collisionChecks(0) {}
    
    int createPlayer(float x, float y) {
        auto playerEntity = std::make_unique<Player>(nextEntityId++, x, y);
        player = playerEntity.get();
        entityMap[playerEntity->id] = playerEntity.get();
        entities.push_back(std::move(playerEntity));
        return player->id;
    }
    
    int createEnemy(float x, float y, float speed) {
        auto enemy = std::make_unique<Enemy>(nextEntityId++, x, y, speed);
        if (player) {
            enemy->target = player;
        }
        int id = enemy->id;
        entityMap[id] = enemy.get();
        entities.push_back(std::move(enemy));
        return id;
    }
    
    int createWolf(float x, float y) {
        auto wolf = std::make_unique<Wolf>(nextEntityId++, x, y);
        if (player) {
            wolf->target = player;
        }
        int id = wolf->id;
        entityMap[id] = wolf.get();
        entities.push_back(std::move(wolf));
        return id;
    }
    
    int createProjectile(float x, float y, float vx, float vy, float damage, int ownerId) {
        auto projectile = std::make_unique<Projectile>(nextEntityId++, x, y, vx, vy, damage, ownerId);
        int id = projectile->id;
        entityMap[id] = projectile.get();
        entities.push_back(std::move(projectile));
        return id;
    }
    
    void removeEntity(int id) {
        auto it = entityMap.find(id);
        if (it != entityMap.end()) {
            it->second->active = false;
            entityMap.erase(it);
        }
    }
    
    void updatePlayerInput(float dx, float dy, float deltaTime) {
        if (player && player->active) {
            player->applyInput(dx, dy, deltaTime);
        }
    }
    
    void update(float deltaTime) {
        auto startTime = emscripten_get_now();
        
        // Update all entities
        for (auto& entity : entities) {
            if (entity->active) {
                entity->update(deltaTime);
                
                // Keep entities in bounds
                entity->position.x = std::max(entity->radius, 
                    std::min(worldWidth - entity->radius, entity->position.x));
                entity->position.y = std::max(entity->radius, 
                    std::min(worldHeight - entity->radius, entity->position.y));
            }
        }
        
        physicsTime = emscripten_get_now() - startTime;
        
        // Rebuild spatial grid
        startTime = emscripten_get_now();
        spatialGrid.clear();
        for (auto& entity : entities) {
            if (entity->active) {
                spatialGrid.insert(entity.get());
            }
        }
        
        // Check collisions using spatial hashing
        collisionChecks = 0;
        for (auto& entity : entities) {
            if (!entity->active) continue;
            
            auto nearby = spatialGrid.getNearby(entity.get());
            for (Entity* other : nearby) {
                collisionChecks++;
                if (entity->isColliding(*other)) {
                    handleCollision(*entity, *other);
                }
            }
        }
        
        collisionTime = emscripten_get_now() - startTime;
        
        // Clean up inactive entities
        entities.erase(
            std::remove_if(entities.begin(), entities.end(),
                [](const std::unique_ptr<Entity>& e) { return !e->active; }),
            entities.end()
        );
    }
    
    void handleCollision(Entity& a, Entity& b) {
        // Player-Enemy collision
        if (a.type == EntityType::PLAYER && b.type == EntityType::ENEMY) {
            Player* p = static_cast<Player*>(&a);
            Enemy* e = static_cast<Enemy*>(&b);
            
            if (!p->invulnerable) {
                p->health -= e->damage;
                p->invulnerable = true;
                
                // Knockback
                Vector2 knockback = (p->position - e->position).normalized() * 5;
                p->velocity += knockback;
            }
        }
        
        // Projectile-Enemy collision
        if (a.type == EntityType::PROJECTILE && b.type == EntityType::ENEMY) {
            Projectile* proj = static_cast<Projectile*>(&a);
            b.health -= proj->damage;
            proj->active = false;
            
            if (b.health <= 0) {
                b.active = false;
            }
        }
        
        // Enemy-Enemy separation (prevent overlap)
        if (a.type == EntityType::ENEMY && b.type == EntityType::ENEMY) {
            Vector2 separation = (a.position - b.position).normalized();
            float overlap = (a.radius + b.radius) - a.distanceTo(b);
            if (overlap > 0) {
                a.position += separation * (overlap * 0.5f);
                b.position = b.position - (separation * (overlap * 0.5f));
            }
        }
    }
    
    // JavaScript interface methods
    emscripten::val getEntityPositions() {
        emscripten::val result = emscripten::val::array();
        int index = 0;
        
        for (const auto& entity : entities) {
            if (entity->active) {
                emscripten::val entityData = emscripten::val::object();
                entityData.set("id", entity->id);
                entityData.set("type", static_cast<int>(entity->type));
                entityData.set("x", entity->position.x);
                entityData.set("y", entity->position.y);
                entityData.set("vx", entity->velocity.x);
                entityData.set("vy", entity->velocity.y);
                entityData.set("radius", entity->radius);
                entityData.set("health", entity->health);
                entityData.set("maxHealth", entity->maxHealth);
                result.set(index++, entityData);
            }
        }
        
        return result;
    }
    
    emscripten::val getPlayerState() {
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
        
        return state;
    }
    
    emscripten::val getPerformanceMetrics() {
        emscripten::val metrics = emscripten::val::object();
        metrics.set("physicsTime", physicsTime);
        metrics.set("collisionTime", collisionTime);
        metrics.set("collisionChecks", collisionChecks);
        metrics.set("entityCount", static_cast<int>(entities.size()));
        metrics.set("activeEntities", static_cast<int>(
            std::count_if(entities.begin(), entities.end(),
                [](const std::unique_ptr<Entity>& e) { return e->active; })
        ));
        
        return metrics;
    }
    
    void setWorldBounds(float width, float height) {
        worldWidth = width;
        worldHeight = height;
    }
    
    void activateBoost(int playerId) {
        if (player && player->id == playerId && player->boostCooldown <= 0) {
            player->boosting = true;
            player->boostCooldown = 1000; // 1 second cooldown
            player->velocity = player->velocity.normalized() * 15; // Boost speed
        }
    }
    
    void deactivateBoost(int playerId) {
        if (player && player->id == playerId) {
            player->boosting = false;
        }
    }
};

// Bindings for JavaScript
EMSCRIPTEN_BINDINGS(game_engine) {
    emscripten::class_<GameEngine>("GameEngine")
        .constructor<float, float>()
        .function("createPlayer", &GameEngine::createPlayer)
        .function("createEnemy", &GameEngine::createEnemy)
        .function("createWolf", &GameEngine::createWolf)
        .function("createProjectile", &GameEngine::createProjectile)
        .function("removeEntity", &GameEngine::removeEntity)
        .function("updatePlayerInput", &GameEngine::updatePlayerInput)
        .function("update", &GameEngine::update)
        .function("getEntityPositions", &GameEngine::getEntityPositions)
        .function("getPlayerState", &GameEngine::getPlayerState)
        .function("getPerformanceMetrics", &GameEngine::getPerformanceMetrics)
        .function("setWorldBounds", &GameEngine::setWorldBounds)
        .function("activateBoost", &GameEngine::activateBoost)
        .function("deactivateBoost", &GameEngine::deactivateBoost);
}