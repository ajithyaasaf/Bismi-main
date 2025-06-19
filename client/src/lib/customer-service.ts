import { apiRequest, safeJsonResponse } from './queryClient';
import * as OrderService from './order-service';

// Get all customers from API
export async function getCustomers() {
  const response = await apiRequest('GET', '/api/customers');
  return safeJsonResponse(response);
}

// Get a customer by ID from API
export async function getCustomerById(id: string) {
  const response = await apiRequest('GET', `/api/customers/${id}`);
  return safeJsonResponse(response);
}

// Add a new customer (uses API for enterprise validation)
export async function addCustomer(customerData: any) {
  const response = await apiRequest('POST', '/api/customers', customerData);
  return safeJsonResponse(response);
}

// Update an existing customer (uses API for enterprise validation)
export async function updateCustomer(id: string, customerData: any) {
  const response = await apiRequest('PUT', `/api/customers/${id}`, customerData);
  return safeJsonResponse(response);
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