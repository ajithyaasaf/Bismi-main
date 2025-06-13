import * as OrderService from './order-service';

// API base URL
const API_BASE = '/api';

// Helper function to make API requests
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

// Add a new customer
export async function addCustomer(customerData: any) {
  try {
    console.log('Adding customer via API:', customerData);
    const result = await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    });
    console.log('Customer added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
}

// Get all customers
export async function getCustomers() {
  try {
    console.log('Getting all customers via API');
    const customers = await apiRequest('/customers');
    console.log(`Retrieved ${customers.length} customers`);
    return customers;
  } catch (error) {
    console.error('Error getting customers:', error);
    throw error;
  }
}

// Update an existing customer
export async function updateCustomer(id: string, customerData: any) {
  try {
    console.log(`Updating customer via API with ID: ${id}`, customerData);
    const result = await apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    });
    console.log(`Customer with ID ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error(`Error updating customer:`, error);
    throw error;
  }
}

// Get a customer by ID
export async function getCustomerById(id: string) {
  try {
    console.log(`Getting customer via API with ID: ${id}`);
    const customer = await apiRequest(`/customers/${id}`);
    return customer;
  } catch (error) {
    console.error(`Error getting customer:`, error);
    throw error;
  }
}

// Recalculate a customer's pending amount based on their pending orders
export async function recalculateCustomerPendingAmount(customerId: string) {
  try {
    console.log(`Recalculating pending amount for customer with ID: ${customerId}`);
    
    // Get all orders for this customer
    const customerOrders = await OrderService.getOrdersByCustomer(customerId);
    
    // Calculate total pending amount by summing all pending orders
    const pendingAmount = customerOrders
      .filter(order => {
        // Check if the order has the required properties
        return order && 
               typeof order === 'object' && 
               'status' in order &&
               typeof order.status === 'string' &&
               order.status !== 'paid';
      })
      .reduce((sum, order) => {
        // Safely extract total value with type checking
        let orderTotal = 0;
        if (order && 
            typeof order === 'object' && 
            'total' in order) {
          orderTotal = typeof order.total === 'number' ? order.total : 0;
        }
        return sum + orderTotal;
      }, 0);
    
    console.log(`Calculated pending amount for customer ${customerId}: ${pendingAmount}`);
    
    // Update the customer with the new pending amount
    const updateResult = await updateCustomer(customerId, { pendingAmount });
    
    return updateResult;
  } catch (error) {
    console.error(`Error recalculating pending amount for customer ${customerId}:`, error);
    throw error;
  }
}

// Delete a customer
export async function deleteCustomer(id: string) {
  try {
    console.log(`Deleting customer via API with ID: ${id}`);
    await apiRequest(`/customers/${id}`, {
      method: 'DELETE',
    });
    console.log(`Customer with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting customer:`, error);
    throw error;
  }
}