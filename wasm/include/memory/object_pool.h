#ifndef OBJECT_POOL_H
#define OBJECT_POOL_H

#include <vector>
#include <queue>
#include <memory>
#include <functional>
#include <type_traits>

// Modern object pool implementation for efficient memory management
// Reduces allocation overhead and improves cache locality
template<typename T>
class ObjectPool {
private:
    struct PoolDeleter {
        ObjectPool* pool;
        
        void operator()(T* ptr) {
            if (pool && ptr) {
                pool->returnObject(ptr);
            }
        }
    };
    
    using UniquePtr = std::unique_ptr<T, PoolDeleter>;
    
    std::vector<std::unique_ptr<T>> pool;
    std::queue<T*> available;
    size_t maxSize;
    size_t currentSize;
    std::function<void(T*)> resetFunc;
    
public:
    explicit ObjectPool(size_t initialSize = 100, size_t maxSize = 1000)
        : maxSize(maxSize), currentSize(0) {
        reserve(initialSize);
    }
    
    // Set custom reset function for objects
    void setResetFunction(std::function<void(T*)> func) {
        resetFunc = func;
    }
    
    // Pre-allocate objects
    void reserve(size_t count) {
        for (size_t i = 0; i < count && currentSize < maxSize; ++i) {
            auto obj = std::make_unique<T>();
            available.push(obj.get());
            pool.push_back(std::move(obj));
            currentSize++;
        }
    }
    
    // Get object from pool (with constructor arguments)
    template<typename... Args>
    UniquePtr acquire(Args&&... args) {
        T* obj = nullptr;
        
        if (!available.empty()) {
            // Reuse existing object
            obj = available.front();
            available.pop();
            
            // Reconstruct in-place
            obj->~T();
            new(obj) T(std::forward<Args>(args)...);
        } else if (currentSize < maxSize) {
            // Create new object
            auto newObj = std::make_unique<T>(std::forward<Args>(args)...);
            obj = newObj.release();
            currentSize++;
        } else {
            // Pool exhausted, create temporary object
            // This will be deleted normally, not returned to pool
            return UniquePtr(new T(std::forward<Args>(args)...), PoolDeleter{nullptr});
        }
        
        return UniquePtr(obj, PoolDeleter{this});
    }
    
    // Return object to pool
    void returnObject(T* obj) {
        if (!obj || available.size() >= maxSize) {
            delete obj;
            return;
        }
        
        // Reset object state
        if (resetFunc) {
            resetFunc(obj);
        } else {
            // Default reset: call reset method if it exists
            if constexpr (requires { obj->reset(); }) {
                obj->reset();
            }
        }
        
        available.push(obj);
    }
    
    // Get pool statistics
    size_t getAvailableCount() const { return available.size(); }
    size_t getTotalCount() const { return currentSize; }
    size_t getInUseCount() const { return currentSize - available.size(); }
    
    // Clear all objects
    void clear() {
        while (!available.empty()) {
            available.pop();
        }
        pool.clear();
        currentSize = 0;
    }
    
    ~ObjectPool() {
        clear();
    }
};

// Specialized pool for POD types with faster allocation
template<typename T>
class FastObjectPool {
    static_assert(std::is_trivially_copyable_v<T>, 
                  "FastObjectPool only works with POD types");
    
private:
    std::vector<T> storage;
    std::vector<T*> available;
    size_t maxSize;
    
public:
    explicit FastObjectPool(size_t initialSize = 100, size_t maxSize = 1000)
        : maxSize(maxSize) {
        reserve(initialSize);
    }
    
    void reserve(size_t count) {
        size_t oldSize = storage.size();
        storage.resize(oldSize + count);
        
        for (size_t i = oldSize; i < storage.size(); ++i) {
            available.push_back(&storage[i]);
        }
    }
    
    T* acquire() {
        if (available.empty()) {
            if (storage.size() < maxSize) {
                reserve(std::min(size_t(100), maxSize - storage.size()));
            } else {
                return nullptr;
            }
        }
        
        T* obj = available.back();
        available.pop_back();
        *obj = T{}; // Reset to default
        return obj;
    }
    
    void release(T* obj) {
        if (obj >= &storage[0] && obj < &storage[0] + storage.size()) {
            available.push_back(obj);
        }
    }
    
    size_t getAvailableCount() const { return available.size(); }
    size_t getTotalCount() const { return storage.size(); }
};

// Global pools for common entity types
namespace Pools {
    extern ObjectPool<class Projectile> projectilePool;
    extern ObjectPool<class Particle> particlePool;
    extern FastObjectPool<struct CollisionPair> collisionPool;
}

#endif // OBJECT_POOL_H