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

// Process supplier payment with comprehensive cache invalidation and enhanced error handling
export async function processSupplierPayment(supplierId: string, amount: number, description?: string) {
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
    console.log(`[SupplierService] Processing payment of ₹${roundedAmount} for supplier ${supplierId}`);
    
    const response = await apiRequest('POST', `/api/suppliers/${supplierId}/payment`, {
      amount: roundedAmount,
      description
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Payment failed with status ${response.status}`);
    }
    
    const result = await safeJsonResponse(response);
    
    console.log(`[SupplierService] Payment successful:`, {
      updatedPendingAmount: result.updatedPendingAmount,
      transactionId: result.transaction?.id
    });
    
    // Invalidate all related cache keys for dynamic updates
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', supplierId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
    ]);
    
    return result;
  } catch (error) {
    console.error('Supplier payment processing failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Payment processing failed. Please try again.');
  }
}