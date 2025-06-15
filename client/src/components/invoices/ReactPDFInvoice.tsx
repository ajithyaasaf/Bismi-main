import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import { Customer, Order, Transaction } from '@shared/schema';
import { format, differenceInDays, parseISO } from 'date-fns';

interface InvoiceData {
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
    color: '#1e40af',
    marginBottom: 8,
  },
  businessDetails: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    textAlign: 'right',
  },
  invoiceTitleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666666',
  },
  detailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  billTo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  customerDetails: {
    fontSize: 9,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceMeta: {
    width: 200,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 9,
    color: '#666666',
    width: 80,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    fontSize: 8,
  },
  tableCellHeader: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  orderIdCell: {
    width: '15%',
  },
  dateCell: {
    width: '15%',
  },
  itemsCell: {
    width: '40%',
  },
  amountCell: {
    width: '15%',
    textAlign: 'right',
  },
  statusCell: {
    width: '15%',
    textAlign: 'center',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalsTable: {
    width: 200,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: '#f3f4f6',
  },
  totalsLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: 'Courier',
  },
  totalsValueFinal: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Courier',
  },
  paymentSection: {
    backgroundColor: '#f9fafb',
    padding: 15,
    marginBottom: 20,
    borderRadius: 5,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentColumn: {
    flex: 1,
    marginRight: 20,
  },
  paymentSubtitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentText: {
    fontSize: 8,
    marginBottom: 3,
  },
  termText: {
    fontSize: 7,
    color: '#666666',
    marginBottom: 2,
  },
  overdueNotice: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
  },
  overdueTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 3,
  },
  overdueText: {
    fontSize: 8,
    color: '#dc2626',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 7,
    color: '#9ca3af',
    marginBottom: 2,
  },
  statusPaid: {
    color: '#16a34a',
    fontWeight: 'bold',
  },
  statusOverdue: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#eab308',
    fontWeight: 'bold',
  },
});

// PDF Document Component
const InvoicePDFDocument = ({ data }: { data: InvoiceData }) => {
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
      gstin: "33AADCB1234F1Z5",
      email: "bismi.broilers@gmail.com"
    },
    paymentInfo = {
      upiId: "9514499968@ybl",
      phone: "+91 9514499968",
      accountName: "Bismi Broiler's",
      terms: [
        "Payment is due within 15 days of invoice date",
        "Late payments may be subject to 2% monthly interest charges",
        "For queries regarding this invoice, please contact our accounts department"
      ]
    }
  } = data;

  // Filter orders based on customer and payment status
  const filteredOrders = orders.filter(order => {
    if (order.customerId !== customer.id) return false;
    return showPaid ? true : order.status !== 'paid';
  });

  // Calculate totals
  const totalPending = typeof customer.pendingAmount === 'number' ? customer.pendingAmount : 
    filteredOrders.reduce((sum, order) => {
      if (order.status === 'paid') return sum;
      return sum + (typeof order.total === 'number' ? order.total : 0);
    }, 0);

  const totalPaid = filteredOrders.reduce((sum, order) => {
    if (order.status !== 'paid') return sum;
    return sum + (typeof order.total === 'number' ? order.total : 0);
  }, 0);

  const ordersGrandTotal = filteredOrders.reduce((sum, order) => {
    return sum + (typeof order.total === 'number' ? order.total : 0);
  }, 0);

  const paidThroughRecordedPayments = Math.max(0, ordersGrandTotal - totalPending - totalPaid);
  const adjustedTotalPaid = totalPaid + paidThroughRecordedPayments;
  const grandTotal = totalPending + adjustedTotalPaid;
  const taxAmount = grandTotal * 0.05;

  // Check for overdue orders
  const overdueOrders = filteredOrders.filter(order => {
    if (order.status === 'paid') return false;
    
    let orderDate: Date;
    if (typeof order.date === 'string') {
      orderDate = parseISO(order.date);
    } else if (order.date instanceof Date) {
      orderDate = order.date;
    } else {
      orderDate = new Date();
    }
    
    const currentDateObj = parseISO(currentDate);
    return differenceInDays(currentDateObj, orderDate) >= overdueThresholdDays;
  });

  // Format order items for display
  const formatOrderItems = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return "No items";
    
    try {
      return items.map(item => {
        const quantity = typeof item.quantity === 'number' ? 
          item.quantity.toFixed(2) : 
          (item.quantity || '0');
          
        const itemType = item.type || (typeof item.itemId === 'string' && item.itemId.length > 0 ? 'item' : 'product');
        
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
            <Text style={styles.businessDetails}>GSTIN: {businessInfo.gstin}</Text>
            <Text style={styles.businessDetails}>Email: {businessInfo.email}</Text>
          </View>
          <View style={styles.invoiceTitle}>
            <Text style={styles.invoiceTitleText}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{invoiceNumber}</Text>
          </View>
        </View>

        {/* Invoice Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.billTo}>
            <Text style={styles.sectionTitle}>BILL TO:</Text>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerDetails}>
              Type: {customer.type === 'hotel' ? 'Hotel/Restaurant' : 'Retail Customer'}
            </Text>
            {customer.contact && (
              <Text style={styles.customerDetails}>Contact: {customer.contact}</Text>
            )}
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.sectionTitle}>INVOICE DETAILS:</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Invoice Date:</Text>
              <Text style={styles.metaValue}>{format(parseISO(currentDate), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date:</Text>
              <Text style={styles.metaValue}>{format(parseISO(dueDate), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Customer ID:</Text>
              <Text style={styles.metaValue}>{customer.id.substring(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment Status:</Text>
              <Text style={[styles.metaValue, totalPending > 0 ? styles.statusOverdue : styles.statusPaid]}>
                {totalPending > 0 ? 'PENDING' : 'PAID'}
              </Text>
            </View>
          </View>
        </View>

        {/* Orders Table */}
        <View style={styles.table}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCellHeader, styles.orderIdCell]}>Order ID</Text>
            <Text style={[styles.tableCellHeader, styles.dateCell]}>Date</Text>
            <Text style={[styles.tableCellHeader, styles.itemsCell]}>Items</Text>
            <Text style={[styles.tableCellHeader, styles.amountCell]}>Amount</Text>
            <Text style={[styles.tableCellHeader, styles.statusCell]}>Status</Text>
          </View>

          {/* Table Rows */}
          {filteredOrders.length === 0 ? (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '100%', textAlign: 'center' }]}>
                No orders found for this customer
              </Text>
            </View>
          ) : (
            filteredOrders.map((order, index) => {
              const orderWithTimestamp = order as any;
              const timestamp = orderWithTimestamp.createdAt || order.date;
              const orderDate = typeof timestamp === 'string' ? parseISO(timestamp) : 
                               timestamp instanceof Date ? timestamp : new Date();
              
              return (
                <View key={order.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.orderIdCell]}>
                    {getOrderIdentifier(order, index)}
                  </Text>
                  <Text style={[styles.tableCell, styles.dateCell]}>
                    {format(orderDate, 'dd/MM/yyyy')}
                  </Text>
                  <Text style={[styles.tableCell, styles.itemsCell]}>
                    {formatOrderItems(Array.isArray(order.items) ? order.items : [])}
                  </Text>
                  <Text style={[styles.tableCell, styles.amountCell]}>
                    {formatCurrency(typeof order.total === 'number' ? order.total : 0)}
                  </Text>
                  <Text style={[styles.tableCell, styles.statusCell, getStatusStyle(order)]}>
                    {getStatusText(order)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal:</Text>
              <Text style={styles.totalsValue}>{formatCurrency(grandTotal - taxAmount)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax (5%):</Text>
              <Text style={styles.totalsValue}>{formatCurrency(taxAmount)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Paid Amount:</Text>
              <Text style={[styles.totalsValue, styles.statusPaid]}>
                -{formatCurrency(adjustedTotalPaid)}
              </Text>
            </View>
            <View style={styles.totalsRowFinal}>
              <Text style={styles.totalsLabel}>Total Due:</Text>
              <Text style={styles.totalsValueFinal}>{formatCurrency(totalPending)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <View style={styles.paymentGrid}>
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentSubtitle}>Payment Methods:</Text>
              <Text style={styles.paymentText}>UPI ID: {paymentInfo.upiId}</Text>
              <Text style={styles.paymentText}>Phone: {paymentInfo.phone}</Text>
              <Text style={styles.paymentText}>Account Name: {paymentInfo.accountName}</Text>
            </View>
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentSubtitle}>Terms & Conditions:</Text>
              {paymentInfo.terms.map((term, index) => (
                <Text key={index} style={styles.termText}>• {term}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Overdue Notice */}
        {overdueOrders.length > 0 && (
          <View style={styles.overdueNotice}>
            <Text style={styles.overdueTitle}>⚠️ Overdue Notice</Text>
            <Text style={styles.overdueText}>
              You have {overdueOrders.length} overdue order(s). Please settle your account immediately.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>This is a computer-generated invoice. No signature required.</Text>
          <Text style={styles.footerText}>
            Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} | Invoice #{invoiceNumber}
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
    const blob = await pdf(<InvoicePDFDocument data={data} />).toBlob();
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${data.customer.name.replace(/\s+/g, '-')}-${data.invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

export default InvoicePDFDocument;
export type { InvoiceData };