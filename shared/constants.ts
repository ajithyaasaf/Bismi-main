// Centralized constants for the application

export const ITEM_TYPES = [
  { value: 'chicken', label: 'Chicken' },
  { value: 'eeral', label: 'Eeral' },
  { value: 'leg-piece', label: 'Leg Piece' },
  { value: 'goat', label: 'Goat' },
  { value: 'kadai', label: 'Kadai' },
  { value: 'beef', label: 'Beef' },
  { value: 'kodal', label: 'Kodal' },
  { value: 'chops', label: 'Chops' },
  { value: 'boneless', label: 'Boneless' },
  { value: 'order', label: 'Order' }
] as const;

// Helper function to get item label by value
export function getItemLabel(value: string): string {
  const item = ITEM_TYPES.find(type => type.value === value);
  return item ? item.label : value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ');
}

// Helper function to format item list for display
export function formatItemsList(items: Array<{ type: string; quantity: number }>): string {
  if (!items || items.length === 0) return 'No items';
  
  return items.map(item => 
    `${item.quantity}kg ${getItemLabel(item.type)}`
  ).join(', ');
}

export const CUSTOMER_TYPES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'random', label: 'Random Customer' }
] as const;

export const PAYMENT_STATUS = [
  { value: 'paid', label: 'Paid' },
  { value: 'partially_paid', label: 'Partially Paid' },
  { value: 'pending', label: 'Pending' }
] as const;

export const ORDER_STATUS = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
] as const;

export const TRANSACTION_TYPES = [
  { value: 'customer_payment', label: 'Customer Payment' },
  { value: 'supplier_payment', label: 'Supplier Payment' },
  { value: 'expense', label: 'Expense' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'initial_debt', label: 'Initial Debt' },
  { value: 'stock_adjustment', label: 'Stock Adjustment' }
] as const;

export const ENTITY_TYPES = [
  { value: 'supplier', label: 'Supplier' },
  { value: 'customer', label: 'Customer' }
] as const;