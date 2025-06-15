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

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private suppliers: Supplier[] = [];
  private inventory: Inventory[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];
  private transactions: Transaction[] = [];

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(user => user.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.users.length + 1,
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return [...this.suppliers];
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.find(supplier => supplier.id === id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const newSupplier: Supplier = {
      id: `supplier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: supplier.name,
      debt: supplier.debt ?? 0,
      contact: supplier.contact ?? null,
      createdAt: new Date(),
    };
    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    this.suppliers[index] = { ...this.suppliers[index], ...supplier };
    return this.suppliers[index];
  }

  async deleteSupplier(id: string): Promise<boolean> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.suppliers.splice(index, 1);
    return true;
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    return [...this.inventory];
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    return this.inventory.find(item => item.id === id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const newItem: Inventory = {
      id: `inventory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: item.type,
      quantity: item.quantity ?? 0,
      rate: item.rate ?? 0,
      updatedAt: new Date(),
    };
    this.inventory.push(newItem);
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const index = this.inventory.findIndex(i => i.id === id);
    if (index === -1) return undefined;

    this.inventory[index] = { ...this.inventory[index], ...item };
    return this.inventory[index];
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    const index = this.inventory.findIndex(i => i.id === id);
    if (index === -1) return false;

    this.inventory.splice(index, 1);
    return true;
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    return [...this.customers];
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.find(customer => customer.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = {
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: customer.name,
      type: customer.type,
      contact: customer.contact || null,
      pendingAmount: customer.pendingAmount || 0,
      createdAt: new Date(),
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.customers[index] = { ...this.customers[index], ...customer };
    return this.customers[index];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.customers.splice(index, 1);
    return true;
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return [...this.orders];
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.orders.filter(order => order.customerId === customerId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.find(order => order.id === id);
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    const newOrder: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId: order.customerId,
      items: order.items,
      total: order.total,
      status: order.status,
      date: order.date ? new Date(order.date) : new Date(),
      createdAt: order.createdAt || new Date(),
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;

    this.orders[index] = { ...this.orders[index], ...order };
    return this.orders[index];
  }

  async deleteOrder(id: string): Promise<boolean> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return false;

    this.orders.splice(index, 1);
    return true;
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    return [...this.transactions];
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    return this.transactions.filter(transaction => transaction.entityId === entityId);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.find(transaction => transaction.id === id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      id: `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: transaction.type,
      entityId: transaction.entityId,
      entityType: transaction.entityType,
      amount: transaction.amount,
      description: transaction.description || null,
      date: transaction.date || new Date(),
    };
    this.transactions.push(newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) return undefined;

    this.transactions[index] = { ...this.transactions[index], ...transaction };
    return this.transactions[index];
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) return false;

    this.transactions.splice(index, 1);
    return true;
  }
}

export const memoryStorage = new MemoryStorage();