import { db } from './firebase-config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { apiRequest } from './queryClient';

// Firebase Client SDK for real-time data access
const SUPPLIERS_COLLECTION = 'suppliers';

// Get all suppliers from Firestore
export async function getSuppliers() {
  try {
    const suppliersRef = collection(db, SUPPLIERS_COLLECTION);
    const snapshot = await getDocs(suppliersRef);
    
    const suppliers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
    
    console.log('Loaded suppliers directly from Firestore:', suppliers);
    return suppliers;
  } catch (error) {
    console.error('Error loading suppliers from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', '/api/suppliers');
    return response.json();
  }
}

// Get a supplier by ID from Firestore
export async function getSupplierById(id: string) {
  try {
    const supplierRef = doc(db, SUPPLIERS_COLLECTION, id);
    const snapshot = await getDoc(supplierRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data().createdAt?.toDate?.() || new Date(snapshot.data().createdAt),
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading supplier by ID from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', `/api/suppliers/${id}`);
    return response.json();
  }
}

// Add a new supplier (uses API for enterprise validation)
export async function addSupplier(supplierData: any) {
  const response = await apiRequest('POST', '/api/suppliers', supplierData);
  return response.json();
}

// Update an existing supplier (uses API for enterprise validation)
export async function updateSupplier(id: string, supplierData: any) {
  const response = await apiRequest('PUT', `/api/suppliers/${id}`, supplierData);
  return response.json();
}

// Delete a supplier (uses API for enterprise validation)
export async function deleteSupplier(id: string) {
  const response = await apiRequest('DELETE', `/api/suppliers/${id}`);
  return response.ok;
}

// Make a payment to a supplier (uses API for enterprise validation)
export async function makeSupplierPayment(id: string, paymentData: any) {
  const response = await apiRequest('POST', `/api/suppliers/${id}/payment`, paymentData);
  return response.json();
}