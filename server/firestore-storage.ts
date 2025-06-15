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
      // Initialize Firebase Admin if not already initialized
      if (!admin.apps || admin.apps.length === 0) {
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        
        if (serviceAccountKey) {
          try {
            // Clean and parse the service account key
            let cleanedKey = serviceAccountKey;
            
            // Handle different formats of the service account key
            if (typeof serviceAccountKey === 'string') {
              // Remove any extra quotes or escaping
              cleanedKey = serviceAccountKey.trim();
              
              // Check if the key is too short or incomplete
              if (cleanedKey.length < 50) {
                console.error('Firebase service account key appears to be incomplete or truncated');
                console.error('Key length:', cleanedKey.length);
                console.error('Key content:', cleanedKey);
                throw new Error('Firebase service account key is incomplete. Please ensure you copied the entire JSON content from your Firebase service account key file.');
              }
              
              // If it starts and ends with quotes, remove them
              if (cleanedKey.startsWith('"') && cleanedKey.endsWith('"')) {
                cleanedKey = cleanedKey.slice(1, -1);
              }
              
              // Handle escaped characters properly
              // First handle double-escaped newlines
              cleanedKey = cleanedKey.replace(/\\\\n/g, '\\n');
              // Then handle single-escaped newlines
              cleanedKey = cleanedKey.replace(/\\n/g, '\n');
              
              // Handle escaped quotes
              cleanedKey = cleanedKey.replace(/\\"/g, '"');
              
              // Handle other escaped characters that might cause issues
              cleanedKey = cleanedKey.replace(/\\t/g, '\t');
              cleanedKey = cleanedKey.replace(/\\r/g, '\r');
              
              // Validate basic JSON structure
              if (!cleanedKey.startsWith('{') || !cleanedKey.endsWith('}')) {
                throw new Error('Firebase service account key must be a complete JSON object starting with { and ending with }');
              }
              
              // Try to parse as JSON with better error handling
              try {
                // Additional cleaning for common JSON issues
                // Remove any BOM or hidden characters
                cleanedKey = cleanedKey.replace(/^\uFEFF/, '');
                
                // Fix common JSON formatting issues
                // Ensure proper formatting of the private key field
                cleanedKey = cleanedKey.replace(/"private_key":\s*"([^"]*(?:\\.[^"]*)*)"/g, (match, key) => {
                  // Properly escape the private key content
                  const escapedKey = key
                    .replace(/\n/g, '\\n')
                    .replace(/\r/g, '\\r')
                    .replace(/\t/g, '\\t');
                  return `"private_key":"${escapedKey}"`;
                });
                
                const serviceAccount = JSON.parse(cleanedKey);
                
                if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
                  throw new Error('Missing required fields in service account key (project_id, private_key, client_email). Please ensure you downloaded the complete service account key from Firebase Console.');
                }
                
                console.log('Initializing Firebase Admin with service account for project:', serviceAccount.project_id);
                
                admin.initializeApp({
                  credential: admin.credential.cert(serviceAccount),
                  projectId: serviceAccount.project_id,
                });
              } catch (jsonError) {
                console.error('JSON parse error:', jsonError);
                console.error('Error at position:', (jsonError as any).message.match(/position (\d+)/)?.[1] || 'unknown');
                
                // Try alternative parsing method for Base64 encoded keys
                try {
                  // Check if it might be base64 encoded
                  if (!cleanedKey.includes('"type"') && cleanedKey.length > 100) {
                    const decoded = Buffer.from(cleanedKey, 'base64').toString('utf-8');
                    const serviceAccount = JSON.parse(decoded);
                    
                    admin.initializeApp({
                      credential: admin.credential.cert(serviceAccount),
                      projectId: serviceAccount.project_id,
                    });
                    console.log('Successfully parsed base64 encoded service account key');
                    return;
                  }
                } catch {
                  // Base64 parsing failed, continue with original error
                }
                
                throw new Error('Invalid JSON format in Firebase service account key. Please ensure you copied the complete, valid JSON from your Firebase service account key file.');
              }
            } else {
              // Already an object
              admin.initializeApp({
                credential: admin.credential.cert(serviceAccountKey),
                projectId: serviceAccountKey.project_id,
              });
            }
          } catch (parseError) {
            console.error('Failed to initialize Firebase with service account key:', parseError);
            throw new Error(`Firebase initialization failed: ${parseError.message}`);
          }
        } else {
          // Fallback to individual environment variables
          const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
          const projectId = process.env.FIREBASE_PROJECT_ID;
          const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
          
          if (!projectId || !clientEmail || !privateKey) {
            throw new Error('Missing Firebase configuration. Please provide FIREBASE_SERVICE_ACCOUNT_KEY or individual Firebase environment variables.');
          }
          
          console.log('Initializing Firebase Admin with individual credentials for project:', projectId);
          
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: projectId,
              clientEmail: clientEmail,
              privateKey: privateKey,
            }),
            projectId: projectId,
          });
        }
      }
      
      this.db = admin.firestore();
      console.log('Firebase Firestore storage initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase Admin SDK:', error);
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