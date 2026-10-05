import admin from 'firebase-admin';
import { IStorage } from './storage.js';
import { roundCurrency, calculateOrderBalance, determinePaymentStatus } from '../shared/currency-utils.js';
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
    try {
      this.db.settings({ ignoreUndefinedProperties: true });
    } catch (e) {
      // Already configured or not supported in mock
    }
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

          // Vercel stores multiline env vars as literal \n text (backslash + n)
          // We need to convert these to actual newline characters for Firebase
          const formattedPrivateKey = privateKey.split('\\n').join('\n');

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
          pendingAmount: Math.max(0, data.pendingAmount !== undefined ? data.pendingAmount : (data.debt || 0)),
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
        pendingAmount: Math.max(0, data?.pendingAmount !== undefined ? data?.pendingAmount : (data?.debt || 0)),
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
      const initialPending = roundCurrency(supplier.pendingAmount || 0);
      const docRef = await this.db.collection('suppliers').add({
        name: supplier.name,
        contact: supplier.contact,
        debt: initialPending,
        pendingAmount: initialPending,
        createdAt: now,
        updatedAt: now,
      });

      const newSupplier = {
        id: docRef.id,
        name: supplier.name,
        contact: supplier.contact,
        pendingAmount: initialPending,
        createdAt: now,
      };

      // If there's an initial pending amount, create an initial debt transaction
      if (initialPending > 0) {
        await this.createTransaction({
          entityId: docRef.id,
          entityType: 'supplier',
          type: 'initial_debt',
          amount: initialPending,
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

      // Synchronize both pendingAmount and legacy debt in Firestore so neither goes stale
      if (updateData.pendingAmount !== undefined) {
        const rounded = roundCurrency(updateData.pendingAmount);
        updateData.pendingAmount = rounded;
        updateData.debt = rounded;
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
          pendingAmount: Math.max(0, data.pendingAmount || 0),
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
        pendingAmount: Math.max(0, data?.pendingAmount || 0),
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting customer:', error);
      throw new Error(`Failed to get customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    try {
      const now = new Date();
      const initialPending = roundCurrency(customer.pendingAmount || 0);

      const docRef = await this.db.collection('customers').add({
        name: customer.name,
        contact: customer.contact,
        type: customer.type,
        pendingAmount: initialPending,
        createdAt: now,
        updatedAt: now,
      });

      const newCustomer = {
        id: docRef.id,
        name: customer.name,
        contact: customer.contact,
        type: customer.type,
        pendingAmount: initialPending,
        createdAt: now,
      };

      // Record initial debt transaction for auditing and consistent balance calculation
      if (initialPending > 0) {
        await this.createTransaction({
          entityId: docRef.id,
          entityType: 'customer',
          type: 'initial_debt',
          amount: initialPending,
          description: `Initial debt for customer: ${customer.name}`
        });
      }

      return newCustomer;
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
          originalPaidAmount: data?.originalPaidAmount !== undefined ? data.originalPaidAmount : undefined,
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
          originalPaidAmount: data?.originalPaidAmount !== undefined ? data.originalPaidAmount : undefined,
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
        originalPaidAmount: data?.originalPaidAmount !== undefined ? data.originalPaidAmount : undefined,
        createdAt: this.convertTimestamp(data?.createdAt),
      };
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error(`Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    try {
      const totalAmount = roundCurrency(order.totalAmount || 0);
      const rawPaidAmount = roundCurrency(order.paidAmount || 0);
      const paidAmount = Math.min(totalAmount, Math.max(0, rawPaidAmount));
      const orderBalance = Math.max(0, calculateOrderBalance(totalAmount, paidAmount));

      const calculatedPaymentStatus = determinePaymentStatus(totalAmount, paidAmount);
      const finalPaymentStatus = order.paymentStatus || calculatedPaymentStatus;
      const createdAt = order.createdAt || new Date();

      // Use Firestore WriteBatch for ACID atomicity across orders, inventory, customer, and transaction
      const batch = this.db.batch();

      // 1. Order document reference
      const orderRef = this.db.collection('orders').doc();
      const orderDocData: any = {
        customerId: order.customerId,
        items: order.items,
        totalAmount,
        paidAmount,
        paymentStatus: finalPaymentStatus,
        orderStatus: order.orderStatus,
        createdAt,
      };
      if (order.originalPaidAmount !== undefined) {
        orderDocData.originalPaidAmount = order.originalPaidAmount;
      }
      batch.set(orderRef, orderDocData);

      // 2. Inventory updates inside batch using aggregated decrements (prevents duplicate document write error in single batch)
      const allInventory = await this.getAllInventory();
      const inventoryDeltas = new Map<string, number>();

      for (const item of order.items) {
        const inventoryItem = allInventory.find(inv => inv.type === item.type);
        if (inventoryItem) {
          const itemQuantity = roundCurrency(item.quantity || 0);
          const current = inventoryDeltas.get(inventoryItem.id) || 0;
          inventoryDeltas.set(inventoryItem.id, roundCurrency(current + itemQuantity));
        }
      }

      inventoryDeltas.forEach((totalQty, invId) => {
        const invRef = this.db.collection('inventory').doc(invId);
        batch.update(invRef, {
          quantity: admin.firestore.FieldValue.increment(-totalQty),
          updatedAt: new Date()
        });
      });

      // 3. Customer pending amount atomic increment (prevents race conditions)
      if (orderBalance > 0 && finalPaymentStatus !== 'paid') {
        const customerRef = this.db.collection('customers').doc(order.customerId);
        batch.update(customerRef, {
          pendingAmount: admin.firestore.FieldValue.increment(orderBalance),
          updatedAt: new Date()
        });
      }

      // 4. Commercial sales charge transaction inside batch (always full totalAmount to maintain double-entry integrity)
      const transactionRef = this.db.collection('transactions').doc();
      batch.set(transactionRef, {
        entityId: order.customerId,
        entityType: 'customer',
        type: finalPaymentStatus === 'paid' ? 'sale' : 'credit',
        amount: totalAmount,
        description: `Order #${orderRef.id} - ${order.items.length} items (${finalPaymentStatus})`,
        createdAt: createdAt,
        date: createdAt,
      });

      // 5. If upfront cash payment was made, record payment transaction atomically in same batch
      if (paidAmount > 0) {
        const paymentTxRef = this.db.collection('transactions').doc();
        batch.set(paymentTxRef, {
          entityId: order.customerId,
          entityType: 'customer',
          type: 'payment',
          amount: paidAmount,
          description: `Payment received for Order #${orderRef.id}`,
          createdAt: createdAt,
          date: createdAt,
        });
      }

      // Atomically commit all changes together
      await batch.commit();

      console.log(`[ORDER CREATED ATOMICALLY] ID: ${orderRef.id}, Total: ₹${totalAmount}, Paid: ₹${paidAmount}, Balance: ₹${orderBalance}`);

      return {
        id: orderRef.id,
        customerId: order.customerId,
        items: order.items,
        totalAmount,
        paidAmount,
        paymentStatus: finalPaymentStatus,
        orderStatus: order.orderStatus,
        originalPaidAmount: order.originalPaidAmount,
        createdAt: createdAt,
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

      // Clean update object: ignore undefined properties, handle null as FieldValue.delete()
      const updateData: any = {};
      for (const [key, value] of Object.entries(order)) {
        if (value === null) {
          updateData[key] = admin.firestore.FieldValue.delete();
        } else if (value !== undefined) {
          updateData[key] = value;
        }
      }
      updateData.updatedAt = new Date();

      await this.db.collection('orders').doc(id).update(updateData);

      // Handle payment amount and status changes
      if (existingOrder) {
        const customer = await this.getCustomer(existingOrder.customerId);
        if (customer) {
          // Calculate old and new balances
          const oldBalance = roundCurrency((existingOrder.totalAmount || 0) - (existingOrder.paidAmount || 0));
          const newPaidAmount = order.paidAmount !== undefined ? order.paidAmount : (existingOrder.paidAmount || 0);
          const newTotalAmount = order.totalAmount !== undefined ? order.totalAmount : (existingOrder.totalAmount || 0);
          const newBalance = roundCurrency(newTotalAmount - newPaidAmount);

          // Update customer pending amount based on balance change
          const balanceChange = roundCurrency(newBalance - oldBalance);
          if (balanceChange !== 0) {
            const newPendingAmount = Math.max(0, roundCurrency((customer.pendingAmount || 0) + balanceChange));
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

      const batch = this.db.batch();
      const now = new Date();

      // Aggregate inventory quantity reversals (prevents multiple batch writes if multiple items of same type)
      const allInventory = await this.getAllInventory();
      const inventoryDeltas = new Map<string, number>();

      for (const item of (order.items || [])) {
        const inventoryItem = allInventory.find(inv => inv.type === item.type);
        if (inventoryItem) {
          const itemQuantity = roundCurrency(item.quantity || 0);
          const current = inventoryDeltas.get(inventoryItem.id) || 0;
          inventoryDeltas.set(inventoryItem.id, roundCurrency(current + itemQuantity));
        }
      }

      inventoryDeltas.forEach((totalQty, invId) => {
        const invRef = this.db.collection('inventory').doc(invId);
        batch.update(invRef, {
          quantity: admin.firestore.FieldValue.increment(totalQty),
          updatedAt: now
        });
      });

      // Reverse customer pending amount for any unpaid balance
      if (order.paymentStatus !== 'paid' && order.customerId) {
        const customer = await this.getCustomer(order.customerId);
        if (customer) {
          const orderBalance = roundCurrency((order.totalAmount || 0) - (order.paidAmount || 0));
          const newPendingAmount = Math.max(0, roundCurrency((customer.pendingAmount || 0) - orderBalance));
          const customerRef = this.db.collection('customers').doc(order.customerId);
          batch.update(customerRef, {
            pendingAmount: newPendingAmount,
            updatedAt: now
          });
        }
      }

      // Delete commercial charge transactions, but preserve customer payments as account credit
      const transactions = await this.getTransactionsByEntity(order.customerId);
      for (const transaction of transactions) {
        if (transaction.description.includes(`Order #${id}`)) {
          const txRef = this.db.collection('transactions').doc(transaction.id);
          if (transaction.type === 'payment') {
            batch.update(txRef, {
              description: `Credit balance from cancelled Order #${id.slice(0, 8)} (${transaction.description})`,
              updatedAt: now
            });
          } else {
            batch.delete(txRef);
          }
        }
      }

      const orderRef = this.db.collection('orders').doc(id);
      batch.delete(orderRef);

      await batch.commit();
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

      // Parallel fetch: orders, adjustments, and transactions
      const [orders, adjustments, transactions] = await Promise.all([
        this.getOrdersByCustomer(customerId),
        this.getDebtAdjustmentsByCustomer(customerId),
        this.getTransactionsByEntity(customerId)
      ]);

      // Combine all financial events into chronological stream
      const allEvents: HotelLedgerEntry[] = [
        // Orders: Debit (commercial sales charges)
        ...orders.map(order => ({
          id: `order-${order.id}`,
          customerId: order.customerId,
          entryType: 'order' as const,
          relatedOrderId: order.id,
          amount: roundCurrency(order.totalAmount || 0),
          description: `Order: ${order.items.map(item => `${item.quantity}kg ${item.type}`).join(', ')}`,
          runningBalance: 0,
          createdAt: order.createdAt,
        })),

        // Payments: Credit (funds received)
        ...transactions
          .filter(t => t.type === 'payment')
          .map(t => ({
            id: `payment-${t.id}`,
            customerId: customerId,
            entryType: 'payment' as const,
            amount: -roundCurrency(t.amount || 0), // Negative amount represents credit/payment
            description: t.description || 'Payment received',
            runningBalance: 0,
            createdAt: t.createdAt,
          })),

        // Initial legacy debt
        ...transactions
          .filter(t => t.type === 'initial_debt')
          .map(t => ({
            id: `initial-debt-${t.id}`,
            customerId: customerId,
            entryType: 'adjustment' as const,
            amount: roundCurrency(t.amount || 0),
            description: t.description || 'Opening Balance: Legacy debt',
            runningBalance: 0,
            createdAt: t.createdAt,
          })),

        // Manual debt adjustments
        ...adjustments.map(adj => ({
          id: `adjustment-${adj.id}`,
          customerId: adj.customerId,
          entryType: 'adjustment' as const,
          relatedAdjustmentId: adj.id,
          amount: adj.type === 'debit' ? roundCurrency(adj.amount) : -roundCurrency(adj.amount),
          description: `${adj.type === 'debit' ? 'Charge' : 'Credit'}: ${adj.reason}`,
          runningBalance: 0,
          createdAt: adj.createdAt,
        }))
      ].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // If customer has an initial pendingAmount but no transaction yet
      if (allEvents.length === 0 || (!transactions.some(t => t.type === 'initial_debt') && orders.length === 0)) {
        const customer = await this.getCustomer(customerId);
        if (customer && (customer.pendingAmount || 0) > 0 && !allEvents.some(e => e.id.startsWith('initial-debt'))) {
          allEvents.unshift({
            id: `initial-debt-${customer.id}`,
            customerId: customer.id,
            entryType: 'adjustment',
            amount: roundCurrency(customer.pendingAmount),
            description: 'Opening balance',
            runningBalance: 0,
            createdAt: customer.createdAt,
          });
        }
      }

      // Calculate chronological running balance
      for (const entry of allEvents) {
        runningBalance = roundCurrency(runningBalance + entry.amount);
        entry.runningBalance = runningBalance;
        entries.push(entry);
      }

      // Apply limit if specified (return most recent entries first)
      if (limit) {
        return entries.slice(-limit).reverse();
      }

      return entries.reverse();
    } catch (error) {
      console.error('Error getting hotel ledger entries:', error);
      throw new Error(`Failed to get hotel ledger entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getHotelDebtSummary(customerId: string): Promise<HotelDebtSummary | undefined> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer || customer.type !== 'hotel') return undefined;

      const [orders, transactions, ledgerEntries] = await Promise.all([
        this.getOrdersByCustomer(customerId),
        this.getTransactionsByEntity(customerId),
        this.getHotelLedgerEntries(customerId, 15)
      ]);

      // Most recent running balance from double-entry ledger
      const totalOwed = ledgerEntries.length > 0
        ? Math.max(0, ledgerEntries[0].runningBalance)
        : roundCurrency(customer.pendingAmount || 0);

      // Latest order date
      const sortedOrders = [...orders].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastOrderDate = sortedOrders.length > 0 ? sortedOrders[0].createdAt : undefined;

      // Latest payment date
      const payments = transactions
        .filter(t => t.type === 'payment')
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const lastPaymentDate = payments.length > 0 ? payments[0].createdAt : undefined;

      return {
        customer: {
          ...customer,
          pendingAmount: totalOwed
        },
        totalOwed,
        totalOrders: orders.length,
        recentActivity: ledgerEntries,
        lastOrderDate,
        lastPaymentDate,
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

      // Process in parallel to prevent N+1 serial query waterfall
      const summaries = await Promise.all(
        hotels.map(hotel => this.getHotelDebtSummary(hotel.id))
      );

      return summaries
        .filter((s): s is HotelDebtSummary => s !== undefined)
        .sort((a, b) => b.totalOwed - a.totalOwed);
    } catch (error) {
      console.error('Error getting all hotel debt summaries:', error);
      throw new Error(`Failed to get all hotel debt summaries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Atomic & Concurrency-Safe Operations
  async atomicUpdateCustomerPending(customerId: string, delta: number): Promise<void> {
    try {
      const roundedDelta = roundCurrency(delta);
      if (roundedDelta === 0) return;
      await this.db.collection('customers').doc(customerId).update({
        pendingAmount: admin.firestore.FieldValue.increment(roundedDelta),
        updatedAt: new Date()
      });
      console.log(`[ATOMIC] Updated customer ${customerId} pending by ₹${roundedDelta}`);
    } catch (error) {
      console.error(`Error atomically updating customer pending for ${customerId}:`, error);
      throw new Error(`Failed to update customer balance atomically: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async atomicUpdateSupplierPending(supplierId: string, delta: number): Promise<void> {
    try {
      const roundedDelta = roundCurrency(delta);
      if (roundedDelta === 0) return;
      await this.db.collection('suppliers').doc(supplierId).update({
        debt: admin.firestore.FieldValue.increment(roundedDelta),
        pendingAmount: admin.firestore.FieldValue.increment(roundedDelta),
        updatedAt: new Date()
      });
      console.log(`[ATOMIC] Updated supplier ${supplierId} debt by ₹${roundedDelta}`);
    } catch (error) {
      console.error(`Error atomically updating supplier pending for ${supplierId}:`, error);
      throw new Error(`Failed to update supplier debt atomically: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async atomicProcessMultipleCustomerPayments(
    customerId: string,
    payments: Array<{ orderId: string; amount: number; description?: string }>
  ): Promise<{ appliedAmount: number; updatedOrders: string[] }> {
    try {
      const customer = await this.getCustomer(customerId);
      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      // Fetch all customer orders once in a single query
      const orders = await this.getOrdersByCustomer(customerId);
      const ordersMap = new Map(orders.map(o => [String(o.id).trim(), o]));

      const batch = this.db.batch();
      let totalApplied = 0;
      const updatedOrders: string[] = [];
      const now = new Date();

      // Track aggregated updates per order to prevent Firestore batch collision
      // (A document cannot be written more than once in a single batch)
      const orderUpdates = new Map<string, { newPaid: number; newStatus: string }>();

      for (const payment of payments) {
        const allocAmount = roundCurrency(parseFloat(String(payment.amount)) || 0);
        if (allocAmount <= 0) continue;

        const orderIdStr = String(payment.orderId || '').trim();
        const order = ordersMap.get(orderIdStr);

        if (!order || orderIdStr === 'account' || orderIdStr === 'general') {
          // Account-level payment allocation (e.g. towards opening debt or manual adjustments)
          const actualAlloc = allocAmount;
          const txRef = this.db.collection('transactions').doc();
          batch.set(txRef, {
            entityId: customerId,
            entityType: 'customer',
            type: 'payment',
            amount: actualAlloc,
            description: payment.description || `Payment towards account balance`,
            createdAt: now,
            date: now
          });

          totalApplied = roundCurrency(totalApplied + actualAlloc);
          continue;
        }

        const currentPaid = roundCurrency(order.paidAmount || 0);
        const totalAmount = roundCurrency(order.totalAmount || 0);
        const remainingBalance = Math.max(0, roundCurrency(totalAmount - currentPaid));

        if (remainingBalance <= 0) {
          console.log(`[SMART PAYMENT] Order ${order.id} already paid. Skipping.`);
          continue;
        }

        // Strictly cap payment to remaining order balance
        const actualAlloc = Math.min(allocAmount, remainingBalance);
        const newPaid = roundCurrency(currentPaid + actualAlloc);
        const newStatus = determinePaymentStatus(totalAmount, newPaid);

        // Record aggregated update per order to apply once in the batch
        orderUpdates.set(order.id, { newPaid, newStatus });

        // Add payment transaction to batch
        const txRef = this.db.collection('transactions').doc();
        batch.set(txRef, {
          entityId: customerId,
          entityType: 'customer',
          type: 'payment',
          amount: actualAlloc,
          description: payment.description || `Payment for order #${orderIdStr.slice(0, 8)}`,
          createdAt: now,
          date: now
        });

        // Update local object to reflect in subsequent loop iterations if order repeated
        order.paidAmount = newPaid;
        order.paymentStatus = newStatus;

        totalApplied = roundCurrency(totalApplied + actualAlloc);
        if (!updatedOrders.includes(order.id)) {
          updatedOrders.push(order.id);
        }
      }

      // Apply aggregated order updates to batch (each orderRef updated exactly once)
      orderUpdates.forEach((update, orderId) => {
        const orderRef = this.db.collection('orders').doc(orderId);
        batch.update(orderRef, {
          paidAmount: update.newPaid,
          paymentStatus: update.newStatus,
          updatedAt: now
        });
      });

      if (totalApplied > 0) {
        // Decrement customer pending amount safely (guarantee never negative)
        const currentPending = roundCurrency(customer.pendingAmount || 0);
        const newPending = Math.max(0, roundCurrency(currentPending - totalApplied));
        const customerRef = this.db.collection('customers').doc(customerId);
        batch.update(customerRef, {
          pendingAmount: newPending,
          updatedAt: now
        });
      }

      // Single atomic commit for everything (instant, ACID compliant)
      await batch.commit();

      console.log(`[ATOMIC SMART PAYMENT] Customer ${customerId}: Applied ₹${totalApplied} across ${updatedOrders.length} orders in 1 batch`);

      return {
        appliedAmount: totalApplied,
        updatedOrders
      };
    } catch (error) {
      console.error(`Error in atomicProcessMultipleCustomerPayments for ${customerId}:`, error);
      throw new Error(`Failed to process payments atomically: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async atomicAddStock(data: {
    type: string;
    quantity: number;
    price: number;
    supplierId: string;
  }): Promise<Inventory> {
    try {
      const { type, quantity, price, supplierId } = data;
      const supplier = await this.getSupplier(supplierId);
      if (!supplier) {
        throw new Error(`Supplier ${supplierId} not found`);
      }

      const allInventory = await this.getAllInventory();
      const existingItem = allInventory.find(item => item.type === type);
      const totalCost = roundCurrency(quantity * price);
      const now = new Date();
      const batch = this.db.batch();

      let targetInventoryId: string;
      let finalQuantity: number;

      if (existingItem) {
        targetInventoryId = existingItem.id;
        finalQuantity = roundCurrency(existingItem.quantity + quantity);
        const invRef = this.db.collection('inventory').doc(existingItem.id);
        batch.update(invRef, {
          quantity: admin.firestore.FieldValue.increment(quantity),
          price,
          supplierId,
          updatedAt: now
        });
      } else {
        const invRef = this.db.collection('inventory').doc();
        targetInventoryId = invRef.id;
        finalQuantity = quantity;
        batch.set(invRef, {
          name: type,
          type,
          quantity,
          unit: 'kg',
          price,
          supplierId,
          createdAt: now,
          updatedAt: now
        });
      }

      // Purchase transaction inside batch
      const txRef = this.db.collection('transactions').doc();
      batch.set(txRef, {
        entityId: supplierId,
        entityType: 'supplier',
        type: 'purchase',
        amount: totalCost,
        description: `Stock purchase: ${quantity}kg ${type} @ ₹${price}/kg`,
        createdAt: now,
        date: now
      });

      // Increment supplier pending debt inside batch
      const supplierRef = this.db.collection('suppliers').doc(supplierId);
      batch.update(supplierRef, {
        debt: admin.firestore.FieldValue.increment(totalCost),
        pendingAmount: admin.firestore.FieldValue.increment(totalCost),
        updatedAt: now
      });

      await batch.commit();

      console.log(`[ATOMIC ADD STOCK] Item: ${type}, Qty: ${quantity}kg, Supplier: ${supplier.name}, Cost: ₹${totalCost}`);

      return {
        id: targetInventoryId,
        name: type,
        type,
        quantity: finalQuantity,
        unit: 'kg',
        price,
        supplierId,
        createdAt: existingItem ? existingItem.createdAt : now
      };
    } catch (error) {
      console.error('Error in atomicAddStock:', error);
      throw new Error(`Failed to add stock atomically: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const createFirestoreStorage = () => new FirestoreStorage();