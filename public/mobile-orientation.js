/**
 * Mobile Orientation Detection and Landscape Mode Invitation
 * Detects mobile devices and invites users to switch to landscape mode
 */

class MobileOrientationDetector {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
    this.isMobile = this.detectMobile();
    this.isPortrait = false;
    this.animationFrame = null;
    
    // Bind methods
    this.handleOrientationChange = this.handleOrientationChange.bind(this);
    this.checkOrientation = this.checkOrientation.bind(this);
    
    // Initialize if on mobile
    if (this.isMobile) {
      this.init();
    }
  }
  
  /**
   * Detect if the device is mobile
   */
  detectMobile() {
    // Check multiple indicators for mobile devices
    const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenSize = window.innerWidth <= 768 && window.innerHeight <= 1024;
    
    // Consider it mobile if any two conditions are true
    let mobileIndicators = 0;
    if (userAgent) mobileIndicators++;
    if (touchSupport) mobileIndicators++;
    if (screenSize) mobileIndicators++;
    
    return mobileIndicators >= 2;
  }
  
  /**
   * Initialize the orientation detector
   */
  init() {
    // Create the overlay element
    this.createOverlay();
    
    // Add event listeners
    window.addEventListener('orientationchange', this.handleOrientationChange);
    window.addEventListener('resize', this.checkOrientation);
    
    // Add fullscreen change listener
    document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('mozfullscreenchange', this.handleFullscreenChange.bind(this));
    document.addEventListener('MSFullscreenChange', this.handleFullscreenChange.bind(this));
    
    // Check initial orientation
    this.checkOrientation();
  }
  
  /**
   * Create the landscape invitation overlay
   */
  createOverlay() {
    // Create overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'orientation-overlay';
    this.overlay.innerHTML = `
      <div class="orientation-content">
        <div class="phone-icon-container">
          <div class="phone-icon">
            <svg width="120" height="200" viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Phone body -->
              <rect x="10" y="10" width="100" height="180" rx="15" stroke="currentColor" stroke-width="3" fill="none"/>
              <!-- Screen -->
              <rect x="20" y="30" width="80" height="140" rx="5" fill="currentColor" opacity="0.2"/>
              <!-- Home button indicator -->
              <rect x="50" y="175" width="20" height="3" rx="2" fill="currentColor"/>
              <!-- Rotation arrow -->
              <g class="rotation-arrow">
                <path d="M 60 100 A 40 40 0 0 1 100 140" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
                <path d="M 95 135 L 100 140 L 95 145" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </svg>
          </div>
        </div>
        <h2 class="orientation-title">Rotate Your Device</h2>
        <p class="orientation-message">For the best gaming experience, please rotate your device to landscape mode</p>
        <div class="orientation-hint">
          <span class="hint-icon">↻</span>
          <span>Turn your phone sideways</span>
        </div>
      </div>
    `;
    
    // Add styles
    this.addStyles();
    
    // Append to body
    document.body.appendChild(this.overlay);
  }
  
  /**
   * Add CSS styles for the overlay
   */
  addStyles() {
    if (document.getElementById('orientation-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'orientation-styles';
    styles.textContent = `
      .orientation-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        z-index: 99999;
        display: none;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease-out;
      }
      
      .orientation-overlay.visible {
        display: flex;
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      .orientation-content {
        text-align: center;
        color: white;
        padding: 2rem;
        max-width: 90%;
      }
      
      .phone-icon-container {
        margin-bottom: 2rem;
        position: relative;
      }
      
      .phone-icon {
        display: inline-block;
        animation: phoneRotate 2s ease-in-out infinite;
      }
      
      @keyframes phoneRotate {
        0%, 100% {
          transform: rotate(0deg);
        }
        50% {
          transform: rotate(90deg);
        }
      }
      
      .rotation-arrow {
        animation: arrowPulse 2s ease-in-out infinite;
        transform-origin: 60px 100px;
      }
      
      @keyframes arrowPulse {
        0%, 100% {
          opacity: 0.3;
        }
        50% {
          opacity: 1;
        }
      }
      
      .orientation-title {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1rem;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        animation: titlePulse 2s ease-in-out infinite;
      }
      
      @keyframes titlePulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      
      .orientation-message {
        font-size: 1.1rem;
        margin-bottom: 2rem;
        opacity: 0.95;
        line-height: 1.5;
      }
      
      .orientation-hint {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(255, 255, 255, 0.2);
        padding: 0.75rem 1.5rem;
        border-radius: 50px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        animation: hintBounce 2s ease-in-out infinite;
      }
      
      @keyframes hintBounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }
      
      .hint-icon {
        font-size: 1.5rem;
        animation: iconRotate 2s linear infinite;
      }
      
      @keyframes iconRotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      
      /* Responsive adjustments */
      @media (max-height: 500px) {
        .phone-icon svg {
          width: 80px;
          height: 133px;
        }
        
        .orientation-title {
          font-size: 1.5rem;
        }
        
        .orientation-message {
          font-size: 1rem;
        }
        
        .orientation-content {
          padding: 1rem;
        }
      }
      
      /* Additional animation for emphasis */
      .orientation-overlay.visible .phone-icon-container {
        animation: slideInFromTop 0.5s ease-out;
      }
      
      @keyframes slideInFromTop {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .orientation-overlay.visible .orientation-title {
        animation: slideInFromLeft 0.6s ease-out;
      }
      
      @keyframes slideInFromLeft {
        from {
          transform: translateX(-30px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .orientation-overlay.visible .orientation-message {
        animation: slideInFromRight 0.7s ease-out;
      }
      
      @keyframes slideInFromRight {
        from {
          transform: translateX(30px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .orientation-overlay.visible .orientation-hint {
        animation: slideInFromBottom 0.8s ease-out, hintBounce 2s ease-in-out infinite 0.8s;
      }
      
      @keyframes slideInFromBottom {
        from {
          transform: translateY(30px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  /**
   * Check current orientation and show/hide overlay
   */
  checkOrientation() {
    if (!this.isMobile) return;
    
    // Check if in portrait mode
    const aspectRatio = window.innerWidth / window.innerHeight;
    this.isPortrait = aspectRatio < 1;
    
    // Alternative check using orientation API if available
    if (window.orientation !== undefined) {
      this.isPortrait = Math.abs(window.orientation) !== 90;
    }
    
    // Show or hide overlay based on orientation
    if (this.isPortrait) {
      this.showOverlay();
      this.exitFullscreen();
    } else {
      // In landscape mode
      if (this.isVisible) {
        this.hideOverlay();
      } else {
        // If already in landscape on load or refresh, enter fullscreen
        this.enterFullscreen();
      }
    }
  }
  
  /**
   * Handle orientation change event
   */
  handleOrientationChange() {
    // Add a small delay to ensure dimensions are updated
    setTimeout(() => {
      this.checkOrientation();
    }, 100);
  }
  
  /**
   * Handle fullscreen change event
   */
  handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || 
                           document.webkitFullscreenElement || 
                           document.mozFullScreenElement || 
                           document.msFullscreenElement);
    
    if (!isFullscreen && this.isMobile && !this.isPortrait) {
      // User manually exited fullscreen while in landscape
      console.log('User exited fullscreen mode manually');
      // Optionally re-enter fullscreen after a delay
      // setTimeout(() => this.enterFullscreen(), 1000);
    }
  }
  
  /**
   * Show the orientation overlay with animation
   */
  showOverlay() {
    if (!this.overlay || this.isVisible) return;
    
    this.overlay.classList.add('visible');
    this.isVisible = true;
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('orientationOverlayShown', {
      detail: { isPortrait: true }
    }));
    
    // Log for debugging
    console.log('Mobile device detected in portrait mode - showing landscape invitation');
  }
  
  /**
   * Hide the orientation overlay
   */
  hideOverlay() {
    if (!this.overlay || !this.isVisible) return;
    
    this.overlay.classList.remove('visible');
    this.isVisible = false;
    
    // Enter fullscreen when mobile and landscape
    this.enterFullscreen();
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('orientationOverlayHidden', {
      detail: { isPortrait: false }
    }));
    
    // Log for debugging
    console.log('Device rotated to landscape mode - hiding overlay and entering fullscreen');
  }
  
  /**
   * Enter fullscreen mode
   */
  enterFullscreen() {
    if (!this.isMobile) return;
    
    const elem = document.documentElement;
    
    // Check if already in fullscreen
    if (document.fullscreenElement || 
        document.webkitFullscreenElement || 
        document.mozFullScreenElement || 
        document.msFullscreenElement) {
      return;
    }
    
    // Request fullscreen using the appropriate method
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log('Error attempting to enable fullscreen:', err.message);
      });
    } else if (elem.webkitRequestFullscreen) {
      // Safari/old Chrome
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      // Old Firefox
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      // Old IE/Edge
      elem.msRequestFullscreen();
    }
    
    console.log('Entering fullscreen mode for mobile landscape');
  }
  
  /**
   * Exit fullscreen mode
   */
  exitFullscreen() {
    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement && 
        !document.mozFullScreenElement && 
        !document.msFullscreenElement) {
      return;
    }
    
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.log('Error attempting to exit fullscreen:', err.message);
      });
    } else if (document.webkitExitFullscreen) {
      // Safari/old Chrome
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      // Old Firefox
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      // Old IE/Edge
      document.msExitFullscreen();
    }
    
    console.log('Exiting fullscreen mode');
  }
  
  /**
   * Force check (useful for testing)
   */
  forceCheck() {
    this.checkOrientation();
  }
  
  /**
   * Destroy the detector and clean up
   */
  destroy() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.removeEventListener('resize', this.checkOrientation);
    
    // Remove fullscreen event listeners
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.handleFullscreenChange);
    
    const styles = document.getElementById('orientation-styles');
    if (styles) {
      styles.remove();
    }
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      isMobile: this.isMobile,
      isPortrait: this.isPortrait,
      isOverlayVisible: this.isVisible
    };
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.mobileOrientationDetector = new MobileOrientationDetector();
  });
} else {
  window.mobileOrientationDetector = new MobileOrientationDetector();
}