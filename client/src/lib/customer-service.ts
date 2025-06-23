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
    .filter((order: any) => order.paymentStatus === 'pending')
    .reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  
  return await updateCustomer(customerId, { pendingAmount });
}

// Process customer payment with comprehensive cache invalidation and enhanced error handling
export async function processCustomerPayment(customerId: string, amount: number, description?: string, targetOrderId?: string) {
  // Validate payment amount on frontend
  if (!amount || amount <= 0) {
    throw new Error('Payment amount must be greater than ₹0');
  }
  
  if (amount > 1000000) {
    throw new Error('Payment amount cannot exceed ₹10,00,000');
  }
  
  // Round to 2 decimal places for precision
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount !== amount) {
    throw new Error('Payment amount can only have up to 2 decimal places');
  }

  try {
    console.log(`[CustomerService] Processing payment of ₹${roundedAmount} for customer ${customerId}`);
    
    const response = await apiRequest('POST', `/api/customers/${customerId}/payment`, {
      amount: roundedAmount,
      description,
      targetOrderId
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Payment failed with status ${response.status}`);
    }
    
    const result = await safeJsonResponse(response);
    
    console.log(`[CustomerService] Payment successful:`, {
      appliedAmount: result.appliedAmount,
      remainingCredit: result.remainingCredit,
      updatedOrders: result.updatedOrders?.length || 0
    });
    
    // Invalidate all related cache keys for dynamic updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/orders', customerId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] }),
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/whatsapp`] })
    ]);
    
    return result;
  } catch (error) {
    console.error('Customer payment processing failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Payment processing failed. Please try again.');
  }
}