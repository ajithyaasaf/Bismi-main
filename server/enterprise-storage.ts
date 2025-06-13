import { IStorage, MemStorage } from './storage';
import { firestoreStorage } from './firestore-storage';
import {
  User, InsertUser,
  Supplier, InsertSupplier,
  Inventory, InsertInventory,
  Customer, InsertCustomer,
  Order, InsertOrder,
  Transaction, InsertTransaction
} from '@shared/schema';

/**
 * Enterprise-level storage manager that uses Firestore exclusively
 */
export class EnterpriseStorage implements IStorage {
  private primaryStorage: IStorage;
  private fallbackStorage: MemStorage;
  private isUsingFirestore: boolean = true;

  constructor() {
    this.fallbackStorage = new MemStorage();
    this.primaryStorage = firestoreStorage;
    console.log('Using Firestore database exclusively');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.primaryStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.primaryStorage.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.primaryStorage.createUser(user);
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.primaryStorage.getAllSuppliers();
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.primaryStorage.getSupplier(id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    return this.primaryStorage.createSupplier(supplier);
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    return this.primaryStorage.updateSupplier(id, supplier);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return this.primaryStorage.deleteSupplier(id);
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    return this.primaryStorage.getAllInventory();
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    return this.primaryStorage.getInventoryItem(id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    return this.primaryStorage.createInventoryItem(item);
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    return this.primaryStorage.updateInventoryItem(id, item);
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.primaryStorage.deleteInventoryItem(id);
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    return this.primaryStorage.getAllCustomers();
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.primaryStorage.getCustomer(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.primaryStorage.createCustomer(customer);
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    return this.primaryStorage.updateCustomer(id, customer);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.primaryStorage.deleteCustomer(id);
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return this.primaryStorage.getAllOrders();
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.primaryStorage.getOrdersByCustomer(customerId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.primaryStorage.getOrder(id);
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    return this.primaryStorage.createOrder(order);
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    return this.primaryStorage.updateOrder(id, order);
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.primaryStorage.deleteOrder(id);
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    return this.primaryStorage.getAllTransactions();
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    return this.primaryStorage.getTransactionsByEntity(entityId);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.primaryStorage.getTransaction(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return this.primaryStorage.createTransaction(transaction);
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    return this.primaryStorage.updateTransaction(id, transaction);
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.primaryStorage.deleteTransaction(id);
  }

  // Utility methods
  isUsingFirestoreStorage(): boolean {
    return this.isUsingFirestore;
  }

  getStorageType(): string {
    return this.isUsingFirestore ? 'Firestore' : 'In-Memory';
  }
}

export const enterpriseStorage = new EnterpriseStorage();