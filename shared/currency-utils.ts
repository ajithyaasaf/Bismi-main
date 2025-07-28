/**
 * Currency calculation utilities to ensure precision and consistency
 * Handles floating point precision issues in financial calculations
 */

/**
 * Round currency amount to 2 decimal places
 * Prevents floating point precision errors
 */
export function roundCurrency(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Add two currency amounts with proper rounding
 */
export function addCurrency(a: number, b: number): number {
  return roundCurrency(a + b);
}

/**
 * Subtract two currency amounts with proper rounding
 */
export function subtractCurrency(a: number, b: number): number {
  return roundCurrency(a - b);
}

/**
 * Multiply currency amount with proper rounding
 */
export function multiplyCurrency(amount: number, multiplier: number): number {
  return roundCurrency(amount * multiplier);
}

/**
 * Calculate order item total with proper rounding
 */
export function calculateItemTotal(quantity: number, rate: number): number {
  return multiplyCurrency(quantity, rate);
}

/**
 * Calculate order total from items array
 */
export function calculateOrderTotal(items: Array<{ quantity: number; rate: number }>): number {
  const total = items.reduce((sum, item) => {
    const itemTotal = calculateItemTotal(item.quantity || 0, item.rate || 0);
    return addCurrency(sum, itemTotal);
  }, 0);
  
  return roundCurrency(total);
}

/**
 * Calculate remaining balance for an order
 */
export function calculateOrderBalance(totalAmount: number, paidAmount: number): number {
  return subtractCurrency(totalAmount || 0, paidAmount || 0);
}

/**
 * Determine payment status based on amounts
 */
export function determinePaymentStatus(totalAmount: number, paidAmount: number): string {
  const total = roundCurrency(totalAmount || 0);
  const paid = roundCurrency(paidAmount || 0);
  
  if (total <= 0) return 'pending';
  if (paid <= 0) return 'pending';
  if (paid >= total) return 'paid';
  return 'partially_paid';
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${roundCurrency(amount).toFixed(2)}`;
}

/**
 * Parse currency input safely
 */
export function parseCurrency(input: string | number): number {
  if (typeof input === 'number') {
    return roundCurrency(input);
  }
  
  const parsed = parseFloat(input.toString());
  return isNaN(parsed) ? 0 : roundCurrency(parsed);
}