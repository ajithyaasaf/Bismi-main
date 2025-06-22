/**
 * Simplified Enterprise PDF Generation Service
 * Uses browser's built-in print functionality with enhanced styling
 * Provides reliable cross-browser PDF generation without complex dependencies
 */

import { Customer, Order, Transaction } from '@shared/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import qrCodeImage from '../assets/qr-code-payment.png';

export interface InvoiceData {
  customer: Customer;
  orders: Order[];
  currentDate: string;
  invoiceNumber: string;
  dueDate: string;
  showPaid?: boolean;
  overdueThresholdDays?: number;
  payments?: Transaction[];
  businessInfo?: {
    name: string;
    address: string[];
    phone: string;
    email: string;
  };
  paymentInfo?: {
    upiId: string;
    phone: string;
    accountName: string;
    terms: string[];
  };
}

export class SimplePDFService {
  private static instance: SimplePDFService;

  private constructor() {}

  static getInstance(): SimplePDFService {
    if (!SimplePDFService.instance) {
      SimplePDFService.instance = new SimplePDFService();
    }
    return SimplePDFService.instance;
  }

  /**
   * Generate PDF using browser's native print functionality
   * Optimized for both desktop and mobile devices
   */
  async generateInvoicePDF(data: InvoiceData): Promise<void> {
    console.log('Starting simplified PDF generation for:', data.customer.name);
    
    try {
      // Detect if user is on mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Create the invoice HTML content
      const invoiceHTML = this.createInvoiceHTML(data, isMobile);
      
      if (isMobile) {
        // Mobile-optimized approach: new window with mobile settings
        this.handleMobilePrint(invoiceHTML);
      } else {
        // Desktop approach: open in new window
        this.handleDesktopPrint(invoiceHTML);
      }

      console.log('PDF generation initiated successfully');
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle PDF generation for mobile devices
   */
  private handleMobilePrint(invoiceHTML: string): void {
    // Create a new window for mobile as well, but with different settings
    const printWindow = window.open('', '_blank', 'width=device-width,initial-scale=1.0');
    
    if (!printWindow) {
      // Fallback: try in-page printing
      this.fallbackMobilePrint(invoiceHTML);
      return;
    }

    // Write the invoice content to the print window
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        
        // For mobile, keep window open longer so user can save
        printWindow.onafterprint = () => {
          setTimeout(() => {
            printWindow.close();
          }, 2000);
        };
      }, 1000);
    };
  }

  /**
   * Fallback method for mobile when popup is blocked
   */
  private fallbackMobilePrint(invoiceHTML: string): void {
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = invoiceHTML;
    tempDiv.style.cssText = `
      position: fixed;
      top: -10000px;
      left: -10000px;
      width: 100vw;
      height: 100vh;
      background: white;
      z-index: 9999;
    `;
    
    document.body.appendChild(tempDiv);

    // Add print styles
    const printStyles = document.createElement('style');
    printStyles.id = 'mobile-print-styles';
    printStyles.textContent = `
      @media print {
        body * { visibility: hidden; }
        #mobile-invoice-container, #mobile-invoice-container * { visibility: visible; }
        #mobile-invoice-container {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    tempDiv.id = 'mobile-invoice-container';
    tempDiv.style.position = 'static';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';

    // Trigger print
    setTimeout(() => {
      window.print();
      
      // Clean up after print
      setTimeout(() => {
        document.body.removeChild(tempDiv);
        const styleElement = document.getElementById('mobile-print-styles');
        if (styleElement) {
          document.head.removeChild(styleElement);
        }
      }, 1000);
    }, 500);
  }

  /**
   * Handle PDF generation for desktop devices
   */
  private handleDesktopPrint(invoiceHTML: string): void {
    // Open print window with the invoice
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Could not open print window. Please check browser popup settings.');
    }

    // Write the invoice content to the print window
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after printing (user can cancel)
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);
    };
  }

  /**
   * Generate complete HTML for the invoice with embedded CSS
   * Optimized for mobile and desktop viewing
   */
  private createInvoiceHTML(data: InvoiceData, isMobile: boolean = false): string {
    const {
      customer,
      orders,
      currentDate,
      invoiceNumber,
      dueDate,
      showPaid = false,
      overdueThresholdDays = 15,
      payments = [],
      businessInfo = {
        name: "Bismi Broiler's",
        address: ["Near Busstand, Hayarnisha Hospital", "Mudukulathur"],
        phone: "+91 8681087082",
        email: "bismi.broilers@gmail.com"
      },
      paymentInfo = {
        upiId: "barakathnisha004@okicici",
        phone: "+91 9514499968",
        accountName: "Barakath Nisha",
        terms: [
          "For queries regarding this invoice, please contact us"
        ]
      }
    } = data;

    // Debug logging for order filtering
    console.log('PDF Generation Debug:', {
      customerId: customer.id,
      totalOrders: orders.length,
      orders: orders.map(o => ({ id: o.id, customerId: o.customerId, totalAmount: o.totalAmount })),
      showPaid
    });

    // Filter orders based on customer and payment status
    const filteredOrders = orders.filter(order => {
      if (order.customerId !== customer.id) return false;
      return showPaid ? true : order.paymentStatus !== 'paid';
    });

    console.log('Filtered orders:', filteredOrders.length, filteredOrders);

    // Calculate totals
    const totalPending = customer.pendingAmount || 0;
    const ordersGrandTotal = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const paidAmount = Math.max(0, ordersGrandTotal - totalPending);
    const taxAmount = ordersGrandTotal * 0.05;

    // Check for overdue orders
    const overdueOrders = filteredOrders.filter(order => {
      if (order.paymentStatus === 'paid') return false;
      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const currentDateObj = parseISO(currentDate);
      return differenceInDays(currentDateObj, orderDate) >= overdueThresholdDays;
    });

    // Generate order rows
    const orderRows = filteredOrders.length === 0 ? `
      <tr>
        <td colspan="5" style="padding: 20px; text-align: center; color: #666;">
          No orders found for this customer
        </td>
      </tr>
    ` : filteredOrders.map((order, index) => {
      const isOverdue = overdueOrders.some(o => o.id === order.id);
      const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
      const orderItems = Array.isArray(order.items) ? order.items : [];
      
      const formattedItems = orderItems.map(item => {
        const quantity = typeof item.quantity === 'number' ? item.quantity.toFixed(2) : (item.quantity || '0');
        const itemType = item.type || 'item';
        const rate = typeof item.rate === 'number' ? item.rate.toFixed(2) : (item.rate || '0');
        const details = item.details ? ` (${item.details})` : '';
        return `${quantity} kg ${itemType}${details} - ₹${rate}/kg`;
      }).join(', ') || 'No items';
      
      const statusColor = order.paymentStatus === 'paid' ? '#16a34a' : isOverdue ? '#dc2626' : '#d97706';
      const statusBg = order.paymentStatus === 'paid' ? '#dcfce7' : isOverdue ? '#fecaca' : '#fef3c7';
      const statusText = order.paymentStatus === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING';
      
      return `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
          <td style="padding: 12px; font-size: 12px; color: #666; border: 1px solid #ddd;">
            ${order.id.substring(0, 8).toUpperCase()}
          </td>
          <td style="padding: 12px; border: 1px solid #ddd;">
            ${format(orderDate, 'dd/MM/yyyy')}
          </td>
          <td style="padding: 12px; border: 1px solid #ddd; max-width: 200px;">
            ${formattedItems}
          </td>
          <td style="padding: 12px; text-align: right; font-family: monospace; border: 1px solid #ddd;">
            ₹${(order.totalAmount || 0).toFixed(2)}
          </td>
          <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">
            <span style="
              padding: 4px 8px; 
              border-radius: 4px; 
              font-size: 11px; 
              font-weight: 600;
              background-color: ${statusBg};
              color: ${statusColor};
            ">
              ${statusText}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice - ${customer.name} - ${invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .container {
            max-width: ${isMobile ? '100%' : '800px'};
            margin: 0 auto;
            padding: ${isMobile ? '20px 15px' : '40px'};
            background: white;
        }
        
        .header {
            display: ${isMobile ? 'block' : 'flex'};
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: ${isMobile ? '30px' : '40px'};
            padding-bottom: ${isMobile ? '15px' : '20px'};
            border-bottom: 2px solid #e5e7eb;
        }
        
        ${isMobile ? `
        .invoice-info {
            margin-top: 20px;
            text-align: left !important;
        }
        .invoice-info h2 {
            font-size: 24px !important;
        }
        ` : ''}
        
        .business-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 16px;
        }
        
        .business-info p {
            margin: 4px 0;
            color: #6b7280;
            font-size: 13px;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .invoice-info h2 {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
        }
        
        .invoice-info p {
            font-size: 16px;
            color: #6b7280;
        }
        
        .details-section {
            display: ${isMobile ? 'block' : 'flex'};
            justify-content: space-between;
            margin-bottom: ${isMobile ? '30px' : '40px'};
            gap: ${isMobile ? '20px' : '40px'};
        }
        
        ${isMobile ? `
        .invoice-meta {
            margin-top: 20px;
            max-width: none !important;
        }
        ` : ''}
        
        .bill-to {
            flex: 1;
        }
        
        .invoice-meta {
            flex: 1;
            max-width: 300px;
        }
        
        .bill-to h3, .invoice-meta h3 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 12px;
        }
        
        .bill-to p {
            margin: 4px 0;
        }
        
        .meta-table {
            width: 100%;
            font-size: 13px;
        }
        
        .meta-table td {
            padding: 2px 0;
        }
        
        .meta-table .label {
            color: #6b7280;
        }
        
        .meta-table .value {
            text-align: right;
        }
        
        .orders-section {
            margin-bottom: 40px;
        }
        
        .orders-section h3 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 16px;
        }
        
        .orders-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #d1d5db;
            ${isMobile ? 'font-size: 12px;' : ''}
        }
        
        ${isMobile ? `
        .orders-table th,
        .orders-table td {
            padding: 8px 4px !important;
            font-size: 11px !important;
        }
        .orders-table th:nth-child(3),
        .orders-table td:nth-child(3) {
            max-width: 120px;
            word-wrap: break-word;
        }
        ` : ''}
        
        .orders-table th {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
            font-size: 13px;
            font-weight: 600;
            background-color: #f3f4f6;
        }
        
        .orders-table td {
            border: 1px solid #d1d5db;
            padding: 12px;
            font-size: 13px;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 40px;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
            border: 1px solid #d1d5db;
        }
        
        .totals-table td {
            border: 1px solid #d1d5db;
            padding: 12px;
            font-size: 13px;
        }
        
        .totals-table .label {
            text-align: right;
            font-weight: 600;
        }
        
        .totals-table .value {
            text-align: right;
            font-family: monospace;
        }
        
        .total-row {
            background-color: #f3f4f6;
            font-weight: bold;
            font-size: 16px;
        }
        
        .payment-section {
            background-color: #f9fafb;
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 40px;
        }
        
        .payment-section h3 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 16px;
        }
        
        .payment-grid {
            display: ${isMobile ? 'block' : 'flex'};
            gap: ${isMobile ? '20px' : '40px'};
        }
        
        ${isMobile ? `
        .payment-grid > div:first-child {
            margin-bottom: 20px;
        }
        ` : ''}
        
        .payment-grid > div {
            flex: 1;
        }
        
        .payment-grid h4 {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .payment-grid p {
            margin: 4px 0;
            font-size: 13px;
        }
        
        .overdue-notice {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .overdue-notice h4 {
            color: #dc2626;
            font-weight: bold;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .overdue-notice p {
            color: #dc2626;
            font-size: 13px;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer p {
            color: #6b7280;
            font-size: 12px;
            margin: 4px 0;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .container {
                padding: 20px;
                max-width: none;
            }
            .no-print {
                display: none !important;
            }
        }
        
        @page {
            size: A4;
            margin: ${isMobile ? '0.5cm' : '1cm'};
        }
        
        /* Mobile-specific print optimizations */
        @media screen and (max-width: 768px) {
            .container {
                padding: 15px !important;
            }
            .header h1 {
                font-size: 22px !important;
            }
            .invoice-info h2 {
                font-size: 22px !important;
            }
            .details-section h3 {
                font-size: 14px !important;
            }
        }
        
        /* Print-specific styles */
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            body {
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
            }
            .container {
                max-width: none !important;
                box-shadow: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header">
            <div class="business-info">
                <h1>${businessInfo.name}</h1>
                ${businessInfo.address.map(line => `<p>${line}</p>`).join('')}
                <p>Phone: ${businessInfo.phone}</p>
                <p>Email: ${businessInfo.email}</p>
            </div>
            <div class="invoice-info">
                <h2>INVOICE</h2>
                <p>#${invoiceNumber}</p>
            </div>
        </div>

        <!-- Invoice Details Section -->
        <div class="details-section">
            <div class="bill-to">
                <h3>BILL TO:</h3>
                <p style="font-weight: 600; font-size: 16px;">${customer.name}</p>
                <p style="color: #6b7280;">Type: ${customer.type === 'hotel' ? 'Hotel/Restaurant' : 'Retail Customer'}</p>
                ${customer.contact ? `<p style="color: #6b7280;">Contact: ${customer.contact}</p>` : ''}
            </div>
            <div class="invoice-meta">
                <h3>INVOICE DETAILS:</h3>
                <table class="meta-table">
                    <tr>
                        <td class="label">Invoice Date:</td>
                        <td class="value">${format(parseISO(currentDate), 'dd/MM/yyyy')}</td>
                    </tr>
                    <tr>
                        <td class="label">Due Date:</td>
                        <td class="value">${format(parseISO(dueDate), 'dd/MM/yyyy')}</td>
                    </tr>
                    <tr>
                        <td class="label">Customer ID:</td>
                        <td class="value">${customer.id.substring(0, 8).toUpperCase()}</td>
                    </tr>
                    <tr>
                        <td class="label">Payment Status:</td>
                        <td class="value" style="font-weight: 600; color: ${totalPending > 0 ? '#dc2626' : '#16a34a'};">
                            ${totalPending > 0 ? 'PENDING' : 'PAID'}
                        </td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Orders Table -->
        <div class="orders-section">
            <h3>Order Summary</h3>
            <table class="orders-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th style="text-align: right;">Amount</th>
                        <th style="text-align: center;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderRows}
                </tbody>
            </table>
        </div>

        <!-- Totals Section -->
        <div class="totals-section">
            <table class="totals-table">
                <tbody>
                    <tr>
                        <td class="label">Subtotal:</td>
                        <td class="value">₹${(ordersGrandTotal - taxAmount).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td class="label">Tax (5%):</td>
                        <td class="value">₹${taxAmount.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td class="label">Paid Amount:</td>
                        <td class="value" style="color: #16a34a;">-₹${paidAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="total-row">
                        <td class="label">Total Due:</td>
                        <td class="value">₹${totalPending.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Payment Information -->
        <div class="payment-section">
            <h3>Payment Information</h3>
            <div class="payment-grid">
                <div>
                    <h4>UPI Payment Details:</h4>
                    <div style="display: flex; align-items: center; gap: 20px; margin: 16px 0;">
                        <div style="flex: 1;">
                            <p style="margin: 4px 0; font-size: 14px;"><strong>UPI ID:</strong> <span style="font-family: monospace; color: #1e40af; font-weight: 600;">${paymentInfo.upiId}</span></p>
                            <p style="margin: 4px 0; font-size: 13px;"><strong>Account Name:</strong> ${paymentInfo.accountName}</p>
                            <p style="margin: 4px 0; font-size: 13px;"><strong>Phone:</strong> <span style="font-family: monospace;">${paymentInfo.phone}</span></p>
                        </div>
                        <div style="flex-shrink: 0;">
                            <div style="width: 140px; height: 180px; border: 2px solid #e5e7eb; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f9fafb; padding: 8px;">
                                <img src="${qrCodeImage}" style="width: 120px; height: 120px; border-radius: 8px; object-fit: contain;" alt="QR Code for UPI Payment - ${paymentInfo.upiId}"/>
                                <div style="text-align: center; color: #374151; font-size: 10px; line-height: 1.2; margin-top: 8px;">
                                    <div style="font-weight: 600; margin-bottom: 2px;">${paymentInfo.accountName}</div>
                                    <div style="color: #6b7280; font-size: 9px;">${paymentInfo.upiId}</div>
                                    <div style="color: #1e40af; font-weight: 600; margin-top: 2px; font-size: 9px;">Scan to Pay</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4>Terms & Conditions:</h4>
                    ${paymentInfo.terms.map(term => `<p style="font-size: 12px; color: #6b7280;">• ${term}</p>`).join('')}
                </div>
            </div>
        </div>

        ${overdueOrders.length > 0 ? `
            <!-- Overdue Notice -->
            <div class="overdue-notice">
                <h4>⚠ OVERDUE NOTICE</h4>
                <p>You have ${overdueOrders.length} overdue order(s). Please make payment immediately to avoid additional charges.</p>
            </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>Thank you for your business! For any queries, please contact us at ${businessInfo.phone}</p>
            <p>Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const simplePDFService = SimplePDFService.getInstance();