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
  // Ensure orders is an array
  const ordersArray = Array.isArray(orders) ? orders : [];
  
  // Filter orders based on customer and payment status
  const filteredOrders = ordersArray
    .filter(order => {
      if (order.customerId !== customer.id) return false;
      return showPaid ? true : order.paymentStatus !== 'paid';
    })
    .sort((a, b) => {
      // Sort by date in ascending order (oldest first)
      const dateA = typeof a.createdAt === 'string' ? parseISO(a.createdAt) : 
                   a.createdAt instanceof Date ? a.createdAt : new Date(0);
      const dateB = typeof b.createdAt === 'string' ? parseISO(b.createdAt) : 
                   b.createdAt instanceof Date ? b.createdAt : new Date(0);
      return dateA.getTime() - dateB.getTime();
    });

  // Calculate totals
  const totalPending = typeof customer.pendingAmount === 'number' ? customer.pendingAmount : 
    filteredOrders.reduce((sum, order) => {
      if (order.paymentStatus === 'paid') return sum;
      return sum + (typeof order.totalAmount === 'number' ? order.totalAmount : 0);
    }, 0);

  const totalPaid = filteredOrders.reduce((sum, order) => {
    if (order.paymentStatus !== 'paid') return sum;
    return sum + (typeof order.totalAmount === 'number' ? order.totalAmount : 0);
  }, 0);

  const ordersGrandTotal = filteredOrders.reduce((sum, order) => {
    return sum + (typeof order.totalAmount === 'number' ? order.totalAmount : 0);
  }, 0);

  const paidThroughRecordedPayments = Math.max(0, ordersGrandTotal - totalPending - totalPaid);
  const adjustedTotalPaid = totalPaid + paidThroughRecordedPayments;
  const grandTotal = totalPending + adjustedTotalPaid;

  // Check for overdue orders
  const overdueOrders = filteredOrders.filter(order => {
    if (order.paymentStatus === 'paid') return false;
    
    let orderDate: Date;
    if (typeof order.createdAt === 'string') {
      orderDate = parseISO(order.createdAt);
    } else if (order.createdAt instanceof Date) {
      orderDate = order.createdAt;
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

  return (
    <div ref={ref} className="invoice-template bg-white p-3 sm:p-4 lg:p-6 xl:p-8 max-w-4xl mx-auto" style={{ 
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#333'
    }}>
      {/* Header Section - Mobile First */}
      <div className="header flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8 pb-3 sm:pb-4 lg:pb-6 border-b-2 border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
          <div className="business-info flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-800 mb-2">{businessInfo.name}</h1>
            <div className="space-y-1">
              {businessInfo.address.map((line, index) => (
                <p key={index} className="text-xs sm:text-sm text-gray-600">{line}</p>
              ))}
              <p className="text-xs sm:text-sm text-gray-600">Phone: {businessInfo.phone}</p>
              <p className="text-xs sm:text-sm text-gray-600">Email: {businessInfo.email}</p>
            </div>
          </div>
          <div className="invoice-info text-left sm:text-right">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-800 mb-2">INVOICE</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">#{invoiceNumber}</p>
          </div>
        </div>
      </div>

      {/* Invoice Details Section - Mobile Optimized */}
      <div className="invoice-details space-y-4 sm:space-y-6 mb-4 sm:mb-6 lg:mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bill-to">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-2 sm:mb-3 text-blue-800">BILL TO:</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <p className="font-semibold text-sm sm:text-base lg:text-lg">{customer.name}</p>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Type: {customer.type === 'hotel' ? 'Hotel/Restaurant' : 'Retail Customer'}</p>
              {customer.contact && <p className="text-xs sm:text-sm text-gray-600">Contact: {customer.contact}</p>}
            </div>
          </div>
          <div className="invoice-meta">
            <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-2 sm:mb-3 text-blue-800">INVOICE DETAILS:</h3>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
              <div className="grid grid-cols-1 gap-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Invoice Date:</span>
                  <span className="font-semibold">{format(parseISO(currentDate), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Due Date:</span>
                  <span className="font-semibold">{format(parseISO(dueDate), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-medium">Customer ID:</span>
                  <span className="font-semibold break-all">{customer.id.substring(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Payment Status:</span>
                  <span className={`font-bold ${totalPending > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {totalPending > 0 ? 'PENDING' : 'PAID'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section - Mobile First */}
      <div className="orders-section mb-4 sm:mb-6 lg:mb-8">
        <h3 className="text-sm sm:text-base lg:text-lg font-bold mb-3 sm:mb-4 text-blue-800">Order Summary</h3>
        
        {filteredOrders.length === 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-500 text-sm">No orders found for this customer</p>
          </div>
        ) : (
          <>
            {/* Mobile Card Layout */}
            <div className="block lg:hidden space-y-3">
              {filteredOrders.map((order, index) => {
                const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : 
                                 order.createdAt instanceof Date ? order.createdAt : new Date();
                return (
                  <div key={order.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-sm text-blue-800">
                          #{getOrderIdentifier(order, index)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(orderDate, 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">
                          {formatCurrency(typeof order.totalAmount === 'number' ? order.totalAmount : 0)}
                        </p>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 
                          order.paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {order.paymentStatus === 'paid' ? 'PAID' : 
                           order.paymentStatus === 'partially_paid' ? 'PARTIAL' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">Items:</span> {formatOrderItems(order.items)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout - Item-wise breakdown */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Order ID</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Date</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-left text-xs lg:text-sm">Item</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-center text-xs lg:text-sm">Quantity (kg)</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-right text-xs lg:text-sm">Rate (₹)</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-right text-xs lg:text-sm">Amount</th>
                    <th className="border border-gray-300 p-2 lg:p-3 text-center text-xs lg:text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.flatMap((order, orderIndex) => {
                    const isOverdue = overdueOrders.some(o => o.id === order.id);
                    const orderDate = typeof order.createdAt === 'string' ? parseISO(order.createdAt) : 
                                     order.createdAt instanceof Date ? order.createdAt : new Date();
                    const orderId = getOrderIdentifier(order, orderIndex);
                    const items = Array.isArray(order.items) ? order.items : [];
                    
                    if (items.length === 0) {
                      return (
                        <tr key={order.id} className={orderIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 lg:p-3">
                            <span className="text-xs text-gray-500">{orderId}</span>
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3">
                            {format(orderDate, 'dd/MM/yyyy')}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-gray-500">No items</td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-center">-</td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-right">-</td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono">
                            {formatCurrency(order.totalAmount || 0)}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              order.paymentStatus === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : isOverdue 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.paymentStatus === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    
                    return items.map((item: any, itemIndex: number) => {
                      const itemAmount = (item.quantity || 0) * (item.rate || 0);
                      const isFirstItem = itemIndex === 0;
                      
                      return (
                        <tr key={`${order.id}-${itemIndex}`} className={orderIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="border border-gray-300 p-2 lg:p-3">
                            {isFirstItem ? (
                              <span className="text-xs text-gray-500">{orderId}</span>
                            ) : (
                              <span className="text-xs text-gray-300">↳</span>
                            )}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3">
                            {isFirstItem ? format(orderDate, 'dd/MM/yyyy') : ''}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 font-medium">
                            {(item.type || '').charAt(0).toUpperCase() + (item.type || '').slice(1)}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-center font-mono">
                            {(item.quantity || 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono">
                            ₹{(item.rate || 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono font-semibold">
                            ₹{itemAmount.toFixed(1)}
                          </td>
                          <td className="border border-gray-300 p-2 lg:p-3 text-center">
                            {isFirstItem ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                order.paymentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : isOverdue 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {order.paymentStatus === 'paid' ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                              </span>
                            ) : ''}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>



      {/* Totals Section */}
      <div className="totals-section flex flex-col sm:flex-row sm:justify-end mb-6 lg:mb-8">
        <div className="totals-table w-full sm:w-1/2 lg:w-1/3">
          <table className="w-full border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-semibold text-xs lg:text-sm">Total Amount:</td>
                <td className="border border-gray-300 p-2 lg:p-3 text-right font-mono text-xs lg:text-sm">{formatCurrency(grandTotal)}</td>
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
            {Array.isArray(paymentInfo.terms) ? paymentInfo.terms.map((term, index) => (
              <p key={index} className="text-xs text-gray-600 mb-1">• {term}</p>
            )) : (
              <p className="text-xs text-gray-600 mb-1">• {paymentInfo.terms}</p>
            )}
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