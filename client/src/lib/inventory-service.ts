import { apiRequest, safeJsonResponse } from './queryClient';

// Get all inventory items from API
export async function getInventoryItems() {
  const response = await apiRequest('GET', '/api/inventory');
  return safeJsonResponse(response);
}

// Get an inventory item by ID from API
export async function getInventoryItemById(id: string) {
  const response = await apiRequest('GET', `/api/inventory/${id}`);
  return safeJsonResponse(response);
}

// Add a new inventory item (uses API for enterprise validation)
export async function addInventoryItem(itemData: any) {
  const response = await apiRequest('POST', '/api/inventory', itemData);
  return safeJsonResponse(response);
}

// Update an existing inventory item (uses API for enterprise validation)
export async function updateInventoryItem(id: string, itemData: any) {
  const response = await apiRequest('PUT', `/api/inventory/${id}`, itemData);
  return safeJsonResponse(response);
}

// Delete an inventory item (uses API for enterprise validation)
export async function deleteInventoryItem(id: string) {
  const response = await apiRequest('DELETE', `/api/inventory/${id}`);
  return response.ok;
}

// Add stock to inventory (uses API for enterprise validation and supplier pendingAmount tracking)
export async function addStock(stockData: any) {
  const response = await apiRequest('POST', '/api/add-stock', stockData);
  return safeJsonResponse(response);
}