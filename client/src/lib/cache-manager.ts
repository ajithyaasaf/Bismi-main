// Cache Management System for Instant Updates
export class CacheManager {
  private static instance: CacheManager;
  private updateAvailable = false;
  private registration: ServiceWorkerRegistration | null = null;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async initialize(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker registered successfully');

        // Check for updates immediately
        await this.checkForUpdates();

        // Listen for service worker updates
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New version available');
                this.updateAvailable = true;
                this.notifyUpdateAvailable();
              }
            });
          }
        });

        // Listen for service worker messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CACHE_CLEARED') {
            console.log('Cache cleared, reloading page...');
            window.location.reload();
          }
        });

        // Event-driven updates only - no time-based intervals
        // Check when tab becomes active (no rate limiting needed since intervals are removed)
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) {
            this.checkForUpdates();
          }
        });
        
        // Network change detection (no rate limiting needed)
        window.addEventListener('online', () => {
          setTimeout(() => {
            this.checkForUpdates();
          }, 1000);
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  async checkForUpdates(): Promise<void> {
    if (this.registration) {
      try {
        await this.registration.update();
      } catch (error) {
        console.log('Update check failed:', error);
      }
    }
  }

  async performDeepVersionCheck(): Promise<void> {
    try {
      // Multi-endpoint version checking for maximum reliability
      const endpoints = ['/api/health', '/api/suppliers', '/api/customers'];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${endpoint}?v=${Date.now()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'If-None-Match': '*'
          }
        });

        if (response.ok) {
          const etag = response.headers.get('etag');
          const lastModified = response.headers.get('last-modified');
          
          // Check if deployment has changed based on headers
          const cacheKey = `deployment-${endpoint}`;
          const storedEtag = localStorage.getItem(cacheKey);
          
          if (storedEtag && etag && storedEtag !== etag) {
            console.log(`Deployment change detected on ${endpoint}`);
            this.triggerAutomaticUpdate();
            return;
          }
          
          if (etag) {
            localStorage.setItem(cacheKey, etag);
          }
        }
      }
    } catch (error) {
      console.log('Deep version check failed:', error);
    }
  }

  private async triggerAutomaticUpdate(): Promise<void> {
    if (this.updateAvailable) return; // Prevent multiple simultaneous updates
    
    this.updateAvailable = true;
    console.log('🚀 Automatic deployment update initiated');
    
    // Show minimal non-intrusive loading indicator
    this.showUpdateIndicator();
    
    // Wait a moment for any ongoing operations to complete
    setTimeout(async () => {
      await this.clearAllCaches();
    }, 2000);
  }

  private showUpdateIndicator(): void {
    const indicator = document.createElement('div');
    indicator.id = 'auto-update-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white;
        padding: 6px 12px;
        border-radius: 15px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
      ">
        <div style="
          width: 12px;
          height: 12px;
          border: 1.5px solid rgba(255,255,255,0.4);
          border-top: 1.5px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        Auto-updating...
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(indicator);
  }

  async forceUpdate(): Promise<void> {
    if (this.registration?.waiting) {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Clear all caches and reload
      await this.clearAllCaches();
    }
  }

  async clearAllCaches(): Promise<void> {
    try {
      // Clear all browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      // Send message to service worker to clear its caches
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      // Force reload from server
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear caches:', error);
      // Force reload anyway
      window.location.reload();
    }
  }

  private notifyUpdateAvailable(): void {
    // Automatic silent update - no user interaction required
    console.log('New deployment detected - automatically updating...');
    
    // Show minimal loading indicator during automatic update
    const loadingIndicator = document.createElement('div');
    loadingIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
      ">
        <div style="
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        Updating...
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    document.body.appendChild(loadingIndicator);

    // Automatically trigger update after brief delay
    setTimeout(() => {
      this.forceUpdate();
    }, 1500);
  }

  // Public method to manually refresh cache (for admin use)
  async manualRefresh(): Promise<void> {
    console.log('Manual cache refresh triggered');
    await this.clearAllCaches();
  }

  isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }
}

// Enterprise-grade version checking with multiple detection mechanisms
export class VersionChecker {
  private static currentVersion: string | null = null;
  private static deploymentFingerprint: string | null = null;
  private static lastCheckTimestamp = 0;

  static async checkVersion(): Promise<boolean> {
    try {
      const now = Date.now();
      
      // Rate limiting: don't check more than once every 5 seconds
      if (now - this.lastCheckTimestamp < 5000) {
        return false;
      }
      
      this.lastCheckTimestamp = now;

      // Multi-layered version detection
      const checks = await Promise.allSettled([
        this.checkHealthEndpoint(),
        this.checkStaticAssetVersion(),
        this.checkServiceWorkerVersion(),
        this.checkHTMLFingerprint()
      ]);

      // If any check indicates an update is needed, trigger it
      const updateNeeded = checks.some(result => 
        result.status === 'fulfilled' && result.value === true
      );

      if (updateNeeded) {
        console.log('🚀 Deployment change detected via multi-layer checking');
        return true;
      }

    } catch (error) {
      console.log('Version check failed:', error);
    }

    return false;
  }

  private static async checkHealthEndpoint(): Promise<boolean> {
    try {
      const response = await fetch(`/api/health?cache_bust=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'If-None-Match': '*'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const serverVersion = data.version || data.deployment?.sha || data.timestamp;
        const etag = response.headers.get('etag');

        if (this.currentVersion && serverVersion !== this.currentVersion) {
          console.log('📡 Health endpoint version change:', { 
            old: this.currentVersion, 
            new: serverVersion 
          });
          this.currentVersion = serverVersion;
          return true;
        }

        this.currentVersion = serverVersion;
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  private static async checkStaticAssetVersion(): Promise<boolean> {
    try {
      // Check if main CSS/JS files have changed by attempting to fetch with cache busting
      const response = await fetch(`/?v=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const lastModified = response.headers.get('last-modified');
      const etag = response.headers.get('etag');
      
      const fingerprint = `${lastModified}-${etag}`;
      
      if (this.deploymentFingerprint && fingerprint !== this.deploymentFingerprint) {
        console.log('📡 Static asset fingerprint changed');
        this.deploymentFingerprint = fingerprint;
        return true;
      }
      
      this.deploymentFingerprint = fingerprint;
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  private static async checkServiceWorkerVersion(): Promise<boolean> {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Check if there's a waiting service worker (new version available)
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          console.log('📡 New service worker is waiting');
          return true;
        }
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  private static async checkHTMLFingerprint(): Promise<boolean> {
    try {
      // Create a subtle fingerprint of the current DOM to detect changes
      const metaTags = document.querySelectorAll('meta[name], meta[property]');
      const fingerprint = Array.from(metaTags)
        .map(tag => tag.getAttribute('content'))
        .join('|');

      const stored = sessionStorage.getItem('dom-fingerprint');
      if (stored && stored !== fingerprint) {
        console.log('📡 DOM fingerprint changed - possible deployment');
        sessionStorage.setItem('dom-fingerprint', fingerprint);
        return true;
      }
      
      if (!stored) {
        sessionStorage.setItem('dom-fingerprint', fingerprint);
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  static setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }

  // Advanced deployment detection using multiple signals
  static async performAdvancedDeploymentDetection(): Promise<boolean> {
    const signals = await Promise.allSettled([
      // Signal 1: Check for Vercel deployment headers
      fetch('/api/health').then(r => r.headers.get('x-vercel-cache')),
      
      // Signal 2: Browser cache invalidation check
      this.checkBrowserCacheInvalidation(),
      
      // Signal 3: Service worker update detection
      this.detectServiceWorkerUpdates(),
      
      // Signal 4: Application timestamp check
      this.checkApplicationTimestamp()
    ]);

    return signals.some(signal => 
      signal.status === 'fulfilled' && signal.value === true
    );
  }

  private static async checkBrowserCacheInvalidation(): Promise<boolean> {
    try {
      // Check multiple endpoints with different cache strategies
      const endpoints = ['/api/health', '/api/suppliers', '/api/customers'];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${endpoint}?invalidate=${Date.now()}`, {
          cache: 'reload',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        const cacheStatus = response.headers.get('cache-control');
        const etag = response.headers.get('etag');
        
        // Store and compare ETags for change detection
        const key = `etag-${endpoint}`;
        const stored = localStorage.getItem(key);
        
        if (stored && etag && stored !== etag) {
          localStorage.setItem(key, etag);
          return true;
        }
        
        if (etag) localStorage.setItem(key, etag);
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }

  private static async detectServiceWorkerUpdates(): Promise<boolean> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          return Boolean(registration.waiting);
        }
      } catch (error) {
        // Silent fail
      }
    }
    return false;
  }

  private static async checkApplicationTimestamp(): Promise<boolean> {
    try {
      // Check for a timestamp embedded in the page
      const appStart = window.performance.timing.navigationStart;
      const lastKnownStart = parseInt(sessionStorage.getItem('app-start') || '0');
      
      if (lastKnownStart && Math.abs(appStart - lastKnownStart) > 60000) {
        sessionStorage.setItem('app-start', appStart.toString());
        return true;
      }
      
      if (!lastKnownStart) {
        sessionStorage.setItem('app-start', appStart.toString());
      }
    } catch (error) {
      // Silent fail
    }
    return false;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();