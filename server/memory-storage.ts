import { IStorage } from './storage';
import { 
  User, InsertUser,
  Supplier, InsertSupplier,
  Inventory, InsertInventory,
  Customer, InsertCustomer,
  Order, InsertOrder,
  Transaction, InsertTransaction
} from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

export class MemoryStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private inventory: Map<string, Inventory> = new Map();
  private customers: Map<string, Customer> = new Map();
  private orders: Map<string, Order> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  constructor() {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData() {
    // Add sample suppliers
    const supplier1: Supplier = {
      id: 'supplier-1',
      name: 'Al Nahda Chicken Farm',
      contact: '+971-50-123-4567',
      address: 'Al Nahda, Dubai',
      outstanding: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.suppliers.set(supplier1.id, supplier1);

    // Add sample inventory
    const inventory1: Inventory = {
      id: 'inv-1',
      type: 'Whole Chicken',
      category: 'Fresh',
      quantity: 100,
      rate: 25,
      minStock: 20,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventory.set(inventory1.id, inventory1);

    const inventory2: Inventory = {
      id: 'inv-2',
      type: 'Chicken Breast',
      category: 'Fresh',
      quantity: 50,
      rate: 35,
      minStock: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventory.set(inventory2.id, inventory2);

    // Add sample customers
    const customer1: Customer = {
      id: 'customer-1',
      name: 'Grand Hotel Dubai',
      type: 'Hotel',
      contact: '+971-4-567-8901',
      address: 'Downtown Dubai',
      balance: 0,
      pendingAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.set(customer1.id, customer1);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = Date.now();
    const newUser: User = {
      id,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = uuidv4();
    const newSupplier: Supplier = {
      id,
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const existing = this.suppliers.get(id);
    if (!existing) return undefined;

    const updated: Supplier = {
      ...existing,
      ...supplier,
      updatedAt: new Date()
    };
    this.suppliers.set(id, updated);
    return updated;
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    return Array.from(this.inventory.values());
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    return this.inventory.get(id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const id = uuidv4();
    const newItem: Inventory = {
      id,
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventory.set(id, newItem);
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const existing = this.inventory.get(id);
    if (!existing) return undefined;

    const updated: Inventory = {
      ...existing,
      ...item,
      updatedAt: new Date()
    };
    this.inventory.set(id, updated);
    return updated;
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.inventory.delete(id);
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = uuidv4();
    const newCustomer: Customer = {
      id,
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated: Customer = {
      ...existing,
      ...customer,
      updatedAt: new Date()
    };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.customerId === customerId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    const id = uuidv4();
    const newOrder: Order = {
      id,
      ...order,
      createdAt: order.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: Order = {
      ...existing,
      ...order,
      updatedAt: new Date()
    };
    this.orders.set(id, updated);
    return updated;
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.orders.delete(id);
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      transaction => transaction.customerId === entityId || transaction.supplierId === entityId
    );
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = uuidv4();
    const newTransaction: Transaction = {
      id,
      ...transaction,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;

    const updated: Transaction = {
      ...existing,
      ...transaction,
      updatedAt: new Date()
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }
}

export const memoryStorage = new MemoryStorage();