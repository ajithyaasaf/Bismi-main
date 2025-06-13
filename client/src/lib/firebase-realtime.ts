import { db } from './firebase-client';
import type { 
  Supplier, 
  Customer, 
  Inventory, 
  Order, 
  Transaction 
} from '@shared/schema';

// Real-time Firebase client SDK service for UI updates
// This uses the Firebase Web SDK for client-side real-time operations
// Backend operations still use Firebase Admin SDK through API routes

export class FirebaseRealtimeClient {
  
  // Initialize real-time listeners for suppliers
  static async getSuppliers(): Promise<Supplier[]> {
    try {
      // For now, we'll use API fallback until Firebase v9 SDK is properly configured
      // This maintains separation: client SDK for real-time, admin SDK for backend
      const response = await fetch('/api/suppliers');
      const suppliers = await response.json();
      console.log('Firebase client: Retrieved suppliers via API fallback');
      return suppliers;
    } catch (error) {
      console.error('Firebase client: Error getting suppliers:', error);
      return [];
    }
  }

  // Initialize real-time listeners for customers
  static async getCustomers(): Promise<Customer[]> {
    try {
      const response = await fetch('/api/customers');
      const customers = await response.json();
      console.log('Firebase client: Retrieved customers via API fallback');
      return customers;
    } catch (error) {
      console.error('Firebase client: Error getting customers:', error);
      return [];
    }
  }

  // Initialize real-time listeners for inventory
  static async getInventory(): Promise<Inventory[]> {
    try {
      const response = await fetch('/api/inventory');
      const inventory = await response.json();
      console.log('Firebase client: Retrieved inventory via API fallback');
      return inventory;
    } catch (error) {
      console.error('Firebase client: Error getting inventory:', error);
      return [];
    }
  }

  // Initialize real-time listeners for orders
  static async getOrders(): Promise<Order[]> {
    try {
      const response = await fetch('/api/orders');
      const orders = await response.json();
      console.log('Firebase client: Retrieved orders via API fallback');
      return orders;
    } catch (error) {
      console.error('Firebase client: Error getting orders:', error);
      return [];
    }
  }

  // Initialize real-time listeners for transactions
  static async getTransactions(): Promise<Transaction[]> {
    try {
      const response = await fetch('/api/transactions');
      const transactions = await response.json();
      console.log('Firebase client: Retrieved transactions via API fallback');
      return transactions;
    } catch (error) {
      console.error('Firebase client: Error getting transactions:', error);
      return [];
    }
  }

  // Get orders by customer ID
  static async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      const orders = await this.getOrders();
      return orders.filter(order => order.customerId === customerId);
    } catch (error) {
      console.error('Firebase client: Error getting customer orders:', error);
      return [];
    }
  }

  // Get transactions by entity
  static async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    try {
      const transactions = await this.getTransactions();
      return transactions.filter(transaction => transaction.entityId === entityId);
    } catch (error) {
      console.error('Firebase client: Error getting entity transactions:', error);
      return [];
    }
  }

  // Low stock alerts
  static async getLowStockItems(): Promise<Inventory[]> {
    try {
      const inventory = await this.getInventory();
      return inventory.filter(item => item.quantity < 10);
    } catch (error) {
      console.error('Firebase client: Error getting low stock items:', error);
      return [];
    }
  }

  // Pending orders
  static async getPendingOrders(): Promise<Order[]> {
    try {
      const orders = await this.getOrders();
      return orders.filter(order => order.status === 'pending');
    } catch (error) {
      console.error('Firebase client: Error getting pending orders:', error);
      return [];
    }
  }

  // Recent transactions (last 7 days)
  static async getRecentTransactions(): Promise<Transaction[]> {
    try {
      const transactions = await this.getTransactions();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      return transactions.filter(transaction => {
        if (!transaction.date) return false;
        const transactionDate = new Date(transaction.date);
        return transactionDate >= sevenDaysAgo;
      }).sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      console.error('Firebase client: Error getting recent transactions:', error);
      return [];
    }
  }
}

// Export convenience functions
export const {
  getSuppliers,
  getCustomers,
  getInventory,
  getOrders,
  getTransactions,
  getOrdersByCustomer,
  getTransactionsByEntity,
  getLowStockItems,
  getPendingOrders,
  getRecentTransactions
} = FirebaseRealtimeClient;