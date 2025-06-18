// Validation utilities following Google standards

/**
 * Validates phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Basic validation: must have at least 10 digits
  const digitCount = cleaned.replace(/\+/g, '').length;
  return digitCount >= 10 && digitCount <= 15;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates positive number
 */
export function isPositiveNumber(value: any): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validates non-negative number
 */
export function isNonNegativeNumber(value: any): boolean {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Validates required string field
 */
export function isValidString(value: any, minLength: number = 1): boolean {
  return typeof value === 'string' && value.trim().length >= minLength;
}

/**
 * Validates inventory quantity
 */
export function isValidQuantity(quantity: any): boolean {
  return isNonNegativeNumber(quantity) && parseFloat(quantity) !== 0;
}

/**
 * Validates order items array
 */
export function validateOrderItems(items: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('At least one item is required');
    return { isValid: false, errors };
  }
  
  items.forEach((item, index) => {
    if (!isValidString(item.type)) {
      errors.push(`Item ${index + 1}: Type is required`);
    }
    
    if (!isValidQuantity(item.quantity)) {
      errors.push(`Item ${index + 1}: Valid quantity is required`);
    }
    
    if (!isPositiveNumber(item.rate)) {
      errors.push(`Item ${index + 1}: Valid rate is required`);
    }
  });
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates customer data
 */
export function validateCustomer(customer: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isValidString(customer.name)) {
    errors.push('Customer name is required');
  }
  
  if (!isValidString(customer.type)) {
    errors.push('Customer type is required');
  }
  
  if (customer.contact && !isValidPhoneNumber(customer.contact)) {
    errors.push('Invalid phone number format');
  }
  
  return { isValid: errors.length === 0, errors };
}