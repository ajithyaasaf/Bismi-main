import { db } from './firebase-config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { apiRequest } from './queryClient';

// Firebase Client SDK for real-time data access
const INVENTORY_COLLECTION = 'inventory';

// Get all inventory items from Firestore
export async function getInventoryItems() {
  try {
    const inventoryRef = collection(db, INVENTORY_COLLECTION);
    const snapshot = await getDocs(inventoryRef);
    
    const inventory = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate?.() || (doc.data().updatedAt ? new Date(doc.data().updatedAt) : null),
    }));
    
    console.log('Loaded inventory directly from Firestore:', inventory);
    return inventory;
  } catch (error) {
    console.error('Error loading inventory from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', '/api/inventory');
    return response.json();
  }
}

// Get an inventory item by ID from Firestore
export async function getInventoryItemById(id: string) {
  try {
    const inventoryRef = doc(db, INVENTORY_COLLECTION, id);
    const snapshot = await getDoc(inventoryRef);
    
    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
        updatedAt: snapshot.data().updatedAt?.toDate?.() || (snapshot.data().updatedAt ? new Date(snapshot.data().updatedAt) : null),
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading inventory item by ID from Firestore:', error);
    // Fallback to API
    const response = await apiRequest('GET', `/api/inventory/${id}`);
    return response.json();
  }
}

// Add a new inventory item (uses API for enterprise validation)
export async function addInventoryItem(itemData: any) {
  const response = await apiRequest('POST', '/api/inventory', itemData);
  return response.json();
}

// Update an existing inventory item (uses API for enterprise validation)
export async function updateInventoryItem(id: string, itemData: any) {
  const response = await apiRequest('PUT', `/api/inventory/${id}`, itemData);
  return response.json();
}

// Delete an inventory item (uses API for enterprise validation)
export async function deleteInventoryItem(id: string) {
  const response = await apiRequest('DELETE', `/api/inventory/${id}`);
  return response.ok;
}

// Add stock to inventory (uses API for enterprise validation and supplier debt tracking)
export async function addStock(stockData: any) {
  const response = await apiRequest('POST', '/api/add-stock', stockData);
  return response.json();
}