import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const text = await res.text();
      
      // Enhanced error logging for production debugging
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
    const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint.replace('/api', ''));
    
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
        return await res.json();
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

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
