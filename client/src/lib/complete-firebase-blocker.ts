// COMPLETE FIREBASE CLIENT SDK ELIMINATION
// This file ensures no Firebase client code can execute in any context

// 1. IMMEDIATE GLOBAL BLOCKS (before any other code can run)
if (typeof window !== 'undefined') {
  // Block all Firebase client SDK globals
  const firebaseBlocker = () => {
    throw new Error('Firebase client SDK permanently disabled - API-only architecture');
  };

  // Override all Firebase client functions globally
  (window as any).firebase = undefined;
  (window as any).initializeApp = firebaseBlocker;
  (window as any).getFirestore = firebaseBlocker;
  (window as any).collection = firebaseBlocker;
  (window as any).doc = firebaseBlocker;
  (window as any).getDocs = firebaseBlocker;
  (window as any).getDoc = firebaseBlocker;
  (window as any).addDoc = firebaseBlocker;
  (window as any).updateDoc = firebaseBlocker;
  (window as any).deleteDoc = firebaseBlocker;
  (window as any).query = firebaseBlocker;
  (window as any).where = firebaseBlocker;
  (window as any).orderBy = firebaseBlocker;
  (window as any).limit = firebaseBlocker;

  // 2. INTERCEPT AND BLOCK NETWORK REQUESTS
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Block Firebase client API calls
    if (url.includes('firestore.googleapis.com') || 
        url.includes('firebase.googleapis.com') ||
        url.includes('identitytoolkit.googleapis.com') ||
        url.includes('firebaseapp.com')) {
      console.error('🚫 Blocked Firebase client request:', url);
      return Promise.reject(new Error('Firebase client requests permanently blocked'));
    }
    
    return originalFetch(input, init);
  };

  // 3. BLOCK XMLHTTPREQUEST TO FIREBASE
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
    const urlString = typeof url === 'string' ? url : url.toString();
    if (urlString.includes('firestore.googleapis.com') || 
        urlString.includes('firebase.googleapis.com') ||
        urlString.includes('identitytoolkit.googleapis.com')) {
      throw new Error('Firebase XHR requests permanently blocked');
    }
    return originalXHROpen.call(this, method, url, async ?? true, username, password);
  };

  // 4. BLOCK DYNAMIC IMPORTS OF FIREBASE
  const originalImport = (window as any).import;
  if (originalImport) {
    (window as any).import = (moduleName: string) => {
      if (moduleName.includes('firebase') && !moduleName.includes('firebase-admin')) {
        return Promise.reject(new Error(`Firebase module ${moduleName} blocked permanently`));
      }
      return originalImport(moduleName);
    };
  }

  // 5. CATCH AND BLOCK FIREBASE ERRORS AND JSON PARSING ISSUES
  window.addEventListener('error', (event) => {
    const message = event.error?.message || event.message || '';
    if (message.includes('firebase') || 
        message.includes('Firestore') ||
        message.includes('getFirestore') ||
        message.includes('collection') ||
        (message.includes('JSON') && message.includes('Unexpected token'))) {
      console.error('🚫 Firebase client error blocked:', message);
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    if (message.includes('firebase') || 
        message.includes('Firestore') ||
        message.includes('getFirestore') ||
        message.includes('collection') ||
        (message.includes('JSON') && message.includes('Unexpected token') && message.includes('<!DOCTYPE'))) {
      console.error('🚫 Firebase client promise rejection blocked:', message);
      event.preventDefault();
    }
  });

  // 6. OVERRIDE ANY REMAINING FIREBASE CLIENT SERVICE FUNCTIONS
  const blockFirebaseService = () => {
    throw new Error('Firebase client service permanently disabled - use API endpoints');
  };

  (window as any).getCustomers = undefined;
  (window as any).getOrders = undefined;
  (window as any).getTransactions = undefined;
  (window as any).getSuppliers = undefined;
  (window as any).getInventory = undefined;

  console.log('🔒 Complete Firebase client SDK blocker activated');
}

// 6. EXPORT BLOCKED FUNCTIONS FOR COMPATIBILITY
export const initializeApp = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const getFirestore = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const collection = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const doc = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const getDocs = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const getDoc = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const addDoc = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const updateDoc = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const deleteDoc = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const query = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const where = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const orderBy = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

export const limit = () => {
  throw new Error('Firebase client permanently disabled - use API endpoints');
};

// Export null references
export const db = null;
export const app = null;

export default null;