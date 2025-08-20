#ifndef VECTOR2_H
#define VECTOR2_H

#include <cmath>

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
    
    float distanceTo(const Vector2& other) const {
        float dx = x - other.x;
        float dy = y - other.y;
        return std::sqrt(dx * dx + dy * dy);
    }
    
    static Vector2 lerp(const Vector2& a, const Vector2& b, float t) {
        return a + (b - a) * t;
    }
};

#endif // VECTOR2_H