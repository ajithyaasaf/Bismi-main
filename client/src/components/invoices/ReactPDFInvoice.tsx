import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Customer, Order, Transaction } from '@shared/schema';
import { format, differenceInDays, parseISO } from 'date-fns';

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
    gstin: string;
    email: string;
  };
  paymentInfo?: {
    upiId: string;
    phone: string;
    accountName: string;
    terms: string[];
  };
}

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 30,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  businessDetails: {
    fontSize: 10,
    color: '#555',
    marginBottom: 2,
  },
  invoiceInfo: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2c3e50',
  },
  customerInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 5,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  customerDetails: {
    fontSize: 10,
    marginBottom: 3,
    color: '#555',
  },
  dateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  dateSection: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  dateValue: {
    fontSize: 10,
  },
  balanceSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 5,
  },
  balanceTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  balanceLabel: {
    fontSize: 10,
  },
  balanceValue: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    color: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  tableRowPaid: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: '#d4edda',
  },
  tableRowOverdue: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingVertical: 8,
    paddingHorizontal: 5,
    backgroundColor: '#f8d7da',
  },
  tableCell: {
    fontSize: 9,
    paddingHorizontal: 3,
  },
  statusPaid: {
    color: '#155724',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#856404',
    fontWeight: 'bold',
  },
  statusOverdue: {
    color: '#721c24',
    fontWeight: 'bold',
  },
  summary: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    borderTopWidth: 2,
    borderTopColor: '#2c3e50',
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  paymentSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#e8f5e8',
    borderRadius: 5,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentDetail: {
    fontSize: 10,
    marginBottom: 3,
  },
  terms: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  termsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  termItem: {
    fontSize: 9,
    marginBottom: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 15,
  },
  footerText: {
    fontSize: 8,
    color: '#7f8c8d',
  },
});

// React PDF Component
export const InvoicePDF: React.FC<InvoiceData> = ({
  customer,
  orders,
  currentDate,
  invoiceNumber,
  dueDate,
  showPaid = false,
  overdueThresholdDays = 30,
  payments = [],
  businessInfo = {
    name: 'Bismi Chicken Shop',
    address: ['Al Qusais, Dubai', 'United Arab Emirates'],
    phone: '+971-50-123-4567',
    gstin: 'GST123456789',
    email: 'contact@bismichicken.com'
  },
  paymentInfo = {
    upiId: 'bismichicken@upi',
    phone: '+971-50-123-4567',
    accountName: 'Bismi Chicken Shop',
    terms: [
      'Payment is due within 30 days of invoice date',
      'Late payments may incur additional charges',
      'All prices are in AED unless otherwise specified'
    ]
  }
}) => {
  // Filter orders based on showPaid setting
  const filteredOrders = showPaid ? orders : orders.filter(order => order.status !== 'paid');
  
  // Calculate totals
  const totalAmount = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const taxAmount = totalAmount * 0.05; // 5% tax
  const grandTotal = totalAmount + taxAmount;
  
  // Calculate paid amount from payments
  const totalPaid = payments
    .filter(payment => payment.type === 'receipt' && payment.entityId === customer.id)
    .reduce((sum, payment) => sum + payment.amount, 0);
  
  const adjustedTotalPaid = Math.min(totalPaid, grandTotal);
  const totalPending = grandTotal - adjustedTotalPaid;
  
  // Identify overdue orders
  const currentDateObj = parseISO(currentDate);
  const overdueOrders = filteredOrders.filter(order => {
    if (order.status === 'paid') return false;
    if (!order.createdAt) return false;
    const orderDate = new Date(order.createdAt);
    const daysDiff = differenceInDays(currentDateObj, orderDate);
    return daysDiff > overdueThresholdDays;
  });

  const formatOrderItems = (order: Order) => {
    try {
      if (!order.items || !Array.isArray(order.items)) {
        return "Items information unavailable";
      }
      
      return order.items.map((item: any) => {
        const quantity = typeof item.quantity === 'number' ? 
          item.quantity.toFixed(1) : 
          (item.quantity || '0');
          
        const itemType = item.type || 'Unknown Item';
        const rate = typeof item.rate === 'number' ? 
          item.rate.toFixed(2) : 
          (item.rate || '0');
          
        const details = item.details ? ` (${item.details})` : '';
        
        return `${quantity} kg ${itemType}${details} - ₹${rate}/kg`;
      }).join(', ');
    } catch (error) {
      console.error("Error formatting order items:", error);
      return "Items information unavailable";
    }
  };

  const getOrderIdentifier = (order: Order, index: number) => {
    const id = typeof order.id === 'string' ? order.id.substring(0, 8) : `ORDER-${index + 1}`;
    return id.toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getStatusStyle = (order: Order) => {
    if (order.status === 'paid') return styles.statusPaid;
    const isOverdue = overdueOrders.some(o => o.id === order.id);
    return isOverdue ? styles.statusOverdue : styles.statusPending;
  };

  const getStatusText = (order: Order) => {
    if (order.status === 'paid') return 'PAID';
    const isOverdue = overdueOrders.some(o => o.id === order.id);
    return isOverdue ? 'OVERDUE' : 'PENDING';
  };

  const getRowStyle = (order: Order) => {
    if (order.status === 'paid') return styles.tableRowPaid;
    const isOverdue = overdueOrders.some(o => o.id === order.id);
    return isOverdue ? styles.tableRowOverdue : styles.tableRow;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.businessInfo}>
            <Text style={styles.businessName}>{businessInfo.name}</Text>
            {businessInfo.address.map((line, index) => (
              <Text key={index} style={styles.businessDetails}>{line}</Text>
            ))}
            <Text style={styles.businessDetails}>Phone: {businessInfo.phone}</Text>
            <Text style={styles.businessDetails}>Email: {businessInfo.email}</Text>
            <Text style={styles.businessDetails}>GSTIN: {businessInfo.gstin}</Text>
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
          </View>
        </View>

        {/* Date Information */}
        <View style={styles.dateInfo}>
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Invoice Date:</Text>
            <Text style={styles.dateValue}>{currentDate}</Text>
          </View>
          <View style={styles.dateSection}>
            <Text style={styles.dateLabel}>Due Date:</Text>
            <Text style={styles.dateValue}>{dueDate}</Text>
          </View>
        </View>

        {/* Customer Section */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To:</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerDetails}>Type: {customer.type}</Text>
            {customer.contact && (
              <Text style={styles.customerDetails}>Contact: {customer.contact}</Text>
            )}
          </View>
        </View>

        {/* Balance Summary */}
        <View style={styles.balanceSection}>
          <Text style={styles.balanceTitle}>Account Summary</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Current Pending Amount:</Text>
            <Text style={styles.balanceValue}>{formatCurrency(totalPending || 0)}</Text>
          </View>
        </View>

        {/* Orders Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>
            Order Details {!showPaid && '(Pending Orders Only)'}
          </Text>
          
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Order ID</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Date</Text>
            <Text style={[styles.tableHeaderCell, { width: '40%' }]}>Items</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Amount</Text>
            <Text style={[styles.tableHeaderCell, { width: '15%' }]}>Status</Text>
          </View>
          
          {filteredOrders.map((order, index) => (
            <View key={order.id} style={getRowStyle(order)}>
              <Text style={[styles.tableCell, { width: '15%' }]}>
                {getOrderIdentifier(order, index)}
              </Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>
                {order.createdAt ? format(order.createdAt, 'dd/MM/yyyy') : 'N/A'}
              </Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>
                {formatOrderItems(order)}
              </Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' }]}>
                {formatCurrency(order.total)}
              </Text>
              <Text style={[styles.tableCell, getStatusStyle(order), { width: '15%', textAlign: 'center' }]}>
                {getStatusText(order)}
              </Text>
            </View>
          ))}
        </View>

        {/* Summary Section */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (5%):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(adjustedTotalPaid)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Due:</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPending)}</Text>
          </View>
        </View>

        {/* Payment Information */}
        {paymentInfo && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <Text style={styles.paymentDetail}>UPI ID: {paymentInfo.upiId}</Text>
            <Text style={styles.paymentDetail}>Phone: {paymentInfo.phone}</Text>
            <Text style={styles.paymentDetail}>Account Name: {paymentInfo.accountName}</Text>
          </View>
        )}

        {/* Terms and Conditions */}
        {paymentInfo?.terms && (
          <View style={styles.terms}>
            <Text style={styles.termsTitle}>Terms & Conditions</Text>
            {paymentInfo.terms.map((term, index) => (
              <Text key={index} style={styles.termItem}>• {term}</Text>
            ))}
          </View>
        )}

        {/* Overdue Warning */}
        {overdueOrders.length > 0 && (
          <View style={[styles.terms, { backgroundColor: '#fff3cd' }]}>
            <Text style={styles.termsTitle}>⚠️ Overdue Notice</Text>
            <Text style={styles.termItem}>
              {overdueOrders.length} order(s) are overdue. Please settle these amounts immediately.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Invoice #{invoiceNumber} | Generated on {currentDate}
          </Text>
          <Text style={styles.footerText}>
            For any queries, please contact {businessInfo.email} or {businessInfo.phone}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

// Function to generate and download PDF
export const generatePDFInvoice = async (data: InvoiceData): Promise<void> => {
  try {
    const blob = await pdf(<InvoicePDF {...data} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${data.invoiceNumber}-${data.customer.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

export default InvoicePDF;