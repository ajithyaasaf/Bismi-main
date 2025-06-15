import { db } from './firebase-config';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { apiRequest } from './queryClient';

// Firebase Client SDK for real-time data access
const TRANSACTIONS_COLLECTION = 'transactions';

// Get all transactions from Firestore
export async function getTransactions() {
  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const snapshot = await getDocs(transactionsRef);
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(doc.data().date),
    }));
    
    console.log('Loaded transactions directly from Firestore:', transactions);
    return transactions;
  } catch (error) {
    console.error('Error loading transactions from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', '/api/transactions');
    return response.json();
  }
}

// Get a transaction by ID from Firestore
export async function getTransactionById(id: string) {
  try {
    const transactionRef = doc(db, TRANSACTIONS_COLLECTION, id);
    const snapshot = await getDoc(transactionRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        date: snapshot.data().date?.toDate?.() || new Date(snapshot.data().date),
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading transaction by ID from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', `/api/transactions/${id}`);
    return response.json();
  }
}

// Get transactions by entity ID from Firestore
export async function getTransactionsByEntity(entityId: string) {
  try {
    const transactionsRef = collection(db, TRANSACTIONS_COLLECTION);
    const q = query(transactionsRef, where('entityId', '==', entityId));
    const snapshot = await getDocs(q);
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(doc.data().date),
    }));
    
    return transactions;
  } catch (error) {
    console.error('Error loading transactions by entity from Firestore:', error);
    // Fallback to API approach
    const transactions = await getTransactions();
    return transactions.filter((transaction: any) => transaction.entityId === entityId);
  }
}

// Add a new transaction (uses API for enterprise validation)
export async function addTransaction(transactionData: any) {
  const response = await apiRequest('POST', '/api/transactions', transactionData);
  return response.json();
}