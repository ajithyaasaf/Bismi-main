// API Configuration for deployment
export const API_CONFIG = {
  // Always use Render backend URL since it's working
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://bismi-main.onrender.com',
  
  // Environment detection
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = API_CONFIG.BASE_URL;
  const fullUrl = `${baseUrl}/api${cleanEndpoint}`;
  
  // Enhanced logging for debugging
  console.log(`API Request: ${fullUrl}`);
  return fullUrl;
}