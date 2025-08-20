#include "../../include/utils/performance_monitor.h"
#include <emscripten/bind.h>

// Initialize static member
PerformanceMonitor* PerformanceMonitor::instance = nullptr;

// Export performance metrics to JavaScript
namespace {
    emscripten::val getPerformanceReport() {
        return PerformanceMonitor::getInstance().exportMetrics();
    }
    
    void resetPerformanceMonitor() {
        PerformanceMonitor::getInstance().reset();
    }
    
    void setProfilingEnabled(bool enabled) {
        // This would typically control whether profiling is active
        // For now, profiling is always active in debug builds
        #ifdef DEBUG_BUILD
        EM_ASM({
            console.log("Profiling is", $0 ? "enabled" : "disabled");
        }, enabled);
        #endif
    }
}

// Bind performance monitoring functions for JavaScript access
EMSCRIPTEN_BINDINGS(performance_monitor) {
    emscripten::function("getPerformanceReport", &getPerformanceReport);
    emscripten::function("resetPerformanceMonitor", &resetPerformanceMonitor);
    emscripten::function("setProfilingEnabled", &setProfilingEnabled);
}