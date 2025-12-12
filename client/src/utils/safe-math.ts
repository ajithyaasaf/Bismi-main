// Safe mathematical operations with null checking - Google standards

/**
 * Safely converts to number with fallback
 */
export function safeToNumber(value: any, fallback: number = 0): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
  }
  
  return fallback;
}

/**
 * Safely formats number with specified decimal places
 */
export function safeToFixed(value: any, decimals: number = 2): string {
  const num = safeToNumber(value, 0);
  return num.toFixed(decimals);
}

/**
 * Safely calculates total with null safety
 */
export function safeCalculateTotal(items: Array<{quantity?: number; rate?: number}>): number {
  if (!Array.isArray(items)) {
    return 0;
  }
  
  return items.reduce((total, item) => {
    const quantity = safeToNumber(item?.quantity);
    const rate = safeToNumber(item?.rate);
    return total + (quantity * rate);
  }, 0);
}

/**
 * Safely adds two numbers with null checking
 */
export function safeAdd(a: any, b: any): number {
  return safeToNumber(a) + safeToNumber(b);
}

/**
 * Safely subtracts with null checking
 */
export function safeSubtract(a: any, b: any): number {
  return safeToNumber(a) - safeToNumber(b);
}