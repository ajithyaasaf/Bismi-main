import { db } from './firebase-config';
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { apiRequest } from './queryClient';
import * as OrderService from './order-service';

// Firebase Client SDK for real-time data access
const CUSTOMERS_COLLECTION = 'customers';

// Get all customers from Firestore
export async function getCustomers() {
  try {
    const customersRef = collection(db, CUSTOMERS_COLLECTION);
    const snapshot = await getDocs(customersRef);
    
    const customers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
    
    console.log('Loaded customers directly from Firestore:', customers);
    return customers;
  } catch (error) {
    console.error('Error loading customers from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', '/api/customers');
    return response.json();
  }
}

// Get a customer by ID from Firestore
export async function getCustomerById(id: string) {
  try {
    const customerRef = doc(db, CUSTOMERS_COLLECTION, id);
    const snapshot = await getDoc(customerRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        createdAt: snapshot.data().createdAt?.toDate?.() || new Date(snapshot.data().createdAt),
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading customer by ID from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', `/api/customers/${id}`);
    return response.json();
  }
}

// Add a new customer (uses API for enterprise validation)
export async function addCustomer(customerData: any) {
  const response = await apiRequest('POST', '/api/customers', customerData);
  return response.json();
}

// Update an existing customer (uses API for enterprise validation)
export async function updateCustomer(id: string, customerData: any) {
  const response = await apiRequest('PUT', `/api/customers/${id}`, customerData);
  return response.json();
}

// Delete a customer (uses API for enterprise validation)
export async function deleteCustomer(id: string) {
  const response = await apiRequest('DELETE', `/api/customers/${id}`);
  return response.ok;
}

// Recalculate a customer's pending amount based on their pending orders
export async function recalculateCustomerPendingAmount(customerId: string) {
  const customerOrders = await OrderService.getOrdersByCustomer(customerId);
  
  const pendingAmount = customerOrders
    .filter((order: any) => order.status !== 'paid')
    .reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  
  return await updateCustomer(customerId, { pendingAmount });
}