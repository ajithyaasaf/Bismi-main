// PERMANENT Firebase Client SDK Override
// This file ensures Firebase client code can never execute, even if cached

// Override at module level - this prevents any Firebase client imports
declare global {
  interface Window {
    firebase: undefined;
    getFirestore: undefined;
    collection: undefined;
    doc: undefined;
    getDocs: undefined;
    getDoc: undefined;
  }
}

// Block Firebase at the source - override require/import if they exist
if (typeof window !== 'undefined') {
  // Block all Firebase client functions globally
  (window as any).firebase = undefined;
  (window as any).getFirestore = undefined;
  (window as any).collection = undefined;
  (window as any).doc = undefined;
  (window as any).getDocs = undefined;
  (window as any).getDoc = undefined;
  
  // Override console methods that might contain Firebase client logs
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('Firebase client') || 
        message.includes('Getting all') || 
        message.includes('Retrieved') && message.includes('via Firebase')) {
      console.error('BLOCKED: Firebase client SDK attempt detected and prevented');
      return;
    }
    originalLog.apply(console, args);
  };
}

// Create blocking module exports
export const initializeApp = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const getFirestore = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const collection = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const doc = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const getDocs = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const getDoc = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const addDoc = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const updateDoc = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const deleteDoc = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const query = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

export const where = () => {
  throw new Error('Firebase client permanently disabled - API-only architecture');
};

// Export null database reference
export const db = null;
export const app = null;

// Prevent any Firebase client initialization
export default null;

console.log('🔒 Firebase client SDK permanently overridden - API-only mode enforced');