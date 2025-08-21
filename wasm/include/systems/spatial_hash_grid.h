#ifndef SPATIAL_HASH_GRID_H
#define SPATIAL_HASH_GRID_H

#include <unordered_map>
#include <vector>
#include "../entities/entity.h"

// Spatial hash grid for efficient collision detection
class SpatialHashGrid {
private:
    static constexpr int CELL_SIZE = 100;
    std::unordered_map<int, std::vector<Entity*>> grid;
    
    int hashPosition(float x, float y) const;
    
public:
    SpatialHashGrid() = default;
    ~SpatialHashGrid() = default;
    
    void clear();
    void insert(Entity* entity);
    std::vector<Entity*> getNearby(Entity* entity);
};

#endif // SPATIAL_HASH_GRID_H