// Data models for Bismi Chicken Shop application

export interface User {
  id: number;
  username: string;
  password: string;
  createdAt: Date;
}

export interface InsertUser {
  username: string;
  password: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  pendingAmount: number;
  createdAt: Date;
}

export interface InsertSupplier {
  name: string;
  contact: string;
  pendingAmount?: number;
}

export interface Inventory {
  id: string;
  name: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  supplierId: string;
  createdAt: Date;
}

export interface InsertInventory {
  name?: string;
  type: string;
  quantity: number;
  unit?: string;
  price: number;
  supplierId?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  type: string;
  pendingAmount: number;
  createdAt: Date;
}

export interface InsertCustomer {
  name: string;
  contact: string;
  type: string;
  pendingAmount?: number;
}

export interface OrderItem {
  type: string;
  quantity: number;
  rate: number;
  details?: string;
}

// Standardized API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// Standardized error response
export interface ApiError {
  success: false;
  message: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount: number; // Track how much has been paid for this specific order
  paymentStatus: string;
  orderStatus: string;
  createdAt: Date;
}

export interface InsertOrder {
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount?: number; // Optional, defaults to 0 for new orders
  paymentStatus: string;
  orderStatus: string;
}

export interface Transaction {
  id: string;
  entityId: string;
  entityType: string;
  type: string;
  amount: number;
  description: string;
  createdAt: Date;
}

export interface InsertTransaction {
  entityId: string;
  entityType: string;
  type: string;
  amount: number;
  description: string;
}