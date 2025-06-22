import { simplePDFService } from '@/services/SimplePDFService';
import type { InvoiceData } from '@/services/SimplePDFService';

// Re-export InvoiceData from SimplePDFService
export type { InvoiceData } from '@/services/SimplePDFService';

/**
 * Enterprise-level PDF generation for customer invoices
 * Uses browser's native print functionality for maximum reliability
 */
export const generateCustomerInvoicePDF = async (data: InvoiceData): Promise<void> => {
  console.log('Starting simplified PDF generation for:', data.customer.name);
  
  try {
    // Use simplified PDF service with browser print functionality
    await simplePDFService.generateInvoicePDF(data);
    console.log('PDF generation completed successfully');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

