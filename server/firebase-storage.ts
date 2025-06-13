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

// Use dynamic imports to handle Firebase module resolution
let firebaseModules: any = null;

async function loadFirebaseModules() {
  if (firebaseModules) return firebaseModules;
  
  try {
    // Create the firebase modules object with functions that will dynamically import
    firebaseModules = {
      initializeApp: null,
      getFirestore: null,
      collection: null,
      doc: null,
      getDocs: null,
      getDoc: null,
      addDoc: null,
      updateDoc: null,
      deleteDoc: null,
      query: null,
      where: null,
      orderBy: null,
      Timestamp: null
    };
    
    // Load the actual functions by eval to bypass module resolution
    const importApp = new Function('return import("firebase/app")');
    const importFirestore = new Function('return import("firebase/firestore")');
    
    const [appModule, firestoreModule] = await Promise.all([
      importApp(),
      importFirestore()
    ]);
    
    firebaseModules.initializeApp = appModule.initializeApp;
    firebaseModules.getFirestore = firestoreModule.getFirestore;
    firebaseModules.collection = firestoreModule.collection;
    firebaseModules.doc = firestoreModule.doc;
    firebaseModules.getDocs = firestoreModule.getDocs;
    firebaseModules.getDoc = firestoreModule.getDoc;
    firebaseModules.addDoc = firestoreModule.addDoc;
    firebaseModules.updateDoc = firestoreModule.updateDoc;
    firebaseModules.deleteDoc = firestoreModule.deleteDoc;
    firebaseModules.query = firestoreModule.query;
    firebaseModules.where = firestoreModule.where;
    firebaseModules.orderBy = firestoreModule.orderBy;
    firebaseModules.Timestamp = firestoreModule.Timestamp;
    
    return firebaseModules;
  } catch (error) {
    console.error('Failed to load Firebase modules:', error);
    throw error;
  }
}

export class FirebaseStorage implements IStorage {
  private db: any;
  private initialized: boolean = false;

  constructor() {
    this.initializeFirestore();
  }

  private async initializeFirestore() {
    try {
      const modules = await loadFirebaseModules();
      
      const firebaseConfig = {
        apiKey: "AIzaSyA3f4gJOKZDIjy9gnhSSpMVLs1UblGxo0s",
        authDomain: "bismi-broilers-3ca96.firebaseapp.com",
        databaseURL: "https://bismi-broilers-3ca96-default-rtdb.firebaseio.com",
        projectId: "bismi-broilers-3ca96",
        storageBucket: "bismi-broilers-3ca96.firebasestorage.app",
        messagingSenderId: "949430744092",
        appId: "1:949430744092:web:4ea5638a9d38ba3e76dbd9"
      };

      const app = modules.initializeApp(firebaseConfig);
      this.db = modules.getFirestore(app);
      this.initialized = true;
      console.log('Firebase Firestore initialized exclusively with project:', firebaseConfig.projectId);
    } catch (error) {
      console.error('Failed to initialize Firebase Firestore:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    let retries = 0;
    while (!this.initialized && retries < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    if (!this.initialized) {
      throw new Error('Firebase Firestore not initialized');
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
      const usersRef = query(collection(this.db, 'users'), where('id', '==', id));
      const snapshot = await getDocs(usersRef);
      if (snapshot.empty) return undefined;
      
      const userData = snapshot.docs[0].data();
      return {
        id: userData.id,
        username: userData.username,
        password: userData.password
      };
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const usersRef = query(collection(this.db, 'users'), where('username', '==', username));
      const snapshot = await getDocs(usersRef);
      if (snapshot.empty) return undefined;
      
      const userData = snapshot.docs[0].data();
      return {
        id: userData.id,
        username: userData.username,
        password: userData.password
      };
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const userWithId = { ...insertUser, id: Date.now() };
      await addDoc(collection(this.db, 'users'), userWithId);
      return userWithId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    try {
      const snapshot = await getDocs(collection(this.db, 'suppliers'));
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          contact: data.contact,
          debt: data.debt || 0,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting all suppliers:', error);
      throw error;
    }
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    try {
      const suppliersRef = query(collection(this.db, 'suppliers'), where('id', '==', id));
      const snapshot = await getDocs(suppliersRef);
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        name: data.name,
        contact: data.contact,
        debt: data.debt || 0,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting supplier:', error);
      throw error;
    }
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    try {
      const newSupplier = {
        ...supplier,
        id: uuidv4(),
        debt: supplier.debt || 0,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(this.db, 'suppliers'), newSupplier);
      
      return {
        ...newSupplier,
        createdAt: newSupplier.createdAt.toDate()
      };
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const suppliersRef = query(collection(this.db, 'suppliers'), where('id', '==', id));
      const snapshot = await getDocs(suppliersRef);
      
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, supplier);
      
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        name: data!.name,
        contact: data!.contact,
        debt: data!.debt || 0,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  }

  async deleteSupplier(id: string): Promise<boolean> {
    try {
      const suppliersRef = query(collection(this.db, 'suppliers'), where('id', '==', id));
      const snapshot = await getDocs(suppliersRef);
      
      if (snapshot.empty) return false;
      
      await deleteDoc(snapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    try {
      const snapshot = await getDocs(collection(this.db, 'inventory'));
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          quantity: data.quantity,
          rate: data.rate,
          updatedAt: this.convertTimestamp(data.updatedAt)
        };
      });
    } catch (error) {
      console.error('Error getting all inventory:', error);
      throw error;
    }
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    try {
      const inventoryRef = query(collection(this.db, 'inventory'), where('id', '==', id));
      const snapshot = await getDocs(inventoryRef);
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        type: data.type,
        quantity: data.quantity,
        rate: data.rate,
        updatedAt: this.convertTimestamp(data.updatedAt)
      };
    } catch (error) {
      console.error('Error getting inventory item:', error);
      throw error;
    }
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    try {
      const newItem = {
        ...item,
        id: uuidv4(),
        updatedAt: Timestamp.now()
      };
      
      await addDoc(collection(this.db, 'inventory'), newItem);
      
      return {
        ...newItem,
        updatedAt: newItem.updatedAt.toDate()
      };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    try {
      const inventoryRef = query(collection(this.db, 'inventory'), where('id', '==', id));
      const snapshot = await getDocs(inventoryRef);
      
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, { ...item, updatedAt: Timestamp.now() });
      
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        type: data!.type,
        quantity: data!.quantity,
        rate: data!.rate,
        updatedAt: this.convertTimestamp(data!.updatedAt)
      };
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    try {
      const inventoryRef = query(collection(this.db, 'inventory'), where('id', '==', id));
      const snapshot = await getDocs(inventoryRef);
      
      if (snapshot.empty) return false;
      
      await deleteDoc(snapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    try {
      const snapshot = await getDocs(collection(this.db, 'customers'));
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          contact: data.contact,
          pendingAmount: data.pendingAmount || 0,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting all customers:', error);
      throw error;
    }
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    try {
      const customersRef = query(collection(this.db, 'customers'), where('id', '==', id));
      const snapshot = await getDocs(customersRef);
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        name: data.name,
        type: data.type,
        contact: data.contact,
        pendingAmount: data.pendingAmount || 0,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting customer:', error);
      throw error;
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const newCustomer = {
        ...customer,
        id: uuidv4(),
        pendingAmount: customer.pendingAmount || 0,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(this.db, 'customers'), newCustomer);
      
      return {
        ...newCustomer,
        createdAt: newCustomer.createdAt.toDate()
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    try {
      const customersRef = query(collection(this.db, 'customers'), where('id', '==', id));
      const snapshot = await getDocs(customersRef);
      
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, customer);
      
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        name: data!.name,
        type: data!.type,
        contact: data!.contact,
        pendingAmount: data!.pendingAmount || 0,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }

  async deleteCustomer(id: string): Promise<boolean> {
    try {
      const customersRef = query(collection(this.db, 'customers'), where('id', '==', id));
      const snapshot = await getDocs(customersRef);
      
      if (snapshot.empty) return false;
      
      await deleteDoc(snapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await getDocs(query(collection(this.db, 'orders'), orderBy('date', 'desc')));
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          customerId: data.customerId,
          items: data.items,
          date: this.convertTimestamp(data.date),
          total: data.total,
          status: data.status,
          type: data.type,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw error;
    }
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    try {
      const ordersRef = query(
        collection(this.db, 'orders'), 
        where('customerId', '==', customerId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(ordersRef);
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          customerId: data.customerId,
          items: data.items,
          date: this.convertTimestamp(data.date),
          total: data.total,
          status: data.status,
          type: data.type,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting orders by customer:', error);
      throw error;
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const ordersRef = query(collection(this.db, 'orders'), where('id', '==', id));
      const snapshot = await getDocs(ordersRef);
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        customerId: data.customerId,
        items: data.items,
        date: this.convertTimestamp(data.date),
        total: data.total,
        status: data.status,
        type: data.type,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    try {
      const newOrder = {
        ...order,
        id: uuidv4(),
        date: order.date ? Timestamp.fromDate(order.date) : Timestamp.now(),
        createdAt: order.createdAt ? Timestamp.fromDate(order.createdAt) : Timestamp.now()
      };
      
      await addDoc(collection(this.db, 'orders'), newOrder);
      
      return {
        ...order,
        id: newOrder.id,
        date: newOrder.date.toDate(),
        createdAt: newOrder.createdAt.toDate()
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    try {
      const ordersRef = query(collection(this.db, 'orders'), where('id', '==', id));
      const snapshot = await getDocs(ordersRef);
      
      if (snapshot.empty) return undefined;
      
      const updateData = { ...order };
      if (order.date) {
        updateData.date = Timestamp.fromDate(order.date);
      }
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, updateData);
      
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        customerId: data!.customerId,
        items: data!.items,
        date: this.convertTimestamp(data!.date),
        total: data!.total,
        status: data!.status,
        type: data!.type,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<boolean> {
    try {
      const ordersRef = query(collection(this.db, 'orders'), where('id', '==', id));
      const snapshot = await getDocs(ordersRef);
      
      if (snapshot.empty) return false;
      
      await deleteDoc(snapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      throw error;
    }
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    try {
      const snapshot = await getDocs(query(collection(this.db, 'transactions'), orderBy('date', 'desc')));
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          entityId: data.entityId,
          entityType: data.entityType,
          date: this.convertTimestamp(data.date),
          description: data.description,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    try {
      const transactionsRef = query(
        collection(this.db, 'transactions'), 
        where('entityId', '==', entityId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(transactionsRef);
      return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          amount: data.amount,
          entityId: data.entityId,
          entityType: data.entityType,
          date: this.convertTimestamp(data.date),
          description: data.description,
          createdAt: this.convertTimestamp(data.createdAt)
        };
      });
    } catch (error) {
      console.error('Error getting transactions by entity:', error);
      throw error;
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    try {
      const transactionsRef = query(collection(this.db, 'transactions'), where('id', '==', id));
      const snapshot = await getDocs(transactionsRef);
      if (snapshot.empty) return undefined;
      
      const data = snapshot.docs[0].data();
      return {
        id: data.id,
        type: data.type,
        amount: data.amount,
        entityId: data.entityId,
        entityType: data.entityType,
        date: this.convertTimestamp(data.date),
        description: data.description,
        createdAt: this.convertTimestamp(data.createdAt)
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    try {
      const newTransaction = {
        ...transaction,
        id: uuidv4(),
        date: transaction.date ? Timestamp.fromDate(transaction.date) : Timestamp.now(),
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(this.db, 'transactions'), newTransaction);
      
      return {
        ...transaction,
        id: newTransaction.id,
        date: newTransaction.date.toDate(),
        createdAt: newTransaction.createdAt.toDate()
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    try {
      const transactionsRef = query(collection(this.db, 'transactions'), where('id', '==', id));
      const snapshot = await getDocs(transactionsRef);
      
      if (snapshot.empty) return undefined;
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, transaction);
      
      const updatedDoc = await getDoc(docRef);
      const data = updatedDoc.data();
      
      return {
        id: data!.id,
        type: data!.type,
        amount: data!.amount,
        entityId: data!.entityId,
        entityType: data!.entityType,
        date: this.convertTimestamp(data!.date),
        description: data!.description,
        createdAt: this.convertTimestamp(data!.createdAt)
      };
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      const transactionsRef = query(collection(this.db, 'transactions'), where('id', '==', id));
      const snapshot = await getDocs(transactionsRef);
      
      if (snapshot.empty) return false;
      
      await deleteDoc(snapshot.docs[0].ref);
      return true;
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }
}

export const firebaseStorage = new FirebaseStorage();