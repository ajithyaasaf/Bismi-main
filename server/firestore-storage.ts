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
        } catch (parseError) {
          throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY');
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });

        console.log('Firebase Admin SDK initialized with project:', serviceAccount.project_id);
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
        
        // Debug logging to understand actual database structure
        console.log('Supplier data from Firestore:', {
          id: doc.id,
          name: data.name,
          rawData: data,
          hasPendingAmount: !!data.pendingAmount,
          hasDebt: !!data.debt,
          hasUpdatedAt: !!data.updatedAt,
          hasCreatedAt: !!data.createdAt
        });
        
        return {
          id: doc.id,
          name: data.name || '',
          contact: data.contact || '',
          pendingAmount: data.debt || data.pendingAmount || 0, // Handle debt vs pendingAmount field mismatch
          createdAt: this.convertTimestamp(data.updatedAt || data.createdAt), // Handle updatedAt vs createdAt
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
        pendingAmount: data?.debt || data?.pendingAmount || 0,
        createdAt: this.convertTimestamp(data?.updatedAt || data?.createdAt),
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
        debt: supplier.pendingAmount || 0, // Store as 'debt' to match existing database structure
        pendingAmount: supplier.pendingAmount || 0, // Also store as pendingAmount for consistency
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
      // Map pendingAmount to debt field for database consistency
      const updateData: any = { ...supplier, updatedAt: new Date() };
      if (updateData.pendingAmount !== undefined) {
        updateData.debt = updateData.pendingAmount;
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
        
        // Debug logging to understand actual database structure
        console.log('Inventory data from Firestore:', {
          id: doc.id,
          rawData: data,
          hasName: !!data.name,
          hasRate: !!data.rate,
          hasPrice: !!data.price,
          hasUpdatedAt: !!data.updatedAt,
          hasCreatedAt: !!data.createdAt
        });
        
        return {
          id: doc.id,
          name: data.name || `Item-${data.type || 'Unknown'}`, // Generate name if missing
          type: data.type || 'boneless',
          quantity: data.quantity || 0,
          unit: data.unit || 'kg', // Default unit
          price: data.rate || data.price || 0, // Handle rate vs price field mismatch
          supplierId: data.supplierId || '', // May be empty in existing data
          createdAt: this.convertTimestamp(data.updatedAt || data.createdAt), // Handle updatedAt vs createdAt
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
        name: data?.name || `Item-${data?.type || 'Unknown'}`,
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
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.price, // Store as 'rate' to match existing database structure
        price: item.price, // Also store as price for consistency
        supplierId: item.supplierId,
        createdAt: now,
        updatedAt: now,
      });

      return {
        id: docRef.id,
        name: item.name,
        type: item.type,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        supplierId: item.supplierId,
        createdAt: now,
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw new Error(`Failed to create inventory item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    try {
      // Map price to rate field for database consistency
      const updateData: any = { ...item, updatedAt: new Date() };
      if (updateData.price !== undefined) {
        updateData.rate = updateData.price;
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
          rawData: data,
          typeField: data.type,
          customerTypeField: data.customerType
        });
        
        return {
          id: doc.id,
          name: data.name || '',
          contact: data.contact || '',
          customerType: data.type || data.customerType || 'random',
          pendingAmount: data.pendingAmount || data.debt || 0,
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
        customerType: data?.type || data?.customerType || 'random',
        pendingAmount: data?.pendingAmount || data?.debt || 0,
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
        type: customer.customerType, // Store as 'type' to match existing database structure
        pendingAmount: customer.pendingAmount || 0,
        debt: customer.pendingAmount || 0, // Also store as debt for consistency
        createdAt: new Date(),
      });

      return {
        id: docRef.id,
        name: customer.name,
        contact: customer.contact,
        customerType: customer.customerType,
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
      // Map customerType to type field for database consistency
      const updateData: any = { ...customer };
      if (updateData.customerType) {
        updateData.type = updateData.customerType;
        delete updateData.customerType;
      }
      // Also handle pendingAmount to debt mapping for existing records
      if (updateData.pendingAmount !== undefined) {
        updateData.debt = updateData.pendingAmount;
      }
      
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
      await this.db.collection('orders').doc(id).update(order);
      return this.getOrder(id);
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
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