import { apiRequest } from './queryClient';

// Get all orders from API
export async function getOrders() {
  const response = await apiRequest('GET', '/api/orders');
  return response.json();
}

// Get orders by customer ID from API
export async function getOrdersByCustomer(customerId: string) {
  const orders = await getOrders();
  return orders.filter((order: any) => order.customerId === customerId);
}

// Get an order by ID from API
export async function getOrderById(id: string) {
  const response = await apiRequest('GET', `/api/orders/${id}`);
  return response.json();
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