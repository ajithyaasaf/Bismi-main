import { useState } from "react";
import { Order, Customer, OrderItem, DebtAdjustment } from "@shared/types";
import { getItemLabel } from "@shared/constants";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { safeDateTimeFormat } from "@/utils/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createOrderWhatsAppMessage } from "@/lib/whatsapp-service";
import OrderPaymentModal from "@/components/modals/OrderPaymentModal";
import OrderDateEditModal from "@/components/modals/OrderDateEditModal";
import { processCustomerPayment } from "@/lib/customer-service";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Eye, IndianRupee, MessageSquare, Trash2, Check, Clock, Hourglass, FileText } from 'lucide-react';
import { generateOrderInvoicePDF, OrderInvoiceData } from "@/components/invoices/ReactPDFInvoice";
import { apiRequest } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/config";

interface OrdersListProps {
  orders: Order[];
  customers: Customer[];
  onUpdateStatus?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
  onEditDate?: (orderId: string, newDate: string) => Promise<void>;
}

export default function OrdersList({ orders, customers, onUpdateStatus, onDeleteOrder, onEditDate }: OrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [dateEditOrder, setDateEditOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  // Sort orders by date (newest first) - Enterprise level timestamp handling
  const sortedOrders = [...orders].sort((a, b) => {
    // Use createdAt as primary timestamp, fallback to date field
    const aOrder = a as any;
    const bOrder = b as any;
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  // Get customer by ID
  const getCustomer = (customerId: string) => {
    return customers.find(c => c.id === customerId);
  };

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = getCustomer(customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  // Get payment status badge
  const getPaymentStatusBadge = (order: Order) => {
    const paidAmount = order.paidAmount || 0;
    const totalAmount = order.totalAmount || 0;
    const remainingBalance = totalAmount - paidAmount;

    if (order.paymentStatus === 'paid' || remainingBalance <= 0) {
      return <Badge variant="default" className="bg-green-500">Paid</Badge>;
    } else if (order.paymentStatus === 'partially_paid' && paidAmount > 0) {
      return <Badge variant="secondary">Partially Paid</Badge>;
    } else {
      return <Badge variant="destructive">Pending</Badge>;
    }
  };

  // Handle payment submission
  const handlePaymentSubmit = async (amount: number, orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        return;
      }

      const customer = getCustomer(order.customerId);
      if (!customer) {
        toast({
          title: "Error",
          description: "Customer not found",
          variant: "destructive",
        });
        return;
      }

      await processCustomerPayment(
        customer.id,
        amount,
        `Payment for order #${orderId}`,
        orderId // Target specific order
      );

      toast({
        title: "Payment processed",
        description: `Payment of ₹${amount.toFixed(2)} recorded successfully`,
        variant: "default",
      });

      setPaymentOrder(null);
    } catch (error) {
      console.error('Payment submission error:', error);
      toast({
        title: "Payment failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format items for display with proper property access
  const formatItems = (items: OrderItem[]) => {
    if (items.length === 0) return 'No items';

    // Take first 2 items and summarize
    const displayItems = items.slice(0, 2).map(item => {
      const details = item.details ? ` (${item.details})` : '';
      return `${item.quantity} kg ${getItemLabel(item.type)}${details}`;
    }).join(', ');

    return items.length > 2
      ? `${displayItems} and ${items.length - 2} more`
      : displayItems;
  };

  // View order details
  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
  };

  // Close order details dialog
  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  // Generate PDF for a specific order
  const handleGenerateOrderPDF = async (order: Order) => {
    try {
      const customer = getCustomer(order.customerId);
      if (!customer) {
        toast({
          title: "Error",
          description: "Customer not found",
          variant: "destructive",
        });
        return;
      }

      const currentDate = format(new Date(), 'yyyy-MM-dd');
      const dueDate = format(addDays(new Date(), 15), 'yyyy-MM-dd');
      const invoiceNumber = `ORD-${order.id.substring(0, 8).toUpperCase()}`;

      // Calculate total debt the same way as Hotel Debt Page:
      // 1. Get all unpaid orders for this customer
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const orderDebt = customerOrders.reduce((sum, o) =>
        sum + ((o.totalAmount || 0) - (o.paidAmount || 0)), 0
      );

      // 2. For hotel customers, also fetch debt adjustments
      let adjustmentBalance = 0;

      // FORCED LOG - THIS MUST APPEAR
      console.warn('🔴🔴🔴 PDF DEBUG START 🔴🔴🔴');
      console.warn('Customer:', customer.name, 'Type:', customer.type);

      if (customer.type?.toLowerCase() === 'hotel') {
        console.warn('✅ Is hotel, fetching adjustments...');
        try {
          const adjustmentsUrl = getApiUrl(`/api/hotels/${customer.id}/debt-adjustments`);
          console.warn('URL:', adjustmentsUrl);
          const response = await fetch(adjustmentsUrl);
          console.warn('Response status:', response.status);

          if (response.ok) {
            const responseData = await response.json();
            // API returns wrapped response: { success: true, data: [...] }
            // Extract the actual array from .data property
            const debtAdjustments: DebtAdjustment[] = responseData.data || responseData;
            console.warn('Adjustments received:', debtAdjustments.length, debtAdjustments);

            // Calculate adjustment balance: debits add, credits subtract
            adjustmentBalance = debtAdjustments.reduce((sum, adj) =>
              sum + (adj.type === 'debit' ? adj.amount : -adj.amount), 0
            );
            console.warn('Adjustment balance:', adjustmentBalance);
          } else {
            const errorText = await response.text();
            console.error('Fetch failed:', response.status, errorText);
          }
        } catch (error) {
          console.error('Error fetching adjustments:', error);
        }
      } else {
        console.warn('❌ Not a hotel:', customer.type);
      }

      // 3. Total owed = Order Debt + Adjustment Balance (same as Hotel Debt Page)
      const totalOwed = orderDebt + adjustmentBalance;
      console.warn('🔴🔴🔴 FINAL: orderDebt=', orderDebt, 'adjustmentBalance=', adjustmentBalance, 'totalOwed=', totalOwed);

      console.log('📊 Order PDF generation data:', {
        customerName: customer.name,
        customerType: customer.type,
        orderDebt,
        adjustmentBalance,
        totalOwed,
        orderId: order.id
      });

      const orderInvoiceData: OrderInvoiceData = {
        customer,
        order,
        customerPendingAmount: totalOwed, // Use the calculated total (same as Hotel Debt Page)
        currentDate,
        invoiceNumber,
        dueDate,
      };

      await generateOrderInvoicePDF(orderInvoiceData);

      toast({
        title: "PDF Generated",
        description: `Invoice generated for ${customer.name}. Total pending: ₹${totalOwed.toLocaleString('en-IN')}`,
      });
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Failed to generate order PDF. Please try again.",
        variant: "destructive",
      });
    }
  };



  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <i className="fas fa-shopping-cart text-gray-400 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-gray-900">No orders found</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first order to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount Details</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {(() => {
                      // Enterprise-level timestamp handling - use createdAt first, then date, with proper error handling
                      const orderWithTimestamp = order as any;
                      const orderTimestamp = order.createdAt;
                      if (!orderTimestamp) {
                        return <span className="text-red-500 text-xs">No timestamp</span>;
                      }
                      return safeDateTimeFormat(orderTimestamp);
                    })()}
                  </TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    {getCustomerName(order.customerId)}
                    {getCustomer(order.customerId)?.contact && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={async () => {
                                const { createOrderWhatsAppMessage } = await import("@/lib/whatsapp-service");
                                const whatsappLink = await createOrderWhatsAppMessage(order.customerId, order.id);
                                if (whatsappLink) {
                                  window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                                }
                              }}
                            >
                              <i className="fab fa-whatsapp text-lg"></i>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send order details via WhatsApp</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatItems(order.items as OrderItem[])}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="space-y-1">
                      <div className="font-medium">
                        Total: ₹{(order.totalAmount || 0).toFixed(2)}
                      </div>
                      {(order.paidAmount || 0) > 0 && (
                        <div className="text-sm text-green-600">
                          Paid: ₹{(order.paidAmount || 0).toFixed(2)}
                        </div>
                      )}
                      {((order.totalAmount || 0) - (order.paidAmount || 0)) > 0 && (
                        <div className="text-sm text-red-600">
                          Balance: ₹{((order.totalAmount || 0) - (order.paidAmount || 0)).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPaymentStatusBadge(order)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1 flex-wrap">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => viewOrderDetails(order)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View details</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              onClick={() => handleGenerateOrderPDF(order)}
                              data-testid={`button-pdf-order-${order.id}`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate PDF</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {onEditDate && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={() => setDateEditOrder(order)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Edit date</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      {order.paymentStatus !== 'paid' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setPaymentOrder(order)}
                              >
                                <IndianRupee className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Record payment</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={order.paymentStatus === 'paid' ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}
                              onClick={() => onUpdateStatus?.(order)}
                            >
                              {order.paymentStatus === 'paid' ?
                                <Clock className="h-4 w-4" /> :
                                <Check className="h-4 w-4" />
                              }
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{order.paymentStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => onDeleteOrder?.(order)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete order</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && closeOrderDetails()}>
          <DialogContent className="w-[95vw] max-w-[500px] max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="pb-4">
              <DialogTitle className="text-lg sm:text-xl">Order Details</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Customer and Basic Info - Mobile First Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Customer</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm sm:text-base">{getCustomerName(selectedOrder.customerId)}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              const whatsappLink = await createOrderWhatsAppMessage(selectedOrder.customerId, selectedOrder.id);
                              if (whatsappLink) {
                                window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                              }
                            }}
                          >
                            <i className="fab fa-whatsapp text-lg"></i>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Send order details via WhatsApp</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Date</p>
                  <p className="font-medium text-sm sm:text-base">
                    {(() => {
                      const orderWithTimestamp = selectedOrder as any;
                      const orderTimestamp = selectedOrder.createdAt;
                      if (!orderTimestamp) {
                        return <span className="text-red-500 text-xs">No timestamp</span>;
                      }
                      return safeDateTimeFormat(orderTimestamp);
                    })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Payment Status</p>
                  {getPaymentStatusBadge(selectedOrder)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">Type</p>
                  <p className="font-medium capitalize text-sm sm:text-base">{selectedOrder.orderStatus}</p>
                </div>
              </div>

              {/* Order Items - Mobile Responsive */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium mb-3 text-sm sm:text-base">Order Items</h4>

                {/* Mobile Card Layout */}
                <div className="block sm:hidden space-y-3">
                  {(selectedOrder.items as OrderItem[]).map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium capitalize text-sm">{getItemLabel(item.type)}</h5>
                        <span className="font-bold text-sm">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="block">Quantity:</span>
                          <span className="font-medium">{(item.quantity || 0).toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="block">Rate:</span>
                          <span className="font-medium">₹{(item.rate || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      {item.details && (
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="block">Details:</span>
                          <span className="font-medium">{item.details}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="border-t-2 border-gray-300 pt-2 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base">Total</span>
                      <span className="font-bold text-lg">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantity (kg)</TableHead>
                        <TableHead className="text-right">Rate (₹)</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedOrder.items as OrderItem[]).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="capitalize">{getItemLabel(item.type)}</TableCell>
                          <TableCell className="text-right">{(item.quantity || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{(item.rate || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{item.details || '-'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2">
                        <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                        <TableCell className="text-right font-bold text-lg">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Payment Summary - Mobile Optimized */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-medium mb-3 text-sm sm:text-base">Payment Summary</h4>
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 sm:p-4 rounded-lg border border-blue-200 space-y-2">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-700 font-medium">Order Total:</span>
                    <span className="font-bold">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-gray-700 font-medium">Paid Amount:</span>
                    <span className="font-bold text-green-600">₹{(selectedOrder.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base border-t border-blue-200 pt-2">
                    <span className="text-gray-900 font-bold">Remaining Balance:</span>
                    <span className="font-bold text-base sm:text-lg text-red-600">₹{((selectedOrder.totalAmount || 0) - (selectedOrder.paidAmount || 0)).toFixed(2)}</span>
                  </div>
                </div>
                {selectedOrder.paymentStatus !== 'paid' && (
                  <Button
                    className="mt-3 w-full h-12 text-base font-medium"
                    onClick={() => {
                      setPaymentOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                  >
                    <IndianRupee className="h-4 w-4 mr-2" />
                    Record Payment
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Payment Modal */}
      {paymentOrder && (
        <OrderPaymentModal
          isOpen={Boolean(paymentOrder)}
          onClose={() => setPaymentOrder(null)}
          onSubmit={handlePaymentSubmit}
          order={paymentOrder}
          customerName={getCustomerName(paymentOrder.customerId)}
        />
      )}

      {/* Order Date Edit Modal */}
      {dateEditOrder && onEditDate && (
        <OrderDateEditModal
          isOpen={Boolean(dateEditOrder)}
          onClose={() => setDateEditOrder(null)}
          order={dateEditOrder}
          onSave={onEditDate}
        />
      )}
    </>
  );
}
