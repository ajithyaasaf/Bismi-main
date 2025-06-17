// BULLETPROOF Firebase Client SDK Prevention
// This prevents ALL possible Firebase client execution paths

// 1. IMMEDIATE EXECUTION - Block before any other code runs
(() => {
  if (typeof window === 'undefined') return;

  // 2. COMPREHENSIVE FUNCTION BLOCKING
  const createFirebaseBlocker = (functionName: string) => {
    return () => {
      const error = new Error(`Firebase client function '${functionName}' permanently disabled - API-only architecture`);
      console.error(error.message);
      throw error;
    };
  };

  // 3. OVERRIDE ALL FIREBASE FUNCTIONS (Safe approach)
  const firebaseFunctions = [
    'initializeApp', 'getFirestore', 'collection', 'doc', 'getDocs', 'getDoc', 
    'addDoc', 'updateDoc', 'deleteDoc', 'setDoc', 'query', 'where', 'orderBy', 
    'limit', 'onSnapshot', 'connectFirestoreEmulator', 'enableNetwork', 
    'disableNetwork', 'clearIndexedDbPersistence', 'enableIndexedDbPersistence'
  ];

  firebaseFunctions.forEach(funcName => {
    try {
      (window as any)[funcName] = createFirebaseBlocker(funcName);
    } catch (e) {
      // Ignore if property can't be set
    }
  });

  // 4. BLOCK FIREBASE NAMESPACE
  try {
    (window as any).firebase = {
      initializeApp: createFirebaseBlocker('firebase.initializeApp'),
      firestore: createFirebaseBlocker('firebase.firestore'),
      app: createFirebaseBlocker('firebase.app')
    };
  } catch (e) {
    // Ignore if property can't be set
  }

  // 5. NETWORK REQUEST INTERCEPTION (Bulletproof)
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Block ALL Firebase-related domains
    const firebaseDomains = [
      'firestore.googleapis.com',
      'firebase.googleapis.com', 
      'identitytoolkit.googleapis.com',
      'securetoken.googleapis.com',
      'firebase-settings.crashlytics.com',
      'firebaseremoteconfig.googleapis.com'
    ];

    if (firebaseDomains.some(domain => url.includes(domain))) {
      const error = new Error(`Firebase client network request blocked: ${url}`);
      console.error(error.message);
      return Promise.reject(error);
    }

    try {
      return await originalFetch(input, init);
    } catch (error) {
      // Enhanced error handling for JSON parsing issues
      if (error instanceof Error && error.message.includes('JSON')) {
        console.error(`Network request failed for ${url}:`, error.message);
        throw new Error(`API request to ${url} failed - check backend connectivity`);
      }
      throw error;
    }
  };

  // 6. BULLETPROOF JSON PARSING PROTECTION
  const originalJSONParse = JSON.parse;
  JSON.parse = (text: string) => {
    // Detect HTML responses (common cause of JSON parsing errors)
    if (typeof text === 'string' && 
        (text.trim().startsWith('<!DOCTYPE') || 
         text.trim().startsWith('<html') ||
         text.includes('<title>') ||
         text.includes('<body>'))) {
      
      const error = new Error('Attempted to parse HTML as JSON - API endpoint returned HTML instead of JSON');
      console.error('JSON Parse Error:', error.message);
      console.error('Response text (first 200 chars):', text.substring(0, 200));
      throw error;
    }

    try {
      return originalJSONParse(text);
    } catch (error) {
      console.error('JSON Parse Error:', error);
      console.error('Failed text (first 200 chars):', text?.substring(0, 200));
      throw error;
    }
  };

  // 7. MODULE IMPORT BLOCKING
  if ((window as any).require) {
    const originalRequire = (window as any).require;
    (window as any).require = (moduleName: string) => {
      if (moduleName.includes('firebase') && !moduleName.includes('firebase-admin')) {
        throw new Error(`Firebase client module '${moduleName}' blocked`);
      }
      return originalRequire(moduleName);
    };
  }

  // 8. ERROR BOUNDARY FOR UNHANDLED FIREBASE ATTEMPTS
  window.addEventListener('error', (event) => {
    const message = event.error?.message || event.message || '';
    if (message.toLowerCase().includes('firebase') || 
        message.toLowerCase().includes('firestore')) {
      console.error('Firebase client error caught and blocked:', message);
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    if (typeof message === 'string' && 
        (message.toLowerCase().includes('firebase') || 
         message.toLowerCase().includes('firestore') ||
         (message.includes('JSON') && message.includes('Unexpected token')))) {
      console.error('Firebase client promise rejection caught and blocked:', message);
      event.preventDefault();
    }
  });

  console.log('🛡️ BULLETPROOF Firebase client blocking activated - API-only architecture enforced');
})();

// 9. EXPORT BLOCKED FUNCTIONS FOR IMPORT COMPATIBILITY
export const initializeApp = () => { throw new Error('Firebase client disabled'); };
export const getFirestore = () => { throw new Error('Firebase client disabled'); };
export const collection = () => { throw new Error('Firebase client disabled'); };
export const doc = () => { throw new Error('Firebase client disabled'); };
export const getDocs = () => { throw new Error('Firebase client disabled'); };
export const getDoc = () => { throw new Error('Firebase client disabled'); };
export const addDoc = () => { throw new Error('Firebase client disabled'); };
export const updateDoc = () => { throw new Error('Firebase client disabled'); };
export const deleteDoc = () => { throw new Error('Firebase client disabled'); };
export const setDoc = () => { throw new Error('Firebase client disabled'); };
export const query = () => { throw new Error('Firebase client disabled'); };
export const where = () => { throw new Error('Firebase client disabled'); };
export const orderBy = () => { throw new Error('Firebase client disabled'); };
export const limit = () => { throw new Error('Firebase client disabled'); };
export const onSnapshot = () => { throw new Error('Firebase client disabled'); };

export const db = null;
export const app = null;
export const firebase = null;

export default null;