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
  originalPaidAmount?: number; // Tracks partial payment before completion
  createdAt: Date;
}

export interface InsertOrder {
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount?: number; // Optional, defaults to 0 for new orders
  paymentStatus: string;
  orderStatus: string;
  originalPaidAmount?: number; // Tracks partial payment before completion
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

// Hotel Debt Adjustment for manual debt tracking
export interface DebtAdjustment {
  id: string;
  customerId: string; // Hotel customer ID
  type: 'debit' | 'credit'; // debit increases debt, credit decreases debt
  amount: number;
  reason: string; // Description of the adjustment
  adjustedBy: string; // Who made the adjustment
  createdAt: Date;
}

export interface InsertDebtAdjustment {
  customerId: string;
  type: 'debit' | 'credit';
  amount: number;
  reason: string;
  adjustedBy?: string;
}

// Hotel Ledger Entry for comprehensive debt tracking
export interface HotelLedgerEntry {
  id: string;
  customerId: string;
  entryType: 'order' | 'adjustment' | 'payment';
  amount: number;
  description: string;
  relatedOrderId?: string; // If entry is related to an order
  relatedAdjustmentId?: string; // If entry is related to a debt adjustment
  runningBalance: number; // Running total after this entry
  createdAt: Date;
}

// Hotel debt summary for the main ledger view
export interface HotelDebtSummary {
  customer: Customer;
  totalOwed: number;
  totalOrders: number;
  recentActivity: HotelLedgerEntry[];
  lastOrderDate?: Date;
  lastPaymentDate?: Date;
}