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
} from '@shared/schema';

export class FirestoreStorage implements IStorage {
  private db: any;

  constructor() {
    try {
      if (admin.apps.length === 0) {
        console.log('[Firestore] Initializing Firebase Admin SDK...');
        
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          console.log('[Firestore] Using FIREBASE_SERVICE_ACCOUNT_KEY');
          try {
            let serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
            let serviceAccount: any;
            
            console.log('[Firestore] Service account key length:', serviceAccountString.length);
            console.log('[Firestore] Key starts with {:', serviceAccountString.startsWith('{'));
            console.log('[Firestore] Key ends with }:', serviceAccountString.endsWith('}'));
            
            // Try multiple parsing strategies
            if (serviceAccountString.startsWith('{') && serviceAccountString.endsWith('}')) {
              console.log('[Firestore] Parsing as direct JSON...');
              serviceAccount = JSON.parse(serviceAccountString);
            } else {
              console.log('[Firestore] Trying base64 decoding...');
              try {
                const decoded = Buffer.from(serviceAccountString, 'base64').toString('utf-8');
                console.log('[Firestore] Decoded length:', decoded.length);
                console.log('[Firestore] Decoded starts with {:', decoded.startsWith('{'));
                console.log('[Firestore] Decoded ends with }:', decoded.endsWith('}'));
                
                if (decoded.startsWith('{') && decoded.endsWith('}')) {
                  serviceAccount = JSON.parse(decoded);
                } else {
                  throw new Error('Decoded content is not valid JSON');
                }
              } catch (decodeError) {
                console.log('[Firestore] Base64 failed, trying escaped JSON...');
                try {
                  const unescaped = serviceAccountString.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                  serviceAccount = JSON.parse(unescaped);
                } catch (unescapeError) {
                  throw new Error(`Unable to parse service account key. Expected JSON format. First 100 chars: ${serviceAccountString.substring(0, 100)}...`);
                }
              }
            }
            
            console.log('[Firestore] Service account parsed successfully');
            console.log('[Firestore] Project ID:', serviceAccount.project_id);
            console.log('[Firestore] Client email:', serviceAccount.client_email);
            
            // Validate required fields
            if (!serviceAccount.type || !serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
              throw new Error('Service account JSON is missing required fields (type, project_id, private_key, client_email)');
            }
            
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
            });
            
            console.log('[Firestore] Firebase Admin SDK initialized successfully');
          } catch (error) {
            console.error('[Firestore] Firebase service account parsing error:', error);
            throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        } else {
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing Firebase credentials. Please provide FIREBASE_SERVICE_ACCOUNT_KEY or individual credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).');
          }
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        }
      }

      this.db = admin.firestore();
      console.log('Firestore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
  }

  private convertTimestamp(timestamp: any): Date {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return new Date();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const doc = await this.db.collection('users').doc(id.toString()).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        username: data?.username,
        password: data?.password,
      };
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw new Error(`Failed to fetch user: ${error.message}`);
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
      };
    } catch (error) {
      console.error(`Error fetching user by username ${username}:`, error);
      throw new Error(`Failed to fetch user by username: ${error.message}`);
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const usersSnapshot = await this.db.collection('users').get();
      const nextId = usersSnapshot.size + 1;
      
      const newUser: User = {
        id: nextId,
        ...user,
      };
      
      await this.db.collection('users').doc(nextId.toString()).set(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const snapshot = await this.db.collection('suppliers').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          debt: data.debt || 0,
          contact: data.contact || null,
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      throw new Error(`Failed to fetch suppliers: ${error.message}`);
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const doc = await this.db.collection('suppliers').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        name: data.name,
        debt: data.debt || 0,
        contact: data.contact || null,
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error fetching supplier ${id}:`, error);
      throw new Error(`Failed to fetch supplier: ${error.message}`);
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const docRef = this.db.collection('suppliers').doc();
      const newSupplier: Supplier = {
        id: docRef.id,
        name: supplier.name,
        debt: supplier.debt || 0,
        contact: supplier.contact || null,
        createdAt: new Date(),
      };
      
      await docRef.set(newSupplier);
      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error(`Failed to create supplier: ${error.message}`);
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const docRef = this.db.collection('suppliers').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) return undefined;
      
      await docRef.update(supplier);
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        name: data.name,
        debt: data.debt || 0,
        contact: data.contact || null,
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error updating supplier ${id}:`, error);
      throw new Error(`Failed to update supplier: ${error.message}`);
    }
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('suppliers').doc(id).get();
      if (!doc.exists) return false;
      
      await this.db.collection('suppliers').doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting supplier ${id}:`, error);
      throw new Error(`Failed to delete supplier: ${error.message}`);
    }
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    try {
      const snapshot = await this.db.collection('inventory').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          quantity: data.quantity || 0,
          rate: data.rate || 0,
          updatedAt: this.convertTimestamp(data.updatedAt),
        };
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw new Error(`Failed to fetch inventory: ${error.message}`);
    }
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    try {
      const doc = await this.db.collection('inventory').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        type: data.type,
        quantity: data.quantity || 0,
        rate: data.rate || 0,
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    } catch (error) {
      console.error(`Error fetching inventory item ${id}:`, error);
      throw new Error(`Failed to fetch inventory item: ${error.message}`);
    }
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    try {
      const docRef = this.db.collection('inventory').doc();
      const newItem: Inventory = {
        id: docRef.id,
        type: item.type,
        quantity: item.quantity || 0,
        rate: item.rate || 0,
        updatedAt: new Date(),
      };
      
      await docRef.set(newItem);
      return newItem;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw new Error(`Failed to create inventory item: ${error.message}`);
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    try {
      const docRef = this.db.collection('inventory').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) return undefined;
      
      await docRef.update({
        ...item,
        updatedAt: new Date(),
      });
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        type: data.type,
        quantity: data.quantity || 0,
        rate: data.rate || 0,
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    } catch (error) {
      console.error(`Error updating inventory item ${id}:`, error);
      throw new Error(`Failed to update inventory item: ${error.message}`);
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('inventory').doc(id).get();
      if (!doc.exists) return false;
      
      await this.db.collection('inventory').doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting inventory item ${id}:`, error);
      throw new Error(`Failed to delete inventory item: ${error.message}`);
    }
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const snapshot = await this.db.collection('customers').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          type: data.type,
          contact: data.contact || null,
          pendingAmount: data.pendingAmount || 0,
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const doc = await this.db.collection('customers').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        contact: data.contact || null,
        pendingAmount: data.pendingAmount || 0,
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error);
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const docRef = this.db.collection('customers').doc();
      const newCustomer: Customer = {
        id: docRef.id,
        name: customer.name,
        type: customer.type,
        contact: customer.contact || null,
        pendingAmount: customer.pendingAmount || 0,
        createdAt: new Date(),
      };
      
      await docRef.set(newCustomer);
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const docRef = this.db.collection('customers').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) return undefined;
      
      await docRef.update(customer);
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        name: data.name,
        type: data.type,
        contact: data.contact || null,
        pendingAmount: data.pendingAmount || 0,
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error updating customer ${id}:`, error);
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('customers').doc(id).get();
      if (!doc.exists) return false;
      
      await this.db.collection('customers').doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      throw new Error(`Failed to delete customer: ${error.message}`);
    }
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId,
          items: data.items || [],
          total: data.total || 0,
          status: data.status,
          type: data.type,
          date: this.convertTimestamp(data.date),
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders').where('customerId', '==', customerId).get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId,
          items: data.items || [],
          total: data.total || 0,
          status: data.status,
          type: data.type,
          date: this.convertTimestamp(data.date),
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error(`Error fetching orders for customer ${customerId}:`, error);
      throw new Error(`Failed to fetch orders by customer: ${error.message}`);
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const doc = await this.db.collection('orders').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        customerId: data.customerId,
        items: data.items || [],
        total: data.total || 0,
        status: data.status,
        type: data.type,
        date: this.convertTimestamp(data.date),
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error fetching order ${id}:`, error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    try {
      const docRef = this.db.collection('orders').doc();
      const newOrder: Order = {
        id: docRef.id,
        customerId: order.customerId,
        items: order.items,
        total: order.total || 0,
        status: order.status,
        type: order.type,
        date: order.date ? new Date(order.date) : new Date(),
        createdAt: order.createdAt || new Date(),
      };
      
      await docRef.set(newOrder);
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    try {
      const docRef = this.db.collection('orders').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) return undefined;
      
      await docRef.update(order);
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        customerId: data.customerId,
        items: data.items || [],
        total: data.total || 0,
        status: data.status,
        type: data.type,
        date: this.convertTimestamp(data.date),
        createdAt: this.convertTimestamp(data.createdAt),
      };
    } catch (error) {
      console.error(`Error updating order ${id}:`, error);
      throw new Error(`Failed to update order: ${error.message}`);
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('orders').doc(id).get();
      if (!doc.exists) return false;
      
      await this.db.collection('orders').doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting order ${id}:`, error);
      throw new Error(`Failed to delete order: ${error.message}`);
    }
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          entityId: data.entityId,
          entityType: data.entityType,
          amount: data.amount,
          description: data.description || null,
          date: this.convertTimestamp(data.date),
        };
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions').where('entityId', '==', entityId).get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          entityId: data.entityId,
          entityType: data.entityType,
          amount: data.amount,
          description: data.description || null,
          date: this.convertTimestamp(data.date),
        };
      });
    } catch (error) {
      console.error(`Error fetching transactions for entity ${entityId}:`, error);
      throw new Error(`Failed to fetch transactions by entity: ${error.message}`);
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const doc = await this.db.collection('transactions').doc(id).get();
      if (!doc.exists) return undefined;
      
      const data = doc.data()!;
      return {
        id: doc.id,
        type: data.type,
        entityId: data.entityId,
        entityType: data.entityType,
        amount: data.amount,
        description: data.description || null,
        date: this.convertTimestamp(data.date),
      };
    } catch (error) {
      console.error(`Error fetching transaction ${id}:`, error);
      throw new Error(`Failed to fetch transaction: ${error.message}`);
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const docRef = this.db.collection('transactions').doc();
      const newTransaction: Transaction = {
        id: docRef.id,
        type: transaction.type,
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        amount: transaction.amount,
        description: transaction.description || null,
        date: transaction.date || new Date(),
      };
      
      await docRef.set(newTransaction);
      return newTransaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    try {
      const docRef = this.db.collection('transactions').doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) return undefined;
      
      await docRef.update(transaction);
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data()!;
      
      return {
        id: updatedDoc.id,
        type: data.type,
        entityId: data.entityId,
        entityType: data.entityType,
        amount: data.amount,
        description: data.description || null,
        date: this.convertTimestamp(data.date),
      };
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw new Error(`Failed to update transaction: ${error.message}`);
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const doc = await this.db.collection('transactions').doc(id).get();
      if (!doc.exists) return false;
      
      await this.db.collection('transactions').doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }
}

export const createFirestoreStorage = () => new FirestoreStorage();
