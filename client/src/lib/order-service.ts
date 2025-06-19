import { apiRequest, safeJsonResponse } from './queryClient';

// Get all orders from API
export async function getOrders() {
  const response = await apiRequest('GET', '/api/orders');
  return safeJsonResponse(response);
}

// Get orders by customer ID from API (optimized server-side filtering)
export async function getOrdersByCustomer(customerId: string) {
  const response = await apiRequest('GET', `/api/orders?customerId=${customerId}`);
  return safeJsonResponse(response);
}

// Get an order by ID from API
export async function getOrderById(id: string) {
  const response = await apiRequest('GET', `/api/orders/${id}`);
  return safeJsonResponse(response);
}

// Add a new order (uses API for enterprise validation and inventory updates)
export async function addOrder(orderData: any) {
  const response = await apiRequest('POST', '/api/orders', orderData);
  return safeJsonResponse(response);
}

// Update an existing order (uses API for enterprise validation)
export async function updateOrder(id: string, orderData: any) {
  const response = await apiRequest('PUT', `/api/orders/${id}`, orderData);
  return safeJsonResponse(response);
}

// Delete an order (uses API for enterprise validation)
export async function deleteOrder(id: string) {
  const response = await apiRequest('DELETE', `/api/orders/${id}`);
  return response.ok;
}