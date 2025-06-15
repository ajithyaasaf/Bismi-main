import * as OrderService from './order-service';
import { apiRequest } from './queryClient';

// Add a new customer
export async function addCustomer(customerData: any) {
  const response = await apiRequest('POST', '/api/customers', customerData);
  return response.json();
}

// Get all customers
export async function getCustomers() {
  const response = await apiRequest('GET', '/api/customers');
  return response.json();
}

// Update an existing customer
export async function updateCustomer(id: string, customerData: any) {
  const response = await apiRequest('PUT', `/api/customers/${id}`, customerData);
  return response.json();
}

// Get a customer by ID
export async function getCustomerById(id: string) {
  const response = await apiRequest('GET', `/api/customers/${id}`);
  return response.json();
}

// Recalculate a customer's pending amount based on their pending orders
export async function recalculateCustomerPendingAmount(customerId: string) {
  const customerOrders = await OrderService.getOrdersByCustomer(customerId);
  
  const pendingAmount = customerOrders
    .filter((order: any) => order.status !== 'paid')
    .reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  
  return await updateCustomer(customerId, { pendingAmount });
}

// Delete a customer
export async function deleteCustomer(id: string) {
  const response = await apiRequest('DELETE', `/api/customers/${id}`);
  return response.ok;
}