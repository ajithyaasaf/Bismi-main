// Simple Firebase Client SDK Blocker
// Prevents Firebase client code execution without property conflicts

if (typeof window !== 'undefined') {
  // 1. Simple global blocking without property redefinition
  const blockFirebase = () => {
    console.warn('Firebase client disabled - using API-only architecture');
    return null;
  };

  // Only set if not already defined to avoid conflicts
  if (!(window as any).firebase) {
    (window as any).firebase = undefined;
  }
  
  // 2. Intercept fetch requests to Firebase endpoints
  const originalFetch = window.fetch;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Block direct Firebase API calls
    if (url.includes('firestore.googleapis.com') || 
        url.includes('firebase.googleapis.com') ||
        url.includes('identitytoolkit.googleapis.com')) {
      console.error('Blocked Firebase client request:', url);
      throw new Error('Firebase client requests blocked - use API endpoints');
    }

    return originalFetch(input, init);
  };

  // 3. Handle JSON parsing errors gracefully
  const originalJSONParse = JSON.parse;
  JSON.parse = (text: string) => {
    if (text.includes('<!DOCTYPE') || text.includes('<html>')) {
      console.error('Attempted to parse HTML as JSON - likely API routing issue');
      throw new Error('API endpoint returned HTML instead of JSON');
    }
    return originalJSONParse(text);
  };

  console.log('Simple Firebase blocker activated - API-only mode');
}

// Export blocked functions for compatibility
export const initializeApp = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const getFirestore = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const collection = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const doc = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const getDocs = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const getDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const addDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const updateDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const deleteDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const query = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const where = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const orderBy = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const limit = () => {
  throw new Error('Firebase client disabled - use API endpoints');
};

export const db = null;
export const app = null;

export default null;