#include <stdint.h>
#include <stdlib.h>
#include <emscripten/emscripten.h>

#define GRID_WIDTH 20
#define GRID_HEIGHT 20
#define MAX_SNAKE_LENGTH 400

// Game state
typedef struct {
    int x;
    int y;
} Point;

typedef struct {
    Point body[MAX_SNAKE_LENGTH];
    int length;
    int direction; // 0: up, 1: right, 2: down, 3: left
} Snake;

typedef struct {
    Snake snake;
    Point food;
    int score;
    int gameOver;
    int grid[GRID_WIDTH][GRID_HEIGHT];
} GameState;

static GameState game;

// Random number generator (simple LCG)
static uint32_t rng_state = 12345;

EMSCRIPTEN_KEEPALIVE
uint32_t random_range(uint32_t max) {
    rng_state = (rng_state * 1103515245 + 12345) & 0x7fffffff;
    return rng_state % max;
}

// Initialize the game
EMSCRIPTEN_KEEPALIVE
void init_game() {
    // Initialize snake in the center
    game.snake.length = 3;
    game.snake.direction = 1; // Start moving right
    
    for (int i = 0; i < game.snake.length; i++) {
        game.snake.body[i].x = GRID_WIDTH / 2 - i;
        game.snake.body[i].y = GRID_HEIGHT / 2;
    }
    
    // Place initial food
    game.food.x = random_range(GRID_WIDTH);
    game.food.y = random_range(GRID_HEIGHT);
    
    // Ensure food doesn't spawn on snake
    while (1) {
        int collision = 0;
        for (int i = 0; i < game.snake.length; i++) {
            if (game.snake.body[i].x == game.food.x && 
                game.snake.body[i].y == game.food.y) {
                collision = 1;
                break;
            }
        }
        if (!collision) break;
        game.food.x = random_range(GRID_WIDTH);
        game.food.y = random_range(GRID_HEIGHT);
    }
    
    game.score = 0;
    game.gameOver = 0;
    
    // Clear grid
    for (int x = 0; x < GRID_WIDTH; x++) {
        for (int y = 0; y < GRID_HEIGHT; y++) {
            game.grid[x][y] = 0;
        }
    }
}

// Change snake direction
EMSCRIPTEN_KEEPALIVE
void set_direction(int direction) {
    // Prevent snake from going back into itself
    if ((game.snake.direction == 0 && direction == 2) ||
        (game.snake.direction == 2 && direction == 0) ||
        (game.snake.direction == 1 && direction == 3) ||
        (game.snake.direction == 3 && direction == 1)) {
        return;
    }
    game.snake.direction = direction;
}

// Update game state
EMSCRIPTEN_KEEPALIVE
void update_game() {
    if (game.gameOver) return;
    
    // Calculate new head position
    Point newHead = game.snake.body[0];
    
    switch (game.snake.direction) {
        case 0: newHead.y--; break; // Up
        case 1: newHead.x++; break; // Right
        case 2: newHead.y++; break; // Down
        case 3: newHead.x--; break; // Left
    }
    
    // Check wall collision
    if (newHead.x < 0 || newHead.x >= GRID_WIDTH ||
        newHead.y < 0 || newHead.y >= GRID_HEIGHT) {
        game.gameOver = 1;
        return;
    }
    
    // Check self collision
    for (int i = 0; i < game.snake.length; i++) {
        if (game.snake.body[i].x == newHead.x && 
            game.snake.body[i].y == newHead.y) {
            game.gameOver = 1;
            return;
        }
    }
    
    // Move snake body
    for (int i = game.snake.length - 1; i > 0; i--) {
        game.snake.body[i] = game.snake.body[i - 1];
    }
    game.snake.body[0] = newHead;
    
    // Check food collision
    if (newHead.x == game.food.x && newHead.y == game.food.y) {
        // Increase score and snake length
        game.score += 10;
        if (game.snake.length < MAX_SNAKE_LENGTH) {
            game.snake.length++;
        }
        
        // Generate new food position
        int placed = 0;
        while (!placed) {
            game.food.x = random_range(GRID_WIDTH);
            game.food.y = random_range(GRID_HEIGHT);
            
            placed = 1;
            for (int i = 0; i < game.snake.length; i++) {
                if (game.snake.body[i].x == game.food.x && 
                    game.snake.body[i].y == game.food.y) {
                    placed = 0;
                    break;
                }
            }
        }
    }
}

// Get grid state for rendering
EMSCRIPTEN_KEEPALIVE
void get_grid_state(int* buffer) {
    // Clear grid
    for (int i = 0; i < GRID_WIDTH * GRID_HEIGHT; i++) {
        buffer[i] = 0;
    }
    
    // Mark snake body (value = 1)
    for (int i = 0; i < game.snake.length; i++) {
        int idx = game.snake.body[i].y * GRID_WIDTH + game.snake.body[i].x;
        buffer[idx] = (i == 0) ? 3 : 1; // Head = 3, body = 1
    }
    
    // Mark food (value = 2)
    int foodIdx = game.food.y * GRID_WIDTH + game.food.x;
    buffer[foodIdx] = 2;
}

// Getters for game state
EMSCRIPTEN_KEEPALIVE
int get_score() {
    return game.score;
}

EMSCRIPTEN_KEEPALIVE
int is_game_over() {
    return game.gameOver;
}

EMSCRIPTEN_KEEPALIVE
int get_grid_width() {
    return GRID_WIDTH;
}

EMSCRIPTEN_KEEPALIVE
int get_grid_height() {
    return GRID_HEIGHT;
}