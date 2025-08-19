import { useState } from 'react';
import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { Customer, Inventory, OrderItem } from '@shared/types';
import { ITEM_TYPES, CUSTOMER_TYPES, PAYMENT_STATUS } from '@shared/constants';
import { format, parseISO } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { Separator } from "@/components/ui/separator";
import * as OrderService from '@/lib/order-service';
import * as CustomerService from '@/lib/customer-service';
import * as InventoryService from '@/lib/inventory-service';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  inventory: Inventory[];
}

export default function NewOrderModal({ isOpen, onClose, customers, inventory }: NewOrderModalProps) {
  const [customerType, setCustomerType] = useState('hotel');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'));
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
        details: '' // New field for additional item details
      }
    ]);
    
    // Smooth auto-focus on the new item's quantity input
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
    console.log('UpdateItem called:', { id, field, value });
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
    setOrderDate(format(new Date(), 'yyyy-MM-dd'));
    setItems([{ id: '1', type: 'chicken', quantity: '', rate: '', details: '' }]);
    setPaymentStatus('pending');
    setPaidAmount(0);
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      console.log('=== ORDER CREATION STARTED ===');
      console.log('Items count:', items.length);
      console.log('All items:', items);
      
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
        
        // Update hotel's phone number if provided and different from current
        if (customerPhone) {
          const selectedHotel = hotels.find(h => h.id === customerId);
          if (selectedHotel && selectedHotel.contact !== customerPhone) {
            console.log(`Updating hotel ${selectedHotel.name} contact to ${customerPhone}`);
            try {
              // Update the customer contact info
              await CustomerService.updateCustomer(customerId, {
                contact: customerPhone
              });
            } catch (error) {
              console.error('Failed to update hotel contact:', error);
              // Continue with order creation even if contact update fails
            }
          }
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
        
        // Create new customer using API
        console.log('Creating new random customer via API');
        const newCustomer = await CustomerService.addCustomer({
          name: customerName,
          type: 'random',
          contact: customerPhone,
          pendingAmount: 0
        });
        
        console.log('New customer created:', newCustomer);
        orderCustomerId = newCustomer.id;
      }
      
      // Validate items
      const validItems: OrderItem[] = [];
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
      const selectedOrderDate = new Date(orderDate + 'T00:00:00'); // Parse selected date at midnight
      const now = new Date();
      const isToday = selectedOrderDate.toDateString() === now.toDateString();
      
      let finalOrderDate: Date;
      if (isToday) {
        // Use current time for today's orders
        finalOrderDate = now;
      } else {
        // Use selected date at midnight for past/future dates
        finalOrderDate = selectedOrderDate;
      }
      
      console.log('=== NewOrderModal DATE DEBUG ===');
      console.log('Raw orderDate from form:', orderDate);
      console.log('selectedOrderDate (midnight):', selectedOrderDate);
      console.log('isToday:', isToday);
      console.log('finalOrderDate:', finalOrderDate);
      console.log('finalOrderDate ISO:', finalOrderDate.toISOString());
      
      console.log('About to make API request...');
      const startTime = Date.now();
      
      const response = await apiRequest('POST', '/api/orders', {
        customerId: orderCustomerId,
        items: validItems,
        totalAmount: total,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
        orderStatus: 'pending',
        createdAt: finalOrderDate.toISOString() // Send as ISO string for consistent parsing
      });
      
      const endTime = Date.now();
      console.log(`API request completed in ${endTime - startTime}ms`);
      console.log('Response:', response.status, response.statusText);
      
      // Parse response if needed
      if (response.ok) {
        const responseData = await response.json();
        console.log('Order created successfully:', responseData);
      } else {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      

      
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
      console.error('=== ORDER CREATION ERROR ===');
      console.error('Error details:', error);
      console.error('Error type:', typeof error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      let errorTitle = "Error creating order";
      let errorDescription = "There was an error creating the order";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorTitle = "Order creation timeout";
          errorDescription = "The order is taking longer than expected. Please check if it was created successfully.";
        } else if (error.message.includes('timeout')) {
          errorTitle = "Request timeout";
          errorDescription = "The request timed out. Please try again or check if the order was created.";
        } else if (error.message.includes('network')) {
          errorTitle = "Network error";
          errorDescription = "Network connection issue. Please check your connection and try again.";
        } else if (error.message.includes('400')) {
          errorTitle = "Validation error";
          errorDescription = "Invalid order data. Please check all fields and try again.";
        } else {
          errorDescription = `Error: ${error.message}`;
        }
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      console.log('=== ORDER CREATION FINISHED ===');
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Create a new order for a customer
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 sm:space-y-5 py-2">
          {/* Customer Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="customer-type" className="text-sm font-medium text-foreground">
              Customer Type
            </Label>
            <Select 
              value={customerType} 
              onValueChange={setCustomerType}
            >
              <SelectTrigger className="w-full h-11 text-base sm:text-sm">
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="random">Random Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Conditional Customer Fields */}
          {customerType === 'hotel' ? (
            <div className="space-y-2">
              <Label htmlFor="hotel-select" className="text-sm font-medium text-foreground">
                Select Hotel
              </Label>
              <Select 
                value={customerId} 
                onValueChange={(value) => {
                  setCustomerId(value);
                  // Get the contact data in the background for use during order creation
                  const selectedHotel = hotels.find(h => h.id === value);
                  if (selectedHotel && selectedHotel.contact) {
                    setCustomerPhone(selectedHotel.contact);
                  } else {
                    setCustomerPhone('');
                  }
                }}
              >
                <SelectTrigger className="w-full h-11 text-base sm:text-sm">
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map(hotel => (
                    <SelectItem key={hotel.id} value={hotel.id}>{hotel.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="text-sm font-medium text-foreground">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 text-base sm:text-sm"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="text-sm font-medium text-foreground">
                  Phone Number
                </Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full h-11 text-base sm:text-sm"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
          )}
          
          <Separator className="my-2" />
          
          {/* Order Items Section */}
          <div className="space-y-4">
            <h4 className="text-base sm:text-sm font-medium">Order Items</h4>
            
            <div className="max-h-[350px] sm:max-h-[300px] overflow-y-auto space-y-4">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:items-end sm:p-3 sm:bg-transparent sm:border sm:border-gray-200"
                >
                  {/* Item Type - Full width on mobile */}
                  <div className="sm:col-span-4">
                    <Label htmlFor={`item-type-${item.id}`} className="text-sm font-medium mb-2 block">Item Type</Label>
                    <Select 
                      value={item.type} 
                      onValueChange={(value) => updateItemType(item.id, value)}
                    >
                      <SelectTrigger className="h-11 sm:h-9 text-base sm:text-sm w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Quantity and Rate - Grid on mobile */}
                  <div className="grid grid-cols-2 gap-3 sm:contents">
                    <div className="sm:col-span-3">
                      <Label htmlFor={`item-qty-${item.id}`} className="text-sm font-medium mb-2 block">Qty (kg)</Label>
                      <Input
                        id={`item-qty-${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                        className="h-11 sm:h-9 text-base sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    
                    <div className="sm:col-span-3">
                      <Label htmlFor={`item-rate-${item.id}`} className="text-sm font-medium mb-2 block">Rate (₹)</Label>
                      <Input
                        id={`item-rate-${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.rate || ''}
                        onChange={(e) => {
                          console.log('Rate field onChange:', e.target.value);
                          updateItem(item.id, 'rate', e.target.value);
                        }}
                        onFocus={() => console.log('Rate field focused')}
                        onClick={() => console.log('Rate field clicked')}
                        onKeyDown={(e) => console.log('Rate field keydown:', e.key)}
                        className="h-11 sm:h-9 text-base sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {/* Details - Full width on mobile */}
                  <div className="sm:col-span-2">
                    <Label htmlFor={`item-details-${item.id}`} className="text-sm font-medium mb-2 block sm:hidden">Details</Label>
                    <Label htmlFor={`item-details-${item.id}`} className="text-xs mb-1 hidden sm:block">Details</Label>
                    <Input
                      id={`item-details-${item.id}`}
                      type="text"
                      value={item.details || ''}
                      onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                      className="h-11 sm:h-9 text-base sm:text-sm"
                      placeholder="Additional details"
                    />
                  </div>
                  
                  {/* Action Button - Show remove button for all items when there's more than one */}
                  <div className="flex justify-center sm:justify-end sm:col-span-1">
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-11 w-11 sm:h-9 sm:w-9 rounded-full border-red-300 text-red-600 hover:bg-red-50 touch-manipulation"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                      >
                        <i className="fas fa-minus text-sm"></i>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Add Item Button - Always visible at the bottom */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-12 sm:h-10 bg-green-50 border-green-300 text-green-700 hover:bg-green-100 touch-manipulation"
                onClick={addItem}
                title="Add another item"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Item
              </Button>
            </div>
            
            {/* Total Amount */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-4 rounded-lg border">
              <div className="flex justify-between items-center">
                <span className="text-base sm:text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-xl sm:text-lg font-bold text-gray-900">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            {/* Order Date */}
            <div className="space-y-2">
              <Label htmlFor="order-date" className="text-sm font-medium text-foreground">
                Order Date
              </Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full h-11 sm:h-9 text-base sm:text-sm"
              />
            </div>
            
            {/* Payment Section - Enhanced with Partial Payment */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-base sm:text-sm font-medium text-blue-800 mb-4">Payment Information</h4>
              
              <div className="space-y-4 sm:space-y-3 sm:grid sm:grid-cols-2 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Payment Amount (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="h-11 sm:h-9 text-base sm:text-sm"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500">
                    Max: ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Payment Status</Label>
                  <div className="h-11 sm:h-9 px-3 py-2 border rounded-md bg-white flex items-center">
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
                <div className="mt-4 space-y-2 text-sm sm:text-xs border-t border-blue-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Total:</span>
                    <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment Amount:</span>
                    <span className="font-medium text-green-600">₹{paidAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t border-blue-200 pt-2">
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
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation" 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
          >
            {isSubmitting ? 'Creating Order...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
