import { apiRequest } from './queryClient';

// Add a new order
export async function addOrder(orderData: any) {
  const response = await apiRequest('POST', '/api/orders', orderData);
  return response.json();
}

// Get all orders
export async function getOrders() {
  const response = await apiRequest('GET', '/api/orders');
  return response.json();
}

// Get orders by customer ID
export async function getOrdersByCustomer(customerId: string) {
  const orders = await getOrders();
  return orders.filter((order: any) => order.customerId === customerId);
}

// Update an existing order
export async function updateOrder(id: string, orderData: any) {
  const response = await apiRequest('PUT', `/api/orders/${id}`, orderData);
  return response.json();
}

// Get an order by ID
export async function getOrderById(id: string) {
  const response = await apiRequest('GET', `/api/orders/${id}`);
  return response.json();
}

// Delete an order
export async function deleteOrder(id: string) {
  const response = await apiRequest('DELETE', `/api/orders/${id}`);
  return response.ok;
}