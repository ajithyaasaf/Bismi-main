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
  
  // Handle 204 No Content responses (like DELETE operations)
  if (response.status === 204) {
    return null;
  }
  
  // Only parse JSON if there's content
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Add a new order
export async function addOrder(orderData: any) {
  try {
    console.log('Adding order via API:', orderData);
    const result = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    console.log('Order added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding order:', error);
    throw error;
  }
}

// Get all orders (uses Firebase client SDK for real-time data)
export async function getOrders() {
  try {
    console.log('Getting all orders via Firebase client SDK');
    const orders = await FirebaseRealtimeClient.getOrders();
    console.log(`Retrieved ${orders.length} orders via Firebase client`);
    return orders;
  } catch (error) {
    console.error('Error getting orders:', error);
    throw error;
  }
}

// Get orders by customer ID (uses Firebase client SDK for real-time data)
export async function getOrdersByCustomer(customerId: string) {
  try {
    console.log(`Getting orders for customer ${customerId} via Firebase client SDK`);
    const customerOrders = await FirebaseRealtimeClient.getOrdersByCustomer(customerId);
    console.log(`Retrieved ${customerOrders.length} orders for customer ${customerId} via Firebase client`);
    return customerOrders;
  } catch (error) {
    console.error(`Error getting orders for customer ${customerId}:`, error);
    throw error;
  }
}

// Get an order by ID
export async function getOrderById(id: string) {
  try {
    console.log(`Getting order via API with ID: ${id}`);
    const order = await apiRequest(`/orders/${id}`);
    return order;
  } catch (error) {
    console.error(`Error getting order:`, error);
    throw error;
  }
}

// Update an existing order
export async function updateOrder(id: string, orderData: any) {
  try {
    console.log(`Updating order via API with ID: ${id}`, orderData);
    const result = await apiRequest(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    });
    console.log(`Order with ID ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error(`Error updating order:`, error);
    throw error;
  }
}

// Delete an order
export async function deleteOrder(id: string) {
  try {
    console.log(`Deleting order via API with ID: ${id}`);
    await apiRequest(`/orders/${id}`, {
      method: 'DELETE',
    });
    console.log(`Order with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting order:`, error);
    throw error;
  }
}