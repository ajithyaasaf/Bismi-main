/**
 * API Configuration
 * 
 * Production: Uses same-origin (empty BASE_URL) since API is on Vercel
 * Development: Uses localhost:5000 for local backend
 * 
 * Note: After Vercel migration, no cross-origin requests needed!
 */
export const API_CONFIG = {
  // Same domain in production (Vercel serverless), localhost in dev
  BASE_URL: import.meta.env.DEV
    ? 'http://localhost:5000'
    : '',  // Empty = same origin on Vercel, no CORS issues!

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