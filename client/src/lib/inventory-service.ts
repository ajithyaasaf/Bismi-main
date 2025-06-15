import { apiRequest } from './queryClient';

// Add a new inventory item
export async function addInventoryItem(itemData: any) {
  const response = await apiRequest('POST', '/api/inventory', itemData);
  return response.json();
}

// Get all inventory items
export async function getInventoryItems() {
  const response = await apiRequest('GET', '/api/inventory');
  return response.json();
}

// Update an existing inventory item
export async function updateInventoryItem(id: string, itemData: any) {
  const response = await apiRequest('PUT', `/api/inventory/${id}`, itemData);
  return response.json();
}

// Get an inventory item by ID
export async function getInventoryItemById(id: string) {
  const response = await apiRequest('GET', `/api/inventory/${id}`);
  return response.json();
}

// Delete an inventory item
export async function deleteInventoryItem(id: string) {
  const response = await apiRequest('DELETE', `/api/inventory/${id}`);
  return response.ok;
}

// Add stock to inventory
export async function addStock(stockData: any) {
  const response = await apiRequest('POST', '/api/add-stock', stockData);
  return response.json();
}