// Batched API requests for improved performance
import { getApiUrl } from './config';

interface BatchRequest {
  endpoint: string;
  method?: string;
  data?: any;
}

interface BatchResponse {
  [key: string]: {
    success: boolean;
    data?: any;
    error?: string;
  };
}

// Batch multiple API requests into a single HTTP call
export async function batchApiRequests(requests: Record<string, BatchRequest>): Promise<BatchResponse> {
  const url = getApiUrl('/batch');
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Batch API request failed:', error);
    throw error;
  }
}

// Dashboard data fetcher using batched requests with performance monitoring
import { monitoredApiCall } from './performance-monitor';

export async function fetchDashboardData() {
  const requests = {
    suppliers: { endpoint: '/suppliers' },
    inventory: { endpoint: '/inventory' },
    customers: { endpoint: '/customers' },
    orders: { endpoint: '/orders' },
    transactions: { endpoint: '/transactions' }
  };

  return await monitoredApiCall('dashboard-batch', async () => {
    return await batchApiRequests(requests);
  });
}

// Cache for frequently accessed data
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  invalidate(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Convert iterator to array for compatibility
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const apiCache = new ApiCache();