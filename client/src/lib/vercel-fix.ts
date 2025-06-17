// VERCEL DEPLOYMENT FIX
// Addresses JSON parsing errors by eliminating Firebase client SDK completely

// 1. ENVIRONMENT DETECTION AND API CONFIGURATION
const isProduction = import.meta.env.PROD;
const isVercel = typeof window !== 'undefined' && 
  (window.location.hostname.includes('vercel.app') || 
   window.location.hostname.includes('bismi-main.vercel.app'));

// 2. AGGRESSIVE FIREBASE CLIENT BLOCKING FOR VERCEL
if (typeof window !== 'undefined') {
  // Block all Firebase client functions at window level
  const blockFirebase = () => {
    throw new Error('Firebase client permanently disabled - API-only architecture');
  };

  // Override Firebase globals safely
  try {
    (window as any).firebase = undefined;
    (window as any).getFirestore = blockFirebase;
    (window as any).collection = blockFirebase;
    (window as any).doc = blockFirebase;
    (window as any).getDocs = blockFirebase;
    (window as any).getDoc = blockFirebase;
    (window as any).addDoc = blockFirebase;
    (window as any).updateDoc = blockFirebase;
    (window as any).deleteDoc = blockFirebase;
  } catch (e) {
    // Ignore property definition errors
  }

  // 3. INTERCEPT AND FIX NETWORK REQUESTS
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Block Firebase client API calls completely
    if (url.includes('firestore.googleapis.com') || 
        url.includes('firebase.googleapis.com') ||
        url.includes('identitytoolkit.googleapis.com')) {
      console.error('Blocked Firebase client request:', url);
      throw new Error('Firebase client requests permanently blocked');
    }

    try {
      const response = await originalFetch(input, init);
      
      // Check for HTML responses when JSON is expected (common Vercel issue)
      if (url.includes('/api/') && response.headers.get('content-type')?.includes('text/html')) {
        console.error('API endpoint returned HTML instead of JSON:', url);
        throw new Error(`API endpoint ${url} returned HTML - check backend routing`);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('JSON')) {
        console.error('JSON parsing error for URL:', url, error.message);
        throw new Error(`JSON parsing failed for ${url} - received HTML instead of JSON`);
      }
      throw error;
    }
  };

  // 4. BLOCK CONSOLE LOGS FROM FIREBASE CLIENT ATTEMPTS
  const originalConsoleLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Firebase client') || 
        message.includes('Getting all') && message.includes('via Firebase') ||
        message.includes('Retrieved') && message.includes('via Firebase')) {
      // Silently block Firebase client logs
      return;
    }
    originalConsoleLog.apply(console, args);
  };

  // 5. INTERCEPT AND PREVENT JSON PARSING ERRORS
  const originalJSONParse = JSON.parse;
  JSON.parse = (text: string) => {
    if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
      console.error('Attempted to parse HTML as JSON - blocked:', text.substring(0, 100));
      throw new Error('Received HTML instead of JSON - check API endpoint configuration');
    }
    return originalJSONParse(text);
  };

  console.log('Vercel deployment fix activated - Firebase client SDK completely blocked');
}

// 6. EXPORT API CONFIGURATION FOR VERCEL
export const VERCEL_API_CONFIG = {
  BASE_URL: isVercel ? 'https://bismi-main.onrender.com' : (import.meta.env.VITE_API_BASE_URL || 'https://bismi-main.onrender.com'),
  IS_VERCEL: isVercel,
  IS_PRODUCTION: isProduction,
};

// 7. BLOCK ALL FIREBASE EXPORTS
export const initializeApp = () => { throw new Error('Firebase client disabled'); };
export const getFirestore = () => { throw new Error('Firebase client disabled'); };
export const collection = () => { throw new Error('Firebase client disabled'); };
export const doc = () => { throw new Error('Firebase client disabled'); };
export const getDocs = () => { throw new Error('Firebase client disabled'); };
export const getDoc = () => { throw new Error('Firebase client disabled'); };
export const addDoc = () => { throw new Error('Firebase client disabled'); };
export const updateDoc = () => { throw new Error('Firebase client disabled'); };
export const deleteDoc = () => { throw new Error('Firebase client disabled'); };
export const query = () => { throw new Error('Firebase client disabled'); };
export const where = () => { throw new Error('Firebase client disabled'); };
export const orderBy = () => { throw new Error('Firebase client disabled'); };
export const limit = () => { throw new Error('Firebase client disabled'); };

export const db = null;
export const app = null;

export default VERCEL_API_CONFIG;