import { useState } from "react";
import * as React from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { Customer, Inventory } from "@shared/types";
import { ITEM_TYPES, CUSTOMER_TYPES, PAYMENT_STATUS } from "@shared/constants";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

// Helper type for API responses
interface ApiResponse<T> {
  id: string;
  [key: string]: any;
}

interface OrderFormProps {
  customers: Customer[];
  inventory: Inventory[];
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderForm({ customers, inventory, isOpen, onClose }: OrderFormProps) {
  const [customerType, setCustomerType] = useState('hotel');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderDate, setOrderDate] = useState<Date>(new Date()); // Default to today
  const [items, setItems] = useState<{
    id: string;
    type: string;
    quantity: string;
    rate: string;
    details?: string;
  }[]>([{ id: '1', type: 'chicken', quantity: '', rate: '', details: '' }]);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Item types from centralized constants
  const itemTypes = ITEM_TYPES;
  
  // Hotels (filtered customers) - using the correct field name 'type'
  const hotels = customers.filter(c => c.type === 'hotel');
  
  // Calculate total order amount with precise currency calculations
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      const itemTotal = Math.round((quantity * rate + Number.EPSILON) * 100) / 100;
      return Math.round((total + itemTotal + Number.EPSILON) * 100) / 100;
    }, 0);
  };

  // Calculate payment status based on paid amount
  const totalAmount = calculateTotal();
  React.useEffect(() => {
    if (paidAmount >= totalAmount && totalAmount > 0) {
      setPaymentStatus('paid');
    } else if (paidAmount > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  }, [paidAmount, totalAmount]);
  
  // Add item to order
  const addItem = () => {
    const newItemId = String(items.length + 1);
    setItems([
      ...items,
      { 
        id: newItemId, 
        type: 'chicken', 
        quantity: '', 
        rate: '',
        details: ''
      }
    ]);
    
    // Smooth auto-focus on the new item's quantity field
    setTimeout(() => {
      const newItemQuantityInput = document.querySelector(`#item-qty-${newItemId}`) as HTMLInputElement;
      if (newItemQuantityInput) {
        // Smooth scroll to the new item first
        newItemQuantityInput.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // Then focus after scroll animation
        setTimeout(() => {
          newItemQuantityInput.focus();
        }, 300);
      }
    }, 150);
  };
  
  // Remove item from order
  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };
  
  // Update item field
  const updateItem = (id: string, field: string, value: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Set default rate based on inventory when item type changes
  const updateItemType = (id: string, type: string) => {
    const inventoryItem = inventory.find(item => item.type === type);
    const rate = inventoryItem ? String(inventoryItem.price) : '';
    
    setItems(items.map(item => 
      item.id === id ? { ...item, type, rate } : item
    ));
  };
  
  // Reset form
  const resetForm = () => {
    setCustomerType('hotel');
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setOrderDate(new Date()); // Reset to current date
    setItems([{ id: '1', type: itemTypes.length > 0 ? itemTypes[0].value : 'chicken', quantity: '', rate: '', details: '' }]);
    setPaymentStatus('pending');
    setPaidAmount(0);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate customer
      let orderCustomerId = customerId;
      
      if (customerType === 'hotel') {
        if (!customerId) {
          toast({
            title: "Customer required",
            description: "Please select a hotel",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Random customer - create if not exists
        if (!customerName) {
          toast({
            title: "Customer name required",
            description: "Please enter customer name",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        // Create new customer
        const response = await apiRequest('POST', '/api/customers', {
          name: customerName,
          type: 'random',
          contact: customerPhone,
          pendingAmount: 0
        });
        
        // Parse response to get the customer object
        const newCustomer = await response.json();
        orderCustomerId = newCustomer.id;
      }
      
      // Validate items
      const validItems = [];
      let hasError = false;
      
      for (const item of items) {
        const quantity = parseFloat(item.quantity);
        const rate = parseFloat(item.rate);
        
        if (isNaN(quantity) || quantity === 0) {
          toast({
            title: "Invalid quantity",
            description: `Please enter a non-zero quantity for ${item.type}`,
            variant: "destructive"
          });
          hasError = true;
          break;
        }
        
        if (isNaN(rate) || rate <= 0) {
          toast({
            title: "Invalid rate",
            description: `Please enter a valid rate for ${item.type}`,
            variant: "destructive"
          });
          hasError = true;
          break;
        }
        
        // Find inventory item for this type
        const inventoryItem = inventory.find(i => i.type === item.type);
        
        // Enterprise inventory management: Warn about low stock but allow negative inventory
        if (inventoryItem) {
          const remainingStock = inventoryItem.quantity - quantity;
          if (remainingStock < 0) {
            toast({
              title: "Negative inventory warning",
              description: `Stock will be negative after this order. Available: ${inventoryItem.quantity}kg, Ordered: ${quantity}kg, Remaining: ${remainingStock}kg`,
              variant: "default"
            });
          } else if (remainingStock < 5) {
            toast({
              title: "Low stock warning",
              description: `Low stock after order. Remaining: ${remainingStock}kg`,
              variant: "default"
            });
          }
        } else {
          // Create inventory placeholder for tracking
          console.warn(`No inventory record for ${item.type}. Order will proceed with manual tracking required.`);
        }
        
        validItems.push({
          type: item.type,
          quantity,
          rate,
          details: item.details || ''
        });
      }
      
      if (hasError) {
        setIsSubmitting(false);
        return;
      }
      
      // Calculate total
      const total = calculateTotal();
      
      // Smart date handling: If selected date is today, use current time; otherwise use selected date at midnight
      const now = new Date();
      const isToday = orderDate.toDateString() === now.toDateString();
      
      let finalOrderDate: Date;
      if (isToday) {
        // Use current time for today's orders
        finalOrderDate = now;
      } else {
        // Use selected date at midnight for past/future dates
        finalOrderDate = orderDate;
      }
      
      console.log('=== OrderForm DATE DEBUG ===');
      console.log('orderDate selected:', orderDate);
      console.log('isToday:', isToday);
      console.log('finalOrderDate:', finalOrderDate);
      console.log('finalOrderDate ISO:', finalOrderDate.toISOString());
      
      // Create order
      await apiRequest('POST', '/api/orders', {
        customerId: orderCustomerId,
        items: validItems,
        totalAmount: total,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
        orderStatus: 'pending',
        createdAt: finalOrderDate.toISOString() // Send as ISO string for consistent parsing
      });
      
      console.log('Order created successfully');
      
      // Show success message
      toast({
        title: "Order created",
        description: `Order for ${customerType === 'hotel' ? 
          customers.find(c => c.id === customerId)?.name || 'customer' : 
          customerName} has been created`
      });
      
      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Close modal and reset form
      resetForm();
      onClose();
      
    } catch (error) {
      console.error('Order creation error:', error);
      
      // Check if it's a timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          title: "Order creation timeout",
          description: "The order is taking longer than expected. Please check if it was created successfully.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error creating order",
          description: "There was an error creating the order",
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customer-type" className="text-right">
              Customer Type
            </Label>
            <div className="col-span-3">
              <Select 
                value={customerType} 
                onValueChange={setCustomerType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="random">Random Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {customerType === 'hotel' ? (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hotel-select" className="text-right">
                Select Hotel
              </Label>
              <div className="col-span-3">
                <Select 
                  value={customerId} 
                  onValueChange={setCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hotel" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotels.map(hotel => (
                      <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer-name" className="text-right">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customer-phone" className="text-right">
                  Phone Number
                </Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="col-span-3"
                  placeholder="Enter phone number"
                />
              </div>
            </>
          )}
          
          <Separator className="my-2" />
          
          {/* Order Date Selection */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="order-date" className="text-right">
              Order Date
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    id="order-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDate ? format(orderDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={orderDate}
                    onSelect={(date) => date && setOrderDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Separator className="my-2" />
          
          <div>
            <h4 className="text-sm font-medium mb-2">Order Items</h4>
            
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-5">
                  <Label htmlFor={`item-type-${item.id}`} className="text-xs">Item</Label>
                  <Select 
                    value={item.type} 
                    onValueChange={(value) => updateItemType(item.id, value)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-qty-${item.id}`} className="text-xs">Qty (kg)</Label>
                  <Input
                    id={`item-qty-${item.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-3">
                  <Label htmlFor={`item-rate-${item.id}`} className="text-xs">Rate (₹)</Label>
                  <Input
                    id={`item-rate-${item.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-12 mt-1">
                  <Label htmlFor={`item-details-${item.id}`} className="text-xs">Details</Label>
                  <Input
                    id={`item-details-${item.id}`}
                    type="text"
                    value={item.details || ''}
                    onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Additional details about the meat"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => removeItem(item.id)}
                    >
                      <i className="fas fa-minus text-xs"></i>
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Add Item Button - Always visible at the bottom */}
            <div className="flex justify-center mb-4">
              <Button
                type="button"
                variant="outline"
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                onClick={addItem}
              >
                <i className="fas fa-plus mr-2"></i>
                Add Item
              </Button>
            </div>
            
            <div className="mt-4 bg-slate-50 p-3 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            {/* Payment Section - Enhanced with Partial Payment */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-3">Payment Information</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Payment Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="h-9"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-gray-600 mb-1 block">Payment Status</Label>
                  <div className="h-9 px-3 py-2 border rounded-md bg-white flex items-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      paymentStatus === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {paymentStatus === 'paid' && 'Fully Paid'}
                      {paymentStatus === 'partially_paid' && 'Partially Paid'}
                      {paymentStatus === 'pending' && 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              {totalAmount > 0 && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Total:</span>
                    <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium text-green-600">₹{paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Remaining Balance:</span>
                    <span className={`${(totalAmount - paidAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(totalAmount - paidAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
