import { FirebaseRealtimeClient } from './firebase-realtime';

// API base URL
const API_BASE = '/api';

// Helper function to make API requests (Admin SDK backend operations)
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }
  
  return response.json();
}

// Add a new inventory item
export async function addInventoryItem(itemData: any) {
  try {
    console.log('Adding inventory item via API:', itemData);
    const result = await apiRequest('/inventory', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    console.log('Inventory item added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding inventory item:', error);
    throw error;
  }
}

// Get all inventory items (uses Firebase client SDK for real-time data)
export async function getInventoryItems() {
  try {
    console.log('Getting all inventory items via Firebase client SDK');
    const items = await FirebaseRealtimeClient.getInventory();
    console.log(`Retrieved ${items.length} inventory items via Firebase client`);
    return items;
  } catch (error) {
    console.error('Error getting inventory items:', error);
    throw error;
  }
}

// Get an inventory item by ID
export async function getInventoryItemById(id: string) {
  try {
    console.log(`Getting inventory item via API with ID: ${id}`);
    const item = await apiRequest(`/inventory/${id}`);
    return item;
  } catch (error) {
    console.error(`Error getting inventory item:`, error);
    throw error;
  }
}

// Update an existing inventory item
export async function updateInventoryItem(id: string, itemData: any) {
  try {
    console.log(`Updating inventory item via API with ID: ${id}`, itemData);
    const result = await apiRequest(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(itemData),
    });
    console.log(`Inventory item with ID ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error(`Error updating inventory item:`, error);
    throw error;
  }
}

// Delete an inventory item
export async function deleteInventoryItem(id: string) {
  try {
    console.log(`Deleting inventory item via API with ID: ${id}`);
    await apiRequest(`/inventory/${id}`, {
      method: 'DELETE',
    });
    console.log(`Inventory item with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting inventory item:`, error);
    throw error;
  }
}

// Add stock to an inventory item
export async function addStock(itemData: any) {
  try {
    console.log('Adding stock via API:', itemData);
    const result = await apiRequest('/add-stock', {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    console.log('Stock added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding stock:', error);
    throw error;
  }
}