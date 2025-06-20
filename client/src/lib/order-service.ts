import { apiRequest, safeJsonResponse, queryClient } from './queryClient';

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
  try {
    const response = await apiRequest('POST', '/api/orders', orderData);
    const result = await safeJsonResponse(response);
    
    // Invalidate related cache keys for dynamic updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/customers', orderData.customerId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] }),
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${orderData.customerId}/whatsapp`] })
    ]);
    
    return result;
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}

// Update an existing order (uses API for enterprise validation)
export async function updateOrder(id: string, orderData: any) {
  try {
    const response = await apiRequest('PUT', `/api/orders/${id}`, orderData);
    const result = await safeJsonResponse(response);
    
    // Invalidate related cache keys for dynamic updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/orders', id] }),
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
    ]);
    
    return result;
  } catch (error) {
    console.error('Order update failed:', error);
    throw error;
  }
}

// Delete an order (uses API for enterprise validation)
export async function deleteOrder(id: string) {
  try {
    const response = await apiRequest('DELETE', `/api/orders/${id}`);
    const success = response.ok;
    
    if (success) {
      // Invalidate related cache keys for dynamic updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
      ]);
    }
    
    return success;
  } catch (error) {
    console.error('Order deletion failed:', error);
    throw error;
  }
}