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

// Add a new transaction
export async function addTransaction(transactionData: any) {
  try {
    console.log('Adding transaction via API:', transactionData);
    const result = await apiRequest('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
    console.log('Transaction added successfully:', result);
    return result;
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
}

// Get all transactions
export async function getTransactions() {
  try {
    console.log('Getting all transactions via API');
    const transactions = await apiRequest('/transactions');
    console.log(`Retrieved ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error('Error getting transactions:', error);
    throw error;
  }
}

// Get transactions by entity ID (customer or supplier ID)
export async function getTransactionsByEntity(entityId: string, entityType?: string) {
  try {
    console.log(`Getting transactions for entity ${entityId} via API`);
    const transactions = await getTransactions();
    const entityTransactions = transactions.filter((transaction: any) => 
      transaction.entityId === entityId && 
      (!entityType || transaction.entityType === entityType)
    );
    console.log(`Retrieved ${entityTransactions.length} transactions for entity ${entityId}`);
    return entityTransactions;
  } catch (error) {
    console.error(`Error getting transactions for entity ${entityId}:`, error);
    throw error;
  }
}

// Get a transaction by ID
export async function getTransactionById(id: string) {
  try {
    console.log(`Getting transaction via API with ID: ${id}`);
    const transaction = await apiRequest(`/transactions/${id}`);
    return transaction;
  } catch (error) {
    console.error(`Error getting transaction:`, error);
    throw error;
  }
}

// Update an existing transaction
export async function updateTransaction(id: string, transactionData: any) {
  try {
    console.log(`Updating transaction via API with ID: ${id}`, transactionData);
    const result = await apiRequest(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transactionData),
    });
    console.log(`Transaction with ID ${id} updated successfully`);
    return result;
  } catch (error) {
    console.error(`Error updating transaction:`, error);
    throw error;
  }
}

// Delete a transaction
export async function deleteTransaction(id: string) {
  try {
    console.log(`Deleting transaction via API with ID: ${id}`);
    await apiRequest(`/transactions/${id}`, {
      method: 'DELETE',
    });
    console.log(`Transaction with ID ${id} deleted successfully`);
    return true;
  } catch (error) {
    console.error(`Error deleting transaction:`, error);
    throw error;
  }
}