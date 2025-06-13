import { 
  collection, 
  query, 
  orderBy, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase-client';
import type { 
  Supplier, 
  Customer, 
  Inventory, 
  Order, 
  Transaction 
} from '@shared/schema';

// Real-time listeners for live data updates
export class FirebaseRealtimeService {
  
  // Suppliers real-time operations
  static onSuppliersChange(callback: (suppliers: Supplier[]) => void) {
    const suppliersRef = collection(db, 'suppliers');
    const q = query(suppliersRef, orderBy('name'));
    
    return onSnapshot(q, (snapshot) => {
      const suppliers: Supplier[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        suppliers.push({
          id: doc.id,
          name: data.name,
          contact: data.contact,
          pendingAmount: data.pendingAmount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      callback(suppliers);
    }, (error) => {
      console.error('Error listening to suppliers:', error);
      callback([]);
    });
  }

  // Customers real-time operations
  static onCustomersChange(callback: (customers: Customer[]) => void) {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, orderBy('name'));
    
    return onSnapshot(q, (snapshot) => {
      const customers: Customer[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        customers.push({
          id: doc.id,
          name: data.name,
          type: data.type,
          contact: data.contact,
          pendingAmount: data.pendingAmount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      callback(customers);
    }, (error) => {
      console.error('Error listening to customers:', error);
      callback([]);
    });
  }

  // Inventory real-time operations
  static onInventoryChange(callback: (inventory: Inventory[]) => void) {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, orderBy('type'));
    
    return onSnapshot(q, (snapshot) => {
      const inventory: Inventory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        inventory.push({
          id: doc.id,
          type: data.type,
          quantity: data.quantity || 0,
          rate: data.rate || 0,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      callback(inventory);
    }, (error) => {
      console.error('Error listening to inventory:', error);
      callback([]);
    });
  }

  // Orders real-time operations
  static onOrdersChange(callback: (orders: Order[]) => void) {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          customerId: data.customerId,
          items: data.items || [],
          date: data.date?.toDate() || new Date(),
          total: data.total || 0,
          status: data.status || 'pending',
          type: data.type || 'hotel',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      callback(orders);
    }, (error) => {
      console.error('Error listening to orders:', error);
      callback([]);
    });
  }

  // Transactions real-time operations
  static onTransactionsChange(callback: (transactions: Transaction[]) => void) {
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: data.type,
          amount: data.amount || 0,
          entityId: data.entityId,
          entityType: data.entityType,
          date: data.date?.toDate() || new Date(),
          description: data.description || '',
        });
      });
      callback(transactions);
    }, (error) => {
      console.error('Error listening to transactions:', error);
      callback([]);
    });
  }

  // Get orders by customer ID with real-time updates
  static onCustomerOrdersChange(customerId: string, callback: (orders: Order[]) => void) {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          customerId: data.customerId,
          items: data.items || [],
          date: data.date?.toDate() || new Date(),
          total: data.total || 0,
          status: data.status || 'pending',
          type: data.type || 'hotel',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      callback(orders);
    }, (error) => {
      console.error('Error listening to customer orders:', error);
      callback([]);
    });
  }

  // Get transactions by entity with real-time updates
  static onEntityTransactionsChange(entityId: string, callback: (transactions: Transaction[]) => void) {
    const transactionsRef = collection(db, 'transactions');
    const q = query(transactionsRef, where('entityId', '==', entityId), orderBy('date', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: data.type,
          amount: data.amount || 0,
          entityId: data.entityId,
          entityType: data.entityType,
          date: data.date?.toDate() || new Date(),
          description: data.description || '',
        });
      });
      callback(transactions);
    }, (error) => {
      console.error('Error listening to entity transactions:', error);
      callback([]);
    });
  }

  // Low stock alerts (inventory items with quantity < 10)
  static onLowStockAlerts(callback: (lowStockItems: Inventory[]) => void) {
    const inventoryRef = collection(db, 'inventory');
    const q = query(inventoryRef, where('quantity', '<', 10));
    
    return onSnapshot(q, (snapshot) => {
      const lowStockItems: Inventory[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        lowStockItems.push({
          id: doc.id,
          type: data.type,
          quantity: data.quantity || 0,
          rate: data.rate || 0,
          updatedAt: data.updatedAt?.toDate() || new Date(),
        });
      });
      callback(lowStockItems);
    }, (error) => {
      console.error('Error listening to low stock alerts:', error);
      callback([]);
    });
  }

  // Pending orders real-time updates
  static onPendingOrdersChange(callback: (orders: Order[]) => void) {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        orders.push({
          id: doc.id,
          customerId: data.customerId,
          items: data.items || [],
          date: data.date?.toDate() || new Date(),
          total: data.total || 0,
          status: data.status || 'pending',
          type: data.type || 'hotel',
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      callback(orders);
    }, (error) => {
      console.error('Error listening to pending orders:', error);
      callback([]);
    });
  }

  // Recent transactions (last 7 days)
  static onRecentTransactionsChange(callback: (transactions: Transaction[]) => void) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const transactionsRef = collection(db, 'transactions');
    const q = query(
      transactionsRef, 
      where('date', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('date', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const transactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        transactions.push({
          id: doc.id,
          type: data.type,
          amount: data.amount || 0,
          entityId: data.entityId,
          entityType: data.entityType,
          date: data.date?.toDate() || new Date(),
          description: data.description || '',
        });
      });
      callback(transactions);
    }, (error) => {
      console.error('Error listening to recent transactions:', error);
      callback([]);
    });
  }
}