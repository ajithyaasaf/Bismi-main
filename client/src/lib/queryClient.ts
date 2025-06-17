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

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
    mode: "cors",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const endpoint = queryKey[0] as string;
    const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint.replace('/api', ''));
    
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      mode: "cors",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
