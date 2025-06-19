// Parallel API requests for improved performance
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
  const url = getApiUrl('/api/batch');
  
  try {
    console.log('Making batch request to:', url);
    console.log('Request payload:', { requests });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ requests }),
    });

    console.log('Batch response status:', response.status);
    console.log('Batch response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Batch request error response:', errorText);
      throw new Error(`Batch request failed: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response from batch endpoint:', text.substring(0, 200));
      throw new Error('Batch endpoint returned non-JSON response');
    }

    const result = await response.json();
    console.log('Batch response data:', result);
    return result;
  } catch (error) {
    console.error('Batch API request failed:', error);
    throw error;
  }
}

// Dashboard data fetcher - using parallel requests instead of batching for now
import { monitoredApiCall } from './performance-monitor';

export async function fetchDashboardData() {
  return await monitoredApiCall('dashboard-parallel', async () => {
    // Make all requests in parallel for better performance
    const [
      suppliersResponse,
      inventoryResponse, 
      customersResponse,
      ordersResponse,
      transactionsResponse
    ] = await Promise.all([
      fetch(getApiUrl('/api/suppliers'), { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch(getApiUrl('/api/inventory'), { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch(getApiUrl('/api/customers'), { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch(getApiUrl('/api/orders'), { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      }),
      fetch(getApiUrl('/api/transactions'), { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      })
    ]);

    // Parse all responses and handle standardized API format

    const [suppliersData, inventoryData, customersData, ordersData, transactionsData] = await Promise.all([
      suppliersResponse.json(),
      inventoryResponse.json(),
      customersResponse.json(),
      ordersResponse.json(),
      transactionsResponse.json()
    ]);

    // Extract data from standardized API responses or use direct data
    const extractData = (response: any) => {
      if (response && typeof response === 'object' && 'data' in response) {
        return response.data; // Standardized API response
      }
      return response; // Direct data response
    };

    return {
      suppliers: { success: true, data: extractData(suppliersData) || [] },
      inventory: { success: true, data: extractData(inventoryData) || [] },
      customers: { success: true, data: extractData(customersData) || [] },
      orders: { success: true, data: extractData(ordersData) || [] },
      transactions: { success: true, data: extractData(transactionsData) || [] }
    };
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