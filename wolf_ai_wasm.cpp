/**
 * Wolf AI WASM Module
 * Main entry point for the Wolf AI WebAssembly module
 */

#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <memory>
#include <vector>
#include <cmath>
#include <algorithm>

// Include the necessary components
#include "wasm/include/math/vector2.h"
#include "wasm/include/entities/entity.h"
// Note: We're using the AI::Wolf from wolf_ai.h, not the Wolf from wolf.h
#include "wasm/include/ai/wolf_ai.h"

using namespace emscripten;

// Wrapper class for Wolf Pack management
class WolfPackManager {
private:
    std::vector<std::shared_ptr<AI::Wolf>> wolves;
    std::vector<std::shared_ptr<AI::WolfAI>> wolfAIs;
    int nextId = 0;
    
    // Helper method to find wolf index by ID
    int findWolfIndex(int wolfId) const {
        for (size_t i = 0; i < wolves.size(); i++) {
            if (wolves[i]->id == wolfId) {
                return static_cast<int>(i);
            }
        }
        return -1;
    }

public:
    WolfPackManager() = default;
    
    // Create a new wolf and return its ID
    int createWolf(float x, float y, bool isAlpha) {
        auto wolf = std::make_shared<AI::Wolf>(x, y, isAlpha);
        wolf->id = nextId++;
        wolves.push_back(wolf);
        
        auto wolfAI = std::make_shared<AI::WolfAI>(wolf);
        wolfAIs.push_back(wolfAI);
        
        return wolf->id;
    }
    
    // Update a specific wolf
    void updateWolf(int wolfId, float deltaTime, float playerX, float playerY, 
                   float playerVX, float playerVY, bool playerVisible) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return;
        
        // Create a temporary player entity for the AI
        Entity player(EntityType::PLAYER, Vector2(playerX, playerY), 15.0f);
        player.velocity = Vector2(playerVX, playerVY);
        
        // Update the wolf AI
        std::vector<Entity*> obstacles; // Empty for now
        wolfAIs[index]->update(deltaTime, &player, wolfAIs, obstacles);
        
        // Update wolf position based on AI decisions
        wolves[index]->update(deltaTime);
    }
    
    // Get wolf state
    int getWolfState(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return static_cast<int>(wolfAIs[index]->getState());
    }
    
    // Get wolf position
    float getWolfX(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return wolves[index]->position.x;
    }
    
    float getWolfY(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return wolves[index]->position.y;
    }
    
    // Get wolf rotation
    float getWolfRotation(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return wolves[index]->rotation;
    }
    
    // Get wolf alert level
    float getWolfAlertLevel(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return wolfAIs[index]->getAlertLevel();
    }
    
    // Get wolf health
    float getWolfHealth(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return 0;
        return wolves[index]->health;
    }
    
    // Remove a wolf
    void removeWolf(int wolfId) {
        int index = findWolfIndex(wolfId);
        if (index < 0) return;
        
        wolves.erase(wolves.begin() + index);
        wolfAIs.erase(wolfAIs.begin() + index);
        
        // No longer reassigning IDs - they remain stable
    }
    
    // Get pack size
    int getPackSize() const {
        return static_cast<int>(wolves.size());
    }
};

// Emscripten bindings
EMSCRIPTEN_BINDINGS(wolf_ai_module) {
    // Vector2 class
    class_<Vector2>("Vector2")
        .constructor<>()
        .constructor<float, float>()
        .property("x", &Vector2::x)
        .property("y", &Vector2::y)
        .function("magnitude", &Vector2::magnitude)
        .function("normalized", &Vector2::normalized)
        .function("dot", &Vector2::dot)
        .function("distanceTo", &Vector2::distanceTo);
    
    // Wolf state enum
    enum_<AI::WolfState>("WolfState")
        .value("IDLE", AI::WolfState::IDLE)
        .value("PATROL", AI::WolfState::PATROL)
        .value("INVESTIGATE", AI::WolfState::INVESTIGATE)
        .value("HUNT", AI::WolfState::HUNT)
        .value("FLANK", AI::WolfState::FLANK)
        .value("SEARCH", AI::WolfState::SEARCH);
    
    // Wolf role enum
    enum_<AI::WolfRole>("WolfRole")
        .value("HUNTER", AI::WolfRole::HUNTER)
        .value("TRACKER", AI::WolfRole::TRACKER)
        .value("FLANKER", AI::WolfRole::FLANKER);
    
    // WolfPackManager class
    class_<WolfPackManager>("WolfPackManager")
        .constructor<>()
        .function("createWolf", &WolfPackManager::createWolf)
        .function("updateWolf", &WolfPackManager::updateWolf)
        .function("getWolfState", &WolfPackManager::getWolfState)
        .function("getWolfX", &WolfPackManager::getWolfX)
        .function("getWolfY", &WolfPackManager::getWolfY)
        .function("getWolfRotation", &WolfPackManager::getWolfRotation)
        .function("getWolfAlertLevel", &WolfPackManager::getWolfAlertLevel)
        .function("getWolfHealth", &WolfPackManager::getWolfHealth)
        .function("removeWolf", &WolfPackManager::removeWolf)
        .function("getPackSize", &WolfPackManager::getPackSize);
}