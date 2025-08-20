#ifndef VISUAL_EFFECTS_H
#define VISUAL_EFFECTS_H

#include "particle.h"
#include "../math/vector2.h"
#include <vector>
#include <memory>
#include <cstdlib>
#include <cmath>

class VisualEffects {
private:
    std::vector<std::unique_ptr<Particle>> particles;
    int maxParticles;
    
    // Screen shake
    float screenShakeIntensity;
    float screenShakeDuration;
    Vector2 screenShakeOffset;
    
public:
    VisualEffects(int maxParts = 500)
        : maxParticles(maxParts),
          screenShakeIntensity(0),
          screenShakeDuration(0),
          screenShakeOffset(0, 0) {
        particles.reserve(maxParticles);
    }
    
    void update(float deltaTime) {
        // Update particles
        for (auto& particle : particles) {
            if (particle && particle->active) {
                particle->update(deltaTime);
            }
        }
        
        // Remove inactive particles
        particles.erase(
            std::remove_if(particles.begin(), particles.end(),
                [](const std::unique_ptr<Particle>& p) {
                    return !p || !p->active;
                }),
            particles.end()
        );
        
        // Update screen shake
        if (screenShakeDuration > 0) {
            screenShakeDuration -= deltaTime;
            
            float shakeAmount = screenShakeIntensity * (screenShakeDuration / (Config::SCREEN_SHAKE_DURATION / 1000.0f));
            screenShakeOffset.x = (rand() % 200 - 100) / 100.0f * shakeAmount;
            screenShakeOffset.y = (rand() % 200 - 100) / 100.0f * shakeAmount;
            
            if (screenShakeDuration <= 0) {
                screenShakeIntensity = 0;
                screenShakeOffset = Vector2(0, 0);
            }
        }
    }
    
    void createExplosion(const Vector2& pos, float intensity = 1.0f) {
        int particleCount = 20 * intensity;
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = (rand() % 360) * M_PI / 180.0f;
            float speed = 5.0f + (rand() % 10);
            Vector2 vel(cos(angle) * speed, sin(angle) * speed);
            
            particle->init(pos, vel, 60, 8, "#ff6600", Particle::ParticleType::EXPLOSION);
            particles.push_back(std::move(particle));
        }
        
        // Add smoke
        for (int i = 0; i < 10 && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = (rand() % 360) * M_PI / 180.0f;
            float speed = 1.0f + (rand() % 3);
            Vector2 vel(cos(angle) * speed, sin(angle) * speed - 1);
            
            particle->init(pos, vel, 90, 12, "#333333", Particle::ParticleType::SMOKE);
            particles.push_back(std::move(particle));
        }
        
        // Trigger screen shake
        addScreenShake(intensity * 10);
    }
    
    void createBloodSplatter(const Vector2& pos, const Vector2& direction) {
        int particleCount = 15;
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float spread = 0.5f;
            Vector2 vel = direction * (3 + rand() % 5);
            vel.x += (rand() % 100 - 50) / 100.0f * spread;
            vel.y += (rand() % 100 - 50) / 100.0f * spread;
            
            particle->init(pos, vel, 45, 4, "#cc0000", Particle::ParticleType::BLOOD);
            particles.push_back(std::move(particle));
        }
    }
    
    void createHitEffect(const Vector2& pos, bool perfectParry = false) {
        int particleCount = perfectParry ? 30 : 10;
        std::string color = perfectParry ? "#00ffff" : "#ffff00";
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = (rand() % 360) * M_PI / 180.0f;
            float speed = perfectParry ? 8.0f : 4.0f;
            Vector2 vel(cos(angle) * speed, sin(angle) * speed);
            
            particle->init(pos, vel, 30, 3, color, Particle::ParticleType::SPARK);
            particles.push_back(std::move(particle));
        }
        
        if (perfectParry) {
            addScreenShake(5);
        }
    }
    
    void createBoostTrail(const Vector2& pos, const std::string& color, const Vector2& velocity) {
        if (particles.size() >= maxParticles) return;
        
        auto particle = std::make_unique<Particle>();
        
        Vector2 vel = velocity * -0.5f;
        vel.x += (rand() % 100 - 50) / 100.0f;
        vel.y += (rand() % 100 - 50) / 100.0f;
        
        particle->init(pos, vel, 20, 6, color, Particle::ParticleType::BOOST_TRAIL);
        particles.push_back(std::move(particle));
    }
    
    void createHealEffect(const Vector2& pos) {
        int particleCount = 20;
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = (rand() % 360) * M_PI / 180.0f;
            float radius = rand() % 30;
            Vector2 offset(cos(angle) * radius, sin(angle) * radius);
            Vector2 vel(0, -1.0f - (rand() % 20) / 10.0f);
            
            particle->init(pos + offset, vel, 60, 4, "#00ff00", Particle::ParticleType::HEAL);
            particles.push_back(std::move(particle));
        }
    }
    
    void createEnergyEffect(const Vector2& pos) {
        int particleCount = 15;
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = i * (360.0f / particleCount) * M_PI / 180.0f;
            Vector2 vel(cos(angle) * 2, sin(angle) * 2);
            
            particle->init(pos, vel, 45, 3, "#0099ff", Particle::ParticleType::ENERGY);
            particles.push_back(std::move(particle));
        }
    }
    
    void createDustCloud(const Vector2& pos) {
        int particleCount = 8;
        
        for (int i = 0; i < particleCount && particles.size() < maxParticles; i++) {
            auto particle = std::make_unique<Particle>();
            
            float angle = (rand() % 360) * M_PI / 180.0f;
            float speed = 0.5f + (rand() % 20) / 10.0f;
            Vector2 vel(cos(angle) * speed, sin(angle) * speed - 0.5f);
            
            particle->init(pos, vel, 40, 8, "#996633", Particle::ParticleType::DUST);
            particles.push_back(std::move(particle));
        }
    }
    
    void addScreenShake(float intensity) {
        screenShakeIntensity = std::max(screenShakeIntensity, intensity);
        screenShakeDuration = Config::SCREEN_SHAKE_DURATION / 1000.0f;  // Convert ms to seconds
    }
    
    Vector2 getScreenShakeOffset() const {
        return screenShakeOffset;
    }
    
    const std::vector<std::unique_ptr<Particle>>& getParticles() const {
        return particles;
    }
    
    void clear() {
        particles.clear();
        screenShakeIntensity = 0;
        screenShakeDuration = 0;
        screenShakeOffset = Vector2(0, 0);
    }
};

#endif // VISUAL_EFFECTS_H