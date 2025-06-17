// API Configuration for deployment
import { VERCEL_API_CONFIG } from './vercel-fix';

export const API_CONFIG = {
  // Use Vercel-optimized configuration
  BASE_URL: VERCEL_API_CONFIG.BASE_URL,
  
  // Environment detection
  IS_PRODUCTION: VERCEL_API_CONFIG.IS_PRODUCTION,
  IS_DEVELOPMENT: !VERCEL_API_CONFIG.IS_PRODUCTION,
  IS_VERCEL: VERCEL_API_CONFIG.IS_VERCEL,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = API_CONFIG.BASE_URL;
  const fullUrl = `${baseUrl}${cleanEndpoint.startsWith('/api') ? cleanEndpoint : `/api${cleanEndpoint}`}`;
  
  // Enhanced logging for debugging (only in development)
  if (!API_CONFIG.IS_PRODUCTION) {
    console.log(`API Request: ${fullUrl}`);
  }
  return fullUrl;
}