import { apiRequest, safeJsonResponse } from './queryClient';

// Get all transactions from API
export async function getTransactions() {
  try {
    const response = await apiRequest('GET', '/api/transactions');
    const data = await safeJsonResponse(response);
    
    // Convert date strings back to Date objects for frontend consistency
    return data.map((transaction: any) => ({
      ...transaction,
      createdAt: new Date(transaction.createdAt)
    }));
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

// Get a transaction by ID from API
export async function getTransactionById(id: string) {
  try {
    const response = await apiRequest('GET', `/api/transactions/${id}`);
    const data = await safeJsonResponse(response);
    
    // Convert date string back to Date object
    return {
      ...data,
      createdAt: new Date(data.createdAt)
    };
  } catch (error) {
    console.error('Error fetching transaction by ID:', error);
    throw error;
  }
}

// Get transactions by entity ID from API
export async function getTransactionsByEntity(entityId: string) {
  const transactions = await getTransactions();
  return transactions.filter((transaction: any) => transaction.entityId === entityId);
}

// Add a new transaction (uses API for enterprise validation)
export async function addTransaction(transactionData: any) {
  try {
    const response = await apiRequest('POST', '/api/transactions', transactionData);
    const data = await safeJsonResponse(response);
    
    // Convert date string back to Date object
    return {
      ...data,
      createdAt: new Date(data.createdAt)
    };
  } catch (error) {
    console.error('Error adding transaction:', error);
    throw error;
  }
}