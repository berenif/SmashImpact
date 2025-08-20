#ifndef PERFORMANCE_MONITOR_H
#define PERFORMANCE_MONITOR_H

#include <emscripten/emscripten.h>
#include <string>
#include <unordered_map>
#include <deque>
#include <chrono>

// Performance monitoring system for profiling and optimization
class PerformanceMonitor {
public:
    struct Metric {
        double current;
        double average;
        double min;
        double max;
        size_t samples;
        std::deque<double> history;
        
        Metric() : current(0), average(0), min(1e9), max(0), samples(0) {}
        
        void update(double value) {
            current = value;
            min = std::min(min, value);
            max = std::max(max, value);
            
            history.push_back(value);
            if (history.size() > 60) { // Keep last 60 frames
                history.pop_front();
            }
            
            // Calculate moving average
            double sum = 0;
            for (double v : history) {
                sum += v;
            }
            average = sum / history.size();
            samples++;
        }
        
        void reset() {
            current = 0;
            average = 0;
            min = 1e9;
            max = 0;
            samples = 0;
            history.clear();
        }
    };
    
private:
    std::unordered_map<std::string, Metric> metrics;
    std::unordered_map<std::string, double> timers;
    
    // Frame time tracking
    double lastFrameTime;
    double deltaTime;
    double fps;
    std::deque<double> frameHistory;
    
    // Memory tracking
    size_t currentMemory;
    size_t peakMemory;
    
    static PerformanceMonitor* instance;
    
public:
    PerformanceMonitor() : lastFrameTime(0), deltaTime(0), fps(0), 
                           currentMemory(0), peakMemory(0) {}
    
    static PerformanceMonitor& getInstance() {
        if (!instance) {
            instance = new PerformanceMonitor();
        }
        return *instance;
    }
    
    // Timer functions
    void startTimer(const std::string& name) {
        timers[name] = emscripten_get_now();
    }
    
    void endTimer(const std::string& name) {
        auto it = timers.find(name);
        if (it != timers.end()) {
            double elapsed = emscripten_get_now() - it->second;
            metrics[name].update(elapsed);
            timers.erase(it);
        }
    }
    
    // Scoped timer for RAII-style timing
    class ScopedTimer {
        std::string name;
        double startTime;
        
    public:
        explicit ScopedTimer(const std::string& timerName) 
            : name(timerName), startTime(emscripten_get_now()) {}
        
        ~ScopedTimer() {
            double elapsed = emscripten_get_now() - startTime;
            PerformanceMonitor::getInstance().recordMetric(name, elapsed);
        }
    };
    
    // Record custom metric
    void recordMetric(const std::string& name, double value) {
        metrics[name].update(value);
    }
    
    // Frame tracking
    void beginFrame() {
        double currentTime = emscripten_get_now();
        if (lastFrameTime > 0) {
            deltaTime = currentTime - lastFrameTime;
            frameHistory.push_back(deltaTime);
            if (frameHistory.size() > 60) {
                frameHistory.pop_front();
            }
            
            // Calculate FPS
            double avgFrameTime = 0;
            for (double ft : frameHistory) {
                avgFrameTime += ft;
            }
            avgFrameTime /= frameHistory.size();
            fps = 1000.0 / avgFrameTime;
        }
        lastFrameTime = currentTime;
    }
    
    void endFrame() {
        // Update memory usage
        updateMemoryUsage();
    }
    
    // Memory tracking
    void updateMemoryUsage() {
        // Get WASM memory usage
        size_t memoryUsage = EM_ASM_INT({
            if (typeof performance !== 'undefined' && performance.memory) {
                return performance.memory.usedJSHeapSize;
            }
            return 0;
        });
        
        currentMemory = memoryUsage;
        peakMemory = std::max(peakMemory, currentMemory);
    }
    
    // Get metrics
    const Metric* getMetric(const std::string& name) const {
        auto it = metrics.find(name);
        return (it != metrics.end()) ? &it->second : nullptr;
    }
    
    double getFPS() const { return fps; }
    double getDeltaTime() const { return deltaTime; }
    size_t getCurrentMemory() const { return currentMemory; }
    size_t getPeakMemory() const { return peakMemory; }
    
    // Export metrics to JavaScript
    emscripten::val exportMetrics() {
        emscripten::val result = emscripten::val::object();
        
        result.set("fps", fps);
        result.set("deltaTime", deltaTime);
        result.set("memoryUsed", currentMemory);
        result.set("memoryPeak", peakMemory);
        
        emscripten::val metricsObj = emscripten::val::object();
        for (const auto& [name, metric] : metrics) {
            emscripten::val metricObj = emscripten::val::object();
            metricObj.set("current", metric.current);
            metricObj.set("average", metric.average);
            metricObj.set("min", metric.min);
            metricObj.set("max", metric.max);
            metricObj.set("samples", metric.samples);
            metricsObj.set(name, metricObj);
        }
        result.set("metrics", metricsObj);
        
        return result;
    }
    
    // Reset all metrics
    void reset() {
        metrics.clear();
        timers.clear();
        frameHistory.clear();
        lastFrameTime = 0;
        deltaTime = 0;
        fps = 0;
    }
};

// Convenience macros for performance monitoring
#ifdef DEBUG_BUILD
    #define PERF_TIMER(name) PerformanceMonitor::ScopedTimer _timer_##name(#name)
    #define PERF_START(name) PerformanceMonitor::getInstance().startTimer(#name)
    #define PERF_END(name) PerformanceMonitor::getInstance().endTimer(#name)
    #define PERF_RECORD(name, value) PerformanceMonitor::getInstance().recordMetric(#name, value)
#else
    #define PERF_TIMER(name)
    #define PERF_START(name)
    #define PERF_END(name)
    #define PERF_RECORD(name, value)
#endif

#endif // PERFORMANCE_MONITOR_H