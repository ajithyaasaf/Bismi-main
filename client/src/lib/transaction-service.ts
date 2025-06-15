import { apiRequest } from './queryClient';

// Add a new transaction
export async function addTransaction(transactionData: any) {
  const response = await apiRequest('POST', '/api/transactions', transactionData);
  return response.json();
}

// Get all transactions
export async function getTransactions() {
  const response = await apiRequest('GET', '/api/transactions');
  return response.json();
}

// Get a transaction by ID
export async function getTransactionById(id: string) {
  const response = await apiRequest('GET', `/api/transactions/${id}`);
  return response.json();
}

// Get transactions by entity ID
export async function getTransactionsByEntity(entityId: string) {
  const transactions = await getTransactions();
  return transactions.filter((transaction: any) => transaction.entityId === entityId);
}