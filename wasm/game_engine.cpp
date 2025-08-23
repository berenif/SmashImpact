// High-performance game engine in WebAssembly
// This module handles physics, collision detection, and entity management

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <cmath>
#include <vector>
#include <memory>
#include <algorithm>
#include <unordered_map>
#include <limits>
#include <emscripten/html5.h>
#include <emscripten/val.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

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
    
    // World configuration - 3x larger than viewport
    constexpr float WORLD_SCALE = 3.0f;
    
    // Shield/Block system configuration
    constexpr float SHIELD_DURATION = 2000.0f;
    constexpr float SHIELD_COOLDOWN = 500.0f;
    constexpr float PERFECT_PARRY_WINDOW = 150.0f; // 150ms window for perfect parry
    constexpr float SHIELD_DAMAGE_REDUCTION = 0.7f; // Normal block reduces damage by 70%
    constexpr float PERFECT_PARRY_DAMAGE_REDUCTION = 1.0f; // Perfect parry negates all damage
    constexpr float PERFECT_PARRY_STUN_DURATION = 1500.0f; // Stun enemy for 1.5 seconds
    constexpr float PERFECT_PARRY_ENERGY_RESTORE = 30.0f;
    
    // Sword attack configuration
    constexpr float SWORD_RANGE = 60.0f;
    constexpr float SWORD_ARC = 1.047f; // 60 degrees in radians (PI/3)
    constexpr float SWORD_DAMAGE = 30.0f;
    constexpr float SWORD_KNOCKBACK = 15.0f;
    constexpr float SWORD_COOLDOWN = 400.0f;
    constexpr float SWORD_ANIMATION_TIME = 200.0f;
    constexpr float SWORD_ENERGY_COST = 10.0f;
    
    // Roll/Dodge configuration
    constexpr float ROLL_DISTANCE = 150.0f;
    constexpr float ROLL_DURATION = 200.0f;  // Reduced from 300.0f for quicker, more responsive rolls
    constexpr float ROLL_COOLDOWN = 800.0f;
    constexpr float ROLL_SPEED_MULTIPLIER = 1.5f;  // Reduced from 2.5f to make roll shorter
    constexpr float ROLL_ENERGY_COST = 15.0f;
    
    // Targeting system configuration
    constexpr float MAX_TARGET_DISTANCE = 400.0f;
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
        if (mag > 0.0001f) {  // Use epsilon for safer comparison
            return Vector2(x / mag, y / mag);
        }
        return Vector2(0, 0);
    }
    
    float dot(const Vector2& other) const {
        return x * other.x + y * other.y;
    }
};

// Camera struct for viewport management
struct Camera {
    float x, y;           // Camera position (top-left corner)
    float width, height;  // Viewport dimensions
    float smoothing;      // Camera smoothing factor
    
    Camera() : x(0), y(0), width(800), height(600), smoothing(0.1f) {}
    Camera(float w, float h) : x(0), y(0), width(w), height(h), smoothing(0.1f) {}
    
    void update(float targetX, float targetY, float worldWidth, float worldHeight) {
        // Target camera position (centered on target)
        float desiredX = targetX - width / 2;
        float desiredY = targetY - height / 2;
        
        // Smooth camera movement
        x += (desiredX - x) * smoothing;
        y += (desiredY - y) * smoothing;
        
        // Clamp camera to world boundaries
        x = std::max(0.0f, std::min(worldWidth - width, x));
        y = std::max(0.0f, std::min(worldHeight - height, y));
    }
    
    // Convert world coordinates to screen coordinates
    Vector2 worldToScreen(float worldX, float worldY) const {
        return Vector2(worldX - x, worldY - y);
    }
    
    // Convert screen coordinates to world coordinates
    Vector2 screenToWorld(float screenX, float screenY) const {
        return Vector2(screenX + x, screenY + y);
    }
    
    // Check if a point is visible on screen
    bool isOnScreen(float worldX, float worldY, float radius = 0) const {
        return worldX + radius >= x && 
               worldX - radius <= x + width &&
               worldY + radius >= y && 
               worldY - radius <= y + height;
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
    
    // Shield system properties
    bool shielding;
    float shieldStartTime;
    float shieldCooldown;
    bool perfectParryWindow;
    float lastPerfectParry;
    float shieldHeldTime;
    float shieldAngle;
    
    // Sword attack properties
    bool swordActive;
    float swordAngle;
    float swordCooldown;
    float swordAnimationTime;
    float lastAttackTime;
    
    // Roll properties
    bool rolling;
    Vector2 rollDirection;
    float rollCooldown;
    float rollStartTime;
    float rollEndTime;
    Vector2 rollStartPosition;  // Add this to track starting position
    float rollDistanceTraveled = 0;  // Add this to track distance traveled
    
    // Player facing direction
    float facing;
    
    Player(int id, float x, float y)
        : Entity(id, EntityType::PLAYER, x, y, Config::PLAYER_RADIUS),
          energy(100), maxEnergy(100), invulnerable(false),
          boostCooldown(0), boosting(false),
          shielding(false), shieldStartTime(0), shieldCooldown(0),
          perfectParryWindow(false), lastPerfectParry(0), shieldHeldTime(0), shieldAngle(0),
          swordActive(false), swordAngle(0), swordCooldown(0), 
          swordAnimationTime(0), lastAttackTime(0),
          rolling(false), rollDirection(0, 0), rollCooldown(0),
          rollStartTime(0), rollEndTime(0), rollStartPosition(x, y), 
          rollDistanceTraveled(0), facing(0) {}
    
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
        // Handle rolling movement
        if (rolling) {
            float currentTime = emscripten_get_now();
            if (currentTime < rollEndTime) {
                // Calculate how far we've traveled
                Vector2 currentPos(position.x, position.y);
                float distanceFromStart = (currentPos - rollStartPosition).magnitude();
                
                // Check if we've reached the maximum roll distance
                if (distanceFromStart < Config::ROLL_DISTANCE) {
                    // Apply roll movement, but scale it based on remaining distance
                    float remainingDistance = Config::ROLL_DISTANCE - distanceFromStart;
                    float rollSpeed = Config::PLAYER_MAX_SPEED * Config::ROLL_SPEED_MULTIPLIER;
                    
                    // If we're close to the max distance, slow down to avoid overshooting
                    if (remainingDistance < rollSpeed * deltaTime) {
                        velocity = rollDirection * (remainingDistance / deltaTime);
                    } else {
                        velocity = rollDirection * rollSpeed;
                    }
                    invulnerable = true;
                } else {
                    // We've reached max distance, end the roll early
                    rolling = false;
                    invulnerable = false;
                    velocity *= 0.5f; // Reduce speed after roll
                }
            } else {
                // End roll due to time limit
                rolling = false;
                invulnerable = false;
                velocity *= 0.5f; // Reduce speed after roll
            }
        } else if (!shielding) {
            // Normal movement update (not while shielding or rolling)
            Entity::update(deltaTime);
        } else {
            // Reduced movement while shielding
            velocity *= 0.7f;
            Entity::update(deltaTime);
        }
        
        // Update cooldowns
        if (boostCooldown > 0) {
            boostCooldown -= deltaTime;
        }
        
        if (shieldCooldown > 0) {
            shieldCooldown -= deltaTime;
        }
        
        if (swordCooldown > 0) {
            swordCooldown -= deltaTime;
        }
        
        if (rollCooldown > 0) {
            rollCooldown -= deltaTime;
        }
        
        if (swordAnimationTime > 0) {
            swordAnimationTime -= deltaTime;
            if (swordAnimationTime <= 0) {
                swordActive = false;
            }
        }
        
        // Update shield state
        if (shielding) {
            shieldHeldTime += deltaTime;
            
            // Check if perfect parry window has expired
            if (perfectParryWindow && shieldHeldTime > Config::PERFECT_PARRY_WINDOW) {
                perfectParryWindow = false;
            }
        }
        
        // Energy regeneration (not while rolling or shielding)
        if (!rolling && !shielding && energy < maxEnergy) {
            energy = std::min(maxEnergy, energy + 0.2f * deltaTime / 16.0f);
        }
    }
    
    void startShield() {
        if (shieldCooldown > 0 || shielding || rolling || swordActive) return;
        
        shielding = true;
        shieldStartTime = emscripten_get_now();
        perfectParryWindow = true;
        shieldHeldTime = 0;
        shieldAngle = facing;
    }
    
    void endShield() {
        if (!shielding) return;
        
        shielding = false;
        perfectParryWindow = false;
        shieldCooldown = Config::SHIELD_COOLDOWN;
    }
    
    bool performSwordAttack() {
        if (swordCooldown > 0 || energy < Config::SWORD_ENERGY_COST || rolling || shielding) {
            return false;
        }
        
        swordActive = true;
        swordAngle = facing;
        swordCooldown = Config::SWORD_COOLDOWN;
        swordAnimationTime = Config::SWORD_ANIMATION_TIME;
        lastAttackTime = emscripten_get_now();
        energy -= Config::SWORD_ENERGY_COST;
        
        return true;
    }
    
    bool performRoll(float dirX, float dirY) {
        if (rollCooldown > 0 || energy < Config::ROLL_ENERGY_COST || shielding || rolling) {
            return false;
        }
        
        // If no direction provided, use facing direction
        if (dirX == 0 && dirY == 0) {
            dirX = std::cos(facing);
            dirY = std::sin(facing);
        }
        
        // Normalize direction
        Vector2 dir(dirX, dirY);
        if (dir.magnitude() > 0) {
            dir = dir.normalized();
        }
        
        rolling = true;
        rollDirection = dir;
        rollCooldown = Config::ROLL_COOLDOWN;
        rollStartTime = emscripten_get_now();
        rollEndTime = rollStartTime + Config::ROLL_DURATION;
        rollStartPosition = Vector2(position.x, position.y);  // Store starting position
        rollDistanceTraveled = 0;  // Reset distance counter
        energy -= Config::ROLL_ENERGY_COST;
        invulnerable = true;
        
        return true;
    }
    
    void updateFacing(float mouseX, float mouseY) {
        float dx = mouseX - position.x;
        float dy = mouseY - position.y;
        facing = std::atan2(dy, dx);
    }
};

// Enemy entity with AI behavior
class Enemy : public Entity {
public:
    float speed;
    float damage;
    Entity* target;
    bool stunned;
    float stunnedUntil;
    
    Enemy(int id, float x, float y, float speed = 2.0f)
        : Entity(id, EntityType::ENEMY, x, y, Config::ENEMY_RADIUS),
          speed(speed), damage(10), target(nullptr), stunned(false), stunnedUntil(0) {}
    
    void update(float deltaTime) override {
        // Check if enemy is stunned
        if (stunned && stunnedUntil > 0) {
            stunnedUntil -= deltaTime;
            if (stunnedUntil <= 0) {
                stunned = false;
            } else {
                // Reduce velocity while stunned
                velocity *= 0.9f;
            }
        } else if (target && target->active && !stunned) {
            // Calculate distance to target
            float distToTarget = distanceTo(*target);
            
            // Define attack range and safe distance
            const float ATTACK_RANGE = 50.0f;  // Distance at which enemy stops moving closer
            const float RETREAT_RANGE = 30.0f; // Distance at which enemy backs away
            
            if (distToTarget < RETREAT_RANGE) {
                // Too close - back away slightly
                Vector2 direction = (position - target->position).normalized();
                velocity = direction * speed * 0.5f;
            } else if (distToTarget > ATTACK_RANGE) {
                // Move towards target if too far
                Vector2 direction = (target->position - position).normalized();
                velocity = direction * speed;
            } else {
                // In attack range - circle around the target
                Vector2 toTarget = target->position - position;
                Vector2 perpendicular(-toTarget.y, toTarget.x);
                perpendicular = perpendicular.normalized();
                
                // Add some movement variation
                float circleDirection = (id % 2 == 0) ? 1.0f : -1.0f;
                velocity = perpendicular * speed * 0.7f * circleDirection;
            }
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
    float viewportWidth;
    float viewportHeight;
    Camera camera;
    
    // Targeting system
    Entity* currentTarget;
    bool targetLockEnabled;
    float targetingDisabledUntil;
    
    // Targeting button state
    struct TargetingButton {
        float x, y, radius;
        bool active;
        bool visible;
        float touchStartTime;
        float disabledUntil;
        int touchId;
        
        TargetingButton() : x(0), y(0), radius(40), active(false), visible(true),
                           touchStartTime(0), disabledUntil(0), touchId(-1) {}
    } targetButton;
    
    // Performance metrics
    float physicsTime;
    float collisionTime;
    int collisionChecks;
    
public:
    GameEngine(float width, float height)
        : player(nullptr), nextEntityId(1), 
          viewportWidth(width), viewportHeight(height),
          worldWidth(width * Config::WORLD_SCALE), worldHeight(height * Config::WORLD_SCALE),
          camera(width, height),
          currentTarget(nullptr), targetLockEnabled(true), targetingDisabledUntil(0),
          physicsTime(0), collisionTime(0), collisionChecks(0) {
        // Initialize targeting button position (top-right for mobile)
        targetButton.x = width - 50;
        targetButton.y = height - 280;
        targetButton.radius = 40;
        targetButton.visible = true;
    }
    
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
    
    void updatePlayerInput(float dx, float dy, float aimX = 0, float aimY = 0) {
        if (player && player->active) {
            player->applyInput(dx, dy, 16.0f); // Assume 60 FPS (16ms per frame)
            if (aimX != 0 || aimY != 0) {
                // Convert screen coordinates to world coordinates for aiming
                Vector2 worldAim = camera.screenToWorld(aimX, aimY);
                player->updateFacing(worldAim.x, worldAim.y);
            }
        }
    }
    
    void update(float deltaTime) {
        auto startTime = emscripten_get_now();
        
        // Update targeting system
        updateTargeting(deltaTime);
        
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
        
        // Update camera to follow player
        if (player && player->active) {
            camera.update(player->position.x, player->position.y, worldWidth, worldHeight);
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
    
    void checkCollisions() {
        // Rebuild spatial grid
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
    }
    
    void handlePerfectParry(Player* player, Enemy* enemy) {
        // Perfect parry successful!
        player->lastPerfectParry = emscripten_get_now();
        
        // Restore energy
        player->energy = std::min(player->maxEnergy, 
                                 player->energy + Config::PERFECT_PARRY_ENERGY_RESTORE);
        
        // Stun the enemy
        enemy->stunned = true;
        enemy->stunnedUntil = Config::PERFECT_PARRY_STUN_DURATION;
        
        // Knockback the enemy
        Vector2 knockback = (enemy->position - player->position).normalized() * 10;
        enemy->velocity = knockback;
        
        // Deal damage to enemy
        enemy->health -= 50; // Perfect parry deals damage to enemy
        if (enemy->health <= 0) {
            enemy->active = false;
        }
    }
    
    void handleCollision(Entity& a, Entity& b) {
        // Player-Enemy collision
        if (a.type == EntityType::PLAYER && b.type == EntityType::ENEMY) {
            Player* p = static_cast<Player*>(&a);
            Enemy* e = static_cast<Enemy*>(&b);
            
            if (!p->invulnerable) {
                float damage = e->damage;
                bool blocked = false;
                
                // Check if player is blocking
                if (p->shielding) {
                    blocked = true;
                    
                    // Check for perfect parry
                    if (p->perfectParryWindow) {
                        // Perfect parry!
                        handlePerfectParry(p, e);
                        damage = 0; // No damage on perfect parry
                        return; // Exit early
                    } else {
                        // Normal block - reduce damage
                        damage *= (1.0f - Config::SHIELD_DAMAGE_REDUCTION);
                    }
                }
                
                // Apply damage (if any)
                if (damage > 0) {
                    p->health -= damage;
                    p->invulnerable = true;
                    
                    // Reduced knockback if blocking
                    float knockbackMultiplier = blocked ? 0.3f : 1.0f;
                    Vector2 knockback = (p->position - e->position).normalized() * 5 * knockbackMultiplier;
                    p->velocity += knockback;
                }
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
                // Get screen coordinates
                Vector2 screenPos = camera.worldToScreen(entity->position.x, entity->position.y);
                
                emscripten::val entityData = emscripten::val::object();
                entityData.set("id", entity->id);
                entityData.set("type", static_cast<int>(entity->type));
                entityData.set("x", entity->position.x);
                entityData.set("y", entity->position.y);
                entityData.set("screenX", screenPos.x);
                entityData.set("screenY", screenPos.y);
                entityData.set("vx", entity->velocity.x);
                entityData.set("vy", entity->velocity.y);
                entityData.set("radius", entity->radius);
                entityData.set("health", entity->health);
                entityData.set("maxHealth", entity->maxHealth);
                entityData.set("isOnScreen", camera.isOnScreen(entity->position.x, entity->position.y, entity->radius));
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
        state.set("blocking", player->shielding);
        state.set("blockCooldown", player->shieldCooldown);
        state.set("perfectParryWindow", player->perfectParryWindow);
        
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
        viewportWidth = width;
        viewportHeight = height;
        worldWidth = width * Config::WORLD_SCALE;
        worldHeight = height * Config::WORLD_SCALE;
        camera.width = width;
        camera.height = height;
    }
    
    // Camera-related methods
    emscripten::val getCameraInfo() {
        emscripten::val info = emscripten::val::object();
        info.set("x", camera.x);
        info.set("y", camera.y);
        info.set("width", camera.width);
        info.set("height", camera.height);
        info.set("worldWidth", worldWidth);
        info.set("worldHeight", worldHeight);
        return info;
    }
    
    emscripten::val worldToScreen(float worldX, float worldY) {
        Vector2 screenPos = camera.worldToScreen(worldX, worldY);
        emscripten::val result = emscripten::val::object();
        result.set("x", screenPos.x);
        result.set("y", screenPos.y);
        return result;
    }
    
    emscripten::val screenToWorld(float screenX, float screenY) {
        Vector2 worldPos = camera.screenToWorld(screenX, screenY);
        emscripten::val result = emscripten::val::object();
        result.set("x", worldPos.x);
        result.set("y", worldPos.y);
        return result;
    }
    
    bool isOnScreen(float worldX, float worldY, float radius) {
        return camera.isOnScreen(worldX, worldY, radius);
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
    
    void startBlock(int playerId) {
        if (player && player->id == playerId) {
            player->startShield();
        }
    }
    
    void endBlock(int playerId) {
        if (player && player->id == playerId) {
            player->endShield();
        }
    }
    
    bool isBlocking(int playerId) {
        if (player && player->id == playerId) {
            return player->shielding;
        }
        return false;
    }
    
    bool isPerfectParryWindow(int playerId) {
        if (player && player->id == playerId) {
            return player->perfectParryWindow;
        }
        return false;
    }
    
    // Get all active entities
    emscripten::val getAllEntities() {
        return getEntityPositions(); // Reuse existing method
    }
    
    // Player boost (same as activateBoost)
    void playerBoost() {
        if (player && player->active) {
            activateBoost(player->id);
        }
    }
    
    // Player special ability (can be customized)
    void playerSpecialAbility() {
        if (player && player->active) {
            // Trigger a special ability - for now, a powerful area attack
            if (player->energy >= 50) {
                player->energy -= 50;
                
                // Create explosion effect around player
                for (auto& entity : entities) {
                    if (entity->active && entity->type == EntityType::ENEMY) {
                        float dist = player->distanceTo(*entity);
                        if (dist < 150) { // Area of effect radius
                            entity->health -= 75; // Heavy damage
                            if (entity->health <= 0) {
                                entity->active = false;
                            }
                            // Knockback
                            Vector2 knockback = (entity->position - player->position).normalized() * 20;
                            entity->velocity = knockback;
                        }
                    }
                }
            }
        }
    }
    
    // Player attack (sword attack)
    void playerAttack() {
        if (player && player->active) {
            bool success = player->performSwordAttack();
            if (success) {
                // Check for enemies in sword range
                for (auto& entity : entities) {
                    if (entity->active && entity->type == EntityType::ENEMY) {
                        float dist = player->distanceTo(*entity);
                        if (dist <= Config::SWORD_RANGE) {
                            // Check if enemy is within sword arc
                            Vector2 toEnemy = entity->position - player->position;
                            float angleToEnemy = std::atan2(toEnemy.y, toEnemy.x);
                            float angleDiff = std::abs(angleToEnemy - player->swordAngle);
                            
                            // Normalize angle difference
                            if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;
                            
                            if (angleDiff <= Config::SWORD_ARC / 2) {
                                // Hit the enemy
                                entity->health -= Config::SWORD_DAMAGE;
                                if (entity->health <= 0) {
                                    entity->active = false;
                                }
                                // Apply knockback
                                Vector2 knockback = toEnemy.normalized() * Config::SWORD_KNOCKBACK;
                                entity->velocity = knockback;
                                
                                // Stun enemy if it's an Enemy type
                                if (Enemy* enemy = dynamic_cast<Enemy*>(entity.get())) {
                                    enemy->stunned = true;
                                    enemy->stunnedUntil = emscripten_get_now() + 500; // 0.5 second stun
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Player roll/dodge
    void playerRoll(float dirX = 0, float dirY = 0) {
        if (player && player->active) {
            // If no direction specified, use current velocity or facing
            if (dirX == 0 && dirY == 0) {
                if (player->velocity.magnitude() > 0.1f) {
                    dirX = player->velocity.x;
                    dirY = player->velocity.y;
                } else {
                    dirX = std::cos(player->facing);
                    dirY = std::sin(player->facing);
                }
            }
            player->performRoll(dirX, dirY);
        }
    }
    
    // Mobile-specific input handlers
    void setJoystickInput(float x, float y) {
        if (player && player->active) {
            player->applyInput(x, y, 16.0f); // Assume 60 FPS
        }
    }
    
    // Get player attack state
    bool isAttacking() {
        if (player && player->active) {
            return player->swordActive;
        }
        return false;
    }
    
    // Get player roll state
    bool isRolling() {
        if (player && player->active) {
            return player->rolling;
        }
        return false;
    }
    
    // Get total entity count
    int getEntityCount() {
        return static_cast<int>(entities.size());
    }
    
    // Clear all entities except player
    void clearEntities() {
        entities.erase(
            std::remove_if(entities.begin(), entities.end(),
                [this](const std::unique_ptr<Entity>& e) { 
                    if (e.get() != player) {
                        entityMap.erase(e->id);
                        return true;
                    }
                    return false;
                }),
            entities.end()
        );
    }
    
    // Create power-up
    int createPowerUp(float x, float y, int type) {
        // PowerUp is a simple entity for now
        auto powerup = std::make_unique<Entity>(nextEntityId++, EntityType::POWERUP, x, y, Config::POWERUP_RADIUS);
        int id = powerup->id;
        entityMap[id] = powerup.get();
        entities.push_back(std::move(powerup));
        return id;
    }
    
    // Create obstacle
    int createObstacle(float x, float y, float radius, bool destructible) {
        auto obstacle = std::make_unique<Entity>(nextEntityId++, EntityType::OBSTACLE, x, y, radius);
        obstacle->health = destructible ? 50 : 999999; // High health for indestructible
        int id = obstacle->id;
        entityMap[id] = obstacle.get();
        entities.push_back(std::move(obstacle));
        return id;
    }
    
    // Targeting system methods
    Entity* findClosestEnemy() {
        if (!player || !player->active) return nullptr;
        
        Entity* closest = nullptr;
        float closestDistance = std::numeric_limits<float>::max();
        
        for (const auto& entity : entities) {
            if (!entity->active) continue;
            if (entity->type != EntityType::ENEMY && entity->type != EntityType::WOLF) continue;
            
            float dist = player->distanceTo(*entity);
            if (dist < closestDistance && dist <= Config::MAX_TARGET_DISTANCE) {
                closestDistance = dist;
                closest = entity.get();
            }
        }
        
        return closest;
    }
    
    void switchToNextTarget() {
        switchTarget(1);  // Use the new bidirectional function
    }
    
    // New bidirectional target switching function
    // direction: -1 for previous target, 1 for next target
    void switchTarget(int direction) {
        std::vector<Entity*> targetableEnemies;
        
        // Collect all targetable enemies within range
        for (const auto& entity : entities) {
            if (!entity->active) continue;
            if (entity->type != EntityType::ENEMY && entity->type != EntityType::WOLF) continue;
            
            float dist = player->distanceTo(*entity);
            if (dist <= Config::MAX_TARGET_DISTANCE) {
                targetableEnemies.push_back(entity.get());
            }
        }
        
        if (targetableEnemies.empty()) {
            currentTarget = nullptr;
            return;
        }
        
        // Sort enemies by angle from player for consistent ordering
        if (player) {
            std::sort(targetableEnemies.begin(), targetableEnemies.end(), 
                [this](Entity* a, Entity* b) {
                    float angleA = std::atan2(a->position.y - player->position.y, 
                                            a->position.x - player->position.x);
                    float angleB = std::atan2(b->position.y - player->position.y, 
                                            b->position.x - player->position.x);
                    return angleA < angleB;
                });
        }
        
        // If no current target or current target is invalid, get closest
        if (!currentTarget || std::find(targetableEnemies.begin(), targetableEnemies.end(), currentTarget) == targetableEnemies.end()) {
            currentTarget = findClosestEnemy();
            return;
        }
        
        // Find current target index and switch based on direction
        auto it = std::find(targetableEnemies.begin(), targetableEnemies.end(), currentTarget);
        if (it != targetableEnemies.end()) {
            size_t currentIndex = std::distance(targetableEnemies.begin(), it);
            size_t targetCount = targetableEnemies.size();
            size_t nextIndex;
            
            if (direction > 0) {
                // Next target
                nextIndex = (currentIndex + 1) % targetCount;
            } else {
                // Previous target
                nextIndex = (currentIndex + targetCount - 1) % targetCount;
            }
            
            currentTarget = targetableEnemies[nextIndex];
        }
    }
    
    void enableTargeting() {
        targetLockEnabled = true;
        targetingDisabledUntil = 0;
    }
    
    void disableTargeting(float duration) {
        targetLockEnabled = false;
        targetingDisabledUntil = emscripten_get_now() + duration * 1000; // Convert to milliseconds
        currentTarget = nullptr;
    }
    
    void updateTargeting(float deltaTime) {
        // Re-enable targeting if disabled period has passed
        if (!targetLockEnabled && targetingDisabledUntil > 0) {
            if (emscripten_get_now() >= targetingDisabledUntil) {
                enableTargeting();
            }
        }
        
        if (!targetLockEnabled) {
            currentTarget = nullptr;
            return;
        }
        
        // Validate current target
        if (currentTarget) {
            if (!currentTarget->active) {
                currentTarget = findClosestEnemy();
            } else {
                float dist = player->distanceTo(*currentTarget);
                if (dist > Config::MAX_TARGET_DISTANCE) {
                    currentTarget = findClosestEnemy();
                }
            }
        } else {
            // Auto-acquire target if none
            currentTarget = findClosestEnemy();
        }
        
        // Update player facing to look at target
        if (currentTarget && player) {
            float dx = currentTarget->position.x - player->position.x;
            float dy = currentTarget->position.y - player->position.y;
            player->facing = std::atan2(dy, dx);
        }
    }
    
    int getCurrentTargetId() {
        if (currentTarget && currentTarget->active) {
            return currentTarget->id;
        }
        return -1;
    }
    
    bool isTargetingEnabled() {
        return targetLockEnabled;
    }
    
    // Handle targeting button touch start
    void onTargetButtonTouchStart(float x, float y, int touchId) {
        // Check if touch is within button bounds
        float dx = x - targetButton.x;
        float dy = y - targetButton.y;
        float distance = std::sqrt(dx * dx + dy * dy);
        
        if (distance <= targetButton.radius && !targetButton.active) {
            targetButton.active = true;
            targetButton.touchId = touchId;
            targetButton.touchStartTime = emscripten_get_now();
        }
    }
    
    // Handle targeting button touch end
    void onTargetButtonTouchEnd(int touchId) {
        if (targetButton.active && targetButton.touchId == touchId) {
            float pressDuration = emscripten_get_now() - targetButton.touchStartTime;
            
            // Check if button is not disabled
            if (emscripten_get_now() >= targetButton.disabledUntil) {
                if (pressDuration < 500) {
                    // Quick press - switch to next target
                    switchToNextTarget();
                } else {
                    // Long press - disable targeting for 2 seconds
                    disableTargeting(2.0f);
                    targetButton.disabledUntil = emscripten_get_now() + 2000;
                }
            }
            
            targetButton.active = false;
            targetButton.touchId = -1;
        }
    }
    
    // Update targeting button position (for resize)
    void setTargetButtonPosition(float x, float y) {
        targetButton.x = x;
        targetButton.y = y;
    }
    
    // Set targeting button visibility
    void setTargetButtonVisible(bool visible) {
        targetButton.visible = visible;
    }
    
    // Get targeting button state for rendering
    emscripten::val getTargetButtonState() {
        emscripten::val state = emscripten::val::object();
        state.set("x", targetButton.x);
        state.set("y", targetButton.y);
        state.set("radius", targetButton.radius);
        state.set("active", targetButton.active);
        state.set("visible", targetButton.visible);
        state.set("disabled", emscripten_get_now() < targetButton.disabledUntil);
        state.set("hasTarget", currentTarget != nullptr && currentTarget->active);
        state.set("targetingEnabled", targetLockEnabled);
        
        // Calculate remaining disable time
        if (emscripten_get_now() < targetButton.disabledUntil) {
            float remainingTime = (targetButton.disabledUntil - emscripten_get_now()) / 1000.0f;
            state.set("disableTimeRemaining", remainingTime);
        } else {
            state.set("disableTimeRemaining", 0.0f);
        }
        
        return state;
    }
    
    // Handle targeting button press (legacy method for compatibility)
    // pressDuration in milliseconds
    // Quick press (<500ms): switch target
    // Long press (>=500ms): disable targeting for 2 seconds
    void handleTargetingButton(float pressDuration) {
        if (pressDuration < 500) {
            // Quick press - switch to next target
            switchToNextTarget();
        } else {
            // Long press - disable targeting for 2 seconds
            disableTargeting(2.0f);
        }
    }
    
    // Player shoot projectile
    void playerShoot(float aimX, float aimY) {
        if (!player || !player->active) return;
        
        // Calculate projectile direction
        Vector2 direction(aimX - player->position.x, aimY - player->position.y);
        direction = direction.normalized();
        
        // Create projectile slightly in front of player
        float spawnDist = player->radius + Config::PROJECTILE_RADIUS + 5;
        float px = player->position.x + direction.x * spawnDist;
        float py = player->position.y + direction.y * spawnDist;
        
        // Projectile velocity
        float projectileSpeed = 500;
        float vx = direction.x * projectileSpeed;
        float vy = direction.y * projectileSpeed;
        
        createProjectile(px, py, vx, vy, 25, player->id);
    }
    
    // Get the count of active entities
    
    // Get all entities as a JavaScript array
    emscripten::val getEntities() {
        emscripten::val result = emscripten::val::array();
        int index = 0;
        
        // Add player first
        if (player && player->active) {
            emscripten::val playerObj = emscripten::val::object();
            playerObj.set("id", player->id);
            playerObj.set("type", "player");
            playerObj.set("x", player->position.x);
            playerObj.set("y", player->position.y);
            playerObj.set("vx", player->velocity.x);
            playerObj.set("vy", player->velocity.y);
            playerObj.set("radius", player->radius);
            playerObj.set("health", player->health);
            playerObj.set("maxHealth", player->maxHealth);
            playerObj.set("energy", player->energy);
            playerObj.set("maxEnergy", player->maxEnergy);
            playerObj.set("facing", player->facing);
            result.set(index++, playerObj);
        }
        
        // Add other entities
        for (const auto& entity : entities) {
            if (!entity->active) continue;
            
            emscripten::val entityObj = emscripten::val::object();
            entityObj.set("id", entity->id);
            
            // Set type string based on EntityType
            std::string typeStr;
            switch(entity->type) {
                case EntityType::ENEMY: typeStr = "enemy"; break;
                case EntityType::WOLF: typeStr = "wolf"; break;
                case EntityType::PROJECTILE: typeStr = "projectile"; break;
                case EntityType::POWERUP: typeStr = "powerup"; break;
                case EntityType::OBSTACLE: typeStr = "obstacle"; break;
                default: typeStr = "unknown"; break;
            }
            entityObj.set("type", typeStr);
            
            entityObj.set("x", entity->position.x);
            entityObj.set("y", entity->position.y);
            entityObj.set("vx", entity->velocity.x);
            entityObj.set("vy", entity->velocity.y);
            entityObj.set("radius", entity->radius);
            entityObj.set("health", entity->health);
            entityObj.set("maxHealth", entity->maxHealth);
            // Speed is entity-type specific
            
            result.set(index++, entityObj);
        }
        
        return result;
    }
};

// Bindings for JavaScript
EMSCRIPTEN_BINDINGS(game_engine) {
    // Export Vector2 as Vec2
    emscripten::class_<Vector2>("Vec2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vector2::x)
        .property("y", &Vector2::y)
        .function("magnitude", &Vector2::magnitude)
        .function("magnitudeSquared", &Vector2::magnitudeSquared)
        .function("normalized", &Vector2::normalized)
        .function("dot", &Vector2::dot);
    
    // Export Entity as GameObject
    emscripten::class_<Entity>("GameObject")
        .property("id", &Entity::id)
        .property("type", &Entity::type)
        .property("position", &Entity::position)
        .property("velocity", &Entity::velocity)
        .property("radius", &Entity::radius)
        .property("health", &Entity::health)
        .property("maxHealth", &Entity::maxHealth)
        .property("active", &Entity::active)
        .function("update", &Entity::update)
        .function("isColliding", &Entity::isColliding)
        .function("distanceTo", &Entity::distanceTo);
    
    // Export SpatialHashGrid as CollisionSystem (simplified)
    emscripten::class_<SpatialHashGrid>("CollisionSystem")
        .constructor<>()
        .function("clear", &SpatialHashGrid::clear)
        .function("insert", &SpatialHashGrid::insert, emscripten::allow_raw_pointers())
        .function("getNearby", &SpatialHashGrid::getNearby, emscripten::allow_raw_pointers());
    
    // Export EntityType enum
    emscripten::enum_<EntityType>("EntityType")
        .value("PLAYER", EntityType::PLAYER)
        .value("ENEMY", EntityType::ENEMY)
        .value("WOLF", EntityType::WOLF)
        .value("PROJECTILE", EntityType::PROJECTILE)
        .value("POWERUP", EntityType::POWERUP)
        .value("OBSTACLE", EntityType::OBSTACLE);
    
    emscripten::class_<GameEngine>("GameEngine")
        .constructor<float, float>()
        .function("createPlayer", &GameEngine::createPlayer)
        .function("createEnemy", &GameEngine::createEnemy)
        .function("createWolf", &GameEngine::createWolf)
        .function("createProjectile", &GameEngine::createProjectile)
        .function("createPowerUp", &GameEngine::createPowerUp)
        .function("createObstacle", &GameEngine::createObstacle)
        .function("removeEntity", &GameEngine::removeEntity)
        .function("updatePlayerInput", &GameEngine::updatePlayerInput)
        .function("update", &GameEngine::update)
        .function("checkCollisions", &GameEngine::checkCollisions)
        .function("getEntityPositions", &GameEngine::getEntityPositions)
        .function("getAllEntities", &GameEngine::getAllEntities)
        .function("getPlayerState", &GameEngine::getPlayerState)
        .function("getPerformanceMetrics", &GameEngine::getPerformanceMetrics)
        .function("setWorldBounds", &GameEngine::setWorldBounds)
        .function("getCameraInfo", &GameEngine::getCameraInfo)
        .function("worldToScreen", &GameEngine::worldToScreen)
        .function("screenToWorld", &GameEngine::screenToWorld)
        .function("isOnScreen", &GameEngine::isOnScreen)
        .function("activateBoost", &GameEngine::activateBoost)
        .function("deactivateBoost", &GameEngine::deactivateBoost)
        .function("playerBoost", &GameEngine::playerBoost)
        .function("playerShoot", &GameEngine::playerShoot)
        .function("playerSpecialAbility", &GameEngine::playerSpecialAbility)
        .function("playerAttack", &GameEngine::playerAttack)
        .function("playerRoll", &GameEngine::playerRoll)
        .function("setJoystickInput", &GameEngine::setJoystickInput)
        .function("isAttacking", &GameEngine::isAttacking)
        .function("isRolling", &GameEngine::isRolling)
        .function("getEntityCount", &GameEngine::getEntityCount)
        .function("clearEntities", &GameEngine::clearEntities)
        .function("startBlock", &GameEngine::startBlock)
        .function("endBlock", &GameEngine::endBlock)
        .function("isBlocking", &GameEngine::isBlocking)
        .function("isPerfectParryWindow", &GameEngine::isPerfectParryWindow)
        .function("switchToNextTarget", &GameEngine::switchToNextTarget)
        .function("switchTarget", &GameEngine::switchTarget)
        .function("enableTargeting", &GameEngine::enableTargeting)
        .function("disableTargeting", &GameEngine::disableTargeting)
        .function("getCurrentTargetId", &GameEngine::getCurrentTargetId)
        .function("isTargetingEnabled", &GameEngine::isTargetingEnabled)
        .function("handleTargetingButton", &GameEngine::handleTargetingButton)
        .function("onTargetButtonTouchStart", &GameEngine::onTargetButtonTouchStart)
        .function("onTargetButtonTouchEnd", &GameEngine::onTargetButtonTouchEnd)
        .function("setTargetButtonPosition", &GameEngine::setTargetButtonPosition)
        .function("setTargetButtonVisible", &GameEngine::setTargetButtonVisible)
        .function("getTargetButtonState", &GameEngine::getTargetButtonState)
        .function("getEntityCount", &GameEngine::getEntityCount)
        .function("getEntities", &GameEngine::getEntities);
}