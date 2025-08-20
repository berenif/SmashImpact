#ifndef GAME_CONFIG_H
#define GAME_CONFIG_H

// Game Configuration Constants
namespace Config {
    // Player settings
    constexpr float PLAYER_RADIUS = 20.0f;
    constexpr float PLAYER_MAX_SPEED = 10.0f;
    constexpr float PLAYER_ACCELERATION = 0.5f;
    constexpr float PLAYER_FRICTION = 0.9f;
    constexpr float PLAYER_BOOST_SPEED = 15.0f;
    constexpr float PLAYER_BOOST_DURATION = 200.0f;
    constexpr float PLAYER_BOOST_COOLDOWN = 1000.0f;
    constexpr float PLAYER_MAX_HEALTH = 100.0f;
    constexpr float PLAYER_MAX_ENERGY = 100.0f;
    
    // Enemy settings
    constexpr float ENEMY_RADIUS = 15.0f;
    constexpr float ENEMY_SPEED = 2.0f;
    constexpr float ENEMY_HEALTH = 50.0f;
    constexpr float ENEMY_DAMAGE = 10.0f;
    constexpr float ENEMY_SPAWN_RATE = 3000.0f;
    constexpr int MAX_ENEMIES = 10;
    
    // Wolf settings
    constexpr float WOLF_RADIUS = 18.0f;
    constexpr float WOLF_SPEED = 3.0f;
    constexpr float WOLF_HEALTH = 75.0f;
    constexpr float WOLF_DAMAGE = 15.0f;
    constexpr float WOLF_ALERT_RADIUS = 150.0f;
    constexpr float WOLF_ATTACK_RADIUS = 30.0f;
    constexpr float WOLF_ATTACK_COOLDOWN = 1000.0f;
    constexpr float WOLF_LUNGE_SPEED = 8.0f;
    constexpr float WOLF_LUNGE_DISTANCE = 100.0f;
    constexpr float WOLF_WAVE_SPAWN_DELAY = 2000.0f;
    constexpr int MAX_WOLVES = 20;
    
    // Projectile settings
    constexpr float PROJECTILE_RADIUS = 5.0f;
    constexpr float PROJECTILE_SPEED = 15.0f;
    constexpr float PROJECTILE_DAMAGE = 25.0f;
    constexpr float PROJECTILE_LIFETIME = 2000.0f;
    
    // Power-up settings
    constexpr float POWERUP_RADIUS = 15.0f;
    constexpr float POWERUP_SPAWN_RATE = 5000.0f;
    constexpr int MAX_POWERUPS = 5;
    constexpr float POWERUP_DURATION = 5000.0f;
    
    // Obstacle settings
    constexpr float OBSTACLE_MIN_RADIUS = 20.0f;
    constexpr float OBSTACLE_MAX_RADIUS = 50.0f;
    constexpr int MAX_OBSTACLES = 10;
    
    // Shield/Block system
    constexpr float SHIELD_DURATION = 2000.0f;
    constexpr float SHIELD_COOLDOWN = 500.0f;
    constexpr float PERFECT_PARRY_WINDOW = 150.0f;
    constexpr float SHIELD_DAMAGE_REDUCTION = 0.7f;
    constexpr float PERFECT_PARRY_DAMAGE_REDUCTION = 1.0f;
    constexpr float PERFECT_PARRY_STUN_DURATION = 1500.0f;
    constexpr float PERFECT_PARRY_ENERGY_RESTORE = 30.0f;
    
    // Sword attack
    constexpr float SWORD_RANGE = 60.0f;
    constexpr float SWORD_ARC = 1.047f; // 60 degrees in radians
    constexpr float SWORD_DAMAGE = 30.0f;
    constexpr float SWORD_KNOCKBACK = 15.0f;
    constexpr float SWORD_COOLDOWN = 400.0f;
    constexpr float SWORD_ANIMATION_TIME = 200.0f;
    constexpr float SWORD_ENERGY_COST = 10.0f;
    
    // Roll/Dodge
    constexpr float ROLL_DISTANCE = 150.0f;
    constexpr float ROLL_DURATION = 300.0f;
    constexpr float ROLL_COOLDOWN = 800.0f;
    constexpr float ROLL_SPEED_MULTIPLIER = 2.5f;
    constexpr float ROLL_ENERGY_COST = 15.0f;
    
    // Game settings
    constexpr int INITIAL_LIVES = 3;
    constexpr float INVULNERABILITY_DURATION = 2000.0f;
    constexpr int SCORE_PER_KILL = 100;
    constexpr int SCORE_PER_POWERUP = 50;
    constexpr float WAVE_TRANSITION_TIME = 3000.0f;
    
    // Visual settings
    constexpr int PARTICLE_LIFETIME = 60;
    constexpr int MAX_PARTICLES = 500;
    constexpr float SCREEN_SHAKE_DURATION = 300.0f;
    constexpr int TRAIL_LENGTH = 10;
    
    // System settings
    constexpr int MAX_ENTITIES = 1000;
    constexpr float PHYSICS_TIMESTEP = 16.0f; // 60 FPS
}

#endif // GAME_CONFIG_H