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
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return;
        
        // Create a temporary player entity for the AI
        Entity player(EntityType::PLAYER, Vector2(playerX, playerY), 15.0f);
        player.velocity = Vector2(playerVX, playerVY);
        
        // Update the wolf AI
        std::vector<Entity*> obstacles; // Empty for now
        wolfAIs[wolfId]->update(deltaTime, &player, wolfAIs, obstacles);
        
        // Update wolf position based on AI decisions
        wolves[wolfId]->update(deltaTime);
    }
    
    // Get wolf state
    int getWolfState(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolfAIs.size())) return 0;
        return static_cast<int>(wolfAIs[wolfId]->getState());
    }
    
    // Get wolf position
    float getWolfX(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return 0;
        return wolves[wolfId]->position.x;
    }
    
    float getWolfY(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return 0;
        return wolves[wolfId]->position.y;
    }
    
    // Get wolf rotation
    float getWolfRotation(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return 0;
        return wolves[wolfId]->rotation;
    }
    
    // Get wolf alert level
    float getWolfAlertLevel(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolfAIs.size())) return 0;
        return wolfAIs[wolfId]->getAlertLevel();
    }
    
    // Get wolf health
    float getWolfHealth(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return 0;
        return wolves[wolfId]->health;
    }
    
    // Remove a wolf
    void removeWolf(int wolfId) {
        if (wolfId < 0 || wolfId >= static_cast<int>(wolves.size())) return;
        
        wolves.erase(wolves.begin() + wolfId);
        wolfAIs.erase(wolfAIs.begin() + wolfId);
        
        // Update IDs for remaining wolves
        for (size_t i = wolfId; i < wolves.size(); i++) {
            wolves[i]->id = static_cast<int>(i);
        }
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