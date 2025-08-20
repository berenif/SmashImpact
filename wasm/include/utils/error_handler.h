#ifndef ERROR_HANDLER_H
#define ERROR_HANDLER_H

#include <string>
#include <exception>
#include <functional>
#include <unordered_map>
#include <emscripten/emscripten.h>
#include <emscripten/val.h>

// Error types
enum class ErrorType {
    INITIALIZATION_ERROR,
    MEMORY_ERROR,
    PHYSICS_ERROR,
    COLLISION_ERROR,
    ENTITY_ERROR,
    BOUNDS_ERROR,
    INVALID_PARAMETER,
    UNKNOWN_ERROR
};

// Custom exception class
class GameException : public std::exception {
private:
    ErrorType type;
    std::string message;
    std::string context;
    int errorCode;
    
public:
    GameException(ErrorType t, const std::string& msg, const std::string& ctx = "", int code = -1)
        : type(t), message(msg), context(ctx), errorCode(code) {}
    
    const char* what() const noexcept override {
        return message.c_str();
    }
    
    ErrorType getType() const { return type; }
    const std::string& getContext() const { return context; }
    int getErrorCode() const { return errorCode; }
};

// Error handler singleton
class ErrorHandler {
private:
    static ErrorHandler* instance;
    
    struct ErrorInfo {
        ErrorType type;
        std::string message;
        std::string context;
        int count;
        double lastOccurrence;
        
        ErrorInfo() : type(ErrorType::UNKNOWN_ERROR), count(0), lastOccurrence(0) {}
    };
    
    std::unordered_map<std::string, ErrorInfo> errorLog;
    std::function<void(const GameException&)> errorCallback;
    bool debugMode;
    size_t maxErrorLogSize;
    
    ErrorHandler() : debugMode(false), maxErrorLogSize(1000) {}
    
public:
    static ErrorHandler& getInstance() {
        if (!instance) {
            instance = new ErrorHandler();
        }
        return *instance;
    }
    
    // Set debug mode
    void setDebugMode(bool enabled) {
        debugMode = enabled;
        if (enabled) {
            EM_ASM(console.log("🐛 Debug mode enabled for WASM Game Engine"));
        }
    }
    
    // Set error callback for JavaScript
    void setErrorCallback(std::function<void(const GameException&)> callback) {
        errorCallback = callback;
    }
    
    // Handle an error
    void handleError(const GameException& error) {
        // Log to error history
        std::string key = std::to_string(static_cast<int>(error.getType())) + ":" + error.what();
        ErrorInfo& info = errorLog[key];
        info.type = error.getType();
        info.message = error.what();
        info.context = error.getContext();
        info.count++;
        info.lastOccurrence = emscripten_get_now();
        
        // Limit error log size
        if (errorLog.size() > maxErrorLogSize) {
            // Remove oldest entry
            auto oldest = errorLog.begin();
            for (auto it = errorLog.begin(); it != errorLog.end(); ++it) {
                if (it->second.lastOccurrence < oldest->second.lastOccurrence) {
                    oldest = it;
                }
            }
            errorLog.erase(oldest);
        }
        
        // Log to console in debug mode
        if (debugMode) {
            EM_ASM({
                console.error("🔴 WASM Error:", {
                    type: $0,
                    message: UTF8ToString($1),
                    context: UTF8ToString($2),
                    code: $3
                });
            }, static_cast<int>(error.getType()), 
               error.what(), 
               error.getContext().c_str(), 
               error.getErrorCode());
        }
        
        // Call error callback if set
        if (errorCallback) {
            errorCallback(error);
        }
    }
    
    // Report error to JavaScript
    emscripten::val getErrorReport() {
        emscripten::val report = emscripten::val::object();
        emscripten::val errors = emscripten::val::array();
        
        for (const auto& [key, info] : errorLog) {
            emscripten::val errorObj = emscripten::val::object();
            errorObj.set("type", static_cast<int>(info.type));
            errorObj.set("message", info.message);
            errorObj.set("context", info.context);
            errorObj.set("count", info.count);
            errorObj.set("lastOccurrence", info.lastOccurrence);
            errors.call<void>("push", errorObj);
        }
        
        report.set("errors", errors);
        report.set("totalErrors", errorLog.size());
        report.set("debugMode", debugMode);
        
        return report;
    }
    
    // Clear error log
    void clearErrorLog() {
        errorLog.clear();
    }
    
    // Check if we should suppress repeated errors
    bool shouldSuppressError(const std::string& errorKey) {
        auto it = errorLog.find(errorKey);
        if (it != errorLog.end()) {
            double now = emscripten_get_now();
            // Suppress if same error occurred within 100ms
            if (now - it->second.lastOccurrence < 100) {
                return true;
            }
        }
        return false;
    }
};

// Assertion macros for debug builds
#ifdef DEBUG_BUILD
    #define GAME_ASSERT(condition, message) \
        do { \
            if (!(condition)) { \
                throw GameException(ErrorType::UNKNOWN_ERROR, \
                                  std::string("Assertion failed: ") + message, \
                                  __FILE__ + std::string(":") + std::to_string(__LINE__)); \
            } \
        } while(0)
    
    #define GAME_ASSERT_BOUNDS(value, min, max, name) \
        do { \
            if ((value) < (min) || (value) > (max)) { \
                throw GameException(ErrorType::BOUNDS_ERROR, \
                                  std::string(name) + " out of bounds: " + std::to_string(value), \
                                  __FILE__ + std::string(":") + std::to_string(__LINE__)); \
            } \
        } while(0)
    
    #define GAME_ASSERT_NOT_NULL(ptr, name) \
        do { \
            if (!(ptr)) { \
                throw GameException(ErrorType::INVALID_PARAMETER, \
                                  std::string(name) + " is null", \
                                  __FILE__ + std::string(":") + std::to_string(__LINE__)); \
            } \
        } while(0)
#else
    #define GAME_ASSERT(condition, message)
    #define GAME_ASSERT_BOUNDS(value, min, max, name)
    #define GAME_ASSERT_NOT_NULL(ptr, name)
#endif

// Error handling macros
#define TRY_GAME_OPERATION(operation, errorType, context) \
    try { \
        operation; \
    } catch (const std::exception& e) { \
        ErrorHandler::getInstance().handleError( \
            GameException(errorType, e.what(), context)); \
    } catch (...) { \
        ErrorHandler::getInstance().handleError( \
            GameException(errorType, "Unknown error", context)); \
    }

// Safe wrapper for WASM exports
template<typename ReturnType, typename... Args>
class SafeExport {
private:
    std::function<ReturnType(Args...)> func;
    ReturnType defaultValue;
    std::string name;
    
public:
    SafeExport(std::function<ReturnType(Args...)> f, ReturnType def, const std::string& n)
        : func(f), defaultValue(def), name(n) {}
    
    ReturnType operator()(Args... args) {
        try {
            return func(args...);
        } catch (const GameException& e) {
            ErrorHandler::getInstance().handleError(e);
            return defaultValue;
        } catch (const std::exception& e) {
            ErrorHandler::getInstance().handleError(
                GameException(ErrorType::UNKNOWN_ERROR, e.what(), name));
            return defaultValue;
        } catch (...) {
            ErrorHandler::getInstance().handleError(
                GameException(ErrorType::UNKNOWN_ERROR, "Unknown error in " + name, name));
            return defaultValue;
        }
    }
};

#endif // ERROR_HANDLER_H