import { apiRequest } from './queryClient';

// Add a new supplier
export async function addSupplier(supplierData: any) {
  const response = await apiRequest('POST', '/api/suppliers', supplierData);
  return response.json();
}

// Get all suppliers
export async function getSuppliers() {
  const response = await apiRequest('GET', '/api/suppliers');
  return response.json();
}

// Update an existing supplier
export async function updateSupplier(id: string, supplierData: any) {
  const response = await apiRequest('PUT', `/api/suppliers/${id}`, supplierData);
  return response.json();
}

// Get a supplier by ID
export async function getSupplierById(id: string) {
  const response = await apiRequest('GET', `/api/suppliers/${id}`);
  return response.json();
}

// Delete a supplier
export async function deleteSupplier(id: string) {
  const response = await apiRequest('DELETE', `/api/suppliers/${id}`);
  return response.ok;
}

// Make a payment to a supplier
export async function makeSupplierPayment(id: string, paymentData: any) {
  const response = await apiRequest('POST', `/api/suppliers/${id}/payment`, paymentData);
  return response.json();
}