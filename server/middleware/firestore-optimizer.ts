// Firestore query optimization middleware
import { FirestoreStorage } from '../firestore-storage.js';

// Batch query optimizer for Firestore
export class FirestoreBatchOptimizer {
  private static instance: FirestoreBatchOptimizer;
  private pendingQueries = new Map<string, Promise<any>>();

  static getInstance(): FirestoreBatchOptimizer {
    if (!FirestoreBatchOptimizer.instance) {
      FirestoreBatchOptimizer.instance = new FirestoreBatchOptimizer();
    }
    return FirestoreBatchOptimizer.instance;
  }

  // Batch multiple collection reads
  async batchRead(
    storage: FirestoreStorage,
    collections: string[]
  ): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};

    // Execute all collection reads in parallel
    const promises = collections.map(async (collection) => {
      switch (collection) {
        case 'suppliers':
          return { collection, data: await storage.getAllSuppliers() };
        case 'inventory':
          return { collection, data: await storage.getAllInventory() };
        case 'customers':
          return { collection, data: await storage.getAllCustomers() };
        case 'orders':
          return { collection, data: await storage.getAllOrders() };
        case 'transactions':
          return { collection, data: await storage.getAllTransactions() };
        default:
          return { collection, data: [] };
      }
    });

    const responses = await Promise.all(promises);
    responses.forEach(({ collection, data }) => {
      results[collection] = data;
    });

    return results;
  }
}

// Firestore connection pool for better resource management
export class FirestoreConnectionManager {
  private static instance: FirestoreConnectionManager;
  private activeConnections = 0;
  private maxConnections = 100;
  private waitingQueue: Array<() => void> = [];

  static getInstance(): FirestoreConnectionManager {
    if (!FirestoreConnectionManager.instance) {
      FirestoreConnectionManager.instance = new FirestoreConnectionManager();
    }
    return FirestoreConnectionManager.instance;
  }

  async acquireConnection<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeConnections >= this.maxConnections) {
      await new Promise<void>((resolve) => {
        this.waitingQueue.push(resolve);
      });
    }

    this.activeConnections++;

    try {
      const result = await operation();
      return result;
    } finally {
      this.activeConnections--;

      if (this.waitingQueue.length > 0) {
        const nextCallback = this.waitingQueue.shift();
        if (nextCallback) {
          nextCallback();
        }
      }
    }
  }
}