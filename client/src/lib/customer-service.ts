import { apiRequest, safeJsonResponse, queryClient } from './queryClient';
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

// Get customer data specifically formatted for WhatsApp with accurate pending amounts
export async function getCustomerForWhatsApp(id: string) {
  const response = await apiRequest('GET', `/api/customers/${id}/whatsapp`);
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
    .filter((order: any) => order.paymentStatus !== 'paid')
    .reduce((sum: number, order: any) => {
      const totalAmount = order.totalAmount || 0;
      const paidAmount = order.paidAmount || 0;
      const balance = Math.round((totalAmount - paidAmount + Number.EPSILON) * 100) / 100;
      return Math.round((sum + balance + Number.EPSILON) * 100) / 100;
    }, 0);
  
  return await updateCustomer(customerId, { pendingAmount });
}

// Process customer payment with comprehensive cache invalidation
export async function processCustomerPayment(customerId: string, amount: number, description?: string, targetOrderId?: string) {
  try {
    const response = await apiRequest('POST', `/api/customers/${customerId}/payment`, {
      amount,
      description,
      targetOrderId
    });
    
    const result = await safeJsonResponse(response);
    
    // Invalidate all related cache keys for dynamic updates
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/orders', customerId] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
    queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/whatsapp`] });
    
    return result;
  } catch (error) {
    console.error('Customer payment processing failed:', error);
    throw error;
  }
}