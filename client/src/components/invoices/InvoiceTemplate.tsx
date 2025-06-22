import { forwardRef } from 'react';
import { Customer, Order, Transaction } from '@shared/types';
import { format, differenceInDays, parseISO } from 'date-fns';

interface InvoiceTemplateProps {
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

const InvoiceTemplate = forwardRef<HTMLDivElement, InvoiceTemplateProps>(({
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
}, ref) => {
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
        
        const rate = typeof item.price === 'number' ? 
          item.price.toFixed(2) : 
          (item.price || '0');
          
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

  return (
    <div ref={ref} className="invoice-template bg-white p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto" style={{ 
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#333'
    }}>
      {/* Header Section */}
      <div className="header flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 sm:mb-8 pb-4 sm:pb-6 border-b-2 border-gray-200 gap-4">
        <div className="business-info flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">{businessInfo.name}</h1>
          {businessInfo.address.map((line, index) => (
            <p key={index} className="text-xs sm:text-sm text-gray-600 mb-1">{line}</p>
          ))}
          <p className="text-xs sm:text-sm text-gray-600">Phone: {businessInfo.phone}</p>
          <p className="text-xs sm:text-sm text-gray-600">Email: {businessInfo.email}</p>
        </div>
        <div className="invoice-info text-left sm:text-right">
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">INVOICE</h2>
          <p className="text-base sm:text-lg text-gray-600">#{invoiceNumber}</p>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div className="invoice-details flex flex-col lg:flex-row lg:justify-between mb-6 lg:mb-8 gap-6">
        <div className="bill-to flex-1">
          <h3 className="text-base lg:text-lg font-bold mb-3">BILL TO:</h3>
          <p className="font-semibold text-base lg:text-lg">{customer.name}</p>
          <p className="text-xs lg:text-sm text-gray-600">Type: {customer.type === 'hotel' ? 'Hotel/Restaurant' : 'Retail Customer'}</p>
          {customer.contact && <p className="text-xs lg:text-sm text-gray-600">Contact: {customer.contact}</p>}
        </div>
        <div className="invoice-meta flex-1 lg:max-w-xs">
          <h3 className="text-base lg:text-lg font-bold mb-3">INVOICE DETAILS:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs lg:text-sm">
            <span className="text-gray-600">Invoice Date:</span>
            <span>{format(parseISO(currentDate), 'dd/MM/yyyy')}</span>
            <span className="text-gray-600">Due Date:</span>
            <span>{format(parseISO(dueDate), 'dd/MM/yyyy')}</span>
            <span className="text-gray-600">Customer ID:</span>
            <span className="break-all">{customer.id.substring(0, 8).toUpperCase()}</span>
            <span className="text-gray-600">Payment Status:</span>
            <span className={totalPending > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
              {totalPending > 0 ? 'PENDING' : 'PAID'}
            </span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="orders-section mb-6 lg:mb-8">
        <h3 className="text-base lg:text-lg font-bold mb-4">Order Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 min-w-[500px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Order ID</th>
                <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Date</th>
                <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Items</th>
                <th className="border border-gray-300 p-2 lg:p-3 text-right text-xs lg:text-sm">Amount</th>
                <th className="border border-gray-300 p-2 lg:p-3 text-center text-xs lg:text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border border-gray-300 p-4 text-center text-gray-500">
                    No orders found for this customer
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const isOverdue = overdueOrders.some(o => o.id === order.id);
                  const orderWithTimestamp = order as any;
                  const timestamp = orderWithTimestamp.createdAt || order.date;
                  const orderDate = typeof timestamp === 'string' ? parseISO(timestamp) : 
                                   timestamp instanceof Date ? timestamp : new Date();
                  
                  return (
                    <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-2 lg:p-3">
                        <span className="text-xs text-gray-500">
                          {getOrderIdentifier(order, index)}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2 lg:p-3">
                        {format(orderDate, 'dd/MM/yyyy')}
                      </td>
                      <td className="border border-gray-300 p-2 lg:p-3">
                        {formatOrderItems(Array.isArray(order.items) ? order.items : [])}
                      </td>
                      <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono">
                        {formatCurrency(typeof order.total === 'number' ? order.total : 0)}
                      </td>
                      <td className="border border-gray-300 p-2 lg:p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          order.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : isOverdue 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.status === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="totals-section flex flex-col sm:flex-row sm:justify-end mb-6 lg:mb-8">
        <div className="totals-table w-full sm:w-1/2 lg:w-1/3">
          <table className="w-full border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-semibold text-xs lg:text-sm">Subtotal:</td>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono text-xs lg:text-sm">{formatCurrency(grandTotal - taxAmount)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-semibold text-xs lg:text-sm">Tax (5%):</td>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono text-xs lg:text-sm">{formatCurrency(taxAmount)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-semibold text-xs lg:text-sm">Paid Amount:</td>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono text-green-600 text-xs lg:text-sm">
                  -{formatCurrency(adjustedTotalPaid)}
                </td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-bold text-sm lg:text-lg">Total Due:</td>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono font-bold text-sm lg:text-lg">
                  {formatCurrency(totalPending)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Information */}
      <div className="payment-section bg-gray-50 p-4 lg:p-6 rounded-lg mb-6 lg:mb-8">
        <h3 className="text-base lg:text-lg font-bold mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2 text-sm lg:text-base">Payment Methods:</h4>
            <p className="text-xs lg:text-sm mb-2">UPI ID: <span className="font-mono">{paymentInfo.upiId}</span></p>
            <p className="text-xs lg:text-sm mb-2">Phone: <span className="font-mono">{paymentInfo.phone}</span></p>
            <p className="text-xs lg:text-sm">Account Name: {paymentInfo.accountName}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-sm lg:text-base">Terms & Conditions:</h4>
            {paymentInfo.terms.map((term, index) => (
              <p key={index} className="text-xs text-gray-600 mb-1">• {term}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Overdue Notice */}
      {overdueOrders.length > 0 && (
        <div className="notice bg-red-50 border border-red-200 p-4 rounded-lg mb-6 lg:mb-8">
          <div className="flex items-center">
            <div className="text-red-600 mr-2">⚠️</div>
            <div>
              <h4 className="font-semibold text-red-800 text-sm lg:text-base">Overdue Notice</h4>
              <p className="text-xs lg:text-sm text-red-700">
                You have {overdueOrders.length} overdue order(s). Please settle your account immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
        <p>This is a computer-generated invoice. No signature required.</p>
        <p>Generated on {format(new Date(), 'dd/MM/yyyy HH:mm')} | Invoice #{invoiceNumber}</p>
        <p>For any queries, please contact {businessInfo.email} or {businessInfo.phone}</p>
      </div>
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';

export default InvoiceTemplate;