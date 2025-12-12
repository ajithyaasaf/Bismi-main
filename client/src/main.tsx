import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { cacheManager, VersionChecker } from "@/lib/cache-manager";

// Initialize event-driven deployment detection system
async function initializeApp() {
  console.log('🚀 Initializing event-driven deployment detection...');
  
  // Initialize cache manager
  await cacheManager.initialize();
  
  // Simple deployment detection function
  const checkForDeploymentUpdates = async () => {
    try {
      // Check for new deployments via webhook endpoint
      const response = await fetch('/api/deployment-status', { 
        cache: 'no-cache' 
      });
      
      if (response.ok) {
        const data = await response.json();
        const lastKnownDeployment = sessionStorage.getItem('last-deployment-id');
        
        if (data.deployment && data.deployment.id !== lastKnownDeployment) {
          console.log('📡 New deployment detected via webhook:', data.deployment.id);
          sessionStorage.setItem('last-deployment-id', data.deployment.id);
          await cacheManager.clearAllCaches();
          return;
        }
      }
      
      // Fallback: Check service worker for updates
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.waiting) {
          console.log('📡 Service worker update detected');
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    } catch (error) {
      console.log('Deployment check failed:', error);
    }
  };

  // Event-driven triggers only (no time-based intervals)
  
  // Check when tab becomes visible (user returns to app)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      console.log('📱 Tab became visible, checking for updates...');
      checkForDeploymentUpdates();
    }
  });

  // Check when network reconnects
  window.addEventListener('online', () => {
    console.log('🌐 Network reconnected, checking for updates...');
    setTimeout(checkForDeploymentUpdates, 1000);
  });

  // Check when user focuses on window
  window.addEventListener('focus', () => {
    console.log('🎯 Window focused, checking for updates...');
    checkForDeploymentUpdates();
  });

  // Initial check after app loads
  setTimeout(() => {
    console.log('🚀 Initial deployment check...');
    checkForDeploymentUpdates();
  }, 3000);
}

// Initialize app with cache management
initializeApp().catch(console.error);

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
