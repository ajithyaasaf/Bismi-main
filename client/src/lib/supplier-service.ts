import { FirebaseRealtimeClient } from './firebase-realtime';

// API base URL
const API_BASE = '/api';

// Helper function to make API requests (Admin SDK backend operations)
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${error}`);
  }
  
  return response.json();
}

// Add a new supplier
export async function addSupplier(supplierData: any) {
  try {
    console.log('Adding supplier via API:', supplierData);
    const result = await apiRequest('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
    console.log('Supplier added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding supplier:', error);
    throw error;
  }
}

// Get all suppliers (uses Firebase client SDK for real-time data)
export async function getSuppliers() {
  try {
    console.log('Getting all suppliers via Firebase client SDK');
    const suppliers = await FirebaseRealtimeClient.getSuppliers();
    console.log(`Retrieved ${suppliers.length} suppliers via Firebase client`);
    return suppliers;
  } catch (error) {
    console.error('Error getting suppliers:', error);
    throw error;
  }
}

// Get a supplier by ID
export async function getSupplierById(id: string) {
  try {
    console.log(`Getting supplier via API with ID: ${id}`);
    const supplier = await apiRequest(`/suppliers/${id}`);
    return supplier;
  } catch (error) {
    console.error(`Error getting supplier:`, error);
    throw error;
  }
}

// Update an existing supplier
export async function updateSupplier(id: string, supplierData: any) {
  try {
    console.log(`Updating supplier via API with ID: ${id}`, supplierData);
    const result = await apiRequest(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    });
    console.log(`Supplier with ID ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error(`Error updating supplier:`, error);
    throw error;
  }
}

// Delete a supplier
export async function deleteSupplier(id: string) {
  try {
    console.log(`Deleting supplier via API with ID: ${id}`);
    await apiRequest(`/suppliers/${id}`, {
      method: 'DELETE',
    });
    console.log(`Supplier with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting supplier:`, error);
    throw error;
  }
}

// Record a payment to a supplier
export async function recordSupplierPayment(id: string, amount: number, description: string) {
  try {
    console.log(`Recording payment for supplier with ID: ${id}, amount: ${amount}`);
    const result = await apiRequest(`/suppliers/${id}/payment`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    });
    console.log(`Payment recorded successfully for supplier ${id}`);
    return result;
  } catch (error) {
    console.error(`Error recording payment for supplier ${id}:`, error);
    throw error;
  }
}