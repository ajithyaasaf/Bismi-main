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

export class MemoryStorage implements IStorage {
  private users: User[] = [];
  private suppliers: Supplier[] = [];
  private inventory: Inventory[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];
  private transactions: Transaction[] = [];

  constructor() {
    this.initializeWithSampleData();
  }

  private initializeWithSampleData() {
    // Add sample suppliers
    const supplier1: Supplier = {
      id: uuidv4(),
      name: "Fresh Meat Suppliers Ltd",
      contact: "+91 9876543210",
      pendingAmount: 25000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const supplier2: Supplier = {
      id: uuidv4(),
      name: "Quality Poultry Farm",
      contact: "+91 8765432109",
      pendingAmount: 15000,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.suppliers = [supplier1, supplier2];

    // Add sample inventory
    const inventory1: Inventory = {
      id: uuidv4(),
      type: "broiler",
      currentStock: 250,
      rate: 185,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const inventory2: Inventory = {
      id: uuidv4(),
      type: "country_chicken",
      currentStock: 100,
      rate: 320,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.inventory = [inventory1, inventory2];

    // Add sample customers
    const customer1: Customer = {
      id: uuidv4(),
      name: "Paradise Hotel",
      type: "hotel",
      contact: "+91 7654321098",
      pendingAmount: 8500,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const customer2: Customer = {
      id: uuidv4(),
      name: "Rajesh Kumar",
      type: "retail",
      contact: "+91 6543210987",
      pendingAmount: 1200,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.customers = [customer1, customer2];

    // Add sample orders
    const order1: Order = {
      id: uuidv4(),
      customerId: customer1.id,
      items: [
        { type: "broiler", quantity: 25, rate: 185, details: "Fresh broiler chicken" }
      ],
      total: 4625,
      status: "pending",
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.orders = [order1];
  }

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
      createdAt: new Date(),
      updatedAt: new Date()
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
      id: uuidv4(),
      ...supplier,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.suppliers.push(newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    this.suppliers[index] = {
      ...this.suppliers[index],
      ...supplier,
      updatedAt: new Date()
    };
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
      id: uuidv4(),
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.inventory.push(newItem);
    return newItem;
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const index = this.inventory.findIndex(i => i.id === id);
    if (index === -1) return undefined;

    this.inventory[index] = {
      ...this.inventory[index],
      ...item,
      updatedAt: new Date()
    };
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
      id: uuidv4(),
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.customers.push(newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.customers[index] = {
      ...this.customers[index],
      ...customer,
      updatedAt: new Date()
    };
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
      id: uuidv4(),
      ...order,
      createdAt: order.createdAt || new Date(),
      updatedAt: new Date()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index === -1) return undefined;

    this.orders[index] = {
      ...this.orders[index],
      ...order,
      updatedAt: new Date()
    };
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
      id: uuidv4(),
      ...transaction,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.transactions.push(newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) return undefined;

    this.transactions[index] = {
      ...this.transactions[index],
      ...transaction,
      updatedAt: new Date()
    };
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