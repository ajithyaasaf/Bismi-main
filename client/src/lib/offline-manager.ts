import { queryClient } from './queryClient';

interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data?: any;
  timestamp: number;
  retryCount: number;
}

class OfflineManager {
  private queue: QueuedAction[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    this.loadQueue();
    this.setupEventListeners();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored - starting sync');
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📱 Gone offline - queueing actions');
      this.isOnline = false;
    });
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('offline-queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`📦 Loaded ${this.queue.length} queued actions`);
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem('offline-queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  public queueAction(type: QueuedAction['type'], endpoint: string, data?: any): string {
    const action: QueuedAction = {
      id: `${type}-${endpoint}-${Date.now()}`,
      type,
      endpoint,
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(action);
    this.saveQueue();

    console.log(`📝 Queued ${type} action for ${endpoint}`);

    // Try to sync immediately if online
    if (this.isOnline && !this.syncInProgress) {
      setTimeout(() => this.syncQueue(), 1000);
    }

    return action.id;
  }

  public async syncQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress || this.queue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Syncing ${this.queue.length} queued actions`);

    const actionsToProcess = [...this.queue];
    
    for (const action of actionsToProcess) {
      try {
        await this.processAction(action);
        
        // Remove successful action from queue
        this.queue = this.queue.filter(q => q.id !== action.id);
        console.log(`✅ Synced ${action.type} ${action.endpoint}`);
        
      } catch (error) {
        console.error(`❌ Failed to sync ${action.type} ${action.endpoint}:`, error);
        
        // Increment retry count
        const actionIndex = this.queue.findIndex(q => q.id === action.id);
        if (actionIndex !== -1) {
          this.queue[actionIndex].retryCount++;
          
          // Remove after 5 failed attempts
          if (this.queue[actionIndex].retryCount >= 5) {
            console.error(`🗑️ Removing action after 5 failed attempts: ${action.id}`);
            this.queue.splice(actionIndex, 1);
          }
        }
      }
    }

    this.saveQueue();
    this.syncInProgress = false;

    // Invalidate relevant queries after sync
    if (actionsToProcess.length > 0) {
      queryClient.invalidateQueries();
    }
  }

  private async processAction(action: QueuedAction): Promise<void> {
    const { type, endpoint, data } = action;

    let method: string;
    let body: string | undefined;

    switch (type) {
      case 'CREATE':
        method = 'POST';
        body = JSON.stringify(data);
        break;
      case 'UPDATE':
        method = 'PUT';
        body = JSON.stringify(data);
        break;
      case 'DELETE':
        method = 'DELETE';
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  public getQueueStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.queue.length,
      syncInProgress: this.syncInProgress,
      actions: this.queue.map(action => ({
        id: action.id,
        type: action.type,
        endpoint: action.endpoint,
        timestamp: action.timestamp,
        retryCount: action.retryCount
      }))
    };
  }

  public hasQueuedOrders(): boolean {
    return this.queue.some(action => action.endpoint.includes('/api/orders'));
  }

  public getQueuedOrdersCount(): number {
    return this.queue.filter(action => action.endpoint.includes('/api/orders')).length;
  }

  public clearQueue() {
    this.queue = [];
    this.saveQueue();
    console.log('🧹 Offline queue cleared');
  }
}

export const offlineManager = new OfflineManager();

// Enhanced API request function with offline support
export async function apiRequestWithOffline(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    
    // Mark data as fresh in cache
    if (response.ok && options.method === 'GET') {
      const data = await response.clone().json();
      // Store with offline metadata
      const enhancedData = {
        ...data,
        _cached: false,
        _timestamp: Date.now(),
        _offline: false
      };
      
      return new Response(JSON.stringify(enhancedData), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    
    return response;
  } catch (error) {
    // If offline and making a mutation, queue it
    if (!navigator.onLine && options.method && options.method !== 'GET') {
      const body = options.body ? JSON.parse(options.body as string) : undefined;
      
      offlineManager.queueAction(
        options.method as QueuedAction['type'],
        url,
        body
      );
      
      // Return a success response for optimistic updates
      return new Response(JSON.stringify({ 
        success: true, 
        queued: true,
        message: 'Action queued for sync when online'
      }), {
        status: 202,
        statusText: 'Accepted (Queued)',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Hook for offline status and queue management
import { useState, useEffect } from 'react';

export function useOfflineManager() {
  const [status, setStatus] = useState(offlineManager.getQueueStatus());
  
  useEffect(() => {
    const updateStatus = () => {
      setStatus(offlineManager.getQueueStatus());
    };
    
    const interval = setInterval(updateStatus, 1000);
    
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);
  
  return {
    ...status,
    sync: () => offlineManager.syncQueue(),
    clear: () => offlineManager.clearQueue()
  };
}