import { useState } from "react";
import { Order, Customer, OrderItem } from "@shared/types";
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
import { format } from "date-fns";
import { safeDateTimeFormat } from "@/utils/date-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createOrderWhatsAppMessage } from "@/lib/whatsapp-service";
import OrderPaymentModal from "@/components/modals/OrderPaymentModal";
import { processCustomerPayment } from "@/lib/customer-service";
import { useToast } from "@/hooks/use-toast";

interface OrdersListProps {
  orders: Order[];
  customers: Customer[];
  onUpdateStatus?: (order: Order) => void;
  onDeleteOrder?: (order: Order) => void;
}

export default function OrdersList({ orders, customers, onUpdateStatus, onDeleteOrder }: OrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
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
  
  // Format items for display
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
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => viewOrderDetails(order)}
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
                      {order.paymentStatus !== 'paid' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => setPaymentOrder(order)}
                        >
                          <i className="fas fa-rupee-sign"></i>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={order.paymentStatus === 'paid' ? 'text-yellow-600' : 'text-green-600'}
                        onClick={() => onUpdateStatus?.(order)}
                      >
                        <i className={`fas ${order.paymentStatus === 'paid' ? 'fa-hourglass' : 'fa-check'}`}></i>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600" 
                        onClick={() => onDeleteOrder?.(order)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{getCustomerName(selectedOrder.customerId)}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
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
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
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
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  {getPaymentStatusBadge(selectedOrder)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.orderStatus}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4 mt-2">
                <h4 className="font-medium mb-2">Order Items</h4>
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
                        <TableCell className="capitalize">{item.type}</TableCell>
                        <TableCell className="text-right">{(item.quantity || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(item.rate || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{((item.quantity || 0) * (item.rate || 0)).toFixed(2)}</TableCell>
                        <TableCell>{item.details || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Payment Summary for Selected Order */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="font-medium mb-2">Payment Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Order Total:</span>
                    <span className="font-medium">₹{(selectedOrder.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="font-medium text-green-600">₹{(selectedOrder.paidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-gray-900 font-medium">Remaining Balance:</span>
                    <span className="font-bold text-red-600">₹{((selectedOrder.totalAmount || 0) - (selectedOrder.paidAmount || 0)).toFixed(2)}</span>
                  </div>
                </div>
                {selectedOrder.paymentStatus !== 'paid' && (
                  <Button 
                    className="mt-3 w-full"
                    onClick={() => {
                      setPaymentOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                  >
                    <i className="fas fa-rupee-sign mr-2"></i>
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
    </>
  );
}
