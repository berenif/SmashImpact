#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <emscripten/emscripten.h>

// Game constants
#define MAP_WIDTH 50
#define MAP_HEIGHT 50
#define MAX_ENTITIES 100
#define MAX_INVENTORY 20
#define MAX_ITEMS 200
#define MAX_NPCS 50
#define VIEWPORT_WIDTH 15
#define VIEWPORT_HEIGHT 15

// Tile types
typedef enum {
    TILE_GRASS = 0,
    TILE_STONE = 1,
    TILE_WATER = 2,
    TILE_TREE = 3,
    TILE_WALL = 4,
    TILE_DOOR = 5,
    TILE_CHEST = 6,
    TILE_FLOOR = 7,
    TILE_MOUNTAIN = 8,
    TILE_SAND = 9,
    TILE_BRIDGE = 10,
    TILE_DUNGEON_FLOOR = 11,
    TILE_DUNGEON_WALL = 12
} TileType;

// Entity types
typedef enum {
    ENTITY_NONE = 0,
    ENTITY_PLAYER = 1,
    ENTITY_ENEMY = 2,
    ENTITY_NPC = 3,
    ENTITY_ITEM = 4,
    ENTITY_CHEST = 5,
    ENTITY_PORTAL = 6
} EntityType;

// Item types
typedef enum {
    ITEM_NONE = 0,
    ITEM_SWORD = 1,
    ITEM_SHIELD = 2,
    ITEM_POTION = 3,
    ITEM_KEY = 4,
    ITEM_GOLD = 5,
    ITEM_BOW = 6,
    ITEM_ARROW = 7,
    ITEM_ARMOR = 8,
    ITEM_SPELL_BOOK = 9,
    ITEM_FOOD = 10
} ItemType;

// Enemy types
typedef enum {
    ENEMY_GOBLIN = 0,
    ENEMY_ORC = 1,
    ENEMY_SKELETON = 2,
    ENEMY_DRAGON = 3,
    ENEMY_WOLF = 4,
    ENEMY_BANDIT = 5
} EnemyType;

// Direction
typedef enum {
    DIR_NORTH = 0,
    DIR_EAST = 1,
    DIR_SOUTH = 2,
    DIR_WEST = 3,
    DIR_NORTHEAST = 4,
    DIR_SOUTHEAST = 5,
    DIR_SOUTHWEST = 6,
    DIR_NORTHWEST = 7
} Direction;

// Stats structure
typedef struct {
    int health;
    int maxHealth;
    int mana;
    int maxMana;
    int attack;
    int defense;
    int speed;
    int level;
    int experience;
    int gold;
} Stats;

// Position structure
typedef struct {
    int x;
    int y;
} Position;

// Item structure
typedef struct {
    ItemType type;
    char name[32];
    int value;
    int power;
    int quantity;
    Position pos;
    int active;
} Item;

// Entity structure
typedef struct {
    EntityType type;
    Position pos;
    Stats stats;
    Direction facing;
    char name[32];
    int active;
    int enemyType;
    int aiState;
    int targetId;
    int cooldown;
} Entity;

// Tile structure
typedef struct {
    TileType type;
    int solid;
    int height;
    int explored;
    int visible;
} Tile;

// Game state
typedef struct {
    Tile map[MAP_WIDTH][MAP_HEIGHT];
    Entity entities[MAX_ENTITIES];
    Item items[MAX_ITEMS];
    Item inventory[MAX_INVENTORY];
    Position camera;
    int playerEntityId;
    int turnCount;
    int gameOver;
    int victory;
    char message[256];
    int messageTimer;
    int dungeonLevel;
    int questState;
} GameState;

static GameState game;
static uint32_t rng_state = 42;

// Random number generator
EMSCRIPTEN_KEEPALIVE
uint32_t random_range(uint32_t max) {
    if (max == 0) return 0;
    rng_state = (rng_state * 1103515245 + 12345) & 0x7fffffff;
    return rng_state % max;
}

// Distance calculation
int distance(int x1, int y1, int x2, int y2) {
    int dx = abs(x2 - x1);
    int dy = abs(y2 - y1);
    return (dx > dy) ? dx : dy;
}

// Check if position is valid and walkable
int is_walkable(int x, int y) {
    if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
        return 0;
    }
    
    Tile* tile = &game.map[x][y];
    if (tile->solid) return 0;
    
    // Check for entities blocking the path
    for (int i = 0; i < MAX_ENTITIES; i++) {
        if (game.entities[i].active && 
            game.entities[i].pos.x == x && 
            game.entities[i].pos.y == y &&
            game.entities[i].type != ENTITY_ITEM) {
            return 0;
        }
    }
    
    return 1;
}

// Generate dungeon using cellular automata
void generate_dungeon(int level) {
    // Initialize with random walls
    for (int x = 0; x < MAP_WIDTH; x++) {
        for (int y = 0; y < MAP_HEIGHT; y++) {
            if (x == 0 || x == MAP_WIDTH-1 || y == 0 || y == MAP_HEIGHT-1) {
                game.map[x][y].type = TILE_DUNGEON_WALL;
                game.map[x][y].solid = 1;
            } else {
                int isWall = random_range(100) < 45;
                game.map[x][y].type = isWall ? TILE_DUNGEON_WALL : TILE_DUNGEON_FLOOR;
                game.map[x][y].solid = isWall;
            }
            game.map[x][y].height = 0;
            game.map[x][y].explored = 0;
            game.map[x][y].visible = 0;
        }
    }
    
    // Apply cellular automata
    for (int iteration = 0; iteration < 5; iteration++) {
        Tile newMap[MAP_WIDTH][MAP_HEIGHT];
        memcpy(newMap, game.map, sizeof(game.map));
        
        for (int x = 1; x < MAP_WIDTH-1; x++) {
            for (int y = 1; y < MAP_HEIGHT-1; y++) {
                int wallCount = 0;
                for (int dx = -1; dx <= 1; dx++) {
                    for (int dy = -1; dy <= 1; dy++) {
                        if (game.map[x+dx][y+dy].type == TILE_DUNGEON_WALL) {
                            wallCount++;
                        }
                    }
                }
                
                if (wallCount >= 5) {
                    newMap[x][y].type = TILE_DUNGEON_WALL;
                    newMap[x][y].solid = 1;
                } else {
                    newMap[x][y].type = TILE_DUNGEON_FLOOR;
                    newMap[x][y].solid = 0;
                }
            }
        }
        memcpy(game.map, newMap, sizeof(game.map));
    }
}

// Generate world map
void generate_world() {
    // Create a more interesting overworld
    for (int x = 0; x < MAP_WIDTH; x++) {
        for (int y = 0; y < MAP_HEIGHT; y++) {
            float noise = (float)(random_range(100)) / 100.0f;
            
            // Use simple noise to create terrain
            if (noise < 0.3f) {
                game.map[x][y].type = TILE_WATER;
                game.map[x][y].solid = 1;
                game.map[x][y].height = 0;
            } else if (noise < 0.4f) {
                game.map[x][y].type = TILE_SAND;
                game.map[x][y].solid = 0;
                game.map[x][y].height = 1;
            } else if (noise < 0.7f) {
                game.map[x][y].type = TILE_GRASS;
                game.map[x][y].solid = 0;
                game.map[x][y].height = 2;
            } else if (noise < 0.85f) {
                game.map[x][y].type = TILE_TREE;
                game.map[x][y].solid = 1;
                game.map[x][y].height = 3;
            } else {
                game.map[x][y].type = TILE_MOUNTAIN;
                game.map[x][y].solid = 1;
                game.map[x][y].height = 4;
            }
            
            game.map[x][y].explored = 0;
            game.map[x][y].visible = 0;
        }
    }
    
    // Add some structures
    for (int i = 0; i < 5; i++) {
        int cx = 10 + random_range(MAP_WIDTH - 20);
        int cy = 10 + random_range(MAP_HEIGHT - 20);
        int size = 3 + random_range(4);
        
        // Create a building
        for (int x = cx; x < cx + size && x < MAP_WIDTH; x++) {
            for (int y = cy; y < cy + size && y < MAP_HEIGHT; y++) {
                if (x == cx || x == cx + size - 1 || y == cy || y == cy + size - 1) {
                    game.map[x][y].type = TILE_WALL;
                    game.map[x][y].solid = 1;
                } else {
                    game.map[x][y].type = TILE_FLOOR;
                    game.map[x][y].solid = 0;
                }
                game.map[x][y].height = 2;
            }
        }
        
        // Add door
        int doorX = cx + size/2;
        int doorY = cy + size - 1;
        if (doorX < MAP_WIDTH && doorY < MAP_HEIGHT) {
            game.map[doorX][doorY].type = TILE_DOOR;
            game.map[doorX][doorY].solid = 0;
        }
    }
    
    // Create paths between structures
    for (int i = 0; i < 10; i++) {
        int x1 = random_range(MAP_WIDTH);
        int y1 = random_range(MAP_HEIGHT);
        int x2 = random_range(MAP_WIDTH);
        int y2 = random_range(MAP_HEIGHT);
        
        // Simple path generation
        while (x1 != x2 || y1 != y2) {
            if (x1 < x2) x1++;
            else if (x1 > x2) x1--;
            else if (y1 < y2) y1++;
            else if (y1 > y2) y1--;
            
            if (x1 >= 0 && x1 < MAP_WIDTH && y1 >= 0 && y1 < MAP_HEIGHT) {
                if (game.map[x1][y1].type == TILE_WATER) {
                    game.map[x1][y1].type = TILE_BRIDGE;
                    game.map[x1][y1].solid = 0;
                } else if (game.map[x1][y1].type == TILE_TREE) {
                    game.map[x1][y1].type = TILE_GRASS;
                    game.map[x1][y1].solid = 0;
                }
            }
        }
    }
}

// Spawn enemies
void spawn_enemies() {
    int enemyCount = 5 + game.dungeonLevel * 2;
    
    for (int i = 0; i < enemyCount && i < MAX_ENTITIES - 10; i++) {
        int id = -1;
        for (int j = 1; j < MAX_ENTITIES; j++) {
            if (!game.entities[j].active) {
                id = j;
                break;
            }
        }
        
        if (id == -1) break;
        
        Entity* enemy = &game.entities[id];
        enemy->active = 1;
        enemy->type = ENTITY_ENEMY;
        
        // Find spawn position
        int attempts = 100;
        while (attempts-- > 0) {
            int x = random_range(MAP_WIDTH);
            int y = random_range(MAP_HEIGHT);
            
            if (is_walkable(x, y) && distance(x, y, game.entities[0].pos.x, game.entities[0].pos.y) > 5) {
                enemy->pos.x = x;
                enemy->pos.y = y;
                break;
            }
        }
        
        // Set enemy type and stats
        enemy->enemyType = random_range(6);
        
        switch(enemy->enemyType) {
            case ENEMY_GOBLIN:
                strcpy(enemy->name, "Goblin");
                enemy->stats.maxHealth = 20 + game.dungeonLevel * 5;
                enemy->stats.attack = 5 + game.dungeonLevel;
                enemy->stats.defense = 2;
                enemy->stats.speed = 8;
                break;
            case ENEMY_ORC:
                strcpy(enemy->name, "Orc");
                enemy->stats.maxHealth = 40 + game.dungeonLevel * 8;
                enemy->stats.attack = 10 + game.dungeonLevel * 2;
                enemy->stats.defense = 5;
                enemy->stats.speed = 5;
                break;
            case ENEMY_SKELETON:
                strcpy(enemy->name, "Skeleton");
                enemy->stats.maxHealth = 25 + game.dungeonLevel * 6;
                enemy->stats.attack = 8 + game.dungeonLevel;
                enemy->stats.defense = 3;
                enemy->stats.speed = 6;
                break;
            case ENEMY_DRAGON:
                strcpy(enemy->name, "Dragon");
                enemy->stats.maxHealth = 100 + game.dungeonLevel * 20;
                enemy->stats.attack = 20 + game.dungeonLevel * 3;
                enemy->stats.defense = 10;
                enemy->stats.speed = 4;
                break;
            case ENEMY_WOLF:
                strcpy(enemy->name, "Wolf");
                enemy->stats.maxHealth = 30 + game.dungeonLevel * 5;
                enemy->stats.attack = 12 + game.dungeonLevel;
                enemy->stats.defense = 3;
                enemy->stats.speed = 10;
                break;
            case ENEMY_BANDIT:
                strcpy(enemy->name, "Bandit");
                enemy->stats.maxHealth = 35 + game.dungeonLevel * 7;
                enemy->stats.attack = 9 + game.dungeonLevel * 2;
                enemy->stats.defense = 4;
                enemy->stats.speed = 7;
                break;
        }
        
        enemy->stats.health = enemy->stats.maxHealth;
        enemy->stats.level = 1 + game.dungeonLevel;
        enemy->facing = random_range(4);
        enemy->aiState = 0;
        enemy->cooldown = 0;
    }
}

// Spawn items
void spawn_items() {
    int itemCount = 10 + random_range(10);
    
    for (int i = 0; i < itemCount && i < MAX_ITEMS; i++) {
        Item* item = &game.items[i];
        item->active = 1;
        item->type = 1 + random_range(10);
        item->quantity = 1;
        
        // Find spawn position
        int attempts = 100;
        while (attempts-- > 0) {
            int x = random_range(MAP_WIDTH);
            int y = random_range(MAP_HEIGHT);
            
            if (is_walkable(x, y)) {
                item->pos.x = x;
                item->pos.y = y;
                break;
            }
        }
        
        // Set item properties
        switch(item->type) {
            case ITEM_SWORD:
                strcpy(item->name, "Sword");
                item->power = 5 + random_range(10);
                item->value = 50 + item->power * 10;
                break;
            case ITEM_SHIELD:
                strcpy(item->name, "Shield");
                item->power = 3 + random_range(7);
                item->value = 40 + item->power * 8;
                break;
            case ITEM_POTION:
                strcpy(item->name, "Health Potion");
                item->power = 20 + random_range(30);
                item->value = 20;
                item->quantity = 1 + random_range(3);
                break;
            case ITEM_KEY:
                strcpy(item->name, "Key");
                item->power = 0;
                item->value = 10;
                break;
            case ITEM_GOLD:
                strcpy(item->name, "Gold");
                item->power = 0;
                item->value = 10 + random_range(90);
                item->quantity = item->value;
                break;
            case ITEM_BOW:
                strcpy(item->name, "Bow");
                item->power = 8 + random_range(8);
                item->value = 60 + item->power * 12;
                break;
            case ITEM_ARROW:
                strcpy(item->name, "Arrows");
                item->power = 2;
                item->value = 5;
                item->quantity = 10 + random_range(20);
                break;
            case ITEM_ARMOR:
                strcpy(item->name, "Armor");
                item->power = 5 + random_range(10);
                item->value = 80 + item->power * 15;
                break;
            case ITEM_SPELL_BOOK:
                strcpy(item->name, "Spell Book");
                item->power = 10 + random_range(15);
                item->value = 100 + item->power * 20;
                break;
            case ITEM_FOOD:
                strcpy(item->name, "Food");
                item->power = 10;
                item->value = 5;
                item->quantity = 1 + random_range(3);
                break;
        }
    }
}

// Initialize game
EMSCRIPTEN_KEEPALIVE
void init_game() {
    memset(&game, 0, sizeof(game));
    
    // Generate world
    if (game.dungeonLevel == 0) {
        generate_world();
    } else {
        generate_dungeon(game.dungeonLevel);
    }
    
    // Initialize player
    Entity* player = &game.entities[0];
    player->active = 1;
    player->type = ENTITY_PLAYER;
    strcpy(player->name, "Hero");
    
    // Find starting position
    int placed = 0;
    for (int attempts = 0; attempts < 1000 && !placed; attempts++) {
        int x = MAP_WIDTH / 2 + random_range(10) - 5;
        int y = MAP_HEIGHT / 2 + random_range(10) - 5;
        
        if (is_walkable(x, y)) {
            player->pos.x = x;
            player->pos.y = y;
            placed = 1;
        }
    }
    
    // Player stats
    player->stats.maxHealth = 100;
    player->stats.health = 100;
    player->stats.maxMana = 50;
    player->stats.mana = 50;
    player->stats.attack = 10;
    player->stats.defense = 5;
    player->stats.speed = 10;
    player->stats.level = 1;
    player->stats.experience = 0;
    player->stats.gold = 0;
    player->facing = DIR_SOUTH;
    
    game.playerEntityId = 0;
    
    // Center camera on player
    game.camera.x = player->pos.x - VIEWPORT_WIDTH / 2;
    game.camera.y = player->pos.y - VIEWPORT_HEIGHT / 2;
    
    // Spawn entities
    spawn_enemies();
    spawn_items();
    
    // Initial message
    strcpy(game.message, "Welcome to the Isometric RPG! Use WASD to move.");
    game.messageTimer = 180;
}

// Move entity
int move_entity(int entityId, int dx, int dy) {
    Entity* entity = &game.entities[entityId];
    if (!entity->active) return 0;
    
    int newX = entity->pos.x + dx;
    int newY = entity->pos.y + dy;
    
    // Update facing direction
    if (dx > 0) entity->facing = DIR_EAST;
    else if (dx < 0) entity->facing = DIR_WEST;
    else if (dy > 0) entity->facing = DIR_SOUTH;
    else if (dy < 0) entity->facing = DIR_NORTH;
    
    // Check for combat
    for (int i = 0; i < MAX_ENTITIES; i++) {
        if (i != entityId && game.entities[i].active &&
            game.entities[i].pos.x == newX && 
            game.entities[i].pos.y == newY) {
            
            // Initiate combat
            if ((entity->type == ENTITY_PLAYER && game.entities[i].type == ENTITY_ENEMY) ||
                (entity->type == ENTITY_ENEMY && game.entities[i].type == ENTITY_PLAYER)) {
                
                Entity* target = &game.entities[i];
                int damage = entity->stats.attack - target->stats.defense;
                if (damage < 1) damage = 1;
                
                target->stats.health -= damage;
                
                if (entity->type == ENTITY_PLAYER) {
                    sprintf(game.message, "You hit %s for %d damage!", target->name, damage);
                } else {
                    sprintf(game.message, "%s hits you for %d damage!", entity->name, damage);
                }
                game.messageTimer = 60;
                
                // Check if target died
                if (target->stats.health <= 0) {
                    target->active = 0;
                    
                    if (target->type == ENTITY_ENEMY && entity->type == ENTITY_PLAYER) {
                        entity->stats.experience += 10 * target->stats.level;
                        entity->stats.gold += 5 + random_range(20);
                        sprintf(game.message, "You defeated %s! +%d XP", 
                                target->name, 10 * target->stats.level);
                        game.messageTimer = 90;
                        
                        // Level up check
                        if (entity->stats.experience >= entity->stats.level * 100) {
                            entity->stats.level++;
                            entity->stats.maxHealth += 20;
                            entity->stats.health = entity->stats.maxHealth;
                            entity->stats.maxMana += 10;
                            entity->stats.mana = entity->stats.maxMana;
                            entity->stats.attack += 3;
                            entity->stats.defense += 2;
                            sprintf(game.message, "LEVEL UP! You are now level %d!", entity->stats.level);
                            game.messageTimer = 120;
                        }
                    }
                }
                
                return 1;
            }
            
            return 0;
        }
    }
    
    // Check if movement is valid
    if (!is_walkable(newX, newY)) {
        return 0;
    }
    
    // Move entity
    entity->pos.x = newX;
    entity->pos.y = newY;
    
    // Pick up items if player
    if (entity->type == ENTITY_PLAYER) {
        for (int i = 0; i < MAX_ITEMS; i++) {
            if (game.items[i].active &&
                game.items[i].pos.x == newX &&
                game.items[i].pos.y == newY) {
                
                // Add to inventory
                int added = 0;
                for (int j = 0; j < MAX_INVENTORY; j++) {
                    if (game.inventory[j].type == ITEM_NONE) {
                        game.inventory[j] = game.items[i];
                        game.items[i].active = 0;
                        sprintf(game.message, "Picked up %s!", game.items[i].name);
                        game.messageTimer = 60;
                        added = 1;
                        break;
                    }
                }
                
                if (!added) {
                    strcpy(game.message, "Inventory full!");
                    game.messageTimer = 60;
                }
                
                break;
            }
        }
        
        // Update camera to follow player
        game.camera.x = entity->pos.x - VIEWPORT_WIDTH / 2;
        game.camera.y = entity->pos.y - VIEWPORT_HEIGHT / 2;
        
        // Clamp camera
        if (game.camera.x < 0) game.camera.x = 0;
        if (game.camera.y < 0) game.camera.y = 0;
        if (game.camera.x > MAP_WIDTH - VIEWPORT_WIDTH) 
            game.camera.x = MAP_WIDTH - VIEWPORT_WIDTH;
        if (game.camera.y > MAP_HEIGHT - VIEWPORT_HEIGHT) 
            game.camera.y = MAP_HEIGHT - VIEWPORT_HEIGHT;
    }
    
    return 1;
}

// Update AI
void update_ai() {
    Entity* player = &game.entities[game.playerEntityId];
    
    for (int i = 1; i < MAX_ENTITIES; i++) {
        Entity* entity = &game.entities[i];
        if (!entity->active || entity->type != ENTITY_ENEMY) continue;
        
        if (entity->cooldown > 0) {
            entity->cooldown--;
            continue;
        }
        
        int dist = distance(entity->pos.x, entity->pos.y, 
                          player->pos.x, player->pos.y);
        
        // Simple AI: move towards player if close enough
        if (dist <= 8 && dist > 1) {
            int dx = 0, dy = 0;
            
            if (player->pos.x > entity->pos.x) dx = 1;
            else if (player->pos.x < entity->pos.x) dx = -1;
            
            if (player->pos.y > entity->pos.y) dy = 1;
            else if (player->pos.y < entity->pos.y) dy = -1;
            
            // Try to move
            if (random_range(2) == 0 && dx != 0) {
                move_entity(i, dx, 0);
            } else if (dy != 0) {
                move_entity(i, 0, dy);
            }
            
            entity->cooldown = 10 - entity->stats.speed;
            if (entity->cooldown < 0) entity->cooldown = 0;
        }
        // Random movement if far from player
        else if (dist > 8 && random_range(100) < 20) {
            int dir = random_range(4);
            switch(dir) {
                case 0: move_entity(i, 0, -1); break;
                case 1: move_entity(i, 1, 0); break;
                case 2: move_entity(i, 0, 1); break;
                case 3: move_entity(i, -1, 0); break;
            }
            entity->cooldown = 15;
        }
    }
}

// Update visibility
void update_visibility() {
    Entity* player = &game.entities[game.playerEntityId];
    int viewRange = 8;
    
    // Reset visibility
    for (int x = 0; x < MAP_WIDTH; x++) {
        for (int y = 0; y < MAP_HEIGHT; y++) {
            game.map[x][y].visible = 0;
        }
    }
    
    // Simple visibility calculation
    for (int x = player->pos.x - viewRange; x <= player->pos.x + viewRange; x++) {
        for (int y = player->pos.y - viewRange; y <= player->pos.y + viewRange; y++) {
            if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
                int dist = distance(x, y, player->pos.x, player->pos.y);
                if (dist <= viewRange) {
                    game.map[x][y].visible = 1;
                    game.map[x][y].explored = 1;
                }
            }
        }
    }
}

// Player movement
EMSCRIPTEN_KEEPALIVE
void player_move(int dx, int dy) {
    if (game.gameOver || game.victory) return;
    
    if (move_entity(game.playerEntityId, dx, dy)) {
        game.turnCount++;
        update_ai();
        update_visibility();
        
        // Update message timer
        if (game.messageTimer > 0) {
            game.messageTimer--;
        }
        
        // Check game over
        if (game.entities[game.playerEntityId].stats.health <= 0) {
            game.gameOver = 1;
            strcpy(game.message, "GAME OVER - You have been defeated!");
            game.messageTimer = 999;
        }
    }
}

// Use item
EMSCRIPTEN_KEEPALIVE
void use_item(int inventorySlot) {
    if (inventorySlot < 0 || inventorySlot >= MAX_INVENTORY) return;
    
    Item* item = &game.inventory[inventorySlot];
    if (item->type == ITEM_NONE) return;
    
    Entity* player = &game.entities[game.playerEntityId];
    
    switch(item->type) {
        case ITEM_POTION:
            player->stats.health += item->power;
            if (player->stats.health > player->stats.maxHealth) {
                player->stats.health = player->stats.maxHealth;
            }
            sprintf(game.message, "Used %s - Restored %d health!", item->name, item->power);
            item->quantity--;
            if (item->quantity <= 0) {
                item->type = ITEM_NONE;
            }
            break;
            
        case ITEM_FOOD:
            player->stats.health += item->power;
            if (player->stats.health > player->stats.maxHealth) {
                player->stats.health = player->stats.maxHealth;
            }
            sprintf(game.message, "Ate %s - Restored %d health!", item->name, item->power);
            item->quantity--;
            if (item->quantity <= 0) {
                item->type = ITEM_NONE;
            }
            break;
            
        case ITEM_SWORD:
            player->stats.attack = 10 + item->power;
            sprintf(game.message, "Equipped %s - Attack: %d!", item->name, player->stats.attack);
            break;
            
        case ITEM_SHIELD:
            player->stats.defense = 5 + item->power;
            sprintf(game.message, "Equipped %s - Defense: %d!", item->name, player->stats.defense);
            break;
            
        case ITEM_ARMOR:
            player->stats.defense = 5 + item->power;
            player->stats.maxHealth = 100 + item->power * 5;
            sprintf(game.message, "Equipped %s - Defense: %d, Max HP: %d!", 
                    item->name, player->stats.defense, player->stats.maxHealth);
            break;
            
        default:
            sprintf(game.message, "Cannot use %s right now.", item->name);
            break;
    }
    
    game.messageTimer = 90;
}

// Get render data
EMSCRIPTEN_KEEPALIVE
void get_render_data(int* buffer) {
    int index = 0;
    
    // Pack viewport dimensions
    buffer[index++] = VIEWPORT_WIDTH;
    buffer[index++] = VIEWPORT_HEIGHT;
    buffer[index++] = game.camera.x;
    buffer[index++] = game.camera.y;
    
    // Pack visible map tiles
    for (int y = 0; y < VIEWPORT_HEIGHT; y++) {
        for (int x = 0; x < VIEWPORT_WIDTH; x++) {
            int worldX = game.camera.x + x;
            int worldY = game.camera.y + y;
            
            if (worldX >= 0 && worldX < MAP_WIDTH && 
                worldY >= 0 && worldY < MAP_HEIGHT) {
                Tile* tile = &game.map[worldX][worldY];
                buffer[index++] = tile->type;
                buffer[index++] = tile->height;
                buffer[index++] = tile->visible ? 1 : (tile->explored ? 2 : 0);
            } else {
                buffer[index++] = 0;
                buffer[index++] = 0;
                buffer[index++] = 0;
            }
        }
    }
    
    // Pack visible entities
    int entityCount = 0;
    int entityCountIndex = index++;
    
    for (int i = 0; i < MAX_ENTITIES; i++) {
        Entity* entity = &game.entities[i];
        if (!entity->active) continue;
        
        int relX = entity->pos.x - game.camera.x;
        int relY = entity->pos.y - game.camera.y;
        
        if (relX >= 0 && relX < VIEWPORT_WIDTH && 
            relY >= 0 && relY < VIEWPORT_HEIGHT) {
            
            // Check visibility
            if (!game.map[entity->pos.x][entity->pos.y].visible && 
                entity->type != ENTITY_PLAYER) continue;
            
            buffer[index++] = entity->type;
            buffer[index++] = relX;
            buffer[index++] = relY;
            buffer[index++] = entity->facing;
            buffer[index++] = entity->stats.health;
            buffer[index++] = entity->stats.maxHealth;
            buffer[index++] = entity->enemyType;
            entityCount++;
        }
    }
    buffer[entityCountIndex] = entityCount;
    
    // Pack visible items
    int itemCount = 0;
    int itemCountIndex = index++;
    
    for (int i = 0; i < MAX_ITEMS; i++) {
        Item* item = &game.items[i];
        if (!item->active) continue;
        
        int relX = item->pos.x - game.camera.x;
        int relY = item->pos.y - game.camera.y;
        
        if (relX >= 0 && relX < VIEWPORT_WIDTH && 
            relY >= 0 && relY < VIEWPORT_HEIGHT) {
            
            // Check visibility
            if (!game.map[item->pos.x][item->pos.y].visible) continue;
            
            buffer[index++] = item->type;
            buffer[index++] = relX;
            buffer[index++] = relY;
            itemCount++;
        }
    }
    buffer[itemCountIndex] = itemCount;
}

// Get player stats
EMSCRIPTEN_KEEPALIVE
void get_player_stats(int* buffer) {
    Entity* player = &game.entities[game.playerEntityId];
    
    buffer[0] = player->stats.health;
    buffer[1] = player->stats.maxHealth;
    buffer[2] = player->stats.mana;
    buffer[3] = player->stats.maxMana;
    buffer[4] = player->stats.attack;
    buffer[5] = player->stats.defense;
    buffer[6] = player->stats.level;
    buffer[7] = player->stats.experience;
    buffer[8] = player->stats.gold;
    buffer[9] = game.turnCount;
    buffer[10] = game.gameOver;
    buffer[11] = game.victory;
}

// Get inventory
EMSCRIPTEN_KEEPALIVE
void get_inventory(int* buffer) {
    int index = 0;
    
    for (int i = 0; i < MAX_INVENTORY; i++) {
        buffer[index++] = game.inventory[i].type;
        buffer[index++] = game.inventory[i].quantity;
        buffer[index++] = game.inventory[i].power;
    }
}

// Get message
EMSCRIPTEN_KEEPALIVE
const char* get_message() {
    if (game.messageTimer > 0) {
        return game.message;
    }
    return "";
}

// Enter dungeon
EMSCRIPTEN_KEEPALIVE
void enter_dungeon() {
    game.dungeonLevel++;
    generate_dungeon(game.dungeonLevel);
    
    // Reset entities except player
    for (int i = 1; i < MAX_ENTITIES; i++) {
        game.entities[i].active = 0;
    }
    
    // Reset items
    for (int i = 0; i < MAX_ITEMS; i++) {
        game.items[i].active = 0;
    }
    
    // Place player at entrance
    Entity* player = &game.entities[game.playerEntityId];
    player->pos.x = MAP_WIDTH / 2;
    player->pos.y = MAP_HEIGHT / 2;
    
    // Find a walkable position
    for (int attempts = 0; attempts < 100; attempts++) {
        int x = MAP_WIDTH / 2 + random_range(10) - 5;
        int y = MAP_HEIGHT / 2 + random_range(10) - 5;
        
        if (is_walkable(x, y)) {
            player->pos.x = x;
            player->pos.y = y;
            break;
        }
    }
    
    // Update camera
    game.camera.x = player->pos.x - VIEWPORT_WIDTH / 2;
    game.camera.y = player->pos.y - VIEWPORT_HEIGHT / 2;
    
    // Spawn new enemies and items
    spawn_enemies();
    spawn_items();
    
    sprintf(game.message, "Entered Dungeon Level %d!", game.dungeonLevel);
    game.messageTimer = 120;
    
    update_visibility();
}