cmake_minimum_required(VERSION 3.20)
project(SmashImpactWASM VERSION 1.0.0 LANGUAGES CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Emscripten specific settings
if(EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".js")
    
    # Modern Emscripten flags for best practices
    set(EMSCRIPTEN_FLAGS
        "-s WASM=1"
        "-s MODULARIZE=1"
        "-s EXPORT_NAME='GameEngineModule'"
        "-s EXPORT_ES6=1"
        "-s ENVIRONMENT='web'"
        "-s ALLOW_MEMORY_GROWTH=1"
        "-s INITIAL_MEMORY=16777216"  # 16MB initial memory
        "-s MAXIMUM_MEMORY=268435456"  # 256MB max memory
        "-s MALLOC=emmalloc"  # Use emmalloc for better performance
        "-s FILESYSTEM=0"  # Disable filesystem for smaller size
        "-s ASSERTIONS=0"  # Disable assertions in release
        "-s SAFE_HEAP=0"  # Disable safe heap in release
        "-s STACK_OVERFLOW_CHECK=0"  # Disable stack overflow check in release
        "-s DISABLE_EXCEPTION_CATCHING=0"  # Enable exception handling
        "-s NO_EXIT_RUNTIME=1"  # Keep runtime alive
        "-s STRICT=1"  # Enable strict mode
        "-s WASM_BIGINT=1"  # Enable BigInt support
        "--bind"  # Enable embind
    )
    
    # Optimization flags for release
    set(OPTIMIZATION_FLAGS_RELEASE
        "-O3"
        "-flto"  # Link-time optimization
        "-ffast-math"  # Fast math operations
        # "-fno-rtti"  # RTTI is required for Emscripten bindings
        # "-fno-exceptions"  # Exceptions are enabled for error handling
        "-DNDEBUG"
    )
    
    # SIMD optimization flags (if supported)
    set(SIMD_FLAGS
        "-msimd128"  # Enable WASM SIMD
        "-mrelaxed-simd"  # Enable relaxed SIMD operations
    )
    
    # Debug flags
    set(DEBUG_FLAGS
        "-O0"
        "-g"
        "-s ASSERTIONS=2"
        "-s SAFE_HEAP=1"
        "-s STACK_OVERFLOW_CHECK=2"
        "-s DEMANGLE_SUPPORT=1"
        "-gsource-map"
        "--source-map-base http://localhost:8080/"
    )
    
    # Threading support (SharedArrayBuffer)
    set(THREADING_FLAGS
        "-s USE_PTHREADS=1"
        "-s PTHREAD_POOL_SIZE=4"
        "-s PROXY_TO_PTHREAD=1"
    )
endif()

# Source files
set(SOURCES
    src/game_engine.cpp
    src/entity.cpp
    src/math/vector2_simd.cpp
    src/entities/player.cpp
    src/entities/enemy.cpp
    # src/entities/wolf.cpp  # Commented out - implementation is in header
    src/entities/projectile.cpp
    src/entities/powerup.cpp
    src/entities/obstacle.cpp
    src/systems/collision_system.cpp
    src/systems/wave_system.cpp
    src/systems/physics_system.cpp
    src/effects/visual_effects.cpp
    src/effects/particle_system.cpp
    src/memory/object_pool.cpp
    src/utils/performance_monitor.cpp
)

# Header files
set(HEADERS
    include/game_engine.h
    include/config/game_config.h
    include/math/vector2.h
    include/math/vector2_simd.h
    include/entities/entity.h
    include/entities/player.h
    include/entities/enemy.h
    include/entities/wolf.h
    include/entities/projectile.h
    include/entities/powerup.h
    include/entities/obstacle.h
    include/systems/collision_system.h
    include/systems/wave_system.h
    include/systems/physics_system.h
    include/effects/visual_effects.h
    include/effects/particle.h
    include/memory/object_pool.h
    include/utils/performance_monitor.h
)

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

# Create the WebAssembly module
add_executable(game_engine ${SOURCES} ${HEADERS})

# Apply Emscripten flags
if(EMSCRIPTEN)
    # Determine build type
    if(CMAKE_BUILD_TYPE STREQUAL "Debug")
        string(REPLACE ";" " " DEBUG_FLAGS_STR "${DEBUG_FLAGS}")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${DEBUG_FLAGS_STR}")
        target_compile_definitions(game_engine PRIVATE DEBUG_BUILD)
    else()
        string(REPLACE ";" " " OPT_FLAGS_STR "${OPTIMIZATION_FLAGS_RELEASE}")
        string(REPLACE ";" " " SIMD_FLAGS_STR "${SIMD_FLAGS}")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${OPT_FLAGS_STR} ${SIMD_FLAGS_STR}")
    endif()
    
    # Add threading support if enabled
    option(ENABLE_THREADING "Enable WebAssembly threading support" OFF)
    if(ENABLE_THREADING)
        string(REPLACE ";" " " THREAD_FLAGS_STR "${THREADING_FLAGS}")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} ${THREAD_FLAGS_STR}")
        target_compile_definitions(game_engine PRIVATE THREADING_ENABLED)
    endif()
    
    # Apply Emscripten linker flags
    string(REPLACE ";" " " EMSCRIPTEN_FLAGS_STR "${EMSCRIPTEN_FLAGS}")
    set_target_properties(game_engine PROPERTIES
        LINK_FLAGS "${EMSCRIPTEN_FLAGS_STR}"
    )
    
    # Set output directory
    set_target_properties(game_engine PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../public"
    )
endif()

# Add custom target for running tests
add_custom_target(test
    COMMAND ${CMAKE_COMMAND} -E echo "Running WebAssembly tests..."
    COMMAND python3 -m http.server 8080 --directory ${CMAKE_SOURCE_DIR}/../public &
    COMMAND ${CMAKE_COMMAND} -E echo "Test server running at http://localhost:8080/wasm-test.html"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

# Add custom target for benchmarking
add_custom_target(benchmark
    COMMAND ${CMAKE_COMMAND} -E echo "Running performance benchmarks..."
    COMMAND node ${CMAKE_SOURCE_DIR}/benchmarks/performance_test.js
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

# Installation rules
install(TARGETS game_engine
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/../public
)

install(FILES
    ${CMAKE_SOURCE_DIR}/../public/game_engine.wasm
    DESTINATION ${CMAKE_SOURCE_DIR}/../public
)