// Wolf AI Implementation in WebAssembly
// Compile with: emcc wolf_ai_wasm.cpp -O3 -s WASM=1 -s MODULARIZE=1 -s EXPORT_NAME="WolfAIModule" --bind -o wolf_ai.js

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/html5.h>
#include <cmath>
#include <vector>
#include <memory>
#include <algorithm>
#include <random>
#include <chrono>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Vec2 class (matching game engine interface)
class Vec2 {
public:
    float x, y;
    
    Vec2() : x(0), y(0) {}
    Vec2(float x, float y) : x(x), y(y) {}
    
    float magnitude() const {
        return std::sqrt(x * x + y * y);
    }
    
    float magnitudeSquared() const {
        return x * x + y * y;
    }
    
    Vec2 normalized() const {
        float mag = magnitude();
        if (mag > 0) {
            return Vec2(x / mag, y / mag);
        }
        return Vec2(0, 0);
    }
    
    float dot(const Vec2& other) const {
        return x * other.x + y * other.y;
    }
};

// GameObject class (simplified version matching expected interface)
class GameObject {
public:
    int id;
    int type;
    Vec2 position;
    Vec2 velocity;
    float radius;
    float health;
    float maxHealth;
    bool active;
    
    GameObject() : id(0), type(0), radius(10.0f), health(100.0f), maxHealth(100.0f), active(true) {}
    
    void update(float deltaTime) {
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
    }
    
    bool isColliding(const GameObject& other) const {
        float dx = position.x - other.position.x;
        float dy = position.y - other.position.y;
        float distSq = dx * dx + dy * dy;
        float radiusSum = radius + other.radius;
        return distSq < (radiusSum * radiusSum);
    }
    
    float distanceTo(const GameObject& other) const {
        float dx = position.x - other.position.x;
        float dy = position.y - other.position.y;
        return std::sqrt(dx * dx + dy * dy);
    }
};

// CollisionSystem class (simplified version)
class CollisionSystem {
private:
    std::vector<GameObject*> objects;
    
public:
    CollisionSystem() {}
    
    void clear() {
        objects.clear();
    }
    
    void insert(GameObject* obj) {
        if (obj) {
            objects.push_back(obj);
        }
    }
    
    std::vector<GameObject*> getNearby(GameObject* obj, float range) {
        std::vector<GameObject*> nearby;
        if (!obj) return nearby;
        
        for (auto* other : objects) {
            if (other && other != obj) {
                float dist = obj->distanceTo(*other);
                if (dist <= range) {
                    nearby.push_back(other);
                }
            }
        }
        return nearby;
    }
};

// Vector2 class (internal for Wolf AI)
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
    
    float magnitude() const {
        return std::sqrt(x * x + y * y);
    }
    
    Vector2 normalized() const {
        float mag = magnitude();
        if (mag > 0) {
            return Vector2(x / mag, y / mag);
        }
        return Vector2(0, 0);
    }
};

// Wolf AI States
enum class WolfState {
    IDLE = 0,
    PATROL = 1,
    INVESTIGATE = 2,
    HUNT = 3,
    FLANK = 4,
    SEARCH = 5
};

// Wolf AI Class
class WolfAI {
public:
    // Position and movement
    Vector2 position;
    Vector2 velocity;
    float rotation;
    float health;
    float maxHealth;
    bool isAlpha;
    bool active;
    
    // AI State
    WolfState state;
    float alertLevel; // 0 = unaware, 1 = suspicious, 2 = combat
    
    // Perception
    float sightRange;
    float hearingRange;
    float visionConeAngle;
    
    // Memory
    Vector2 lastSeenPosition;
    float lastSeenTime;
    float investigateTimer;
    float memoryDuration;
    
    // Movement speeds
    float walkSpeed;
    float runSpeed;
    float investigateSpeed;
    float currentSpeed;
    
    // Pack coordination
    int packRole; // 0 = hunter, 1 = left flanker, 2 = right flanker
    float communicationCooldown;
    
    // Patrol
    std::vector<Vector2> patrolPath;
    size_t patrolIndex;
    
    // Search pattern
    int searchPattern;
    float searchTimer;
    
    // Combat
    float attackRange;
    float attackCooldown;
    float attackDamage;
    
    // Intercept prediction
    float interceptLookahead;
    
    // Random number generator
    std::mt19937 rng;
    std::uniform_real_distribution<float> randomDist;
    
    WolfAI(float x, float y, bool alpha = false) 
        : position(x, y),
          velocity(0, 0),
          rotation(0),
          isAlpha(alpha),
          active(true),
          state(WolfState::IDLE),
          alertLevel(0),
          sightRange(400.0f),
          hearingRange(600.0f),
          visionConeAngle(2.094f), // 120 degrees
          lastSeenTime(0),
          investigateTimer(0),
          memoryDuration(5000.0f),
          walkSpeed(100.0f),
          runSpeed(alpha ? 300.0f : 250.0f),
          investigateSpeed(150.0f),
          currentSpeed(0),
          packRole(0),
          communicationCooldown(0),
          patrolIndex(0),
          searchPattern(0),
          searchTimer(0),
          attackRange(50.0f),
          attackCooldown(0),
          attackDamage(alpha ? 20.0f : 15.0f),
          interceptLookahead(1.5f),
          rng(std::chrono::steady_clock::now().time_since_epoch().count()),
          randomDist(0.0f, 1.0f) {
        
        health = maxHealth = alpha ? 150.0f : 100.0f;
        generatePatrolPath();
    }
    
    void update(float deltaTime, float playerX, float playerY, float playerVX, float playerVY, bool playerVisible) {
        if (!active || health <= 0) return;
        
        // Update cooldowns
        if (attackCooldown > 0) attackCooldown -= deltaTime;
        if (communicationCooldown > 0) communicationCooldown -= deltaTime;
        if (investigateTimer > 0) investigateTimer -= deltaTime;
        
        // Create player reference for state handlers
        Vector2 playerPos(playerX, playerY);
        Vector2 playerVel(playerVX, playerVY);
        
        // State machine
        switch (state) {
            case WolfState::IDLE:
                handleIdleState(deltaTime, playerPos, playerVel, playerVisible);
                break;
            case WolfState::PATROL:
                handlePatrolState(deltaTime, playerPos, playerVel, playerVisible);
                break;
            case WolfState::INVESTIGATE:
                handleInvestigateState(deltaTime, playerPos, playerVel, playerVisible);
                break;
            case WolfState::HUNT:
                handleHuntState(deltaTime, playerPos, playerVel, playerVisible);
                break;
            case WolfState::FLANK:
                handleFlankState(deltaTime, playerPos, playerVel, playerVisible);
                break;
            case WolfState::SEARCH:
                handleSearchState(deltaTime, playerPos, playerVel, playerVisible);
                break;
        }
        
        // Apply movement
        position = position + (velocity * deltaTime);
    }
    
    // State getters for JavaScript
    int getState() const { return static_cast<int>(state); }
    float getX() const { return position.x; }
    float getY() const { return position.y; }
    float getVX() const { return velocity.x; }
    float getVY() const { return velocity.y; }
    float getRotation() const { return rotation; }
    float getHealth() const { return health; }
    float getAlertLevel() const { return alertLevel; }
    bool getIsAlpha() const { return isAlpha; }
    bool getActive() const { return active; }
    
    // State setters for JavaScript
    void setPosition(float x, float y) { position = Vector2(x, y); }
    void setPackRole(int role) { packRole = role; }
    void takeDamage(float damage) { 
        health -= damage;
        if (health <= 0) {
            health = 0;
            active = false;
        }
    }
    
    // Pack coordination
    void alertPackMember(float targetX, float targetY) {
        if (state != WolfState::HUNT && state != WolfState::FLANK) {
            lastSeenPosition = Vector2(targetX, targetY);
            lastSeenTime = emscripten_get_now();
            alertLevel = 1;
            
            if (alertLevel < 2) {
                enterInvestigateState(lastSeenPosition);
            }
        }
    }
    
    void coordinateFlank(int role) {
        if (state == WolfState::HUNT) {
            packRole = role;
            if (role != 0) {
                state = WolfState::FLANK;
            }
        }
    }
    
private:
    void handleIdleState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        currentSpeed = 0;
        velocity = Vector2(0, 0);
        
        if (playerVisible && checkLineOfSight(playerPos)) {
            enterHuntState(playerPos);
        } else if (checkForSounds(playerPos, playerVel)) {
            enterInvestigateState(playerPos);
        } else if (randomDist(rng) < 0.01f) {
            state = WolfState::PATROL;
            generatePatrolPath();
        }
    }
    
    void handlePatrolState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        if (playerVisible && checkLineOfSight(playerPos)) {
            enterHuntState(playerPos);
            return;
        }
        
        if (checkForSounds(playerPos, playerVel)) {
            enterInvestigateState(playerPos);
            return;
        }
        
        if (!patrolPath.empty()) {
            Vector2 targetPos = patrolPath[patrolIndex];
            Vector2 direction = (targetPos - position).normalized();
            
            if (distanceToPoint(targetPos) < 30.0f) {
                patrolIndex = (patrolIndex + 1) % patrolPath.size();
            } else {
                currentSpeed = walkSpeed;
                velocity = direction * currentSpeed;
                rotation = atan2(direction.y, direction.x);
            }
        }
    }
    
    void handleInvestigateState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        if (playerVisible && checkLineOfSight(playerPos)) {
            enterHuntState(playerPos);
            return;
        }
        
        Vector2 direction = (lastSeenPosition - position).normalized();
        float dist = distanceToPoint(lastSeenPosition);
        
        if (dist < 50.0f) {
            state = WolfState::SEARCH;
            searchPattern = 0;
            searchTimer = 3.0f;
        } else {
            currentSpeed = investigateSpeed;
            velocity = direction * currentSpeed;
            rotation = atan2(direction.y, direction.x);
            
            // Look around while investigating
            rotation += sin(emscripten_get_now() * 0.003f) * 0.5f;
        }
        
        if (investigateTimer <= 0) {
            state = WolfState::IDLE;
        }
    }
    
    void handleHuntState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        if (!playerVisible) {
            if (emscripten_get_now() - lastSeenTime < memoryDuration) {
                enterInvestigateState(lastSeenPosition);
            } else {
                state = WolfState::SEARCH;
            }
            return;
        }
        
        // Update last seen
        lastSeenPosition = playerPos;
        lastSeenTime = emscripten_get_now();
        
        // Calculate intercept point
        Vector2 interceptPoint = calculateInterceptPoint(playerPos, playerVel);
        Vector2 direction = (interceptPoint - position).normalized();
        
        float dist = distanceToPoint(playerPos);
        
        if (dist < attackRange && attackCooldown <= 0) {
            // Attack!
            attackCooldown = 1.0f;
            // Damage is handled by JavaScript
        } else {
            currentSpeed = runSpeed;
            velocity = direction * currentSpeed;
            rotation = atan2(direction.y, direction.x);
        }
    }
    
    void handleFlankState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        // Calculate flanking position based on role
        float flankAngle = (packRole == 1) ? M_PI / 3.0f : -M_PI / 3.0f;
        float playerDir = atan2(playerVel.y, playerVel.x);
        
        Vector2 flankPos;
        flankPos.x = playerPos.x + cos(playerDir + flankAngle) * 200.0f;
        flankPos.y = playerPos.y + sin(playerDir + flankAngle) * 200.0f;
        
        Vector2 direction = (flankPos - position).normalized();
        float dist = distanceToPoint(flankPos);
        
        if (dist < 50.0f) {
            state = WolfState::HUNT;
        } else {
            currentSpeed = runSpeed;
            velocity = direction * currentSpeed;
            rotation = atan2(direction.y, direction.x);
        }
    }
    
    void handleSearchState(float deltaTime, const Vector2& playerPos, const Vector2& playerVel, bool playerVisible) {
        searchTimer -= deltaTime;
        
        if (playerVisible && checkLineOfSight(playerPos)) {
            enterHuntState(playerPos);
            return;
        }
        
        // Fan out search pattern
        float searchRadius = 100.0f + searchPattern * 50.0f;
        float searchAngle = (searchPattern * M_PI / 4.0f) + (emscripten_get_now() * 0.001f);
        
        Vector2 searchPos;
        searchPos.x = lastSeenPosition.x + cos(searchAngle) * searchRadius;
        searchPos.y = lastSeenPosition.y + sin(searchAngle) * searchRadius;
        
        Vector2 direction = (searchPos - position).normalized();
        float dist = distanceToPoint(searchPos);
        
        if (dist < 30.0f) {
            searchPattern = (searchPattern + 1) % 8;
        } else {
            currentSpeed = investigateSpeed;
            velocity = direction * currentSpeed;
            rotation = atan2(direction.y, direction.x);
        }
        
        if (searchTimer <= 0 || (emscripten_get_now() - lastSeenTime > memoryDuration * 2)) {
            state = WolfState::IDLE;
            searchPattern = 0;
        }
    }
    
    void enterHuntState(const Vector2& playerPos) {
        state = WolfState::HUNT;
        alertLevel = 2;
        lastSeenPosition = playerPos;
        lastSeenTime = emscripten_get_now();
    }
    
    void enterInvestigateState(const Vector2& pos) {
        state = WolfState::INVESTIGATE;
        lastSeenPosition = pos;
        investigateTimer = 3.0f;
        alertLevel = 1;
    }
    
    bool checkLineOfSight(const Vector2& targetPos) {
        float dist = distanceToPoint(targetPos);
        if (dist > sightRange) return false;
        
        // Check vision cone
        Vector2 toTarget = (targetPos - position).normalized();
        float angleToTarget = atan2(toTarget.y, toTarget.x);
        float angleDiff = std::abs(normalizeAngle(angleToTarget - rotation));
        
        return angleDiff <= visionConeAngle / 2.0f;
    }
    
    bool checkForSounds(const Vector2& targetPos, const Vector2& targetVel) {
        float dist = distanceToPoint(targetPos);
        if (dist > hearingRange) return false;
        
        float targetSpeed = targetVel.magnitude();
        return targetSpeed > 150.0f;
    }
    
    Vector2 calculateInterceptPoint(const Vector2& targetPos, const Vector2& targetVel) {
        Vector2 predictedPos;
        predictedPos.x = targetPos.x + targetVel.x * interceptLookahead;
        predictedPos.y = targetPos.y + targetVel.y * interceptLookahead;
        return predictedPos;
    }
    
    void generatePatrolPath() {
        patrolPath.clear();
        int numPoints = 4 + static_cast<int>(randomDist(rng) * 3);
        float radius = 200.0f + randomDist(rng) * 100.0f;
        
        for (int i = 0; i < numPoints; i++) {
            float angle = (M_PI * 2.0f * i) / numPoints + randomDist(rng) * 0.5f;
            Vector2 point;
            point.x = position.x + cos(angle) * radius;
            point.y = position.y + sin(angle) * radius;
            patrolPath.push_back(point);
        }
    }
    
    float distanceToPoint(const Vector2& point) {
        float dx = point.x - position.x;
        float dy = point.y - position.y;
        return std::sqrt(dx * dx + dy * dy);
    }
    
    float normalizeAngle(float angle) {
        while (angle > M_PI) angle -= M_PI * 2.0f;
        while (angle < -M_PI) angle += M_PI * 2.0f;
        return angle;
    }
};

// Wolf Pack Manager
class WolfPackManager {
private:
    std::vector<std::unique_ptr<WolfAI>> wolves;
    
public:
    WolfPackManager() {}
    
    int createWolf(float x, float y, bool isAlpha) {
        wolves.push_back(std::make_unique<WolfAI>(x, y, isAlpha));
        return wolves.size() - 1;
    }
    
    void updateWolf(int id, float deltaTime, float playerX, float playerY, float playerVX, float playerVY, bool playerVisible) {
        if (id >= 0 && id < wolves.size() && wolves[id]) {
            wolves[id]->update(deltaTime, playerX, playerY, playerVX, playerVY, playerVisible);
            
            // Coordinate pack behavior
            if (wolves[id]->getState() == static_cast<int>(WolfState::HUNT)) {
                coordinatePack(id, playerX, playerY);
            }
        }
    }
    
    void coordinatePack(int hunterId, float targetX, float targetY) {
        if (hunterId < 0 || hunterId >= wolves.size()) return;
        
        auto& hunter = wolves[hunterId];
        float hunterDist = std::sqrt(
            (hunter->getX() - targetX) * (hunter->getX() - targetX) +
            (hunter->getY() - targetY) * (hunter->getY() - targetY)
        );
        
        int flankerCount = 0;
        
        for (int i = 0; i < wolves.size(); i++) {
            if (i == hunterId || !wolves[i] || !wolves[i]->getActive()) continue;
            
            auto& wolf = wolves[i];
            float dist = std::sqrt(
                (wolf->getX() - hunter->getX()) * (wolf->getX() - hunter->getX()) +
                (wolf->getY() - hunter->getY()) * (wolf->getY() - hunter->getY())
            );
            
            // If close enough to coordinate
            if (dist < 500.0f) {
                wolf->alertPackMember(targetX, targetY);
                
                // Assign flanking roles
                if (flankerCount < 2 && wolf->getState() == static_cast<int>(WolfState::HUNT)) {
                    wolf->coordinateFlank(flankerCount + 1);
                    flankerCount++;
                }
            }
        }
    }
    
    // Getters for JavaScript
    float getWolfX(int id) { 
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getX() : 0;
    }
    
    float getWolfY(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getY() : 0;
    }
    
    float getWolfVX(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getVX() : 0;
    }
    
    float getWolfVY(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getVY() : 0;
    }
    
    float getWolfRotation(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getRotation() : 0;
    }
    
    float getWolfHealth(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getHealth() : 0;
    }
    
    int getWolfState(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getState() : 0;
    }
    
    float getWolfAlertLevel(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getAlertLevel() : 0;
    }
    
    bool getWolfIsAlpha(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getIsAlpha() : false;
    }
    
    bool getWolfActive(int id) {
        return (id >= 0 && id < wolves.size() && wolves[id]) ? wolves[id]->getActive() : false;
    }
    
    void damageWolf(int id, float damage) {
        if (id >= 0 && id < wolves.size() && wolves[id]) {
            wolves[id]->takeDamage(damage);
        }
    }
    
    void clearWolves() {
        wolves.clear();
    }
    
    int getWolfCount() {
        return wolves.size();
    }
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(wolf_ai_module) {
    using namespace emscripten;
    
    // Export Vec2 class
    class_<Vec2>("Vec2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vec2::x)
        .property("y", &Vec2::y)
        .function("magnitude", &Vec2::magnitude)
        .function("magnitudeSquared", &Vec2::magnitudeSquared)
        .function("normalized", &Vec2::normalized)
        .function("dot", &Vec2::dot);
    
    // Export GameObject class
    class_<GameObject>("GameObject")
        .constructor<>()
        .property("id", &GameObject::id)
        .property("type", &GameObject::type)
        .property("position", &GameObject::position)
        .property("velocity", &GameObject::velocity)
        .property("radius", &GameObject::radius)
        .property("health", &GameObject::health)
        .property("maxHealth", &GameObject::maxHealth)
        .property("active", &GameObject::active)
        .function("update", &GameObject::update)
        .function("isColliding", &GameObject::isColliding)
        .function("distanceTo", &GameObject::distanceTo);
    
    // Export CollisionSystem class
    class_<CollisionSystem>("CollisionSystem")
        .constructor<>()
        .function("clear", &CollisionSystem::clear)
        .function("insert", &CollisionSystem::insert, allow_raw_pointers())
        .function("getNearby", &CollisionSystem::getNearby, allow_raw_pointers());
    
    // Export WolfPackManager class
    class_<WolfPackManager>("WolfPackManager")
        .constructor()
        .function("createWolf", &WolfPackManager::createWolf)
        .function("updateWolf", &WolfPackManager::updateWolf)
        .function("getWolfX", &WolfPackManager::getWolfX)
        .function("getWolfY", &WolfPackManager::getWolfY)
        .function("getWolfVX", &WolfPackManager::getWolfVX)
        .function("getWolfVY", &WolfPackManager::getWolfVY)
        .function("getWolfRotation", &WolfPackManager::getWolfRotation)
        .function("getWolfHealth", &WolfPackManager::getWolfHealth)
        .function("getWolfState", &WolfPackManager::getWolfState)
        .function("getWolfAlertLevel", &WolfPackManager::getWolfAlertLevel)
        .function("getWolfIsAlpha", &WolfPackManager::getWolfIsAlpha)
        .function("getWolfActive", &WolfPackManager::getWolfActive)
        .function("damageWolf", &WolfPackManager::damageWolf)
        .function("clearWolves", &WolfPackManager::clearWolves)
        .function("getWolfCount", &WolfPackManager::getWolfCount);
}