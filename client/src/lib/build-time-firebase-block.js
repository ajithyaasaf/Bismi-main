// Build-time Firebase client blocking
// This script runs during build to ensure no Firebase client code is included

// Check if we're in a build environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Block Firebase client modules at build time
  const originalRequire = typeof require !== 'undefined' ? require : null;
  
  if (originalRequire) {
    const Module = originalRequire('module');
    const originalLoad = Module._load;
    
    Module._load = function(request, parent, isMain) {
      // Block Firebase client modules
      if (request.includes('firebase') && !request.includes('firebase-admin')) {
        console.warn(`🚫 Blocked Firebase client module: ${request}`);
        return {
          // Return empty object instead of Firebase client
          initializeApp: () => { throw new Error('Firebase client blocked - use API endpoints'); },
          getFirestore: () => { throw new Error('Firebase client blocked - use API endpoints'); },
          collection: () => { throw new Error('Firebase client blocked - use API endpoints'); },
          doc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
          getDocs: () => { throw new Error('Firebase client blocked - use API endpoints'); },
          getDoc: () => { throw new Error('Firebase client blocked - use API endpoints'); },
        };
      }
      
      return originalLoad.apply(this, arguments);
    };
  }
}

// Export empty Firebase client shims
export const initializeApp = () => { throw new Error('Firebase client permanently blocked'); };
export const getFirestore = () => { throw new Error('Firebase client permanently blocked'); };
export const collection = () => { throw new Error('Firebase client permanently blocked'); };
export const doc = () => { throw new Error('Firebase client permanently blocked'); };
export const getDocs = () => { throw new Error('Firebase client permanently blocked'); };
export const getDoc = () => { throw new Error('Firebase client permanently blocked'); };
export const db = null;

console.log('🔒 Build-time Firebase client blocking active');