#ifndef OBSTACLE_H
#define OBSTACLE_H

#include "entity.h"
#include "../config/game_config.h"
#include <algorithm>

enum class ObstacleShape {
    CIRCLE,
    SQUARE,
    RECTANGLE
};

class Obstacle : public Entity {
public:
    bool destructible;
    float durability;
    ObstacleShape shape;
    float width;  // For rectangles and squares
    float height; // For rectangles
    float rotation; // For rotated rectangles
    
    // Constructor for circular obstacles (backwards compatibility)
    Obstacle(const Vector2& pos, float rad, bool canDestroy = false)
        : Entity(EntityType::OBSTACLE, pos, rad),
          destructible(canDestroy),
          durability(100),
          shape(ObstacleShape::CIRCLE),
          width(rad * 2),
          height(rad * 2),
          rotation(0) {
        health = destructible ? 100 : 999999;
        maxHealth = health;
    }
    
    // Constructor for shaped obstacles
    Obstacle(const Vector2& pos, ObstacleShape obstacleShape, float w, float h, float rot = 0, bool canDestroy = false)
        : Entity(EntityType::OBSTACLE, pos, std::max(w, h) / 2), // Use half of max dimension as radius for collision
          destructible(canDestroy),
          durability(100),
          shape(obstacleShape),
          width(w),
          height(h),
          rotation(rot) {
        health = destructible ? 100 : 999999;
        maxHealth = health;
        
        // For squares, ensure width and height are the same
        if (shape == ObstacleShape::SQUARE) {
            height = width;
        }
    }
    
    void update(float deltaTime) override {
        // Obstacles don't move
        velocity = Vector2(0, 0);
        
        if (destructible && health <= 0) {
            active = false;
        }
    }
    
    void takeDamage(float damage) override {
        if (destructible) {
            Entity::takeDamage(damage);
        }
    }
    
    // Check if a point is inside this obstacle (for more accurate collision)
    bool containsPoint(const Vector2& point) const {
        if (shape == ObstacleShape::CIRCLE) {
            return (point - position).magnitude() <= radius;
        } else {
            // For rectangles and squares, check with rotation
            Vector2 localPoint = point - position;
            
            // Rotate point to obstacle's local space
            if (rotation != 0) {
                float cos_r = cos(-rotation);
                float sin_r = sin(-rotation);
                float local_x = localPoint.x * cos_r - localPoint.y * sin_r;
                float local_y = localPoint.x * sin_r + localPoint.y * cos_r;
                localPoint.x = local_x;
                localPoint.y = local_y;
            }
            
            // Check if point is within rectangle bounds
            return std::abs(localPoint.x) <= width / 2 && std::abs(localPoint.y) <= height / 2;
        }
    }
    
    // Get the shape type (for rendering)
    int getShapeType() const { return static_cast<int>(shape); }
};

#endif // OBSTACLE_H