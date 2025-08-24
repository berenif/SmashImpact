/**
 * Browser compatibility checker for WebAssembly games
 */

function checkBrowserCompatibility() {
    const issues = [];
    const warnings = [];
    
    // Check for WebAssembly support
    if (typeof WebAssembly === 'undefined') {
        issues.push('WebAssembly is not supported in this browser');
    }
    
    // Check for required APIs
    if (!window.requestAnimationFrame) {
        issues.push('requestAnimationFrame is not supported');
    }
    
    if (!window.cancelAnimationFrame) {
        warnings.push('cancelAnimationFrame is not supported');
    }
    
    // Check for Canvas support
    const canvas = document.createElement('canvas');
    if (!canvas.getContext) {
        issues.push('Canvas is not supported');
    } else {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            issues.push('2D Canvas context is not supported');
        }
    }
    
    // Check for modern JavaScript features
    try {
        eval('const test = () => {}; let x = 1; const [a, b] = [1, 2];');
    } catch (e) {
        issues.push('Modern JavaScript features (ES6+) are not supported');
    }
    
    // Check for Promise support
    if (typeof Promise === 'undefined') {
        issues.push('Promises are not supported');
    }
    
    // Check for async/await support
    try {
        eval('async function test() { await Promise.resolve(); }');
    } catch (e) {
        issues.push('Async/await is not supported');
    }
    
    // Check for optional chaining support (ES2020)
    try {
        eval('const obj = {}; obj?.prop');
    } catch (e) {
        warnings.push('Optional chaining (?.) is not fully supported - using fallbacks');
    }
    
    // Check for ArrayBuffer and typed arrays
    if (typeof ArrayBuffer === 'undefined') {
        issues.push('ArrayBuffer is not supported');
    }
    
    if (typeof Int32Array === 'undefined') {
        issues.push('Typed arrays are not supported');
    }
    
    // Check for localStorage (optional but useful)
    try {
        if (typeof localStorage === 'undefined') {
            warnings.push('localStorage is not available - game progress cannot be saved');
        } else {
            // Test if localStorage is actually usable
            const testKey = '__test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
        }
    } catch (e) {
        warnings.push('localStorage is not accessible - game progress cannot be saved');
    }
    
    // Check for performance.now() (useful for timing)
    if (!window.performance || !window.performance.now) {
        warnings.push('High-resolution timing (performance.now) is not available');
    }
    
    // Browser-specific checks
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for old Internet Explorer
    if (userAgent.indexOf('msie') !== -1 || userAgent.indexOf('trident') !== -1) {
        issues.push('Internet Explorer is not supported. Please use a modern browser.');
    }
    
    // Check for very old Chrome/Safari/Firefox versions
    const chromeMatch = userAgent.match(/chrome\/(\d+)/);
    if (chromeMatch && parseInt(chromeMatch[1]) < 57) {
        warnings.push('Your Chrome version is outdated. Please update for best performance.');
    }
    
    const firefoxMatch = userAgent.match(/firefox\/(\d+)/);
    if (firefoxMatch && parseInt(firefoxMatch[1]) < 52) {
        warnings.push('Your Firefox version is outdated. Please update for best performance.');
    }
    
    const safariMatch = userAgent.match(/version\/(\d+).*safari/);
    if (safariMatch && parseInt(safariMatch[1]) < 11) {
        warnings.push('Your Safari version is outdated. Please update for best performance.');
    }
    
    // Check for mobile browsers (may have performance issues)
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
        warnings.push('Mobile browser detected. Performance may be limited on mobile devices.');
    }
    
    return {
        compatible: issues.length === 0,
        issues: issues,
        warnings: warnings
    };
}

// Polyfills for older browsers
(function() {
    // requestAnimationFrame polyfill
    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = (function() {
            return window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame ||
                   window.oRequestAnimationFrame ||
                   window.msRequestAnimationFrame ||
                   function(callback) {
                       return window.setTimeout(callback, 1000 / 60);
                   };
        })();
    }
    
    // cancelAnimationFrame polyfill
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = (function() {
            return window.webkitCancelAnimationFrame ||
                   window.mozCancelAnimationFrame ||
                   window.oCancelAnimationFrame ||
                   window.msCancelAnimationFrame ||
                   function(id) {
                       window.clearTimeout(id);
                   };
        })();
    }
    
    // performance.now polyfill
    if (!window.performance) {
        window.performance = {};
    }
    
    if (!window.performance.now) {
        let nowOffset = Date.now();
        if (performance.timing && performance.timing.navigationStart) {
            nowOffset = performance.timing.navigationStart;
        }
        window.performance.now = function() {
            return Date.now() - nowOffset;
        };
    }
})();