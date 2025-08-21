#include <emscripten/bind.h>
#include "../include/math/vector2.h"
#include "../include/entities/entity.h"
#include "../include/systems/collision_system.h"

using namespace emscripten;

// Export Vector2 class
EMSCRIPTEN_BINDINGS(vector2) {
    class_<Vector2>("Vec2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vector2::x)
        .property("y", &Vector2::y)
        .function("magnitude", &Vector2::magnitude)
        .function("magnitudeSquared", &Vector2::magnitudeSquared)
        .function("normalized", &Vector2::normalized)
        .function("dot", &Vector2::dot)
        .function("distanceTo", &Vector2::distanceTo)
        .class_function("lerp", &Vector2::lerp);
}

// Export Entity class as GameObject
EMSCRIPTEN_BINDINGS(entity) {
    enum_<EntityType>("EntityType")
        .value("PLAYER", EntityType::PLAYER)
        .value("ENEMY", EntityType::ENEMY)
        .value("WOLF", EntityType::WOLF)
        .value("PROJECTILE", EntityType::PROJECTILE)
        .value("POWERUP", EntityType::POWERUP)
        .value("OBSTACLE", EntityType::OBSTACLE);
    
    class_<Entity>("GameObject")
        .property("id", &Entity::id)
        .property("type", &Entity::type)
        .property("position", &Entity::position)
        .property("velocity", &Entity::velocity)
        .property("radius", &Entity::radius)
        .property("rotation", &Entity::rotation)
        .property("health", &Entity::health)
        .property("maxHealth", &Entity::maxHealth)
        .property("active", &Entity::active)
        .function("update", &Entity::update)
        .function("takeDamage", &Entity::takeDamage)
        .function("collidesWith", &Entity::collidesWith)
        .function("distanceTo", &Entity::distanceTo);
}

// Export CollisionSystem class
EMSCRIPTEN_BINDINGS(collision_system) {
    class_<CollisionSystem>("CollisionSystem")
        .constructor<>()
        .function("getCollisionChecks", &CollisionSystem::getCollisionChecks);
}