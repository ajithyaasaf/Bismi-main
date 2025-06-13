import { 
  User, InsertUser,
  Supplier, InsertSupplier,
  Inventory, InsertInventory,
  Customer, InsertCustomer,
  Order, InsertOrder,
  Transaction, InsertTransaction
} from "@shared/schema";

// Interface with all CRUD operations for our application
export interface IStorage {
  // User operations (kept for compatibility)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Supplier operations
  getAllSuppliers(): Promise<Supplier[]>;
  getSupplier(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: string): Promise<boolean>;
  
  // Inventory operations
  getAllInventory(): Promise<Inventory[]>;
  getInventoryItem(id: string): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined>;
  deleteInventoryItem(id: string): Promise<boolean>;
  
  // Customer operations
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;
  
  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrdersByCustomer(customerId: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;
  
  // Transaction operations
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByEntity(entityId: string): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: string): Promise<boolean>;
}