import { z } from "zod";

// Base validation schemas with comprehensive sanitization
export const sanitizeString = (str: string) => str.trim().replace(/[<>]/g, '');
export const sanitizeNumber = (num: number) => Math.abs(Number(num)) || 0;
export const sanitizeAmount = (amount: number) => Math.round(Math.abs(Number(amount)) * 100) / 100;

// Enhanced validation schemas with sanitization
export const supplierValidationSchema = z.object({
  name: z.string()
    .min(1, "Supplier name is required")
    .max(100, "Supplier name too long")
    .transform(sanitizeString),
  contact: z.string()
    .min(1, "Contact is required")
    .max(50, "Contact too long")
    .transform(sanitizeString),
  pendingAmount: z.number()
    .min(0, "Pending amount cannot be negative")
    .max(10000000, "Pending amount too large")
    .transform(sanitizeAmount)
    .optional()
    .default(0)
});

export const inventoryValidationSchema = z.object({
  name: z.string()
    .max(100, "Item name too long")
    .transform(sanitizeString)
    .optional(),
  type: z.string()
    .min(1, "Item type is required")
    .max(50, "Item type too long")
    .transform(sanitizeString),
  quantity: z.number()
    .min(0, "Quantity cannot be negative")
    .max(100000, "Quantity too large")
    .transform(sanitizeNumber),
  unit: z.string()
    .max(20, "Unit too long")
    .transform(sanitizeString)
    .optional()
    .default("kg"),
  price: z.number()
    .min(0, "Price cannot be negative")
    .max(100000, "Price too large")
    .transform(sanitizeAmount),
  supplierId: z.string()
    .max(100, "Supplier ID too long")
    .transform(sanitizeString)
    .optional()
    .default("")
});

export const customerValidationSchema = z.object({
  name: z.string()
    .min(1, "Customer name is required")
    .max(100, "Customer name too long")
    .transform(sanitizeString),
  contact: z.string()
    .min(1, "Contact is required")
    .max(50, "Contact too long")
    .transform(sanitizeString),
  type: z.enum(['hotel', 'random'], {
    errorMap: () => ({ message: "Customer type must be either 'hotel' or 'random'" })
  }),
  pendingAmount: z.number()
    .min(0, "Pending amount cannot be negative")
    .max(10000000, "Pending amount too large")
    .transform(sanitizeAmount)
    .optional()
    .default(0)
});

export const orderItemValidationSchema = z.object({
  type: z.string()
    .min(1, "Item type is required")
    .max(50, "Item type too long")
    .transform(sanitizeString),
  quantity: z.number()
    .min(0.001, "Quantity must be greater than 0")
    .max(10000, "Quantity too large")
    .transform(sanitizeNumber),
  rate: z.number()
    .min(0, "Rate cannot be negative")
    .max(100000, "Rate too large")
    .transform(sanitizeAmount),
  details: z.string()
    .max(200, "Details too long")
    .transform(sanitizeString)
    .optional()
});

const baseOrderSchema = z.object({
  customerId: z.string()
    .min(1, "Customer ID is required")
    .max(100, "Customer ID too long")
    .transform(sanitizeString),
  items: z.array(orderItemValidationSchema)
    .min(1, "At least one item is required")
    .max(50, "Too many items in order"),
  totalAmount: z.number()
    .min(0.01, "Total amount must be greater than 0")
    .max(10000000, "Total amount too large")
    .transform(sanitizeAmount),
  paidAmount: z.number()
    .min(0, "Paid amount cannot be negative")
    .max(10000000, "Paid amount too large")
    .transform(sanitizeAmount)
    .optional()
    .default(0),
  paymentStatus: z.enum(['paid', 'partially_paid', 'pending'], {
    errorMap: () => ({ message: "Invalid payment status" })
  }),
  orderStatus: z.enum(['confirmed', 'processing', 'completed', 'cancelled'], {
    errorMap: () => ({ message: "Invalid order status" })
  })
});

export const orderValidationSchema = baseOrderSchema.refine((data) => data.paidAmount <= data.totalAmount, {
  message: "Paid amount cannot exceed total amount",
  path: ["paidAmount"]
});

export const transactionValidationSchema = z.object({
  entityId: z.string()
    .min(1, "Entity ID is required")
    .max(100, "Entity ID too long")
    .transform(sanitizeString),
  entityType: z.enum(['supplier', 'customer'], {
    errorMap: () => ({ message: "Entity type must be either 'supplier' or 'customer'" })
  }),
  type: z.enum(['customer_payment', 'supplier_payment', 'expense', 'purchase', 'initial_debt', 'stock_adjustment'], {
    errorMap: () => ({ message: "Invalid transaction type" })
  }),
  amount: z.number()
    .min(0.01, "Amount must be greater than 0")
    .max(10000000, "Amount too large")
    .transform(sanitizeAmount),
  description: z.string()
    .min(1, "Description is required")
    .max(500, "Description too long")
    .transform(sanitizeString)
});

export const paymentValidationSchema = z.object({
  amount: z.number()
    .min(0.01, "Payment amount must be greater than ₹0.01")
    .max(1000000, "Payment amount cannot exceed ₹10,00,000")
    .transform(sanitizeAmount),
  description: z.string()
    .max(500, "Description too long")
    .transform(sanitizeString)
    .optional(),
  targetOrderId: z.string()
    .max(100, "Order ID too long")
    .transform(sanitizeString)
    .optional()
});

// Validation helper functions
export function validateAndSanitizeInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}

export function createValidationError(message: string, field?: string): Error {
  const error = new Error(message);
  error.name = 'ValidationError';
  if (field) {
    (error as any).field = field;
  }
  return error;
}

// Stock validation helpers
export function validateStockAvailability(requestedQuantity: number, availableQuantity: number, itemType: string): void {
  if (requestedQuantity > availableQuantity) {
    throw createValidationError(
      `Insufficient stock for ${itemType}. Requested: ${requestedQuantity}, Available: ${availableQuantity}`,
      'quantity'
    );
  }
}

export function validateBusinessRules(data: any, type: 'order' | 'payment' | 'stock'): void {
  switch (type) {
    case 'order':
      // Validate order business rules
      if (data.items && data.items.length === 0) {
        throw createValidationError('Order must contain at least one item', 'items');
      }
      break;
    case 'payment':
      // Validate payment business rules
      if (data.amount <= 0) {
        throw createValidationError('Payment amount must be greater than zero', 'amount');
      }
      break;
    case 'stock':
      // Validate stock business rules
      if (data.quantity < 0) {
        throw createValidationError('Stock quantity cannot be negative', 'quantity');
      }
      break;
  }
}