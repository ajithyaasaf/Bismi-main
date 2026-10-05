function getBaseUrl(): string {
  // 1. If running in browser on Vercel, always use same-origin relative path ''
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.vercel.app') || hostname === 'bismi-main.vercel.app') {
      return '';
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // 2. Ignore invalid/dead onrender domain even if configured in Vercel environment variables
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    if (cleaned.includes('onrender.com')) {
      return '';
    }
    return cleaned;
  }

  // 3. Fallback for local development or production
  return import.meta.env.DEV ? 'http://localhost:5000' : '';
}

export const API_CONFIG = {
  // Use resolved base URL: same-origin on Vercel, localhost in local development
  BASE_URL: getBaseUrl(),

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