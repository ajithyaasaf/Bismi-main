import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Debug: Log environment variables (only keys, not values for security)
console.log('Firebase client environment check:', {
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  hasStorageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  hasMessagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID // Safe to log project ID
});

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate required configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);

if (missingFields.length > 0) {
  console.error('Missing Firebase configuration fields:', missingFields);
  throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}`);
}

let app;
let db;

try {
  // Initialize Firebase
  console.log('Initializing Firebase client with project:', firebaseConfig.projectId);
  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore
  db = getFirestore(app);
  console.log('Firebase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Firebase client:', error);
  throw error;
}

export { db };
export default app;