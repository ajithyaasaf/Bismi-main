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
    
    // Use optimized cache invalidation
    const { optimizedCacheInvalidation } = await import('./cache-strategy');
    await optimizedCacheInvalidation.order(result.id, 'create');
    
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
    
    // Use optimized cache invalidation
    const { optimizedCacheInvalidation } = await import('./cache-strategy');
    await optimizedCacheInvalidation.order(id, 'update');
    
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
      // Use optimized cache invalidation
      const { optimizedCacheInvalidation } = await import('./cache-strategy');
      await optimizedCacheInvalidation.order(id, 'delete');
    }
    
    return success;
  } catch (error) {
    console.error('Order deletion failed:', error);
    throw error;
  }
}