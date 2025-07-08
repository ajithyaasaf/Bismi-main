// Debug utilities for offline functionality
import { offlineManager } from '@/lib/offline-manager';

export function debugOfflineStatus() {
  const status = offlineManager.getQueueStatus();
  console.log('=== OFFLINE DEBUG STATUS ===');
  console.log('Navigator online:', navigator.onLine);
  console.log('Manager online:', status.isOnline);
  console.log('Queue length:', status.queueLength);
  console.log('Sync in progress:', status.syncInProgress);
  console.log('Queued actions:', status.actions);
  console.log('============================');
  return status;
}

export function forceSync() {
  console.log('🔧 Force syncing offline queue...');
  offlineManager.syncQueue();
}

export function clearOfflineQueue() {
  console.log('🧹 Clearing offline queue...');
  offlineManager.clearQueue();
}

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).debugOffline = {
    status: debugOfflineStatus,
    sync: forceSync,
    clear: clearOfflineQueue
  };
}