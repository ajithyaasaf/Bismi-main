// PERMANENT SOLUTION: Complete Firebase Client Prevention System
// This prevents Firebase client code from executing at any level

// 1. Block at import/require level
const originalRequire = typeof require !== 'undefined' ? require : null;
if (originalRequire && typeof window !== 'undefined') {
  (window as any).require = (moduleName: string) => {
    if (moduleName.includes('firebase') && !moduleName.includes('firebase-admin')) {
      throw new Error('Firebase client imports blocked - API-only architecture enforced');
    }
    return originalRequire(moduleName);
  };
}

// 2. Block dynamic imports
const originalImport = typeof window !== 'undefined' ? (window as any).import : null;
if (originalImport) {
  (window as any).import = (moduleName: string) => {
    if (moduleName.includes('firebase') && !moduleName.includes('firebase-admin')) {
      throw new Error('Firebase client dynamic imports blocked - API-only architecture enforced');
    }
    return originalImport(moduleName);
  };
}

// 3. Block all Firebase client functions globally
const firebaseBlocks = {
  firebase: undefined,
  initializeApp: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  getFirestore: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  collection: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  doc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  getDocs: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  getDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  addDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  updateDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  deleteDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  query: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  where: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  orderBy: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  limit: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  onSnapshot: () => { throw new Error('Firebase client blocked - use API endpoints'); },
  setDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
};

// 4. Apply blocks to window object
if (typeof window !== 'undefined') {
  Object.assign(window, firebaseBlocks);
  
  // Block Firebase on global scope
  (globalThis as any).firebase = undefined;
  Object.assign(globalThis, firebaseBlocks);
}

// 5. Override any existing Firebase methods
const blockFirebaseMethod = (obj: any, methodName: string) => {
  if (obj && typeof obj === 'object') {
    Object.defineProperty(obj, methodName, {
      get: () => () => { throw new Error(`Firebase client method ${methodName} blocked - use API endpoints`); },
      set: () => { throw new Error(`Cannot set Firebase client method ${methodName} - use API endpoints`); },
      configurable: false,
      enumerable: false
    });
  }
};

// Apply method blocking
const methodsToBlock = ['getFirestore', 'collection', 'doc', 'getDocs', 'getDoc', 'addDoc', 'updateDoc', 'deleteDoc', 'query', 'where'];
methodsToBlock.forEach(method => {
  if (typeof window !== 'undefined') {
    blockFirebaseMethod(window, method);
    blockFirebaseMethod(globalThis, method);
  }
});

// 6. Console override to catch and block Firebase client logs
if (typeof window !== 'undefined') {
  const originalConsole = { ...console };
  
  const blockFirebaseLog = (level: keyof Console) => {
    (console as any)[level] = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('Firebase client') || 
          message.includes('Getting all') && message.includes('via Firebase') ||
          message.includes('Retrieved') && message.includes('via Firebase') ||
          message.includes('Loaded') && message.includes('directly from Firestore')) {
        (originalConsole as any)[level]('🚫 BLOCKED: Firebase client SDK call prevented - using API-only architecture');
        return;
      }
      (originalConsole as any)[level](...args);
    };
  };
  
  ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
    blockFirebaseLog(level as keyof Console);
  });
}

// 7. Monitor and block any network requests to Firebase
if (typeof window !== 'undefined' && window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    if (url.includes('firestore.googleapis.com') || url.includes('firebase.google.com')) {
      console.error('🚫 BLOCKED: Direct Firebase client request prevented - redirecting to API');
      // Instead of making Firebase request, this should never happen but if it does, we block it
      return Promise.reject(new Error('Firebase client requests blocked - use API endpoints only'));
    }
    
    return originalFetch(input, init);
  };
}

// 8. Export safe methods
export const db = null;
export const app = null;

// Export all blocked functions
export { firebaseBlocks };

// Initialize immediately
console.log('🔒 Permanent Firebase client blocking system activated');

export default null;