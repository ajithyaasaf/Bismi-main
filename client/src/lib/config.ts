// API Configuration
export const API_CONFIG = {
  // Use localhost in development, Render backend URL in production
  BASE_URL: import.meta.env.DEV
    ? 'http://localhost:5000'
    : (import.meta.env.VITE_API_BASE_URL || 'https://bismi-main-76ww.onrender.com'),

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