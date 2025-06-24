import { apiRequest, safeJsonResponse, queryClient } from './queryClient';

// Get all suppliers from API
export async function getSuppliers() {
  const response = await apiRequest('GET', '/api/suppliers');
  return safeJsonResponse(response);
}

// Get a supplier by ID from API
export async function getSupplierById(id: string) {
  const response = await apiRequest('GET', `/api/suppliers/${id}`);
  return safeJsonResponse(response);
}

// Add a new supplier (uses API for enterprise validation)
export async function addSupplier(supplierData: any) {
  const response = await apiRequest('POST', '/api/suppliers', supplierData);
  return safeJsonResponse(response);
}

// Update an existing supplier (uses API for enterprise validation)
export async function updateSupplier(id: string, supplierData: any) {
  const response = await apiRequest('PUT', `/api/suppliers/${id}`, supplierData);
  return safeJsonResponse(response);
}

// Delete a supplier (uses API for enterprise validation)
export async function deleteSupplier(id: string) {
  const response = await apiRequest('DELETE', `/api/suppliers/${id}`);
  return response.ok;
}

// Make a payment to a supplier (uses API for enterprise validation)
export async function makeSupplierPayment(id: string, paymentData: any) {
  const response = await apiRequest('POST', `/api/suppliers/${id}/payment`, paymentData);
  return safeJsonResponse(response);
}

// Process supplier payment with comprehensive cache invalidation
export async function processSupplierPayment(supplierId: string, amount: number, description?: string) {
  try {
    const response = await apiRequest('POST', `/api/suppliers/${supplierId}/payment`, {
      amount,
      description
    });
    
    const result = await safeJsonResponse(response);
    
    // Invalidate all related cache keys for dynamic updates
    console.log(`[Payment] Invalidating cache for supplier ${supplierId} after payment of ${amount}`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', supplierId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
    ]);
    console.log(`[Payment] Cache invalidation completed for supplier ${supplierId}`);
    
    return result;
  } catch (error) {
    console.error('Supplier payment processing failed:', error);
    throw error;
  }
}