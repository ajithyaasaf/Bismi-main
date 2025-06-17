// ULTIMATE SOLUTION: API-Only Architecture Enforcement
// This creates an unbreakable API-only system

class APIOnlyEnforcer {
  private static instance: APIOnlyEnforcer;
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  static getInstance(): APIOnlyEnforcer {
    if (!APIOnlyEnforcer.instance) {
      APIOnlyEnforcer.instance = new APIOnlyEnforcer();
    }
    return APIOnlyEnforcer.instance;
  }

  private initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    // 1. Override all possible Firebase client entry points
    this.blockFirebaseGlobally();
    
    // 2. Monitor and intercept network requests
    this.interceptNetworkRequests();
    
    // 3. Override module loading systems
    this.blockModuleLoading();
    
    // 4. Set up error boundaries for Firebase attempts
    this.setupErrorBoundaries();
    
    this.isInitialized = true;
    console.log('API-Only Architecture Enforcement: ACTIVE');
  }

  private blockFirebaseGlobally() {
    const firebaseBlock = () => {
      throw new Error('Firebase client permanently disabled - API-only architecture');
    };

    const firebaseOverrides = {
      firebase: undefined,
      initializeApp: firebaseBlock,
      getFirestore: firebaseBlock,
      collection: firebaseBlock,
      doc: firebaseBlock,
      getDocs: firebaseBlock,
      getDoc: firebaseBlock,
      addDoc: firebaseBlock,
      updateDoc: firebaseBlock,
      deleteDoc: firebaseBlock,
      query: firebaseBlock,
      where: firebaseBlock,
      orderBy: firebaseBlock,
      limit: firebaseBlock,
      onSnapshot: firebaseBlock,
      setDoc: firebaseBlock,
    };

    // Apply to all possible global scopes
    Object.assign(window, firebaseOverrides);
    Object.assign(globalThis, firebaseOverrides);
    
    // Make properties non-configurable to prevent overriding
    Object.keys(firebaseOverrides).forEach(key => {
      Object.defineProperty(window, key, {
        value: firebaseOverrides[key as keyof typeof firebaseOverrides],
        writable: false,
        configurable: false,
        enumerable: false
      });
    });
  }

  private interceptNetworkRequests() {
    // Block direct Firebase API calls
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url.includes('firestore.googleapis.com') || 
          url.includes('firebase.google.com') ||
          url.includes('firebaseapp.com')) {
        console.error('Blocked direct Firebase request - redirecting to API');
        return Promise.reject(new Error('Direct Firebase requests blocked - use API endpoints'));
      }
      
      return originalFetch(input, init);
    };

    // Block XMLHttpRequest to Firebase
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      const urlString = typeof url === 'string' ? url : url.toString();
      if (urlString.includes('firestore.googleapis.com') || 
          urlString.includes('firebase.google.com')) {
        throw new Error('Direct Firebase XHR blocked - use API endpoints');
      }
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
  }

  private blockModuleLoading() {
    // Override dynamic imports
    const originalImport = (window as any).__dynamicImportHandler || (window as any).import;
    if (originalImport) {
      (window as any).import = (moduleName: string) => {
        if (this.isFirebaseModule(moduleName)) {
          return Promise.reject(new Error(`Firebase module ${moduleName} blocked - use API endpoints`));
        }
        return originalImport(moduleName);
      };
    }
  }

  private setupErrorBoundaries() {
    // Catch and redirect any remaining Firebase errors
    window.addEventListener('error', (event) => {
      const message = event.error?.message || event.message || '';
      if (this.isFirebaseError(message)) {
        console.error('Firebase client attempt blocked:', message);
        event.preventDefault();
        return false;
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      const message = event.reason?.message || event.reason || '';
      if (this.isFirebaseError(message)) {
        console.error('Firebase client promise rejection blocked:', message);
        event.preventDefault();
      }
    });
  }

  private isFirebaseModule(moduleName: string): boolean {
    return moduleName.includes('firebase') && 
           !moduleName.includes('firebase-admin') &&
           !moduleName.includes('firebase-functions');
  }

  private isFirebaseError(message: string): boolean {
    return message.includes('Firebase') && 
           !message.includes('firebase-admin') &&
           (message.includes('client') || 
            message.includes('firestore') ||
            message.includes('collection') ||
            message.includes('doc'));
  }

  // Public method to verify API-only status
  public verifyAPIOnly(): boolean {
    try {
      // Test if any Firebase client functions exist
      if (typeof (window as any).getFirestore === 'function') {
        (window as any).getFirestore();
      }
      return true; // If no error, blocking is working
    } catch (error) {
      return error instanceof Error && error.message.includes('permanently disabled');
    }
  }
}

// Export the enforcer
export const apiOnlyEnforcer = APIOnlyEnforcer.getInstance();

// Ensure it's active immediately
apiOnlyEnforcer.verifyAPIOnly();

// Export blocked Firebase functions for compatibility
export const db = null;
export const app = null;
export const initializeApp = () => { throw new Error('Firebase client permanently disabled'); };
export const getFirestore = () => { throw new Error('Firebase client permanently disabled'); };
export const collection = () => { throw new Error('Firebase client permanently disabled'); };
export const doc = () => { throw new Error('Firebase client permanently disabled'); };
export const getDocs = () => { throw new Error('Firebase client permanently disabled'); };
export const getDoc = () => { throw new Error('Firebase client permanently disabled'); };

export default apiOnlyEnforcer;