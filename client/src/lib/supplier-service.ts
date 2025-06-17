import { apiRequest, safeJsonResponse } from './queryClient';

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