import { db } from './firebase-config';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { apiRequest } from './queryClient';

// Firebase Client SDK for real-time data access
const ORDERS_COLLECTION = 'orders';

// Get all orders from Firestore
export async function getOrders() {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const snapshot = await getDocs(ordersRef);
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(doc.data().date),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
    
    console.log('Loaded orders directly from Firestore:', orders);
    return orders;
  } catch (error) {
    console.error('Error loading orders from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', '/api/orders');
    return response.json();
  }
}

// Get orders by customer ID from Firestore
export async function getOrdersByCustomer(customerId: string) {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, where('customerId', '==', customerId));
    const snapshot = await getDocs(q);
    
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate?.() || new Date(doc.data().date),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
    }));
    
    return orders;
  } catch (error) {
    console.error('Error loading orders by customer from Firestore:', error);
    // Fallback to API approach
    const orders = await getOrders();
    return orders.filter((order: any) => order.customerId === customerId);
  }
}

// Get an order by ID from Firestore
export async function getOrderById(id: string) {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, id);
    const snapshot = await getDoc(orderRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        date: snapshot.data().date?.toDate?.() || new Date(snapshot.data().date),
        createdAt: snapshot.data().createdAt?.toDate?.() || new Date(snapshot.data().createdAt),
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading order by ID from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', `/api/orders/${id}`);
    return response.json();
  }
}

// Add a new order (uses API for enterprise validation and inventory updates)
export async function addOrder(orderData: any) {
  const response = await apiRequest('POST', '/api/orders', orderData);
  return response.json();
}

// Update an existing order (uses API for enterprise validation)
export async function updateOrder(id: string, orderData: any) {
  const response = await apiRequest('PUT', `/api/orders/${id}`, orderData);
  return response.json();
}

// Delete an order (uses API for enterprise validation)
export async function deleteOrder(id: string) {
  const response = await apiRequest('DELETE', `/api/orders/${id}`);
  return response.ok;
}