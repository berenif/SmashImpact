// Enhanced Combat Game Engine in WebAssembly
// Complete implementation of enhanced-combat-game.js in C++

#include <emscripten/emscripten.h>
#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <cmath>
#include <vector>
#include <memory>
#include <algorithm>
#include <unordered_map>
#include <string>
#include <random>
#include <chrono>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

using namespace emscripten;

// Enhanced Configuration matching enhanced-combat-game.js
namespace Config {
    // World settings (3x larger than viewport)
    constexpr float WORLD_SCALE = 3.0f;
    
    // Player settings
    constexpr float PLAYER_RADIUS = 25.0f;
    constexpr float PLAYER_SPEED = 5.0f;
    constexpr float PLAYER_MAX_SPEED = 8.0f;
    constexpr float PLAYER_ACCELERATION = 0.5f;
    constexpr float PLAYER_FRICTION = 0.9f;
    
    // Sword Attack settings
    constexpr float SWORD_RANGE = 60.0f;
    constexpr float SWORD_ARC = M_PI / 3; // 60 degree arc
    constexpr float SWORD_DAMAGE = 30.0f;
    constexpr float SWORD_KNOCKBACK = 15.0f;
    constexpr float SWORD_COOLDOWN = 400.0f;
    constexpr float SWORD_ANIMATION_TIME = 200.0f;
    
    // Shield settings
    constexpr float SHIELD_DURATION = 2000.0f;
    constexpr float SHIELD_COOLDOWN = 500.0f;
    constexpr float PERFECT_PARRY_WINDOW = 150.0f;
    constexpr float SHIELD_DAMAGE_REDUCTION = 0.7f;
    constexpr float PERFECT_PARRY_DAMAGE_REDUCTION = 1.0f;
    constexpr float PERFECT_PARRY_STUN_DURATION = 1500.0f;
    constexpr float PERFECT_PARRY_ENERGY_RESTORE = 30.0f;
    
    // Roll settings - Fixed distance from enhanced-combat-game.js
    constexpr float ROLL_DISTANCE = 10.0f;  // Distance covered during roll (reduced to 10 pixels)
    constexpr float ROLL_DURATION = 300.0f;
    constexpr float ROLL_COOLDOWN = 800.0f;
    constexpr bool ROLL_INVULNERABILITY = true;
    constexpr float ROLL_SPEED_MULTIPLIER = 2.5f;
    constexpr float ROLL_ENERGY_COST = 15.0f;
    
    // Targeting settings
    constexpr float MAX_TARGET_DISTANCE = 400.0f;
    constexpr float TARGET_REVALIDATION_INTERVAL = 100.0f;
    
    // Enemy settings
    constexpr float ENEMY_RADIUS = 18.0f;
    constexpr float ENEMY_SPEED = 2.0f;
    constexpr float ENEMY_SPAWN_RATE = 2000.0f;
    constexpr int MAX_ENEMIES = 15;
    constexpr float ENEMY_HEALTH = 50.0f;
    constexpr float ENEMY_DAMAGE = 15.0f;
    
    // Game settings
    constexpr float INITIAL_LIVES = 100.0f;
    constexpr float INITIAL_ENERGY = 100.0f;
    constexpr float ENERGY_REGEN_RATE = 0.2f;
    constexpr float INVULNERABILITY_DURATION = 1000.0f;
    constexpr int SCORE_PER_KILL = 100;
    constexpr int SCORE_PER_PERFECT_PARRY = 50;
    
    // Visual settings
    constexpr int PARTICLE_LIFETIME = 60;
    constexpr int MAX_PARTICLES = 500;
    constexpr float SCREEN_SHAKE_DURATION = 300.0f;
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
    
    float magnitude() const {
        return std::sqrt(x * x + y * y);
    }
    
    float magnitudeSquared() const {
        return x * x + y * y;
    }
    
    Vector2 normalized() const {
        float mag = magnitude();
        if (mag > 0.0001f) {
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
    float x, y;
    float width, height;
    float smoothing;
    
    Camera() : x(0), y(0), width(800), height(600), smoothing(0.1f) {}
    Camera(float w, float h) : x(0), y(0), width(w), height(h), smoothing(0.1f) {}
    
    void update(float targetX, float targetY, float worldWidth, float worldHeight) {
        float desiredX = targetX - width / 2;
        float desiredY = targetY - height / 2;
        
        x += (desiredX - x) * smoothing;
        y += (desiredY - y) * smoothing;
        
        x = std::max(0.0f, std::min(worldWidth - width, x));
        y = std::max(0.0f, std::min(worldHeight - height, y));
    }
    
    Vector2 worldToScreen(float worldX, float worldY) const {
        return Vector2(worldX - x, worldY - y);
    }
    
    Vector2 screenToWorld(float screenX, float screenY) const {
        return Vector2(screenX + x, screenY + y);
    }
    
    bool isOnScreen(float worldX, float worldY, float radius = 0) const {
        return worldX + radius >= x && 
               worldX - radius <= x + width &&
               worldY + radius >= y && 
               worldY - radius <= y + height;
    }
};

// Base Entity class
class Entity {
public:
    Vector2 position;
    Vector2 velocity;
    float radius;
    float health;
    float maxHealth;
    bool active;
    std::string type;
    
    Entity() : position(0, 0), velocity(0, 0), radius(10), 
               health(100), maxHealth(100), active(true), type("entity") {}
    
    virtual ~Entity() = default;
    
    virtual void update(float deltaTime) {
        position += velocity * deltaTime;
    }
    
    bool collidesWith(const Entity& other) const {
        if (!active || !other.active) return false;
        float dist = (position - other.position).magnitude();
        return dist < (radius + other.radius);
    }
    
    void takeDamage(float damage) {
        health -= damage;
        if (health <= 0) {
            health = 0;
            active = false;
        }
    }
};

// Player class with enhanced combat abilities
class Player : public Entity {
public:
    float energy;
    float maxEnergy;
    float facing;
    
    // Combat state
    bool attacking;
    bool shielding;
    bool rolling;
    bool invulnerable;
    
    // Cooldowns
    float attackCooldown;
    float shieldCooldown;
    float rollCooldown;
    
    // Roll state
    Vector2 rollDirection;
    float rollStartTime;
    float rollEndTime;
    
    // Shield state
    float shieldStartTime;
    bool perfectParryWindow;
    
    // Attack state
    float attackStartTime;
    float attackAngle;
    
    Player() : Entity() {
        type = "player";
        radius = Config::PLAYER_RADIUS;
        health = Config::INITIAL_LIVES;
        maxHealth = Config::INITIAL_LIVES;
        energy = Config::INITIAL_ENERGY;
        maxEnergy = Config::INITIAL_ENERGY;
        facing = 0;
        
        attacking = false;
        shielding = false;
        rolling = false;
        invulnerable = false;
        
        attackCooldown = 0;
        shieldCooldown = 0;
        rollCooldown = 0;
        
        rollStartTime = 0;
        rollEndTime = 0;
        shieldStartTime = 0;
        perfectParryWindow = false;
        attackStartTime = 0;
        attackAngle = 0;
    }
    
    void update(float deltaTime) override {
        // Update cooldowns
        if (attackCooldown > 0) attackCooldown -= deltaTime;
        if (shieldCooldown > 0) shieldCooldown -= deltaTime;
        if (rollCooldown > 0) rollCooldown -= deltaTime;
        
        // Regenerate energy
        if (energy < maxEnergy && !rolling && !attacking) {
            energy = std::min(maxEnergy, energy + Config::ENERGY_REGEN_RATE * deltaTime);
        }
        
        // Handle rolling
        if (rolling) {
            float currentTime = emscripten_get_now();
            float rollProgress = (currentTime - rollStartTime) / Config::ROLL_DURATION;
            
            if (rollProgress < 1.0f) {
                float rollSpeed = (Config::ROLL_DISTANCE / Config::ROLL_DURATION) * 1000;
                velocity = rollDirection * rollSpeed;
                invulnerable = Config::ROLL_INVULNERABILITY;
            } else {
                rolling = false;
                invulnerable = false;
                velocity *= 0.5f;
            }
        } else if (!shielding) {
            // Apply friction when not rolling or shielding
            velocity *= Config::PLAYER_FRICTION;
        }
        
        // Update position
        Entity::update(deltaTime);
        
        // Check shield state
        if (shielding) {
            float currentTime = emscripten_get_now();
            if (currentTime - shieldStartTime > Config::PERFECT_PARRY_WINDOW) {
                perfectParryWindow = false;
            }
        }
    }
    
    bool performAttack(float angle) {
        if (attacking || attackCooldown > 0 || shielding) return false;
        
        attacking = true;
        attackAngle = angle;
        attackCooldown = Config::SWORD_COOLDOWN;
        attackStartTime = emscripten_get_now();
        
        return true;
    }
    
    bool startShield() {
        if (shielding || shieldCooldown > 0 || rolling) return false;
        
        shielding = true;
        shieldStartTime = emscripten_get_now();
        perfectParryWindow = true;
        velocity *= 0.5f; // Slow down while shielding
        
        return true;
    }
    
    void endShield() {
        shielding = false;
        perfectParryWindow = false;
        shieldCooldown = Config::SHIELD_COOLDOWN;
    }
    
    bool performRoll(float dirX, float dirY) {
        if (rolling || rollCooldown > 0 || shielding || energy < Config::ROLL_ENERGY_COST) {
            return false;
        }
        
        Vector2 direction(dirX, dirY);
        if (direction.magnitude() < 0.1f) {
            // Roll in facing direction if no input
            direction = Vector2(std::cos(facing), std::sin(facing));
        } else {
            direction = direction.normalized();
        }
        
        rolling = true;
        rollDirection = direction;
        rollCooldown = Config::ROLL_COOLDOWN;
        rollStartTime = emscripten_get_now();
        rollEndTime = rollStartTime + Config::ROLL_DURATION;
        energy -= Config::ROLL_ENERGY_COST;
        invulnerable = Config::ROLL_INVULNERABILITY;
        
        return true;
    }
};

// Enemy class
class Enemy : public Entity {
public:
    float speed;
    float damage;
    bool stunned;
    float stunEndTime;
    
    Enemy(float x, float y) : Entity() {
        type = "enemy";
        position = Vector2(x, y);
        radius = Config::ENEMY_RADIUS;
        health = Config::ENEMY_HEALTH;
        maxHealth = Config::ENEMY_HEALTH;
        speed = Config::ENEMY_SPEED;
        damage = Config::ENEMY_DAMAGE;
        stunned = false;
        stunEndTime = 0;
    }
    
    void update(float deltaTime) override {
        if (stunned) {
            float currentTime = emscripten_get_now();
            if (currentTime >= stunEndTime) {
                stunned = false;
            } else {
                velocity *= 0.95f; // Slow down while stunned
            }
        }
        
        Entity::update(deltaTime);
    }
    
    void stun(float duration) {
        stunned = true;
        stunEndTime = emscripten_get_now() + duration;
    }
};

// Particle for visual effects
struct Particle {
    Vector2 position;
    Vector2 velocity;
    float lifetime;
    float maxLifetime;
    std::string color;
    float size;
    bool active;
    
    Particle() : position(0, 0), velocity(0, 0), lifetime(0), 
                 maxLifetime(Config::PARTICLE_LIFETIME), 
                 color("#ffffff"), size(2), active(false) {}
    
    void update(float deltaTime) {
        if (!active) return;
        
        position += velocity * deltaTime;
        lifetime -= deltaTime;
        
        if (lifetime <= 0) {
            active = false;
        }
    }
};

// Main Enhanced Combat Game Engine
class EnhancedCombatEngine {
private:
    // Game state
    std::string state;
    int score;
    float deltaTime;
    float lastTime;
    
    // World dimensions
    float worldWidth;
    float worldHeight;
    
    // Camera
    Camera camera;
    
    // Entities
    std::unique_ptr<Player> player;
    std::vector<std::unique_ptr<Enemy>> enemies;
    std::vector<Particle> particles;
    
    // Input state
    struct InputState {
        bool keys[256];
        float mouseX;
        float mouseY;
        float mouseAngle;
    } input;
    
    // Targeting
    Enemy* targetedEnemy;
    float lastTargetRevalidation;
    
    // Screen shake
    struct ScreenShake {
        float x, y;
        float intensity;
        float duration;
    } screenShake;
    
    // Random number generator
    std::mt19937 rng;
    std::uniform_real_distribution<float> randomFloat;
    
public:
    EnhancedCombatEngine() : 
        state("menu"), 
        score(0), 
        deltaTime(0), 
        lastTime(emscripten_get_now()),
        worldWidth(800 * Config::WORLD_SCALE),
        worldHeight(600 * Config::WORLD_SCALE),
        camera(800, 600),
        targetedEnemy(nullptr),
        lastTargetRevalidation(0),
        rng(std::chrono::steady_clock::now().time_since_epoch().count()),
        randomFloat(0.0f, 1.0f) {
        
        screenShake = {0, 0, 0, 0};
        std::memset(&input, 0, sizeof(input));
        
        // Reserve space for particles
        particles.reserve(Config::MAX_PARTICLES);
        for (int i = 0; i < Config::MAX_PARTICLES; ++i) {
            particles.emplace_back();
        }
    }
    
    void init(float canvasWidth, float canvasHeight) {
        // Set world dimensions
        worldWidth = canvasWidth * Config::WORLD_SCALE;
        worldHeight = canvasHeight * Config::WORLD_SCALE;
        
        // Initialize camera
        camera = Camera(canvasWidth, canvasHeight);
        
        // Initialize player
        player = std::make_unique<Player>();
        player->position = Vector2(worldWidth / 2, worldHeight / 2);
        
        // Clear enemies
        enemies.clear();
        
        // Start game
        state = "playing";
        score = 0;
    }
    
    void update() {
        float currentTime = emscripten_get_now();
        deltaTime = (currentTime - lastTime) / 1000.0f;
        lastTime = currentTime;
        
        if (state != "playing") return;
        
        // Update player
        if (player) {
            handlePlayerInput();
            player->update(deltaTime);
            
            // Keep player in bounds
            player->position.x = std::max(player->radius, 
                std::min(worldWidth - player->radius, player->position.x));
            player->position.y = std::max(player->radius, 
                std::min(worldHeight - player->radius, player->position.y));
            
            // Update camera to follow player
            camera.update(player->position.x, player->position.y, worldWidth, worldHeight);
        }
        
        // Update enemies
        for (auto& enemy : enemies) {
            if (enemy && enemy->active) {
                updateEnemyAI(enemy.get());
                enemy->update(deltaTime);
            }
        }
        
        // Handle combat
        handleCombat();
        
        // Update particles
        for (auto& particle : particles) {
            if (particle.active) {
                particle.update(deltaTime);
            }
        }
        
        // Update screen shake
        if (screenShake.duration > 0) {
            screenShake.duration -= deltaTime;
            if (screenShake.duration <= 0) {
                screenShake.x = 0;
                screenShake.y = 0;
                screenShake.intensity = 0;
            } else {
                screenShake.x = (randomFloat(rng) - 0.5f) * 2 * screenShake.intensity;
                screenShake.y = (randomFloat(rng) - 0.5f) * 2 * screenShake.intensity;
            }
        }
        
        // Spawn enemies
        spawnEnemies();
        
        // Remove inactive enemies
        enemies.erase(
            std::remove_if(enemies.begin(), enemies.end(),
                [](const std::unique_ptr<Enemy>& e) { return !e || !e->active; }),
            enemies.end()
        );
        
        // Check game over
        if (player && player->health <= 0) {
            state = "gameover";
        }
    }
    
    void handlePlayerInput() {
        if (!player) return;
        
        // Movement
        if (!player->rolling && !player->shielding) {
            Vector2 movement(0, 0);
            
            if (input.keys['W'] || input.keys['w']) movement.y -= 1;
            if (input.keys['S'] || input.keys['s']) movement.y += 1;
            if (input.keys['A'] || input.keys['a']) movement.x -= 1;
            if (input.keys['D'] || input.keys['d']) movement.x += 1;
            
            if (movement.magnitude() > 0) {
                movement = movement.normalized();
                player->velocity += movement * Config::PLAYER_ACCELERATION;
                
                // Limit speed
                if (player->velocity.magnitude() > Config::PLAYER_MAX_SPEED) {
                    player->velocity = player->velocity.normalized() * Config::PLAYER_MAX_SPEED;
                }
            }
        }
        
        // Update facing direction based on mouse
        player->facing = input.mouseAngle;
    }
    
    void updateEnemyAI(Enemy* enemy) {
        if (!enemy || !player || enemy->stunned) return;
        
        Vector2 toPlayer = player->position - enemy->position;
        float distance = toPlayer.magnitude();
        
        if (distance > 0) {
            Vector2 direction = toPlayer.normalized();
            enemy->velocity = direction * enemy->speed;
        }
    }
    
    void handleCombat() {
        if (!player) return;
        
        // Check player attack
        if (player->attacking) {
            float currentTime = emscripten_get_now();
            if (currentTime - player->attackStartTime <= Config::SWORD_ANIMATION_TIME) {
                // Check enemies in sword range
                for (auto& enemy : enemies) {
                    if (enemy && enemy->active && !enemy->stunned) {
                        Vector2 toEnemy = enemy->position - player->position;
                        float distance = toEnemy.magnitude();
                        
                        if (distance <= Config::SWORD_RANGE + enemy->radius) {
                            // Check if enemy is within sword arc
                            float angleToEnemy = std::atan2(toEnemy.y, toEnemy.x);
                            float angleDiff = std::abs(angleToEnemy - player->attackAngle);
                            
                            // Normalize angle difference
                            if (angleDiff > M_PI) angleDiff = 2 * M_PI - angleDiff;
                            
                            if (angleDiff <= Config::SWORD_ARC / 2) {
                                // Hit enemy
                                enemy->takeDamage(Config::SWORD_DAMAGE);
                                
                                // Apply knockback
                                Vector2 knockback = toEnemy.normalized() * Config::SWORD_KNOCKBACK;
                                enemy->velocity += knockback;
                                
                                // Create hit effect
                                createHitEffect(enemy->position.x, enemy->position.y);
                                
                                // Add score if killed
                                if (!enemy->active) {
                                    score += Config::SCORE_PER_KILL;
                                    createDeathEffect(enemy->position.x, enemy->position.y);
                                }
                                
                                // Screen shake on hit
                                addScreenShake(5.0f, 100.0f);
                            }
                        }
                    }
                }
            } else {
                player->attacking = false;
            }
        }
        
        // Check enemy collisions with player
        for (auto& enemy : enemies) {
            if (enemy && enemy->active && !enemy->stunned) {
                if (player->collidesWith(*enemy)) {
                    if (!player->invulnerable) {
                        float damage = enemy->damage;
                        
                        if (player->shielding) {
                            if (player->perfectParryWindow) {
                                // Perfect parry
                                damage = 0;
                                enemy->stun(Config::PERFECT_PARRY_STUN_DURATION);
                                player->energy = std::min(player->maxEnergy, 
                                    player->energy + Config::PERFECT_PARRY_ENERGY_RESTORE);
                                score += Config::SCORE_PER_PERFECT_PARRY;
                                createParryEffect(player->position.x, player->position.y);
                            } else {
                                // Normal block
                                damage *= (1.0f - Config::SHIELD_DAMAGE_REDUCTION);
                            }
                        }
                        
                        if (damage > 0) {
                            player->takeDamage(damage);
                            addScreenShake(10.0f, 200.0f);
                        }
                    }
                    
                    // Push enemy away
                    Vector2 pushDir = (enemy->position - player->position).normalized();
                    enemy->velocity += pushDir * 10.0f;
                }
            }
        }
    }
    
    void spawnEnemies() {
        static float lastSpawnTime = 0;
        float currentTime = emscripten_get_now();
        
        if (currentTime - lastSpawnTime > Config::ENEMY_SPAWN_RATE && 
            enemies.size() < Config::MAX_ENEMIES) {
            
            // Random spawn position at edge of world
            float x, y;
            if (randomFloat(rng) < 0.5f) {
                x = randomFloat(rng) < 0.5f ? 0 : worldWidth;
                y = randomFloat(rng) * worldHeight;
            } else {
                x = randomFloat(rng) * worldWidth;
                y = randomFloat(rng) < 0.5f ? 0 : worldHeight;
            }
            
            enemies.push_back(std::make_unique<Enemy>(x, y));
            lastSpawnTime = currentTime;
        }
    }
    
    void createHitEffect(float x, float y) {
        for (int i = 0; i < 5; ++i) {
            Particle* p = getInactiveParticle();
            if (p) {
                p->position = Vector2(x, y);
                p->velocity = Vector2(
                    (randomFloat(rng) - 0.5f) * 100,
                    (randomFloat(rng) - 0.5f) * 100
                );
                p->lifetime = p->maxLifetime;
                p->color = "#ff4444";
                p->size = 3;
                p->active = true;
            }
        }
    }
    
    void createDeathEffect(float x, float y) {
        for (int i = 0; i < 10; ++i) {
            Particle* p = getInactiveParticle();
            if (p) {
                p->position = Vector2(x, y);
                p->velocity = Vector2(
                    (randomFloat(rng) - 0.5f) * 200,
                    (randomFloat(rng) - 0.5f) * 200
                );
                p->lifetime = p->maxLifetime;
                p->color = "#ffaa00";
                p->size = 4;
                p->active = true;
            }
        }
    }
    
    void createParryEffect(float x, float y) {
        for (int i = 0; i < 8; ++i) {
            Particle* p = getInactiveParticle();
            if (p) {
                float angle = (i / 8.0f) * 2 * M_PI;
                p->position = Vector2(x, y);
                p->velocity = Vector2(
                    std::cos(angle) * 150,
                    std::sin(angle) * 150
                );
                p->lifetime = p->maxLifetime;
                p->color = "#00ffff";
                p->size = 5;
                p->active = true;
            }
        }
    }
    
    Particle* getInactiveParticle() {
        for (auto& p : particles) {
            if (!p.active) {
                return &p;
            }
        }
        return nullptr;
    }
    
    void addScreenShake(float intensity, float duration) {
        screenShake.intensity = std::max(screenShake.intensity, intensity);
        screenShake.duration = std::max(screenShake.duration, duration / 1000.0f);
    }
    
    // Input handlers
    void handleKeyDown(int key) {
        if (key >= 0 && key < 256) {
            input.keys[key] = true;
        }
        
        // Handle special keys
        if (player) {
            if (key == 17) { // Ctrl - Attack
                playerAttack();
            } else if (key == 18) { // Alt - Shield
                player->startShield();
            } else if (key == 32) { // Space - Roll
                playerRoll();
            }
        }
    }
    
    void handleKeyUp(int key) {
        if (key >= 0 && key < 256) {
            input.keys[key] = false;
        }
        
        // Handle shield release
        if (player && key == 18) { // Alt
            player->endShield();
        }
    }
    
    void handleMouseMove(float x, float y) {
        input.mouseX = x;
        input.mouseY = y;
        
        if (player) {
            Vector2 worldPos = camera.screenToWorld(x, y);
            Vector2 toMouse = worldPos - player->position;
            input.mouseAngle = std::atan2(toMouse.y, toMouse.x);
        }
    }
    
    void playerAttack() {
        if (player) {
            player->performAttack(input.mouseAngle);
        }
    }
    
    void playerRoll() {
        if (player) {
            // Get movement direction
            Vector2 movement(0, 0);
            if (input.keys['W'] || input.keys['w']) movement.y -= 1;
            if (input.keys['S'] || input.keys['s']) movement.y += 1;
            if (input.keys['A'] || input.keys['a']) movement.x -= 1;
            if (input.keys['D'] || input.keys['d']) movement.x += 1;
            
            if (movement.magnitude() > 0) {
                movement = movement.normalized();
                player->performRoll(movement.x, movement.y);
            } else {
                // Roll towards mouse if no movement input
                player->performRoll(std::cos(input.mouseAngle), std::sin(input.mouseAngle));
            }
        }
    }
    
    // Getters for JavaScript
    val getGameState() {
        val obj = val::object();
        
        if (player) {
            val playerObj = val::object();
            playerObj.set("x", player->position.x);
            playerObj.set("y", player->position.y);
            playerObj.set("health", player->health);
            playerObj.set("maxHealth", player->maxHealth);
            playerObj.set("energy", player->energy);
            playerObj.set("maxEnergy", player->maxEnergy);
            playerObj.set("rolling", player->rolling);
            playerObj.set("shielding", player->shielding);
            playerObj.set("attacking", player->attacking);
            playerObj.set("facing", player->facing);
            obj.set("player", playerObj);
        }
        
        val enemiesArray = val::array();
        int idx = 0;
        for (const auto& enemy : enemies) {
            if (enemy && enemy->active) {
                val enemyObj = val::object();
                enemyObj.set("x", enemy->position.x);
                enemyObj.set("y", enemy->position.y);
                enemyObj.set("health", enemy->health);
                enemyObj.set("maxHealth", enemy->maxHealth);
                enemyObj.set("stunned", enemy->stunned);
                enemiesArray.set(idx++, enemyObj);
            }
        }
        obj.set("enemies", enemiesArray);
        
        val particlesArray = val::array();
        idx = 0;
        for (const auto& particle : particles) {
            if (particle.active) {
                val particleObj = val::object();
                particleObj.set("x", particle.position.x);
                particleObj.set("y", particle.position.y);
                particleObj.set("color", particle.color);
                particleObj.set("size", particle.size);
                particlesArray.set(idx++, particleObj);
            }
        }
        obj.set("particles", particlesArray);
        
        val cameraObj = val::object();
        cameraObj.set("x", camera.x + screenShake.x);
        cameraObj.set("y", camera.y + screenShake.y);
        cameraObj.set("width", camera.width);
        cameraObj.set("height", camera.height);
        obj.set("camera", cameraObj);
        
        obj.set("score", score);
        obj.set("state", state);
        
        return obj;
    }
    
    // Setters
    void setCanvasSize(float width, float height) {
        camera.width = width;
        camera.height = height;
        worldWidth = width * Config::WORLD_SCALE;
        worldHeight = height * Config::WORLD_SCALE;
    }
    
    std::string getState() const { return state; }
    void setState(const std::string& newState) { state = newState; }
    int getScore() const { return score; }
};

// Bindings for JavaScript
EMSCRIPTEN_BINDINGS(enhanced_combat_module) {
    class_<EnhancedCombatEngine>("EnhancedCombatEngine")
        .constructor<>()
        .function("init", &EnhancedCombatEngine::init)
        .function("update", &EnhancedCombatEngine::update)
        .function("handleKeyDown", &EnhancedCombatEngine::handleKeyDown)
        .function("handleKeyUp", &EnhancedCombatEngine::handleKeyUp)
        .function("handleMouseMove", &EnhancedCombatEngine::handleMouseMove)
        .function("playerAttack", &EnhancedCombatEngine::playerAttack)
        .function("playerRoll", &EnhancedCombatEngine::playerRoll)
        .function("getGameState", &EnhancedCombatEngine::getGameState)
        .function("setCanvasSize", &EnhancedCombatEngine::setCanvasSize)
        .function("getState", &EnhancedCombatEngine::getState)
        .function("setState", &EnhancedCombatEngine::setState)
        .function("getScore", &EnhancedCombatEngine::getScore);
}