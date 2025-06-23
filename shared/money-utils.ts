/**
 * Monetary calculation utilities for precision handling
 * Ensures consistent financial calculations across the application
 */

export class MoneyUtils {
  /**
   * Round amount to 2 decimal places for currency precision
   */
  static round(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Validate monetary amount
   */
  static validate(amount: number): { isValid: boolean; error?: string } {
    if (isNaN(amount)) {
      return { isValid: false, error: 'Amount must be a valid number' };
    }
    
    if (amount < 0) {
      return { isValid: false, error: 'Amount cannot be negative' };
    }
    
    if (amount > 1000000) {
      return { isValid: false, error: 'Amount cannot exceed ₹10,00,000' };
    }
    
    // Check decimal places
    const rounded = MoneyUtils.round(amount);
    if (rounded !== amount) {
      return { isValid: false, error: 'Amount can only have up to 2 decimal places' };
    }
    
    return { isValid: true };
  }

  /**
   * Add two monetary amounts with precision handling
   */
  static add(a: number, b: number): number {
    return MoneyUtils.round(a + b);
  }

  /**
   * Subtract two monetary amounts with precision handling
   */
  static subtract(a: number, b: number): number {
    return MoneyUtils.round(a - b);
  }

  /**
   * Format amount for display
   */
  static format(amount: number): string {
    return `₹${MoneyUtils.round(amount).toFixed(2)}`;
  }

  /**
   * Validate payment amount specifically
   */
  static validatePayment(amount: number): { isValid: boolean; error?: string } {
    const baseValidation = MoneyUtils.validate(amount);
    if (!baseValidation.isValid) {
      return baseValidation;
    }
    
    if (amount <= 0) {
      return { isValid: false, error: 'Payment amount must be greater than ₹0' };
    }
    
    return { isValid: true };
  }
}