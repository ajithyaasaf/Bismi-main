import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
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
      // Initialize Firebase Admin SDK if not already initialized
      if (getApps().length === 0) {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
          try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            initializeApp({
              credential: cert(serviceAccount),
              projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
            });
          } catch (error) {
            throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_KEY format');
          }
        } else {
          // Fallback to individual environment variables
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          
          if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing Firebase credentials. Please provide FIREBASE_SERVICE_ACCOUNT_KEY or individual credentials.');
          }
          
          initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
            projectId: process.env.FIREBASE_PROJECT_ID,
          });
        }
      }

      this.db = getFirestore();
      console.log('Firestore initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
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
    const doc = await this.db.collection('users').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    
    const data = doc.data();
    return {
      id: parseInt(doc.id),
      username: data?.username,
      password: data?.password,
    };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await this.db.collection('users').where('username', '==', username).get();
    if (snapshot.empty) return undefined;
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: parseInt(doc.id),
      username: data.username,
      password: data.password,
    };
  }

  async createUser(user: InsertUser): Promise<User> {
    const usersSnapshot = await this.db.collection('users').get();
    const nextId = usersSnapshot.size + 1;
    
    const newUser: User = {
      id: nextId,
      ...user,
    };
    
    await this.db.collection('users').doc(nextId.toString()).set(newUser);
    return newUser;
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
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
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
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
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
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
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
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
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const doc = await this.db.collection('suppliers').doc(id).get();
    if (!doc.exists) return false;
    
    await this.db.collection('suppliers').doc(id).delete();
    return true;
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
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
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
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
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
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
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
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
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const doc = await this.db.collection('inventory').doc(id).get();
    if (!doc.exists) return false;
    
    await this.db.collection('inventory').doc(id).delete();
    return true;
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
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
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
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
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
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
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
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
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const doc = await this.db.collection('customers').doc(id).get();
    if (!doc.exists) return false;
    
    await this.db.collection('customers').doc(id).delete();
    return true;
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
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
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
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
  }

  async getOrder(id: string): Promise<Order | undefined> {
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
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
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
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
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
  }

  async deleteOrder(id: string): Promise<boolean> {
    const doc = await this.db.collection('orders').doc(id).get();
    if (!doc.exists) return false;
    
    await this.db.collection('orders').doc(id).delete();
    return true;
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
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
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
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
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
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
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
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
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
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
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const doc = await this.db.collection('transactions').doc(id).get();
    if (!doc.exists) return false;
    
    await this.db.collection('transactions').doc(id).delete();
    return true;
  }
}

export const firestoreStorage = new FirestoreStorage();