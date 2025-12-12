import admin from 'firebase-admin';
import { IStorage } from './storage.js';
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
  DebtAdjustment,
  InsertDebtAdjustment,
  HotelLedgerEntry,
  HotelDebtSummary
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
        console.log('[Firebase] Initializing Admin SDK...');

        // Try individual environment variables first (preferred for Vercel)
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (projectId && clientEmail && privateKey) {
          console.log('[Firebase] Using individual environment variables');
          console.log('[Firebase] Project ID:', projectId);

          // Replace literal \n strings with actual newlines
          // Vercel sometimes stores multiline text as \n escape sequences
          let formattedPrivateKey = privateKey;

          // If the key doesn't have actual newlines but has \n strings
          if (!formattedPrivateKey.includes('\n') && formattedPrivateKey.includes('\\n')) {
            formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
          }

          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey: formattedPrivateKey,
            }),
          });

          console.log('[Firebase] Admin SDK initialized successfully with project:', projectId);
          return;
        }

        // Fallback to FIREBASE_SERVICE_ACCOUNT_KEY (for backward compatibility)
        const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
        if (serviceAccountKey) {
          console.log('[Firebase] Using FIREBASE_SERVICE_ACCOUNT_KEY (legacy method)');

          let serviceAccount;
          try {
            serviceAccount = JSON.parse(serviceAccountKey);
            console.log('[Firebase] Service account parsed successfully for project:', serviceAccount.project_id);
          } catch (parseError) {
            console.error('[Firebase] Service account JSON parse error:', parseError);
            throw new Error('Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY');
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });

          console.log('[Firebase] Admin SDK initialized successfully with project:', serviceAccount.project_id);
          return;
        }

        // No credentials found
        throw new Error(
          'Firebase credentials not found. Please set either:\n' +
          '1. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (recommended), or\n' +
          '2. FIREBASE_SERVICE_ACCOUNT_KEY with full JSON'
        );
      } else {
        console.log('[Firebase] Admin SDK already initialized');
      }
    } catch (error) {
      console.error('[Firebase] Failed to initialize Admin SDK:', error);
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

      const newSupplier = {
        id: docRef.id,
        name: supplier.name,
        contact: supplier.contact,
        pendingAmount: supplier.pendingAmount || 0,
        createdAt: now,
      };

      // If there's an initial pending amount, create an initial debt transaction
      if (supplier.pendingAmount && supplier.pendingAmount > 0) {
        await this.createTransaction({
          entityId: docRef.id,
          entityType: 'supplier',
          type: 'initial_debt',
          amount: supplier.pendingAmount,
          description: `Initial debt for supplier: ${supplier.name}`
        });
      }

      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw new Error(`Failed to create supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const updateData: any = { ...supplier, updatedAt: new Date() };

      // Handle pending amount updates by maintaining debt in Firestore
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
          paidAmount: data.paidAmount || 0,
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
          paidAmount: data.paidAmount || 0,
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
        paidAmount: data?.paidAmount || 0,
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
      // Import currency utilities for precise calculations
      const { roundCurrency, calculateOrderBalance, determinePaymentStatus } = await import('@shared/currency-utils');

      // Ensure precise currency amounts
      const totalAmount = roundCurrency(order.totalAmount || 0);
      const paidAmount = roundCurrency(order.paidAmount || 0);
      const orderBalance = calculateOrderBalance(totalAmount, paidAmount);

      // Validate payment status consistency
      const calculatedPaymentStatus = determinePaymentStatus(totalAmount, paidAmount);
      const finalPaymentStatus = order.paymentStatus || calculatedPaymentStatus;

      console.log(`[ORDER CREATION] Order balance: ₹${orderBalance}, Payment status: ${finalPaymentStatus}`);

      // Use the provided createdAt date - it should never be undefined due to schema validation
      const createdAt = order.createdAt || new Date();
      console.log(`[ORDER CREATION] Using order date: ${createdAt.toISOString()}, Schema provided: ${order.createdAt ? 'Yes' : 'No (fallback used)'}`);

      const docRef = await this.db.collection('orders').add({
        customerId: order.customerId,
        items: order.items,
        totalAmount,
        paidAmount,
        paymentStatus: finalPaymentStatus,
        orderStatus: order.orderStatus,
        createdAt,
      });

      // Get current inventory state once to avoid race conditions
      const allInventory = await this.getAllInventory();

      // Update inventory quantities for ordered items (batch operation)
      const inventoryUpdates: Promise<any>[] = [];
      for (const item of order.items) {
        const inventoryItem = allInventory.find(inv => inv.type === item.type);

        if (inventoryItem) {
          const currentQuantity = roundCurrency(inventoryItem.quantity);
          const itemQuantity = roundCurrency(item.quantity || 0);
          const newQuantity = roundCurrency(currentQuantity - itemQuantity);

          console.log(`[INVENTORY UPDATE] ${item.type}: ${currentQuantity} - ${itemQuantity} = ${newQuantity}`);

          inventoryUpdates.push(
            this.updateInventoryItem(inventoryItem.id, { quantity: newQuantity })
          );
        } else {
          console.warn(`[INVENTORY WARNING] No inventory found for type: ${item.type}`);
        }
      }

      // Execute inventory updates in parallel
      await Promise.all(inventoryUpdates);

      // Update customer pending amount ONLY if there's an unpaid balance
      // This prevents double-counting since transaction will be recorded separately
      if (orderBalance > 0 && finalPaymentStatus !== 'paid') {
        const customer = await this.getCustomer(order.customerId);
        if (customer) {
          const currentPending = roundCurrency(customer.pendingAmount || 0);
          const newPendingAmount = roundCurrency(currentPending + orderBalance);

          console.log(`[CUSTOMER UPDATE] Pending: ₹${currentPending} + ₹${orderBalance} = ₹${newPendingAmount}`);

          await this.updateCustomer(order.customerId, { pendingAmount: newPendingAmount });
        }
      }

      // Create transaction record - use orderBalance instead of totalAmount for accuracy
      const transactionAmount = finalPaymentStatus === 'paid' ? totalAmount : orderBalance;
      await this.createTransaction({
        entityId: order.customerId,
        entityType: 'customer',
        type: finalPaymentStatus === 'paid' ? 'sale' : 'credit',
        amount: transactionAmount,
        description: `Order #${docRef.id} - ${order.items.length} items (${finalPaymentStatus})`
      });

      console.log(`[ORDER CREATED] ID: ${docRef.id}, Total: ₹${totalAmount}, Paid: ₹${paidAmount}, Balance: ₹${orderBalance}`);

      const returnOrder = {
        id: docRef.id,
        customerId: order.customerId,
        items: order.items,
        totalAmount,
        paidAmount,
        paymentStatus: finalPaymentStatus,
        orderStatus: order.orderStatus,
        createdAt: createdAt, // Use the properly processed createdAt variable
      };

      console.log(`[ORDER RETURN] Returning order with createdAt: ${returnOrder.createdAt.toISOString()}`);
      return returnOrder;
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

      // Handle payment amount and status changes
      if (existingOrder) {
        const customer = await this.getCustomer(existingOrder.customerId);
        if (customer) {
          // Calculate old and new balances
          const oldBalance = (existingOrder.totalAmount || 0) - (existingOrder.paidAmount || 0);
          const newPaidAmount = order.paidAmount !== undefined ? order.paidAmount : existingOrder.paidAmount || 0;
          const newBalance = (existingOrder.totalAmount || 0) - newPaidAmount;

          // Update customer pending amount based on balance change
          const balanceChange = newBalance - oldBalance;
          if (balanceChange !== 0) {
            const newPendingAmount = Math.max(0, (customer.pendingAmount || 0) + balanceChange);
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

      // Reverse customer pending amount for any unpaid balance
      if (order.paymentStatus !== 'paid') {
        const customer = await this.getCustomer(order.customerId);
        if (customer) {
          const orderBalance = order.totalAmount - (order.paidAmount || 0);
          const newPendingAmount = Math.max(0, (customer.pendingAmount || 0) - orderBalance);
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

  // Debt Adjustment operations
  async getAllDebtAdjustments(): Promise<DebtAdjustment[]> {
    try {
      const snapshot = await this.db.collection('debt-adjustments').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId || '',
          type: data.type || 'debit',
          amount: data.amount || 0,
          reason: data.reason || '',
          adjustedBy: data.adjustedBy || 'System',
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });
    } catch (error) {
      console.error('Error getting debt adjustments:', error);
      throw new Error(`Failed to get debt adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDebtAdjustmentsByCustomer(customerId: string): Promise<DebtAdjustment[]> {
    try {
      const snapshot = await this.db.collection('debt-adjustments')
        .where('customerId', '==', customerId)
        .get();
      const adjustments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId || '',
          type: data.type || 'debit',
          amount: data.amount || 0,
          reason: data.reason || '',
          adjustedBy: data.adjustedBy || 'System',
          createdAt: this.convertTimestamp(data.createdAt),
        };
      });

      // Sort in memory to avoid Firestore index requirement
      return adjustments.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting debt adjustments by customer:', error);
      throw new Error(`Failed to get debt adjustments by customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDebtAdjustment(id: string): Promise<DebtAdjustment | undefined> {
    try {
      const doc = await this.db.collection('debt-adjustments').doc(id).get();
      if (!doc.exists) return undefined;

      const data = doc.data();
      return {
        id: doc.id,
        customerId: data?.customerId || '',
        type: data?.type || 'debit',
        amount: data?.amount || 0,
        reason: data?.reason || '',
        adjustedBy: data?.adjustedBy || 'System',
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting debt adjustment:', error);
      throw new Error(`Failed to get debt adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDebtAdjustment(adjustment: InsertDebtAdjustment): Promise<DebtAdjustment> {
    try {
      const now = new Date();
      const docRef = await this.db.collection('debt-adjustments').add({
        customerId: adjustment.customerId,
        type: adjustment.type,
        amount: adjustment.amount,
        reason: adjustment.reason,
        adjustedBy: adjustment.adjustedBy || 'System',
        createdAt: now,
      });

      return {
        id: docRef.id,
        customerId: adjustment.customerId,
        type: adjustment.type,
        amount: adjustment.amount,
        reason: adjustment.reason,
        adjustedBy: adjustment.adjustedBy || 'System',
        createdAt: now,
      };
    } catch (error) {
      console.error('Error creating debt adjustment:', error);
      throw new Error(`Failed to create debt adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateDebtAdjustment(id: string, adjustment: Partial<InsertDebtAdjustment>): Promise<DebtAdjustment | undefined> {
    try {
      await this.db.collection('debt-adjustments').doc(id).update(adjustment);
      return this.getDebtAdjustment(id);
    } catch (error) {
      console.error('Error updating debt adjustment:', error);
      throw new Error(`Failed to update debt adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteDebtAdjustment(id: string): Promise<boolean> {
    try {
      await this.db.collection('debt-adjustments').doc(id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting debt adjustment:', error);
      return false;
    }
  }

  // Hotel Ledger operations
  async getHotelLedgerEntries(customerId: string, limit?: number): Promise<HotelLedgerEntry[]> {
    try {
      const entries: HotelLedgerEntry[] = [];
      let runningBalance = 0;

      // Get all orders for this customer
      const orders = await this.getOrdersByCustomer(customerId);

      // Get all debt adjustments for this customer
      const adjustments = await this.getDebtAdjustmentsByCustomer(customerId);

      // Combine and sort by date
      const allEntries = [
        ...orders.map(order => ({
          id: `order-${order.id}`,
          customerId: order.customerId,
          entryType: 'order' as const,
          relatedOrderId: order.id,
          amount: order.totalAmount - order.paidAmount,
          description: `Order: ${order.items.map(item => `${item.quantity}kg ${item.type}`).join(', ')}`,
          runningBalance: 0, // Will be calculated
          createdAt: order.createdAt,
        })),
        ...adjustments.map(adj => ({
          id: `adjustment-${adj.id}`,
          customerId: adj.customerId,
          entryType: 'adjustment' as const,
          relatedAdjustmentId: adj.id,
          amount: adj.type === 'debit' ? adj.amount : -adj.amount,
          description: `${adj.type === 'debit' ? 'Charge' : 'Credit'}: ${adj.reason}`,
          runningBalance: 0, // Will be calculated
          createdAt: adj.createdAt,
        }))
      ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // Calculate running balance
      for (const entry of allEntries) {
        runningBalance += entry.amount;
        entry.runningBalance = runningBalance;
        entries.push(entry);
      }

      // Apply limit if specified
      if (limit) {
        return entries.slice(-limit).reverse(); // Get most recent entries
      }

      return entries.reverse(); // Most recent first
    } catch (error) {
      console.error('Error getting hotel ledger entries:', error);
      throw new Error(`Failed to get hotel ledger entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHotelDebtSummary(customerId: string): Promise<HotelDebtSummary | undefined> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer || customer.type !== 'hotel') return undefined;

      const orders = await this.getOrdersByCustomer(customerId);
      const adjustments = await this.getDebtAdjustmentsByCustomer(customerId);
      const ledgerEntries = await this.getHotelLedgerEntries(customerId, 10);

      // Calculate total owed
      const orderDebt = orders.reduce((sum, order) => sum + (order.totalAmount - order.paidAmount), 0);
      const adjustmentBalance = adjustments.reduce((sum, adj) =>
        sum + (adj.type === 'debit' ? adj.amount : -adj.amount), 0
      );
      const totalOwed = orderDebt + adjustmentBalance;

      return {
        customer,
        totalOwed,
        totalOrders: orders.length,
        recentActivity: ledgerEntries,
        lastOrderDate: orders.length > 0 ? orders.sort((a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : undefined,
      };
    } catch (error) {
      console.error('Error getting hotel debt summary:', error);
      throw new Error(`Failed to get hotel debt summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllHotelDebtSummaries(): Promise<HotelDebtSummary[]> {
    try {
      const customers = await this.getAllCustomers();
      const hotels = customers.filter(c => c.type === 'hotel');

      const summaries: HotelDebtSummary[] = [];
      for (const hotel of hotels) {
        const summary = await this.getHotelDebtSummary(hotel.id);
        if (summary) {
          summaries.push(summary);
        }
      }

      return summaries;
    } catch (error) {
      console.error('Error getting all hotel debt summaries:', error);
      throw new Error(`Failed to get all hotel debt summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const createFirestoreStorage = () => new FirestoreStorage();