import { IStorage } from './storage';
import type { 
  User, InsertUser, 
  Supplier, InsertSupplier,
  Inventory, InsertInventory,
  Customer, InsertCustomer,
  Order, InsertOrder,
  Transaction, InsertTransaction
} from '../shared/types';

export class MockStorage implements IStorage {
  private users: User[] = [];
  private suppliers: Supplier[] = [];
  private inventory: Inventory[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];
  private transactions: Transaction[] = [];

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData() {
    console.log('[MockStorage] Initializing mock data for development');
    
    // Create sample customers
    this.customers = [
      {
        id: 'customer1',
        name: 'Hotel Paradise',
        contact: '+91-9876543210',
        type: 'hotel',
        pendingAmount: 2500,
        createdAt: new Date('2025-06-25')
      },
      {
        id: 'customer2', 
        name: 'Retail Customer John',
        contact: '+91-9876543211',
        type: 'retail',
        pendingAmount: 800,
        createdAt: new Date('2025-06-26')
      },
      {
        id: 'customer3',
        name: 'Restaurant ABC',
        contact: '+91-9876543212',
        type: 'hotel',
        pendingAmount: 1200,
        createdAt: new Date('2025-06-27')
      }
    ];

    // Create sample suppliers
    this.suppliers = [
      {
        id: 'supplier1',
        name: 'Farm Fresh Suppliers',
        contact: '+91-9876543220',
        pendingAmount: 3000,
        createdAt: new Date('2025-06-25')
      },
      {
        id: 'supplier2',
        name: 'Poultry Direct',
        contact: '+91-9876543221', 
        pendingAmount: 1500,
        createdAt: new Date('2025-06-26')
      }
    ];

    // Create sample orders with different dates
    this.orders = [
      // Today's orders
      {
        id: 'order1',
        customerId: 'customer1',
        items: [{ type: 'whole_chicken', quantity: 5, rate: 200, details: 'Fresh' }],
        totalAmount: 1000,
        paidAmount: 500,
        paymentStatus: 'partially_paid',
        orderStatus: 'completed',
        createdAt: new Date() // Today
      },
      {
        id: 'order2',
        customerId: 'customer2',
        items: [{ type: 'chicken_pieces', quantity: 2, rate: 150, details: 'Cut pieces' }],
        totalAmount: 300,
        paidAmount: 300,
        paymentStatus: 'paid',
        orderStatus: 'completed',
        createdAt: new Date() // Today
      },
      
      // Yesterday's orders
      {
        id: 'order3',
        customerId: 'customer1',
        items: [{ type: 'whole_chicken', quantity: 3, rate: 200, details: 'Premium' }],
        totalAmount: 600,
        paidAmount: 0,
        paymentStatus: 'pending',
        orderStatus: 'completed',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      },
      
      // This week's orders
      {
        id: 'order4',
        customerId: 'customer3',
        items: [{ type: 'chicken_curry_cut', quantity: 4, rate: 180, details: 'Curry cut' }],
        totalAmount: 720,
        paidAmount: 720,
        paymentStatus: 'paid',
        orderStatus: 'completed',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      },
      
      // Last month's orders
      {
        id: 'order5',
        customerId: 'customer2',
        items: [{ type: 'whole_chicken', quantity: 2, rate: 200, details: 'Fresh' }],
        totalAmount: 400,
        paidAmount: 400,
        paymentStatus: 'paid',
        orderStatus: 'completed',
        createdAt: new Date('2025-05-15') // Last month
      }
    ];

    // Create sample transactions
    this.transactions = [
      {
        id: 'txn1',
        entityId: 'customer1',
        entityType: 'customer',
        type: 'payment',
        amount: 500,
        description: 'Partial payment for order',
        createdAt: new Date()
      },
      {
        id: 'txn2',
        entityId: 'supplier1',
        entityType: 'supplier',
        type: 'purchase',
        amount: 2000,
        description: 'Stock purchase',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    ];

    console.log(`[MockStorage] Initialized with ${this.orders.length} orders, ${this.customers.length} customers, ${this.suppliers.length} suppliers`);
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.find(u => u.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find(u => u.username === username);
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.users.length + 1,
      ...user,
      createdAt: new Date()
    };
    this.users.push(newUser);
    return newUser;
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return [...this.suppliers];
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.suppliers.find(s => s.id === id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const newSupplier: Supplier = {
      id: `supplier${this.suppliers.length + 1}`,
      ...supplier,
      pendingAmount: supplier.pendingAmount || 0,
      createdAt: new Date()
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
    return this.inventory.find(i => i.id === id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const newItem: Inventory = {
      id: `inventory${this.inventory.length + 1}`,
      name: item.name || 'Chicken Item',
      unit: item.unit || 'kg',
      supplierId: item.supplierId || 'supplier1',
      ...item,
      createdAt: new Date()
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
    return this.customers.find(c => c.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = {
      id: `customer${this.customers.length + 1}`,
      ...customer,
      pendingAmount: customer.pendingAmount || 0,
      createdAt: new Date()
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
    return this.orders.filter(o => o.customerId === customerId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.find(o => o.id === id);
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    const newOrder: Order = {
      id: `order${this.orders.length + 1}`,
      paidAmount: order.paidAmount || 0,
      createdAt: order.createdAt || new Date(),
      ...order
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
    return this.transactions.filter(t => t.entityId === entityId);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.find(t => t.id === id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const newTransaction: Transaction = {
      id: `txn${this.transactions.length + 1}`,
      ...transaction,
      createdAt: new Date()
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

export const createMockStorage = () => new MockStorage();