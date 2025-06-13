// Firebase configuration using ES modules
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA3f4gJOKZDIjy9gnhSSpMVLs1UblGxo0s",
  authDomain: "bismi-broilers-3ca96.firebaseapp.com",
  databaseURL: "https://bismi-broilers-3ca96-default-rtdb.firebaseio.com",
  projectId: "bismi-broilers-3ca96",
  storageBucket: "bismi-broilers-3ca96.firebasestorage.app",
  messagingSenderId: "949430744092",
  appId: "1:949430744092:web:4ea5638a9d38ba3e76dbd9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log('Firebase Firestore initialized exclusively with project:', firebaseConfig.projectId);

export default {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
};