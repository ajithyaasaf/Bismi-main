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
  const response = await apiRequest('GET', `/api/transactions/${id}`);
  return safeJsonResponse(response);
}

// Get transactions by entity ID from API
export async function getTransactionsByEntity(entityId: string) {
  const transactions = await getTransactions();
  return transactions.filter((transaction: any) => transaction.entityId === entityId);
}

// Add a new transaction (uses API for enterprise validation)
export async function addTransaction(transactionData: any) {
  const response = await apiRequest('POST', '/api/transactions', transactionData);
  return safeJsonResponse(response);
}