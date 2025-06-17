// Complete Firebase client SDK blocker
// This file ensures no Firebase client operations can execute

// Block all Firebase client SDK functions
export const initializeApp = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const getFirestore = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const collection = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const doc = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const getDocs = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const getDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const addDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const updateDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const deleteDoc = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const query = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const where = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const orderBy = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

export const limit = () => {
  throw new Error('Firebase client disabled - use API endpoints only');
};

// Block any Firebase app initialization
export const db = null;
export const app = null;

// Override global Firebase if it exists
if (typeof window !== 'undefined') {
  (window as any).firebase = undefined;
  (window as any).getFirestore = getFirestore;
  (window as any).collection = collection;
  (window as any).doc = doc;
  (window as any).getDocs = getDocs;
  (window as any).getDoc = getDoc;
  console.log('Firebase client SDK completely blocked');
}

export default null;