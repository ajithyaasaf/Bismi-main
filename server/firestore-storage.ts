import admin from 'firebase-admin';
import { IStorage } from './storage';
import {
  User,
  InsertUser,
  Supplier,
  InsertSupplier,
  Inventory,
  InsertInventory,
  Customer,
  InsertCustomer,
  Order,
  InsertOrder,
  Transaction,
  InsertTransaction,
} from '@shared/types';

export class FirestoreStorage implements IStorage {
  private db: admin.firestore.Firestore;

  constructor() {
    this.initializeFirebase();
    this.db = admin.firestore();
    console.log('FirestoreStorage constructor completed successfully');
  }

  private initializeFirebase() {
    try {
      if (admin.apps.length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (!serviceAccountKey) {
          throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
        }

        let serviceAccount;
        try {
          serviceAccount = JSON.parse(serviceAccountKey);
          console.log('Firebase service account parsed successfully for project:', serviceAccount.project_id);
        } catch (parseError) {
          console.error('Firebase service account JSON parse error:', parseError);
          throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY');
        }

        console.log('Initializing Firebase Admin SDK...');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        console.log('Firebase Admin SDK initialized successfully with project:', serviceAccount.project_id);
      } else {
        console.log('Firebase Admin SDK already initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw new Error(`Firebase Admin SDK initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertTimestamp(timestamp: any): Date {
    try {
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      if (typeof timestamp === 'string') {
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
      if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }
      return new Date();
    } catch (error) {
      console.warn('Failed to convert timestamp:', timestamp, error);
      return new Date();
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const doc = await this.db.collection('users').doc(id.toString()).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        username: data?.username || '',
        password: data?.password || '',
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const snapshot = await this.db.collection('users').where('username', '==', username).get();
      if (snapshot.empty) return undefined;

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        username: data.username,
        password: data.password,
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw new Error(`Failed to get user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const userId = Date.now().toString();
      await this.db.collection('users').doc(userId).set({
        username: user.username,
        password: user.password,
        createdAt: new Date(),
      });

      return {
        id: parseInt(userId),
        username: user.username,
        password: user.password,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const snapshot = await this.db.collection('suppliers').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Debug logging
        console.log('Supplier data from Firestore:', {
          id: doc.id,
          name: data.name,
          pendingAmount: data.debt || 0
        });
        
        return {
          id: doc.id,
          name: data.name || '',
          contact: data.contact || '',
          pendingAmount: data.debt || 0,
          createdAt: this.convertTimestamp(data.updatedAt),
        };
      });
    } catch (error) {
      console.error('Error getting suppliers:', error);
      throw new Error(`Failed to get suppliers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const doc = await this.db.collection('suppliers').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        name: data?.name || '',
        contact: data?.contact || '',
        pendingAmount: data?.debt || 0,
        createdAt: this.convertTimestamp(data?.updatedAt),
      };
    } catch (error) {
      console.error('Error getting supplier:', error);
      throw new Error(`Failed to get supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const now = new Date();
      const docRef = await this.db.collection('suppliers').add({
        name: supplier.name,
        contact: supplier.contact,
        debt: supplier.pendingAmount || 0,
        createdAt: now,
        updatedAt: now,
      });

      return {
        id: docRef.id,
        name: supplier.name,
        contact: supplier.contact,
        pendingAmount: supplier.pendingAmount || 0,
        createdAt: now,
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error(`Failed to create supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const updateData: any = { ...supplier, updatedAt: new Date() };
      if (updateData.pendingAmount !== undefined) {
        updateData.debt = updateData.pendingAmount;
        delete updateData.pendingAmount;
      }
      
      await this.db.collection('suppliers').doc(id).update(updateData);
      return this.getSupplier(id);
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw new Error(`Failed to update supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      await this.db.collection('suppliers').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return false;
    }
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    try {
      const snapshot = await this.db.collection('inventory').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        
        return {
          id: doc.id,
          name: data.name || data.type || 'Item',
          type: data.type || 'boneless',
          quantity: data.quantity || 0,
          unit: data.unit || 'kg',
          price: data.rate || data.price || 0,
          supplierId: data.supplierId || '',
          createdAt: this.convertTimestamp(data.updatedAt || data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error getting inventory:', error);
      throw new Error(`Failed to get inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    try {
      const doc = await this.db.collection('inventory').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        name: data?.name || data?.type || 'Item',
        type: data?.type || 'boneless',
        quantity: data?.quantity || 0,
        unit: data?.unit || 'kg',
        price: data?.rate || data?.price || 0,
        supplierId: data?.supplierId || '',
        createdAt: this.convertTimestamp(data?.updatedAt || data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting inventory item:', error);
      throw new Error(`Failed to get inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    try {
      const now = new Date();
      const docRef = await this.db.collection('inventory').add({
        name: item.name || item.type,
        type: item.type,
        quantity: item.quantity,
        unit: item.unit || 'kg',
        rate: item.price,
        supplierId: item.supplierId || '',
        updatedAt: now,
      });

      return {
        id: docRef.id,
        name: item.name || item.type,
        type: item.type,
        quantity: item.quantity,
        unit: item.unit || 'kg',
        price: item.price,
        supplierId: item.supplierId || '',
        createdAt: now,
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw new Error(`Failed to create inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    try {
      const updateData: any = { ...item, updatedAt: new Date() };
      if (updateData.price !== undefined) {
        updateData.rate = updateData.price;
        delete updateData.price;
      }
      
      await this.db.collection('inventory').doc(id).update(updateData);
      return this.getInventoryItem(id);
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw new Error(`Failed to update inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      await this.db.collection('inventory').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return false;
    }
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const snapshot = await this.db.collection('customers').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Debug logging
        console.log('Customer data from Firestore:', {
          id: doc.id,
          name: data.name,
          type: data.type
        });
        
        return {
          id: doc.id,
          name: data.name || '',
          contact: data.contact || '',
          type: data.type || 'hotel',
          pendingAmount: data.pendingAmount || 0,
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error getting customers:', error);
      throw new Error(`Failed to get customers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const doc = await this.db.collection('customers').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        name: data?.name || '',
        contact: data?.contact || '',
        type: data?.type || 'hotel',
        pendingAmount: data?.pendingAmount || 0,
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting customer:', error);
      throw new Error(`Failed to get customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const docRef = await this.db.collection('customers').add({
        name: customer.name,
        contact: customer.contact,
        type: customer.type,
        pendingAmount: customer.pendingAmount || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        id: docRef.id,
        name: customer.name,
        contact: customer.contact,
        type: customer.type,
        pendingAmount: customer.pendingAmount || 0,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const updateData: any = { ...customer, updatedAt: new Date() };
      
      await this.db.collection('customers').doc(id).update(updateData);
      return this.getCustomer(id);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw new Error(`Failed to update customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      await this.db.collection('customers').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId || '',
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          paymentStatus: data.paymentStatus || 'pending',
          orderStatus: data.orderStatus || 'pending',
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error getting orders:', error);
      throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders').where('customerId', '==', customerId).get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId || '',
          items: data.items || [],
          totalAmount: data.totalAmount || 0,
          paymentStatus: data.paymentStatus || 'pending',
          orderStatus: data.orderStatus || 'pending',
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error getting orders by customer:', error);
      throw new Error(`Failed to get orders by customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const doc = await this.db.collection('orders').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        customerId: data?.customerId || '',
        items: data?.items || [],
        totalAmount: data?.totalAmount || 0,
        paymentStatus: data?.paymentStatus || 'pending',
        orderStatus: data?.orderStatus || 'pending',
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error(`Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    try {
      const docRef = await this.db.collection('orders').add({
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt || new Date(),
      });

      // Update customer pending amount if payment is pending
      if (order.paymentStatus === 'pending') {
        const customer = await this.getCustomer(order.customerId);
        if (customer) {
          const newPendingAmount = (customer.pendingAmount || 0) + order.totalAmount;
          await this.updateCustomer(order.customerId, { pendingAmount: newPendingAmount });
        }
      }

      // Update inventory quantities for ordered items
      for (const item of order.items) {
        const allInventory = await this.getAllInventory();
        const inventoryItem = allInventory.find(inv => inv.type === item.type);
        
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity - item.quantity;
          await this.updateInventoryItem(inventoryItem.id, { quantity: newQuantity });
        }
      }

      // Create transaction record for order
      await this.createTransaction({
        entityId: order.customerId,
        entityType: 'customer',
        type: order.paymentStatus === 'paid' ? 'sale' : 'credit',
        amount: order.totalAmount,
        description: `Order #${docRef.id} - ${order.items.length} items`
      });

      return {
        id: docRef.id,
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt || new Date(),
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    try {
      // Get existing order to compare payment status changes
      const existingOrder = await this.getOrder(id);
      
      await this.db.collection('orders').doc(id).update(order);
      
      // Handle payment status changes
      if (existingOrder && order.paymentStatus && order.paymentStatus !== existingOrder.paymentStatus) {
        const customer = await this.getCustomer(existingOrder.customerId);
        if (customer) {
          let pendingAmountChange = 0;
          
          // Calculate pending amount change based on status transition
          if (existingOrder.paymentStatus === 'pending' && order.paymentStatus === 'paid') {
            // Order was paid - reduce customer pending amount
            pendingAmountChange = -existingOrder.totalAmount;
          } else if (existingOrder.paymentStatus === 'paid' && order.paymentStatus === 'pending') {
            // Order was unpaid - increase customer pending amount
            pendingAmountChange = existingOrder.totalAmount;
          }
          
          if (pendingAmountChange !== 0) {
            const newPendingAmount = Math.max(0, (customer.pendingAmount || 0) + pendingAmountChange);
            await this.updateCustomer(existingOrder.customerId, { pendingAmount: newPendingAmount });
          }
        }
      }
      
      return this.getOrder(id);
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      // Get order details before deletion for reversal operations
      const order = await this.getOrder(id);
      if (!order) return false;

      // Reverse inventory quantity changes
      for (const item of order.items) {
        const allInventory = await this.getAllInventory();
        const inventoryItem = allInventory.find(inv => inv.type === item.type);
        
        if (inventoryItem) {
          const newQuantity = inventoryItem.quantity + item.quantity;
          await this.updateInventoryItem(inventoryItem.id, { quantity: newQuantity });
        }
      }

      // Reverse customer pending amount if order was pending
      if (order.paymentStatus === 'pending') {
        const customer = await this.getCustomer(order.customerId);
        if (customer) {
          const newPendingAmount = Math.max(0, (customer.pendingAmount || 0) - order.totalAmount);
          await this.updateCustomer(order.customerId, { pendingAmount: newPendingAmount });
        }
      }

      // Delete related transactions
      const transactions = await this.getTransactionsByEntity(order.customerId);
      for (const transaction of transactions) {
        if (transaction.description.includes(`Order #${id}`)) {
          await this.deleteTransaction(transaction.id);
        }
      }

      await this.db.collection('orders').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions').get();
      const transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        
        // Safely parse each field to prevent data corruption
        const transaction = {
          id: doc.id,
          entityId: String(data.entityId || ''),
          entityType: String(data.entityType || ''),
          type: String(data.type || ''),
          amount: Number(data.amount) || 0,
          description: String(data.description || ''),
          createdAt: this.convertTimestamp(data.createdAt || data.date),
        };
        
        return transaction;
      });
      
      console.log(`Firestore: Successfully retrieved ${transactions.length} transactions`);
      return transactions;
    } catch (error) {
      console.error('Error getting transactions:', error);
      throw new Error(`Failed to get transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions').where('entityId', '==', entityId).get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          entityId: data.entityId || '',
          entityType: data.entityType || '',
          type: data.type || '',
          amount: data.amount || 0,
          description: data.description || '',
          createdAt: this.convertTimestamp(data.createdAt || data.date),
        };
      });
    } catch (error) {
      console.error('Error getting transactions by entity:', error);
      throw new Error(`Failed to get transactions by entity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const doc = await this.db.collection('transactions').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        entityId: data?.entityId || '',
        entityType: data?.entityType || '',
        type: data?.type || '',
        amount: data?.amount || 0,
        description: data?.description || '',
        createdAt: this.convertTimestamp(data?.createdAt || data?.date),
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const now = new Date();
      const docRef = await this.db.collection('transactions').add({
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: now,
        date: now, // Also store as 'date' field for consistency with existing database
      });

      return {
        id: docRef.id,
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: now,
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    try {
      await this.db.collection('transactions').doc(id).update(transaction);
      return this.getTransaction(id);
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw new Error(`Failed to update transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await this.db.collection('transactions').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }
}

export const createFirestoreStorage = () => new FirestoreStorage();