import { apiRequest, safeJsonResponse } from './queryClient';

// Get all transactions from API
export async function getTransactions() {
  const response = await apiRequest('GET', '/api/transactions');
  return safeJsonResponse(response);
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