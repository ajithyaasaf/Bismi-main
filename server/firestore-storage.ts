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
  InsertTransaction 
} from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

// Use Firebase Admin SDK to avoid client SDK module resolution issues
import admin from 'firebase-admin';

export class FirestoreStorage implements IStorage {
  private db: admin.firestore.Firestore;

  constructor() {
    try {
      console.log('Initializing Firebase Admin SDK...');
      
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        // Try service account key first (for Vercel)
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        console.log('Environment variables check:', {
          hasServiceAccountKey: !!serviceAccountKey,
          hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
          hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
          hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY
        });
        
        if (serviceAccountKey) {
          console.log('Using FIREBASE_SERVICE_ACCOUNT_KEY for authentication');
          try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
              projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
            });
            console.log('Firebase initialized with service account key');
          } catch (parseError) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseError);
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
          }
        } else {
          console.log('Using individual environment variables for authentication');
          // Fallback to individual environment variables
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing required Firebase environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY');
          }
          
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
          console.log('Firebase initialized with individual environment variables');
        }
      } else {
        console.log('Firebase Admin already initialized');
      }
      
      this.db = admin.firestore();
      console.log('Firebase Firestore storage initialized with service account credentials');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  // Helper to convert Firestore timestamp to Date
  private convertTimestamp(timestamp: any): Date {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate();
    }
    return new Date(timestamp);
  }

  // User operations (kept for compatibility)
  async getUser(id: number): Promise<User | undefined> {
    try {
      const snapshot = await this.db.collection('users').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const userData = snapshot.docs[0].data();
      return {
        id: userData.id,
        username: userData.username,
        password: userData.password
      };
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const snapshot = await this.db.collection('users').where('username', '==', username).get();
      if (snapshot.empty) return undefined;
      
      const userData = snapshot.docs[0].data();
      return {
        id: userData.id,
        username: userData.username,
        password: userData.password
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const newUser = {
        id: Date.now(), // Simple ID generation
        username: user.username,
        password: user.password
      };
      
      await this.db.collection('users').add(newUser);
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const snapshot = await this.db.collection('suppliers').get();
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          debt: data.debt || 0,
          contact: data.contact || null,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting suppliers:', error);
      return [];
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const snapshot = await this.db.collection('suppliers').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        name: data.name,
        debt: data.debt || 0,
        contact: data.contact || null,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting supplier:', error);
      return undefined;
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const newSupplier = {
        id: uuidv4(),
        name: supplier.name,
        debt: supplier.debt || 0,
        contact: supplier.contact || null,
        createdAt: admin.firestore.Timestamp.now()
      };
      
      await this.db.collection('suppliers').add(newSupplier);
      
      return {
        ...newSupplier,
        createdAt: this.convertTimestamp(newSupplier.createdAt)
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const snapshot = await this.db.collection('suppliers').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await docRef.update(supplier);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        name: data!.name,
        debt: data!.debt || 0,
        contact: data!.contact || null,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return undefined;
    }
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('suppliers').where('id', '==', id).get();
      if (snapshot.empty) return false;
      
      await snapshot.docs[0].ref.delete();
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
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          quantity: data.quantity || 0,
          rate: data.rate || 0,
          updatedAt: this.convertTimestamp(data.updatedAt)
        };
      });
    } catch (error) {
      console.error('Error getting inventory:', error);
      return [];
    }
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    try {
      const snapshot = await this.db.collection('inventory').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        type: data.type,
        quantity: data.quantity || 0,
        rate: data.rate || 0,
        updatedAt: this.convertTimestamp(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting inventory item:', error);
      return undefined;
    }
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    try {
      const newItem = {
        id: uuidv4(),
        type: item.type,
        quantity: item.quantity || 0,
        rate: item.rate || 0,
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      await this.db.collection('inventory').add(newItem);
      
      return {
        ...newItem,
        updatedAt: this.convertTimestamp(newItem.updatedAt)
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    try {
      const snapshot = await this.db.collection('inventory').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      const updateData = { ...item, updatedAt: admin.firestore.Timestamp.now() };
      await docRef.update(updateData);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        type: data!.type,
        quantity: data!.quantity || 0,
        rate: data!.rate || 0,
        updatedAt: this.convertTimestamp(data!.updatedAt)
      };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return undefined;
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('inventory').where('id', '==', id).get();
      if (snapshot.empty) return false;
      
      await snapshot.docs[0].ref.delete();
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
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          contact: data.contact || null,
          createdAt: this.convertTimestamp(data.createdAt),
          pendingAmount: data.pendingAmount || 0
        };
      });
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const snapshot = await this.db.collection('customers').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        contact: data.contact || null,
        createdAt: this.convertTimestamp(data.createdAt),
        pendingAmount: data.pendingAmount || 0
      };
    } catch (error) {
      console.error('Error getting customer:', error);
      return undefined;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const newCustomer = {
        id: uuidv4(),
        name: customer.name,
        type: customer.type,
        contact: customer.contact || null,
        pendingAmount: customer.pendingAmount || 0,
        createdAt: admin.firestore.Timestamp.now()
      };
      
      await this.db.collection('customers').add(newCustomer);
      
      return {
        ...newCustomer,
        createdAt: this.convertTimestamp(newCustomer.createdAt)
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const snapshot = await this.db.collection('customers').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await docRef.update(customer);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        name: data!.name,
        type: data!.type,
        contact: data!.contact || null,
        createdAt: this.convertTimestamp(data!.createdAt),
        pendingAmount: data!.pendingAmount || 0
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      return undefined;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('customers').where('id', '==', id).get();
      if (snapshot.empty) return false;
      
      await snapshot.docs[0].ref.delete();
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      return false;
    }
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders').orderBy('date', 'desc').get();
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          customerId: data.customerId,
          items: data.items || [],
          date: this.convertTimestamp(data.date),
          total: data.total || 0,
          status: data.status,
          type: data.type,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting orders:', error);
      return [];
    }
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      const snapshot = await this.db.collection('orders')
        .where('customerId', '==', customerId)
        .orderBy('date', 'desc')
        .get();
      
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          customerId: data.customerId,
          items: data.items || [],
          date: this.convertTimestamp(data.date),
          total: data.total || 0,
          status: data.status,
          type: data.type,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting orders by customer:', error);
      return [];
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const snapshot = await this.db.collection('orders').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        customerId: data.customerId,
        items: data.items || [],
        date: this.convertTimestamp(data.date),
        total: data.total || 0,
        status: data.status,
        type: data.type,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    try {
      const newOrder = {
        id: uuidv4(),
        customerId: order.customerId,
        items: order.items || [],
        date: order.date ? admin.firestore.Timestamp.fromDate(order.date) : admin.firestore.Timestamp.now(),
        createdAt: order.createdAt ? admin.firestore.Timestamp.fromDate(order.createdAt) : admin.firestore.Timestamp.now(),
        total: order.total || 0,
        status: order.status,
        type: order.type
      };
      
      await this.db.collection('orders').add(newOrder);
      
      return {
        ...newOrder,
        date: this.convertTimestamp(newOrder.date),
        createdAt: this.convertTimestamp(newOrder.createdAt)
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    try {
      const snapshot = await this.db.collection('orders').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      const updateData = order.date ? 
        { ...order, date: admin.firestore.Timestamp.fromDate(order.date) } : 
        order;
      
      await docRef.update(updateData);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        customerId: data!.customerId,
        items: data!.items || [],
        date: this.convertTimestamp(data!.date),
        total: data!.total || 0,
        status: data!.status,
        type: data!.type,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating order:', error);
      return undefined;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('orders').where('id', '==', id).get();
      if (snapshot.empty) return false;
      
      await snapshot.docs[0].ref.delete();
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions').orderBy('date', 'desc').get();
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          entityId: data.entityId,
          entityType: data.entityType,
          date: this.convertTimestamp(data.date),
          description: data.description || null
        };
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    try {
      const snapshot = await this.db.collection('transactions')
        .where('entityId', '==', entityId)
        .orderBy('date', 'desc')
        .get();
      
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          entityId: data.entityId,
          entityType: data.entityType,
          date: this.convertTimestamp(data.date),
          description: data.description || null
        };
      });
    } catch (error) {
      console.error('Error getting transactions by entity:', error);
      return [];
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const snapshot = await this.db.collection('transactions').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        type: data.type,
        amount: data.amount,
        entityId: data.entityId,
        entityType: data.entityType,
        date: this.convertTimestamp(data.date),
        description: data.description || null
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      return undefined;
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const newTransaction = {
        id: uuidv4(),
        type: transaction.type,
        amount: transaction.amount,
        entityId: transaction.entityId,
        entityType: transaction.entityType,
        date: transaction.date ? admin.firestore.Timestamp.fromDate(transaction.date) : admin.firestore.Timestamp.now(),
        description: transaction.description || null
      };
      
      await this.db.collection('transactions').add(newTransaction);
      
      return {
        ...newTransaction,
        date: this.convertTimestamp(newTransaction.date)
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    try {
      const snapshot = await this.db.collection('transactions').where('id', '==', id).get();
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await docRef.update(transaction);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        type: data!.type,
        amount: data!.amount,
        entityId: data!.entityId,
        entityType: data!.entityType,
        date: this.convertTimestamp(data!.date),
        description: data!.description || null
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return undefined;
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const snapshot = await this.db.collection('transactions').where('id', '==', id).get();
      if (snapshot.empty) return false;
      
      await snapshot.docs[0].ref.delete();
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }
}

export const firestoreStorage = new FirestoreStorage();