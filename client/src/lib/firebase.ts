// Firebase client SDK completely removed - API-only architecture
// All data operations go through secure backend API endpoints

// Throw error if anyone tries to use Firebase client
export const db = null;
export const app = null;

// Block any Firebase client operations
export function getFirestore() {
  throw new Error('Firebase client SDK disabled - use API endpoints only');
}

export function collection() {
  throw new Error('Direct Firebase access disabled - use API endpoints');
}

export function doc() {
  throw new Error('Direct Firebase access disabled - use API endpoints');
}

export function getDocs() {
  throw new Error('Direct Firebase access disabled - use API endpoints');
}

export function getDoc() {
  throw new Error('Direct Firebase access disabled - use API endpoints');
}

if (typeof window !== 'undefined') {
  console.log('Firebase client SDK completely disabled - using API-only architecture');
}

export default null;