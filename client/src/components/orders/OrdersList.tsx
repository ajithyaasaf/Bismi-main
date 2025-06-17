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
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OrdersListProps {
  orders: Order[];
  customers: Customer[];
  onUpdateStatus: (order: Order) => void;
  onDelete: (order: Order) => void;
}

export default function OrdersList({ orders, customers, onUpdateStatus, onDelete }: OrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Sort orders by date (newest first) - Enterprise level timestamp handling
  const sortedOrders = [...orders].sort((a, b) => {
    // Use createdAt as primary timestamp, fallback to date field
    const aOrder = a as any;
    const bOrder = b as any;
    const dateA = aOrder.createdAt ? new Date(aOrder.createdAt) : (a.date ? new Date(a.date) : new Date(0));
    const dateB = bOrder.createdAt ? new Date(bOrder.createdAt) : (b.date ? new Date(b.date) : new Date(0));
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
  
  // Create WhatsApp link for a customer
  const createWhatsAppLink = (customerId: string, specificOrder?: Order) => {
    const customer = getCustomer(customerId);
    if (!customer || !customer.contact) return null;
    
    // Clean the phone number (remove spaces, dashes, etc.)
    let phoneNumber = customer.contact.replace(/[\s-()]/g, '');
    
    // Ensure it has the country code (assuming India +91, but this should be adapted for other regions)
    if (!phoneNumber.startsWith('+')) {
      // If it starts with 0, replace it with +91
      if (phoneNumber.startsWith('0')) {
        phoneNumber = '+91' + phoneNumber.substring(1);
      } 
      // If it doesn't have a country code, add +91
      else if (!phoneNumber.startsWith('91')) {
        phoneNumber = '+91' + phoneNumber;
      }
      // If it starts with 91 but no +, add +
      else if (phoneNumber.startsWith('91')) {
        phoneNumber = '+' + phoneNumber;
      }
    }
    
    // Create a dynamic message with order details and pending amount
    let message = `*BISMI CHICKEN SHOP*\n\nHello ${customer.name},`;
    
    // Add pending amount info if applicable
    if (customer.pendingAmount && customer.pendingAmount > 0) {
      message += `\n\n*Current Pending Amount: ₹${customer.pendingAmount.toFixed(2)}*`;
    }
    
    // If a specific order is provided, include its details
    if (specificOrder) {
      message += `\n\n*Order Details:*`;
      // Use proper timestamp for WhatsApp message
      const orderWithTimestamp = specificOrder as any;
      const orderTimestamp = orderWithTimestamp.createdAt || specificOrder.date;
      message += `\n📅 Date: ${orderTimestamp ? format(new Date(orderTimestamp), 'MMM dd, yyyy') : 'Unknown date'}`;
      message += `\n💰 Amount: ₹${specificOrder.total.toFixed(2)}`;
      message += `\n📦 Status: ${specificOrder.status === 'paid' ? 'Paid' : 'Pending'}`;
      
      // Add item details
      message += `\n\n*Items Purchased:*`;
      (specificOrder.items as OrderItem[]).forEach(item => {
        message += `\n- ${item.quantity.toFixed(2)} kg ${getItemLabel(item.type)} (₹${item.rate.toFixed(2)}/kg)`;
      });
    } else {
      // No specific order, just a general message
      message += `\n\nThank you for your business with us.`;
    }
    
    // Add a closing message
    message += `\n\nFor any queries, please contact us.`;
    
    return `https://wa.me/${phoneNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
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
                      const orderTimestamp = orderWithTimestamp.createdAt || order.date;
                      if (!orderTimestamp) {
                        return <span className="text-red-500 text-xs">No timestamp</span>;
                      }
                      try {
                        return format(new Date(orderTimestamp), 'MMM dd, yyyy HH:mm');
                      } catch (error) {
                        return <span className="text-red-500 text-xs">Invalid date</span>;
                      }
                    })()}
                  </TableCell>
                  <TableCell className="font-medium flex items-center gap-2">
                    {getCustomerName(order.customerId)}
                    {createWhatsAppLink(order.customerId, order) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a 
                              href={createWhatsAppLink(order.customerId, order) || "#"} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <i className="fab fa-whatsapp text-lg"></i>
                              </Button>
                            </a>
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
                  <TableCell className="text-right font-medium">
                    ₹{order.total.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full font-medium 
                      ${order.status === 'paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'}`}>
                      {order.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={order.status === 'paid' ? 'text-yellow-600' : 'text-green-600'}
                        onClick={() => onUpdateStatus(order)}
                      >
                        <i className={`fas ${order.status === 'paid' ? 'fa-hourglass' : 'fa-check'}`}></i>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600" 
                        onClick={() => onDelete(order)}
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
                    {createWhatsAppLink(selectedOrder.customerId, selectedOrder) && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a 
                              href={createWhatsAppLink(selectedOrder.customerId, selectedOrder) || "#"} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <i className="fab fa-whatsapp text-lg"></i>
                              </Button>
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Send order details via WhatsApp</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {(() => {
                      const orderWithTimestamp = selectedOrder as any;
                      const orderTimestamp = orderWithTimestamp.createdAt || selectedOrder.date;
                      if (!orderTimestamp) {
                        return <span className="text-red-500 text-xs">No timestamp</span>;
                      }
                      try {
                        return format(new Date(orderTimestamp), 'PPpp');
                      } catch (error) {
                        return <span className="text-red-500 text-xs">Invalid date</span>;
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-medium ${selectedOrder.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {selectedOrder.status === 'paid' ? 'Paid' : 'Pending'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium capitalize">{selectedOrder.type}</p>
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
                        <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{item.rate.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{(item.quantity * item.rate).toFixed(2)}</TableCell>
                        <TableCell>{item.details || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                      <TableCell className="text-right font-bold">₹{selectedOrder.total.toFixed(2)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
