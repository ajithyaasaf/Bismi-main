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

export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = getApiUrl(endpoint);
  
  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  // Add retry logic for Render backend wake-up
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
        mode: "cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      await throwIfResNotOk(res);
      return res;
    } catch (error) {
      lastError = error as Error;
      retries--;
      
      if (retries > 0 && (error as Error).name === 'AbortError') {
        console.log(`Backend timeout, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
      } else if (retries > 0) {
        console.log(`Request failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw lastError || new Error('Request failed after all retries');
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
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
