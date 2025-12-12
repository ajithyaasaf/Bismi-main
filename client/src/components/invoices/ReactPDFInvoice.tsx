import { simplePDFService } from '@/services/SimplePDFService';
import type { InvoiceData, OrderInvoiceData } from '@/services/SimplePDFService';

// Re-export types from SimplePDFService
export type { InvoiceData, OrderInvoiceData } from '@/services/SimplePDFService';

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

/**
 * Generate PDF for a single order
 * Shows specific order details with customer's total pending balance
 */
export const generateOrderInvoicePDF = async (data: OrderInvoiceData): Promise<void> => {
  console.log('Starting order PDF generation for order:', data.order.id);
  
  try {
    await simplePDFService.generateOrderInvoicePDF(data);
    console.log('Order PDF generation completed successfully');
  } catch (error) {
    console.error('Order PDF generation failed:', error);
    throw new Error(`Failed to generate order PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

