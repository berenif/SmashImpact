#include "../../include/ai/wolf_ai.h"
#include <chrono>
#include <iostream>

namespace AI {

// Wolf Implementation
Wolf::Wolf(float x, float y, bool isAlpha) 
    : Entity(EntityType::WOLF, Vector2(x, y), 20.0f), isAlpha(isAlpha) {
    maxHealth = isAlpha ? 150.0f : 100.0f;
    health = maxHealth;
}

void Wolf::update(float deltaTime) {
    // Basic entity update
    position.x += velocity.x * deltaTime;
    position.y += velocity.y * deltaTime;
}

void Wolf::takeDamage(float damage) {
    health -= damage;
    if (health < 0) health = 0;
}

// WolfAI Implementation
WolfAI::WolfAI(std::shared_ptr<Wolf> wolf) 
    : wolf(wolf), state(WolfState::IDLE), role(WolfRole::HUNTER),
      target(nullptr), lastSeenTime(0), investigateTimer(0),
      communicationCooldown(0), alertLevel(0), patrolIndex(0),
      searchPattern(0), lastPlayerTime(0),
      rng(std::chrono::steady_clock::now().time_since_epoch().count()),
      randomDist(0.0f, 1.0f) {
    generatePatrolPath();
}

void WolfAI::update(float deltaTime, const Entity* player,
                   const std::vector<std::shared_ptr<WolfAI>>& packMembers,
                   const std::vector<Entity*>& obstacles) {
    // Update cooldowns
    communicationCooldown = std::max(0.0f, communicationCooldown - deltaTime);
    
    // Update pack awareness
    updatePackAwareness(packMembers);
    
    // Perception checks
    bool canSeePlayer = checkLineOfSight(player, obstacles);
    SoundMemory* heardSound = checkForSounds(player);
    
    // State machine
    switch (state) {
        case WolfState::IDLE:
            handleIdleState(deltaTime, canSeePlayer, heardSound, player);
            break;
        case WolfState::PATROL:
            handlePatrolState(deltaTime, canSeePlayer, heardSound, player);
            break;
        case WolfState::INVESTIGATE:
            handleInvestigateState(deltaTime, canSeePlayer, heardSound, player, obstacles);
            break;
        case WolfState::HUNT:
            handleHuntState(deltaTime, canSeePlayer, player, obstacles);
            break;
        case WolfState::FLANK:
            handleFlankState(deltaTime, canSeePlayer, player, obstacles);
            break;
        case WolfState::SEARCH:
            handleSearchState(deltaTime, canSeePlayer, heardSound, player, obstacles);
            break;
    }
    
    // Clean old sound memories
    cleanSoundMemory();
}

void WolfAI::handleIdleState(float dt, bool canSeePlayer, const SoundMemory* heardSound, const Entity* player) {
    if (canSeePlayer) {
        enterHuntState(player);
    } else if (heardSound) {
        enterInvestigateState(heardSound->position);
    } else {
        // Occasionally start patrolling
        if (randomDist(rng) < 0.01f) {
            state = WolfState::PATROL;
            generatePatrolPath();
        }
    }
}

void WolfAI::handlePatrolState(float dt, bool canSeePlayer, const SoundMemory* heardSound, const Entity* player) {
    if (canSeePlayer) {
        enterHuntState(player);
        return;
    }
    
    if (heardSound) {
        enterInvestigateState(heardSound->position);
        return;
    }
    
    // Follow patrol path
    if (!patrolPath.empty()) {
        const Vector2& target = patrolPath[patrolIndex];
        float dx = target.x - wolf->x()();
        float dy = target.y - wolf->y()();
        float dist = std::sqrt(dx * dx + dy * dy);
        
        if (dist < 30.0f) {
            // Reached waypoint
            patrolIndex = (patrolIndex + 1) % patrolPath.size();
        } else {
            // Move towards waypoint
            moveTowards(target, WALK_SPEED, dt);
        }
    }
}

void WolfAI::handleInvestigateState(float dt, bool canSeePlayer, const SoundMemory* heardSound,
                                    const Entity* player, const std::vector<Entity*>& obstacles) {
    if (canSeePlayer) {
        enterHuntState(player);
        return;
    }
    
    // Move cautiously towards investigation point
    float dx = lastSeenPosition.x - wolf->x();
    float dy = lastSeenPosition.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist < 50.0f) {
        // Reached investigation point - start searching
        enterSearchState();
    } else {
        // Move towards point with caution
        moveTowards(lastSeenPosition, INVESTIGATE_SPEED, dt);
        
        // Look around while moving (add some rotation variation)
        wolf->setRotation(wolf->getRotation() + std::sin(lastSeenTime * 0.003f) * 0.5f);
    }
    
    investigateTimer -= dt;
    if (investigateTimer <= 0) {
        state = WolfState::IDLE;
    }
}

void WolfAI::handleHuntState(float dt, bool canSeePlayer, const Entity* player,
                             const std::vector<Entity*>& obstacles) {
    if (!canSeePlayer) {
        // Lost sight - go to last seen position
        auto currentTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
        if (currentTime - lastSeenTime < MEMORY_DURATION * 1000) {
            enterInvestigateState(lastSeenPosition);
        } else {
            enterSearchState();
        }
        return;
    }
    
    // Update last seen position
    lastSeenPosition = Vector2(player->position.x, player->position.y);
    lastSeenTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
    
    // Check if pack members are nearby for coordination
    std::vector<std::shared_ptr<WolfAI>> nearbyPackMembers;
    for (auto& member : packMembers) {
        float dist = getDistance(Vector2(wolf->x(), wolf->y()), Vector2(member->wolf->x(), member->wolf->y()));
        if (dist < COMMUNICATION_RANGE && member->state == WolfState::HUNT) {
            nearbyPackMembers.push_back(member);
        }
    }
    
    // Coordinate attack
    if (!nearbyPackMembers.empty() && communicationCooldown <= 0) {
        coordinateAttack(nearbyPackMembers, player);
    }
    
    // Calculate intercept point instead of chasing directly
    Vector2 interceptPoint = calculateInterceptPoint(player);
    
    float dx = interceptPoint.x - wolf->x();
    float dy = interceptPoint.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist < ATTACK_RANGE) {
        // Attack!
        performAttack(const_cast<Entity*>(player));
    } else {
        // Move towards intercept point
        moveTowards(interceptPoint, RUN_SPEED, dt);
    }
    
    // Alert nearby wolves
    alertPackMembers(Vector2(player->position.x, player->position.y));
}

void WolfAI::handleFlankState(float dt, bool canSeePlayer, const Entity* player,
                              const std::vector<Entity*>& obstacles) {
    if (!target) {
        state = WolfState::HUNT;
        return;
    }
    
    // Calculate flanking position
    Vector2 flankPos = calculateFlankingPosition(player);
    
    float dx = flankPos.x - wolf->x();
    float dy = flankPos.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist < 50.0f) {
        // In position - switch to hunt
        state = WolfState::HUNT;
    } else {
        // Move to flanking position
        moveTowards(flankPos, RUN_SPEED, dt);
    }
}

void WolfAI::handleSearchState(float dt, bool canSeePlayer, const SoundMemory* heardSound,
                               const Entity* player, const std::vector<Entity*>& obstacles) {
    if (canSeePlayer) {
        enterHuntState(player);
        return;
    }
    
    if (heardSound) {
        enterInvestigateState(heardSound->position);
        return;
    }
    
    // Fan out search pattern from last known position
    float searchRadius = 100.0f + searchPattern * 50.0f;
    float searchAngle = (searchPattern * M_PI / 4.0f) + 
                       (std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f * 0.001f);
    
    Vector2 searchPos;
    searchPos.x = lastSeenPosition.x + std::cos(searchAngle) * searchRadius;
    searchPos.y = lastSeenPosition.y + std::sin(searchAngle) * searchRadius;
    
    float dx = searchPos.x - wolf->x();
    float dy = searchPos.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist < 30.0f) {
        // Reached search point
        searchPattern = (searchPattern + 1) % 8;
        
        // Check likely hiding spots
        checkCoverSpots(obstacles);
    } else {
        // Move to search point
        moveTowards(searchPos, INVESTIGATE_SPEED, dt);
    }
    
    // Give up search after some time
    auto currentTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
    if (currentTime - lastSeenTime > MEMORY_DURATION * 2000) {
        state = WolfState::IDLE;
        searchPattern = 0;
    }
}

void WolfAI::enterHuntState(const Entity* player) {
    state = WolfState::HUNT;
    target = player;
    lastSeenPosition = Vector2(player->position.x, player->position.y);
    lastSeenTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
    alertLevel = 2;
    
    // Call for backup
    alertPackMembers(Vector2(player->position.x, player->position.y));
}

void WolfAI::enterInvestigateState(const Vector2& position) {
    state = WolfState::INVESTIGATE;
    lastSeenPosition = position;
    investigateTimer = 3.0f; // 3 seconds
    alertLevel = 1;
}

void WolfAI::enterSearchState() {
    state = WolfState::SEARCH;
    searchPattern = 0;
    alertLevel = 1;
}

bool WolfAI::checkLineOfSight(const Entity* player, const std::vector<Entity*>& obstacles) {
    float dx = player->position.x - wolf->x();
    float dy = player->position.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist > SIGHT_RANGE) return false;
    
    // Check if player is in front of wolf (vision cone)
    float angleToPlayer = std::atan2(dy, dx);
    float angleDiff = std::abs(normalizeAngle(angleToPlayer - wolf->getRotation()));
    if (angleDiff > VISION_CONE_ANGLE / 2.0f) return false;
    
    // Check for obstacles blocking view
    for (const auto& obstacle : obstacles) {
        if (lineIntersectsCircle(Vector2(wolf->x(), wolf->y()), Vector2(player->position.x, player->position.y),
                                Vector2(obstacle->position.x, obstacle->position.y), obstacle->radius)) {
            return false;
        }
    }
    
    return true;
}

SoundMemory* WolfAI::checkForSounds(const Entity* player) {
    // Check if player made noise (moving fast, shooting, etc.)
    float playerSpeed = std::sqrt(player->velocity.x * player->velocity.x + player->velocity.y * player->velocity.y);
    float dist = getDistance(Vector2(wolf->x(), wolf->y()), Vector2(player->position.x, player->position.y));
    
    if (dist < HEARING_RANGE) {
        if (playerSpeed > 150.0f) { // Player is moving fast
            SoundMemory sound;
            sound.position = Vector2(player->position.x, player->position.y);
            sound.intensity = playerSpeed > 200.0f ? 2.0f : 1.0f;
            sound.timestamp = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
            soundMemory.push_back(sound);
            return &soundMemory.back();
        }
    }
    
    return nullptr;
}

Vector2 WolfAI::calculateInterceptPoint(const Entity* player) {
    // Predict where player will be based on current velocity
    if (std::abs(player->velocity.x) < 0.01f && std::abs(player->velocity.y) < 0.01f) {
        return Vector2(player->position.x, player->position.y);
    }
    
    float timeToIntercept = INTERCEPT_LOOKAHEAD;
    Vector2 predictedPos;
    predictedPos.x = player->position.x + player->velocity.x * timeToIntercept;
    predictedPos.y = player->position.y + player->velocity.y * timeToIntercept;
    
    return predictedPos;
}

Vector2 WolfAI::calculateFlankingPosition(const Entity* player) {
    float flankAngle = (role == WolfRole::FLANKER) ? M_PI / 3.0f : -M_PI / 3.0f;
    Vector2 playerVel = estimatePlayerVelocity(player);
    float playerDir = std::atan2(playerVel.y, playerVel.x);
    
    Vector2 flankPos;
    flankPos.x = player->position.x + std::cos(playerDir + flankAngle) * FLANK_DISTANCE;
    flankPos.y = player->position.y + std::sin(playerDir + flankAngle) * FLANK_DISTANCE;
    
    return flankPos;
}

void WolfAI::moveTowards(const Vector2& target, float speed, float dt) {
    float dx = target.x - wolf->x();
    float dy = target.y - wolf->y();
    float dist = std::sqrt(dx * dx + dy * dy);
    
    if (dist > 0.01f) {
        float moveSpeed = speed * dt;
        wolf->x() += (dx / dist) * moveSpeed;
        wolf->y() += (dy / dist) * moveSpeed;
        wolf->vx = (dx / dist) * speed;
        wolf->vy = (dy / dist) * speed;
        wolf->setRotation(std::atan2(dy, dx));
    }
}

void WolfAI::coordinateAttack(const std::vector<std::shared_ptr<WolfAI>>& nearbyPackMembers,
                              const Entity* player) {
    // Assign roles to pack members
    if (role == WolfRole::HUNTER) {
        // I'm the primary hunter, assign flankers
        int flankerCount = 0;
        for (auto& member : nearbyPackMembers) {
            if (flankerCount < 2) {
                member->setRole(WolfRole::FLANKER);
                member->setState(WolfState::FLANK);
                flankerCount++;
            } else {
                member->setRole(WolfRole::HUNTER);
            }
        }
    }
    
    communicationCooldown = 2.0f; // 2 second cooldown
}

void WolfAI::alertPackMembers(const Vector2& targetPos) {
    for (auto& packMember : packMembers) {
        float dist = getDistance(Vector2(wolf->x(), wolf->y()), Vector2(packMember->wolf->x(), packMember->wolf->y()));
        if (dist < COMMUNICATION_RANGE && packMember->state != WolfState::HUNT) {
            packMember->lastSeenPosition = targetPos;
            packMember->lastSeenTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
            packMember->alertLevel = std::max(packMember->alertLevel, 1.0f);
            
            if (dist < COMMUNICATION_RANGE / 2.0f) {
                packMember->setState(WolfState::HUNT);
                packMember->target = target;
            } else {
                packMember->enterInvestigateState(targetPos);
            }
        }
    }
}

void WolfAI::updatePackAwareness(const std::vector<std::shared_ptr<WolfAI>>& allWolves) {
    packMembers.clear();
    for (const auto& w : allWolves) {
        if (w.get() != this) {
            packMembers.push_back(w);
        }
    }
}

void WolfAI::checkCoverSpots(const std::vector<Entity*>& obstacles) {
    coverSpots.clear();
    for (const auto& obstacle : obstacles) {
        float dx = obstacle->position.x - lastSeenPosition.x;
        float dy = obstacle->position.y - lastSeenPosition.y;
        float dist = std::sqrt(dx * dx + dy * dy);
        
        if (dist < 200.0f) {
            // This is a potential hiding spot
            float angle = std::atan2(dy, dx);
            CoverSpot spot;
            spot.position.x = obstacle->position.x + std::cos(angle) * (obstacle->radius + 30.0f);
            spot.position.y = obstacle->position.y + std::sin(angle) * (obstacle->radius + 30.0f);
            spot.priority = 1.0f / dist; // Closer spots have higher priority
            coverSpots.push_back(spot);
        }
    }
}

void WolfAI::performAttack(Entity* player) {
    // Attack logic
    if (player && player->health > 0) {
        player->health -= 10.0f;
    }
}

void WolfAI::cleanSoundMemory() {
    auto currentTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
    soundMemory.erase(
        std::remove_if(soundMemory.begin(), soundMemory.end(),
            [currentTime](const SoundMemory& s) {
                return currentTime - s.timestamp > 5000.0f;
            }),
        soundMemory.end()
    );
    
    // Keep only the most recent sounds
    if (soundMemory.size() > MAX_SOUND_MEMORY) {
        soundMemory.erase(soundMemory.begin(), soundMemory.begin() + (soundMemory.size() - MAX_SOUND_MEMORY));
    }
}

void WolfAI::generatePatrolPath() {
    patrolPath.clear();
    int numPoints = 4 + static_cast<int>(randomDist(rng) * 3);
    float radius = 200.0f + randomDist(rng) * 100.0f;
    
    for (int i = 0; i < numPoints; i++) {
        float angle = (M_PI * 2.0f * i) / numPoints + randomDist(rng) * 0.5f;
        Vector2 point;
        point.x = wolf->x() + std::cos(angle) * radius;
        point.y = wolf->y() + std::sin(angle) * radius;
        patrolPath.push_back(point);
    }
}

Vector2 WolfAI::estimatePlayerVelocity(const Entity* player) {
    auto currentTime = std::chrono::steady_clock::now().time_since_epoch().count() / 1000000.0f;
    
    if (lastPlayerTime == 0) {
        lastPlayerPosition = Vector2(player->position.x, player->position.y);
        lastPlayerTime = currentTime;
        return Vector2(0, 0);
    }
    
    float dt = (currentTime - lastPlayerTime) / 1000.0f;
    if (dt < 0.001f) dt = 0.001f; // Prevent division by zero
    
    Vector2 velocity;
    velocity.x = (player->position.x - lastPlayerPosition.x) / dt;
    velocity.y = (player->position.y - lastPlayerPosition.y) / dt;
    
    lastPlayerPosition = Vector2(player->position.x, player->position.y);
    lastPlayerTime = currentTime;
    
    return velocity;
}

void WolfAI::setState(WolfState newState) {
    state = newState;
}

float WolfAI::getDistance(const Vector2& a, const Vector2& b) const {
    float dx = a.x - b.x;
    float dy = a.y - b.y;
    return std::sqrt(dx * dx + dy * dy);
}

float WolfAI::normalizeAngle(float angle) const {
    while (angle > M_PI) angle -= M_PI * 2.0f;
    while (angle < -M_PI) angle += M_PI * 2.0f;
    return angle;
}

bool WolfAI::lineIntersectsCircle(const Vector2& lineStart, const Vector2& lineEnd,
                                  const Vector2& circleCenter, float radius) const {
    float dx = lineEnd.x - lineStart.x;
    float dy = lineEnd.y - lineStart.y;
    float fx = lineStart.x - circleCenter.x;
    float fy = lineStart.y - circleCenter.y;
    
    float a = dx * dx + dy * dy;
    float b = 2.0f * (fx * dx + fy * dy);
    float c = (fx * fx + fy * fy) - radius * radius;
    
    float discriminant = b * b - 4.0f * a * c;
    if (discriminant < 0) return false;
    
    float t1 = (-b - std::sqrt(discriminant)) / (2.0f * a);
    float t2 = (-b + std::sqrt(discriminant)) / (2.0f * a);
    
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

// WolfPack Implementation
WolfPack::WolfPack() {
}

void WolfPack::addWolf(std::shared_ptr<WolfAI> wolf) {
    wolves.push_back(wolf);
}

void WolfPack::removeWolf(std::shared_ptr<WolfAI> wolf) {
    wolves.erase(std::remove(wolves.begin(), wolves.end(), wolf), wolves.end());
}

void WolfPack::update(float deltaTime, const Entity* player, const std::vector<Entity*>& obstacles) {
    // Update each wolf
    for (auto& wolf : wolves) {
        wolf->update(deltaTime, player, wolves, obstacles);
    }
    
    // Coordinate pack behavior
    coordinatePack();
}

void WolfPack::coordinatePack() {
    // Find wolves in hunt state
    std::vector<std::shared_ptr<WolfAI>> huntingWolves;
    for (auto& wolf : wolves) {
        if (wolf->getState() == WolfState::HUNT) {
            huntingWolves.push_back(wolf);
        }
    }
    
    // If multiple wolves are hunting, assign roles
    if (huntingWolves.size() > 1) {
        assignRoles();
    }
}

void WolfPack::assignRoles() {
    int hunterCount = 0;
    int flankerCount = 0;
    
    for (auto& wolf : wolves) {
        if (wolf->getState() == WolfState::HUNT || wolf->getState() == WolfState::FLANK) {
            if (hunterCount == 0) {
                wolf->setRole(WolfRole::HUNTER);
                hunterCount++;
            } else if (flankerCount < 2) {
                wolf->setRole(WolfRole::FLANKER);
                flankerCount++;
            } else {
                wolf->setRole(WolfRole::TRACKER);
            }
        }
    }
}

} // namespace AI