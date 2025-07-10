import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = await res.text();
      
      // Enhanced error logging for debugging
      console.error("API Error Details:", {
        status: res.status,
        statusText: res.statusText,
        url: res.url,
        headers: Object.fromEntries(res.headers.entries()),
        responseText: text.substring(0, 500) // Log first 500 chars
      });
      
      // Check if response is HTML (common when API routing fails)
      if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
        throw new Error(`API endpoint returned HTML instead of JSON. Check backend routing. Status: ${res.status}`);
      }
      
      throw new Error(`${res.status}: ${text}`);
    } catch (e) {
      console.error("API Error:", e);
      throw new Error(`Request failed with status ${res.status}`);
    }
  }
}

// Connection pool for HTTP/1.1 optimization
const connectionPool = new Map<string, Promise<Response>>();

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = getApiUrl(endpoint);
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Keep-Alive": "timeout=5, max=1000", // Connection reuse
    "Connection": "keep-alive"
  };

  // Enable compression
  if (!headers["Accept-Encoding"]) {
    headers["Accept-Encoding"] = "gzip, deflate, br";
  }

  let retries = 1; // Single retry for speed
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const controller = new AbortController();
      
      // Dynamic timeout based on endpoint - longer for order creation
      const isOrderCreation = endpoint.includes('/orders') && method === 'POST';
      const timeoutMs = isOrderCreation ? 30000 : 10000; // 30s for order creation, 10s for others
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        mode: "cors",
        signal: controller.signal,
        // Performance optimizations
        cache: method === 'GET' ? 'default' : 'no-cache',
        keepalive: true
      } as RequestInit);

      clearTimeout(timeoutId);
      await throwIfResNotOk(res);
      return res;
    } catch (error) {
      lastError = error as Error;
      retries--;
      
      if (retries > 0) {
        // Quick retry with minimal delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error('Request failed after retry');
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint.startsWith('/api') ? endpoint.substring(4) : endpoint);
    
    // Add retry logic for queries too
    let retries = 3;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const res = await fetch(url, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          mode: "cors",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }

        await throwIfResNotOk(res);
        return await safeJsonResponse(res);
      } catch (error) {
        lastError = error as Error;
        retries--;
        
        if (retries > 0 && (error as Error).name === 'AbortError') {
          console.log(`Query timeout, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else if (retries > 0) {
          console.log(`Query failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Query failed after all retries');
  };

// Safe JSON response handler that checks content type before parsing
export async function safeJsonResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');
  
  // Check if response has JSON content type
  if (contentType && contentType.includes('application/json')) {
    try {
      const jsonData = await response.json();
      
      // Handle standardized API responses
      if (jsonData && typeof jsonData === 'object' && 'success' in jsonData) {
        if (jsonData.success === false) {
          throw new Error(jsonData.message || 'API request failed');
        }
        return jsonData.data || jsonData; // Return data if standardized, otherwise full response
      }
      
      return jsonData;
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('Invalid JSON response from server');
    }
  }
  
  // If not JSON, get text content for better error handling
  const text = await response.text();
  
  // Check if it's an HTML error page
  if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
    throw new Error(`Server returned HTML error page instead of JSON. Status: ${response.status}`);
  }
  
  // If it's plain text, try to parse as JSON (some APIs return JSON without proper content-type)
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const jsonData = JSON.parse(text);
      
      // Handle standardized API responses in parsed text
      if (jsonData && typeof jsonData === 'object' && 'success' in jsonData) {
        if (jsonData.success === false) {
          throw new Error(jsonData.message || 'API request failed');
        }
        return jsonData.data || jsonData;
      }
      
      return jsonData;
    } catch {
      throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
    }
  }
  
  // For other cases, return the text as-is
  return text;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false, // Disable for performance
      staleTime: 1000 * 60 * 3, // 3 minutes cache
      gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
      retry: 1, // Single retry for speed
      retryDelay: 500, // Quick retry
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      retry: 1,
      retryDelay: 500,
      networkMode: 'online',
    },
  },
});
