// Standardized date utilities following Google standards

/**
 * Safely converts any date input to a Date object
 * Handles Firestore timestamps, ISO strings, and Date objects
 */
export function safeToDate(dateInput: any): Date {
  if (!dateInput) {
    return new Date();
  }

  // Already a Date object
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // Firestore timestamp with toDate method
  if (dateInput && typeof dateInput.toDate === 'function') {
    try {
      return dateInput.toDate();
    } catch (error) {
      console.warn('Failed to convert Firestore timestamp:', error);
      return new Date();
    }
  }

  // String or number
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    const parsed = new Date(dateInput);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  // Fallback
  return new Date();
}

/**
 * Safely formats a date for display with error handling
 */
export function safeDateFormat(dateInput: any, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = safeToDate(dateInput);
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.warn('Date formatting failed:', error);
    return 'Invalid date';
  }
}

/**
 * Safely formats a date and time for display
 */
export function safeDateTimeFormat(dateInput: any): string {
  try {
    const date = safeToDate(dateInput);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('DateTime formatting failed:', error);
    return 'Invalid date';
  }
}

/**
 * Safely converts to ISO string for API calls
 */
export function safeToISOString(dateInput: any): string {
  try {
    const date = safeToDate(dateInput);
    return date.toISOString();
  } catch (error) {
    console.warn('ISO string conversion failed:', error);
    return new Date().toISOString();
  }
}