#include "../../include/systems/spatial_hash_grid.h"
#include <unordered_map>

int SpatialHashGrid::hashPosition(float x, float y) const {
    int gridX = static_cast<int>(x / CELL_SIZE);
    int gridY = static_cast<int>(y / CELL_SIZE);
    return gridX * 73856093 ^ gridY * 19349663; // Large primes for hashing
}

void SpatialHashGrid::clear() {
    grid.clear();
}

void SpatialHashGrid::insert(Entity* entity) {
    if (!entity || !entity->active) return;
    
    // Insert into all cells the entity overlaps
    float minX = entity->position.x - entity->radius;
    float maxX = entity->position.x + entity->radius;
    float minY = entity->position.y - entity->radius;
    float maxY = entity->position.y + entity->radius;
    
    int startX = static_cast<int>(minX / CELL_SIZE);
    int endX = static_cast<int>(maxX / CELL_SIZE);
    int startY = static_cast<int>(minY / CELL_SIZE);
    int endY = static_cast<int>(maxY / CELL_SIZE);
    
    for (int x = startX; x <= endX; x++) {
        for (int y = startY; y <= endY; y++) {
            int hash = x * 73856093 ^ y * 19349663;
            grid[hash].push_back(entity);
        }
    }
}

std::vector<Entity*> SpatialHashGrid::getNearby(Entity* entity) {
    std::vector<Entity*> nearby;
    std::unordered_map<int, bool> checked;
    
    if (!entity) return nearby;
    
    float minX = entity->position.x - entity->radius;
    float maxX = entity->position.x + entity->radius;
    float minY = entity->position.y - entity->radius;
    float maxY = entity->position.y + entity->radius;
    
    int startX = static_cast<int>(minX / CELL_SIZE) - 1;
    int endX = static_cast<int>(maxX / CELL_SIZE) + 1;
    int startY = static_cast<int>(minY / CELL_SIZE) - 1;
    int endY = static_cast<int>(maxY / CELL_SIZE) + 1;
    
    for (int x = startX; x <= endX; x++) {
        for (int y = startY; y <= endY; y++) {
            int hash = x * 73856093 ^ y * 19349663;
            auto it = grid.find(hash);
            if (it != grid.end()) {
                for (Entity* other : it->second) {
                    if (other != entity && other->active && !checked[other->id]) {
                        nearby.push_back(other);
                        checked[other->id] = true;
                    }
                }
            }
        }
    }
    
    return nearby;
}