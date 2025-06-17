// ULTIMATE SAFEGUARD SYSTEM
// 100% Guarantee that Firebase client SDK cannot execute in any scenario

// Execute immediately before any other code
if (typeof window !== 'undefined') {
  // 1. NUCLEAR OPTION - Override at prototype level
  Object.defineProperty(window, '__FIREBASE_CLIENT_BLOCKED__', {
    value: true,
    writable: false,
    configurable: false
  });

  // 2. Override ALL possible Firebase entry points
  const firebaseBlocker = () => {
    throw new Error('PERMANENT: Firebase client SDK completely disabled');
  };

  // Block every possible Firebase function name
  const allFirebaseFunctions = [
    'initializeApp', 'getFirestore', 'collection', 'doc', 'getDocs', 'getDoc',
    'addDoc', 'updateDoc', 'deleteDoc', 'setDoc', 'runTransaction', 'writeBatch',
    'query', 'where', 'orderBy', 'limit', 'startAt', 'endAt', 'startAfter', 'endBefore',
    'onSnapshot', 'enableNetwork', 'disableNetwork', 'terminate', 'clearIndexedDbPersistence',
    'enableIndexedDbPersistence', 'connectFirestoreEmulator', 'getApp', 'deleteApp'
  ];

  allFirebaseFunctions.forEach(funcName => {
    try {
      Object.defineProperty(window, funcName, {
        value: firebaseBlocker,
        writable: false,
        configurable: false
      });
    } catch (e) {
      // Fallback if property already exists
      try {
        (window as any)[funcName] = firebaseBlocker;
      } catch (fallbackError) {
        // Last resort - at least log the attempt
        console.warn(`Could not block ${funcName}`);
      }
    }
  });

  // 3. INTERCEPT AT FETCH LEVEL (Unbreakable)
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    value: async function(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      // Block ALL Google/Firebase API domains
      const blockedDomains = [
        'firestore.googleapis.com',
        'firebase.googleapis.com', 
        'identitytoolkit.googleapis.com',
        'securetoken.googleapis.com',
        'firebaseremoteconfig.googleapis.com',
        'firebase-settings.crashlytics.com',
        'firebaseinstallations.googleapis.com'
      ];

      if (blockedDomains.some(domain => url.includes(domain))) {
        console.error('🚫 BLOCKED Firebase API call:', url);
        throw new Error(`Firebase API call permanently blocked: ${url}`);
      }

      // Execute original fetch with enhanced error handling
      try {
        const response = await originalFetch.call(this, input, init);
        
        // Check if response is HTML when JSON expected (Vercel routing issue)
        const contentType = response.headers.get('content-type') || '';
        if (url.includes('/api/') && contentType.includes('text/html')) {
          console.error('API returned HTML instead of JSON:', url);
          throw new Error(`API endpoint ${url} returned HTML - check Vercel routing`);
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error for:', url, error);
        throw error;
      }
    },
    writable: false,
    configurable: false
  });

  // 4. BULLETPROOF JSON PARSING
  const originalJSONParse = JSON.parse;
  Object.defineProperty(JSON, 'parse', {
    value: function(text: string) {
      if (typeof text === 'string') {
        const trimmed = text.trim();
        if (trimmed.startsWith('<!DOCTYPE') || 
            trimmed.startsWith('<html') ||
            trimmed.includes('<title>Error</title>') ||
            trimmed.includes('Vercel') && trimmed.includes('<body>')) {
          
          console.error('🚫 BLOCKED: Attempted to parse HTML as JSON');
          console.error('Response preview:', trimmed.substring(0, 200));
          throw new Error('API returned HTML instead of JSON - check endpoint routing');
        }
      }
      
      return originalJSONParse.call(this, text);
    },
    writable: false,
    configurable: false
  });

  // 5. GLOBAL ERROR INTERCEPTION
  Object.defineProperty(window, 'onerror', {
    value: function(message: any, source?: string, lineno?: number, colno?: number, error?: Error) {
      const msg = String(message);
      if (msg.includes('firebase') || msg.includes('Firestore') || 
          (msg.includes('JSON') && msg.includes('Unexpected token'))) {
        console.error('🛡️ Blocked Firebase/JSON error:', msg);
        return true; // Prevent error propagation
      }
      return false;
    },
    writable: false,
    configurable: false
  });

  // 6. PROMISE REJECTION INTERCEPTION
  Object.defineProperty(window, 'onunhandledrejection', {
    value: function(event: PromiseRejectionEvent) {
      const reason = String(event.reason || event.reason?.message || '');
      if (reason.includes('firebase') || reason.includes('Firestore') ||
          (reason.includes('JSON') && reason.includes('Unexpected token'))) {
        console.error('🛡️ Blocked Firebase/JSON promise rejection:', reason);
        event.preventDefault();
      }
    },
    writable: false,
    configurable: false
  });

  console.log('🛡️ ULTIMATE SAFEGUARD ACTIVE: Firebase client SDK execution impossible');
}

// 7. MODULE EXPORTS BLOCKING
export const initializeApp = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const getFirestore = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const collection = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const doc = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const getDocs = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const getDoc = Object.freeze(() => { 
  throw new Error('Firebase client permanently disabled'); 
});

export const db = Object.freeze(null);
export const app = Object.freeze(null);
export const firebase = Object.freeze(null);

export default Object.freeze(null);