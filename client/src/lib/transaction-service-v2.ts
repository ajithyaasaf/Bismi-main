import { apiRequest, safeJsonResponse } from './queryClient';

// Completely new transaction service with robust error handling
export class TransactionServiceV2 {
  private static async makeRequest(method: string, endpoint: string, data?: any) {
    const response = await apiRequest(method, endpoint, data);
    return safeJsonResponse(response);
  }

  static async getAllTransactions() {
    try {
      const data = await this.makeRequest('GET', '/api/transactions');
      
      // Ensure we have an array
      if (!Array.isArray(data)) {
        console.warn('Expected array but got:', typeof data);
        return [];
      }

      // Convert date strings back to Date objects and ensure proper types
      return data.map((transaction: any) => ({
        id: String(transaction.id),
        entityId: String(transaction.entityId),
        entityType: String(transaction.entityType),
        type: String(transaction.type),
        amount: Number(transaction.amount) || 0,
        description: String(transaction.description),
        createdAt: new Date(transaction.createdAt)
      }));
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw new Error('Unable to load transactions. Please check your connection.');
    }
  }

  static async getTransactionById(id: string) {
    try {
      const data = await this.makeRequest('GET', `/api/transactions/${id}`);
      
      return {
        id: String(data.id),
        entityId: String(data.entityId),
        entityType: String(data.entityType),
        type: String(data.type),
        amount: Number(data.amount) || 0,
        description: String(data.description),
        createdAt: new Date(data.createdAt)
      };
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      throw new Error('Unable to load transaction details.');
    }
  }

  static async createTransaction(transactionData: {
    entityType: string;
    entityId: string;
    type: string;
    amount: number;
    description: string;
  }) {
    try {
      const data = await this.makeRequest('POST', '/api/transactions', transactionData);
      
      return {
        id: String(data.id),
        entityId: String(data.entityId),
        entityType: String(data.entityType),
        type: String(data.type),
        amount: Number(data.amount) || 0,
        description: String(data.description),
        createdAt: new Date(data.createdAt)
      };
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw new Error('Unable to create transaction. Please try again.');
    }
  }

  static async deleteTransaction(id: string) {
    try {
      const data = await this.makeRequest('DELETE', `/api/transactions/${id}`);
      return data.success === true;
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      throw new Error('Unable to delete transaction. Please try again.');
    }
  }
}

// Export convenience functions for backward compatibility
export const getTransactions = () => TransactionServiceV2.getAllTransactions();
export const getTransactionById = (id: string) => TransactionServiceV2.getTransactionById(id);
export const addTransaction = (data: any) => TransactionServiceV2.createTransaction(data);
export const deleteTransaction = (id: string) => TransactionServiceV2.deleteTransaction(id);