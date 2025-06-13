import { IStorage } from './storage';
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
  private firestoreStorage: IStorage;

  constructor() {
    this.firestoreStorage = firestoreStorage;
    console.log('Enterprise storage initialized with Firestore database exclusively');
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.firestoreStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.firestoreStorage.getUserByUsername(username);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.firestoreStorage.createUser(user);
  }

  // Supplier operations
  async getAllSuppliers(): Promise<Supplier[]> {
    return this.firestoreStorage.getAllSuppliers();
  }

  async getSupplier(id: string): Promise<Supplier | undefined> {
    return this.firestoreStorage.getSupplier(id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    return this.firestoreStorage.createSupplier(supplier);
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    return this.firestoreStorage.updateSupplier(id, supplier);
  }

  async deleteSupplier(id: string): Promise<boolean> {
    return this.firestoreStorage.deleteSupplier(id);
  }

  // Inventory operations
  async getAllInventory(): Promise<Inventory[]> {
    return this.firestoreStorage.getAllInventory();
  }

  async getInventoryItem(id: string): Promise<Inventory | undefined> {
    return this.firestoreStorage.getInventoryItem(id);
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    return this.firestoreStorage.createInventoryItem(item);
  }

  async updateInventoryItem(id: string, item: Partial<InsertInventory>): Promise<Inventory | undefined> {
    return this.firestoreStorage.updateInventoryItem(id, item);
  }

  async deleteInventoryItem(id: string): Promise<boolean> {
    return this.firestoreStorage.deleteInventoryItem(id);
  }

  // Customer operations
  async getAllCustomers(): Promise<Customer[]> {
    return this.firestoreStorage.getAllCustomers();
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.firestoreStorage.getCustomer(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.firestoreStorage.createCustomer(customer);
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    return this.firestoreStorage.updateCustomer(id, customer);
  }

  async deleteCustomer(id: string): Promise<boolean> {
    return this.firestoreStorage.deleteCustomer(id);
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return this.firestoreStorage.getAllOrders();
  }

  async getOrdersByCustomer(customerId: string): Promise<Order[]> {
    return this.firestoreStorage.getOrdersByCustomer(customerId);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.firestoreStorage.getOrder(id);
  }

  async createOrder(order: InsertOrder & { createdAt?: Date }): Promise<Order> {
    return this.firestoreStorage.createOrder(order);
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    return this.firestoreStorage.updateOrder(id, order);
  }

  async deleteOrder(id: string): Promise<boolean> {
    return this.firestoreStorage.deleteOrder(id);
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    return this.firestoreStorage.getAllTransactions();
  }

  async getTransactionsByEntity(entityId: string): Promise<Transaction[]> {
    return this.firestoreStorage.getTransactionsByEntity(entityId);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.firestoreStorage.getTransaction(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return this.firestoreStorage.createTransaction(transaction);
  }

  async updateTransaction(id: string, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    return this.firestoreStorage.updateTransaction(id, transaction);
  }

  async deleteTransaction(id: string): Promise<boolean> {
    return this.firestoreStorage.deleteTransaction(id);
  }

  // Utility methods
  isUsingFirestoreStorage(): boolean {
    return true;
  }

  getStorageType(): string {
    return 'Firestore';
  }
}

export const enterpriseStorage = new EnterpriseStorage();