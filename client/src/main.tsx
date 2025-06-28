import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { cacheManager, VersionChecker } from "@/lib/cache-manager";

// Initialize enterprise-grade automatic cache management
async function initializeApp() {
  console.log('🚀 Initializing automatic deployment detection system...');
  
  // Initialize advanced cache manager with automatic updates
  await cacheManager.initialize();
  
  // Enterprise-grade multi-layered automatic detection system
  const performUltimateDeploymentDetection = async () => {
    try {
      // Layer 1: Primary version check (health endpoint)
      const primaryCheck = await VersionChecker.checkVersion();
      if (primaryCheck) {
        console.log('📡 Primary version check detected deployment change');
        await cacheManager.clearAllCaches();
        return;
      }

      // Layer 2: Advanced deployment detection with multiple signals
      const advancedCheck = await VersionChecker.performAdvancedDeploymentDetection();
      if (advancedCheck) {
        console.log('📡 Advanced detection found deployment changes');
        await cacheManager.clearAllCaches();
        return;
      }

      // Layer 3: Service worker state monitoring
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          console.log('📡 Service worker update detected');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
      }

      // Layer 4: Performance-based detection (detect if app is slower than expected)
      const performanceCheck = performance.now();
      const lastPerformanceCheck = parseFloat(sessionStorage.getItem('last-perf-check') || '0');
      
      if (lastPerformanceCheck && (performanceCheck - lastPerformanceCheck) > 5000) {
        // If more than 5 seconds between checks, might indicate caching issues
        console.log('📡 Performance degradation detected, checking for updates');
        const quickHealthCheck = await Promise.race([
          fetch('/api/health?perf=1', { cache: 'no-cache' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]).catch(() => null) as Response | null;
        
        if (quickHealthCheck && quickHealthCheck instanceof Response) {
          const etag = quickHealthCheck.headers.get('etag');
          const storedEtag = sessionStorage.getItem('perf-etag');
          
          if (storedEtag && etag && storedEtag !== etag) {
            sessionStorage.setItem('perf-etag', etag);
            await cacheManager.clearAllCaches();
            return;
          }
          
          if (etag) sessionStorage.setItem('perf-etag', etag);
        }
      }
      
      sessionStorage.setItem('last-perf-check', performanceCheck.toString());

    } catch (error) {
      console.log('Ultimate detection check failed, will retry:', error);
    }
  };

  // Immediate aggressive startup checks
  setTimeout(performUltimateDeploymentDetection, 1000);
  setTimeout(performUltimateDeploymentDetection, 3000);
  
  // Ultra-frequent automatic checks (every 10 seconds for Instagram-level instant detection)
  setInterval(performUltimateDeploymentDetection, 10000);
  
  // Additional frequent checks (every 30 seconds as backup)
  setInterval(performUltimateDeploymentDetection, 30000);
  
  // Immediate checks on user activity
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Check immediately when user returns to tab
      performUltimateDeploymentDetection();
      // Follow up check after 2 seconds
      setTimeout(performUltimateDeploymentDetection, 2000);
    }
  });

  // Network reconnection triggers immediate check
  window.addEventListener('online', () => {
    performUltimateDeploymentDetection();
    setTimeout(performUltimateDeploymentDetection, 1000);
  });

  // Focus events trigger immediate checks
  window.addEventListener('focus', () => {
    performUltimateDeploymentDetection();
  });

  // Mouse movement after idle triggers check (for user activity detection)
  let idleTimer: NodeJS.Timeout;
  document.addEventListener('mousemove', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // User became active after idle, check for updates
      performUltimateDeploymentDetection();
    }, 5000);
  });

  // Scroll events also trigger periodic checks
  let scrollTimer: NodeJS.Timeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(performUltimateDeploymentDetection, 10000);
  });
}

// Initialize app with cache management
initializeApp().catch(console.error);

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
