/**
 * API Configuration
 * 
 * Production: Uses same-origin (empty BASE_URL) since API is on Vercel
 * Development: Uses localhost:5000 for local backend
 * 
 * Note: After Vercel migration, no cross-origin requests needed!
 */
export const API_CONFIG = {
  // Use VITE_API_BASE_URL if explicitly set, otherwise localhost in dev and same-origin in prod
  BASE_URL: (import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== '')
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
    : (import.meta.env.DEV ? 'http://localhost:5000' : ''),

  // Environment detection
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = API_CONFIG.BASE_URL;

  // If endpoint already starts with /api, don't add another /api prefix
  const fullUrl = cleanEndpoint.startsWith('/api')
    ? `${baseUrl}${cleanEndpoint}`
    : `${baseUrl}/api${cleanEndpoint}`;

  // Enhanced logging for debugging
  console.log(`API Request: ${fullUrl}`);
  return fullUrl;
}