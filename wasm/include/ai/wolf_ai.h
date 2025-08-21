#ifndef WOLF_AI_H
#define WOLF_AI_H

#include <vector>
#include <memory>
#include <cmath>
#include <algorithm>
#include <random>
#include "../entities/entity.h"

namespace AI {

// Forward declarations
class Wolf;
class WolfPack;

// Wolf AI states
enum class WolfState {
    IDLE,
    PATROL,
    INVESTIGATE,
    HUNT,
    FLANK,
    SEARCH
};

// Wolf roles in pack
enum class WolfRole {
    HUNTER,
    FLANKER,
    TRACKER
};

// Sound memory structure
struct SoundMemory {
    Vector2 position;
    float intensity;
    float timestamp;
};

// Cover spot for searching
struct CoverSpot {
    Vector2 position;
    float priority;
};

// Wolf AI class
class WolfAI {
public:
    WolfAI(std::shared_ptr<Wolf> wolf);
    ~WolfAI() = default;

    // Main update function
    void update(float deltaTime, const Entity* player, 
                const std::vector<std::shared_ptr<WolfAI>>& packMembers,
                const std::vector<Entity*>& obstacles);

    // State management
    void setState(WolfState newState);
    WolfState getState() const { return state; }
    
    // Pack coordination
    void setRole(WolfRole newRole) { role = newRole; }
    WolfRole getRole() const { return role; }
    void alertPackMembers(const Vector2& targetPos);
    
    // Getters
    std::shared_ptr<Wolf> getWolf() const { return wolf; }
    float getAlertLevel() const { return alertLevel; }
    const Vector2& getLastSeenPosition() const { return lastSeenPosition; }

private:
    // State handlers
    void handleIdleState(float dt, bool canSeePlayer, const SoundMemory* heardSound, const Entity* player);
    void handlePatrolState(float dt, bool canSeePlayer, const SoundMemory* heardSound, const Entity* player);
    void handleInvestigateState(float dt, bool canSeePlayer, const SoundMemory* heardSound, 
                               const Entity* player, const std::vector<Entity*>& obstacles);
    void handleHuntState(float dt, bool canSeePlayer, const Entity* player, 
                        const std::vector<Entity*>& obstacles);
    void handleFlankState(float dt, bool canSeePlayer, const Entity* player, 
                         const std::vector<Entity*>& obstacles);
    void handleSearchState(float dt, bool canSeePlayer, const SoundMemory* heardSound, 
                          const Entity* player, const std::vector<Entity*>& obstacles);

    // State transitions
    void enterHuntState(const Entity* player);
    void enterInvestigateState(const Vector2& position);
    void enterSearchState();

    // Perception
    bool checkLineOfSight(const Entity* player, const std::vector<Entity*>& obstacles);
    SoundMemory* checkForSounds(const Entity* player);
    void cleanSoundMemory();

    // Movement and pathfinding
    Vector2 calculateInterceptPoint(const Entity* player);
    Vector2 calculateFlankingPosition(const Entity* player);
    void moveTowards(const Vector2& target, float speed, float dt);
    
    // Pack coordination
    void coordinateAttack(const std::vector<std::shared_ptr<WolfAI>>& nearbyPackMembers, 
                          const Entity* player);
    void updatePackAwareness(const std::vector<std::shared_ptr<WolfAI>>& allWolves);
    
    // Utility functions
    float getDistance(const Vector2& a, const Vector2& b) const;
    float normalizeAngle(float angle) const;
    bool lineIntersectsCircle(const Vector2& lineStart, const Vector2& lineEnd,
                             const Vector2& circleCenter, float radius) const;
    Vector2 estimatePlayerVelocity(const Entity* player);
    void generatePatrolPath();
    void checkCoverSpots(const std::vector<Entity*>& obstacles);
    void performAttack(Entity* player);

private:
    // Core references
    std::shared_ptr<Wolf> wolf;
    WolfState state;
    WolfRole role;
    
    // Target tracking
    const Entity* target;
    Vector2 lastSeenPosition;
    float lastSeenTime;
    Vector2 lastPlayerPosition;
    float lastPlayerTime;
    
    // State timers
    float investigateTimer;
    float communicationCooldown;
    
    // Alert and awareness
    float alertLevel; // 0 = unaware, 1 = suspicious, 2 = combat
    std::vector<std::shared_ptr<WolfAI>> packMembers;
    
    // Memory systems
    std::vector<SoundMemory> soundMemory;
    std::vector<CoverSpot> coverSpots;
    static constexpr int MAX_SOUND_MEMORY = 5;
    static constexpr float MEMORY_DURATION = 5.0f;
    
    // Patrol system
    std::vector<Vector2> patrolPath;
    size_t patrolIndex;
    
    // Search pattern
    int searchPattern;
    Vector2 predictedInterceptPoint;
    
    // Behavior parameters
    static constexpr float SIGHT_RANGE = 400.0f;
    static constexpr float HEARING_RANGE = 600.0f;
    static constexpr float ATTACK_RANGE = 50.0f;
    static constexpr float WALK_SPEED = 100.0f;
    static constexpr float RUN_SPEED = 250.0f;
    static constexpr float INVESTIGATE_SPEED = 150.0f;
    static constexpr float COMMUNICATION_RANGE = 500.0f;
    static constexpr float FLANK_DISTANCE = 200.0f;
    static constexpr float INTERCEPT_LOOKAHEAD = 1.5f;
    static constexpr float VISION_CONE_ANGLE = M_PI / 3.0f; // 60 degrees
    
    // Random number generator
    std::mt19937 rng;
    std::uniform_real_distribution<float> randomDist;
};

// Wolf entity class
class Wolf : public Entity {
public:
    Wolf(float x, float y, bool isAlpha = false);
    ~Wolf() = default;
    
    void update(float deltaTime);
    
    bool getIsAlpha() const { return isAlpha; }
    void setRotation(float rot) { rotation = rot; }
    float getRotation() const { return rotation; }
    
    // Combat
    void takeDamage(float damage);
    bool isAlive() const { return health > 0; }
    
    // Public access for AI
    float x() const { return position.x; }
    float y() const { return position.y; }
    float vx() const { return velocity.x; }
    float vy() const { return velocity.y; }
    void setPosition(float px, float py) { position.x = px; position.y = py; }
    void setVelocity(float vx, float vy) { velocity.x = vx; velocity.y = vy; }
    
private:
    bool isAlpha;
};

// Wolf Pack coordinator
class WolfPack {
public:
    WolfPack();
    ~WolfPack() = default;
    
    void addWolf(std::shared_ptr<WolfAI> wolf);
    void removeWolf(std::shared_ptr<WolfAI> wolf);
    void update(float deltaTime, const Entity* player, const std::vector<Entity*>& obstacles);
    
    const std::vector<std::shared_ptr<WolfAI>>& getWolves() const { return wolves; }
    
private:
    std::vector<std::shared_ptr<WolfAI>> wolves;
    void coordinatePack();
    void assignRoles();
};

} // namespace AI

#endif // WOLF_AI_H