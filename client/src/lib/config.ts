// API Configuration for deployment
export const API_CONFIG = {
  // Use Render backend URL in production, local development server otherwise
  BASE_URL: import.meta.env.PROD 
    ? 'https://bismi-main.onrender.com'
    : '/api',
  
  // Environment detection
  IS_PRODUCTION: import.meta.env.PROD,
  IS_DEVELOPMENT: import.meta.env.DEV,
} as const;

// Helper function to construct API URLs
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_CONFIG.BASE_URL}/api${cleanEndpoint}`;
}