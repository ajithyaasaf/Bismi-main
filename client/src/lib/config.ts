// API Configuration for deployment
export const API_CONFIG = {
  // Use environment variable first, then fallback to Render URL in production
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 
    (import.meta.env.PROD 
      ? 'https://bismi-main.onrender.com'
      : ''),
  
  // Environment detection
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  if (API_CONFIG.IS_PRODUCTION) {
    const baseUrl = API_CONFIG.BASE_URL;
    const fullUrl = `${baseUrl}/api${cleanEndpoint}`;
    
    // Enhanced logging for production debugging
    console.log(`API Request: ${fullUrl}`);
    return fullUrl;
  } else {
    return `/api${cleanEndpoint}`;
  }
}