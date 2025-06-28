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

        // Check for updates every 30 seconds
        setInterval(() => this.checkForUpdates(), 30000);

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
    // Create a subtle notification for new version
    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #007bff;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        cursor: pointer;
        transition: all 0.3s ease;
      ">
        <div style="font-weight: 600; margin-bottom: 4px;">
          🚀 New version available!
        </div>
        <div style="font-size: 12px; opacity: 0.9;">
          Click to update and get the latest features
        </div>
      </div>
    `;

    notification.addEventListener('click', () => {
      this.forceUpdate();
    });

    // Auto-remove after 10 seconds if not clicked
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);

    document.body.appendChild(notification);
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

// Version checking utility
export class VersionChecker {
  private static currentVersion: string | null = null;

  static async checkVersion(): Promise<boolean> {
    try {
      // Add cache-busting parameter
      const response = await fetch(`/api/health?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const serverVersion = data.version || data.timestamp;

        if (this.currentVersion && serverVersion !== this.currentVersion) {
          console.log('Version mismatch detected:', { 
            current: this.currentVersion, 
            server: serverVersion 
          });
          return true; // Update needed
        }

        this.currentVersion = serverVersion;
      }
    } catch (error) {
      console.log('Version check failed:', error);
    }

    return false; // No update needed
  }

  static setCurrentVersion(version: string): void {
    this.currentVersion = version;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();