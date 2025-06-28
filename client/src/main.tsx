import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { cacheManager, VersionChecker } from "@/lib/cache-manager";

// Initialize comprehensive cache management system
async function initializeApp() {
  // Initialize advanced cache manager for instant updates
  await cacheManager.initialize();
  
  // Set up version checking to detect deployments
  const checkVersionPeriodically = async () => {
    const updateNeeded = await VersionChecker.checkVersion();
    if (updateNeeded) {
      console.log('New deployment detected, forcing cache refresh...');
      await cacheManager.clearAllCaches();
    }
  };

  // Check for version updates every 60 seconds
  setInterval(checkVersionPeriodically, 60000);
  
  // Initial version check
  checkVersionPeriodically();
}

// Initialize app with cache management
initializeApp().catch(console.error);

// Render the app
createRoot(document.getElementById("root")!).render(<App />);
