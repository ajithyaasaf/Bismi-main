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
  
  // Calculate total order amount with null safety
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.rate) || 0;
      return total + (quantity * rate);
    }, 0);
  };

  // Calculate payment status based on paid amount with validation
  const totalAmount = calculateTotal();
  React.useEffect(() => {
    if (totalAmount <= 0) {
      setPaymentStatus('pending');
      return;
    }
    
    if (paidAmount >= totalAmount) {
      setPaymentStatus('paid');
    } else if (paidAmount > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  }, [paidAmount, totalAmount]);
  
  // Add item to order
  const addItem = () => {
    setItems([
      ...items,
      { 
        id: String(items.length + 1), 
        type: 'chicken', 
        quantity: '', 
        rate: '',
        details: '' // New field for additional item details
      }
    ]);
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
      
      // Create order with selected date
      const selectedOrderDate = new Date(orderDate + 'T00:00:00.000Z');
      
      console.log('Selected order date:', orderDate);
      console.log('Converted order date:', selectedOrderDate.toISOString());
      
      await apiRequest('POST', '/api/orders', {
        customerId: orderCustomerId,
        items: validItems,
        totalAmount: total,
        paidAmount: paidAmount,
        paymentStatus: paymentStatus,
        orderStatus: 'pending'
      });
      

      
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
      toast({
        title: "Error creating order",
        description: "There was an error creating the order",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[550px] overflow-y-auto max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>New Order</DialogTitle>
          <DialogDescription>
            Create a new order for a customer.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Customer Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="customer-type" className="sm:text-right text-sm font-medium">
              Customer Type
            </Label>
            <div className="sm:col-span-3">
              <Select 
                value={customerType} 
                onValueChange={setCustomerType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="random">Random Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Conditional Customer Fields */}
          {customerType === 'hotel' ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="hotel-select" className="sm:text-right text-sm font-medium">
                Select Hotel
              </Label>
              <div className="sm:col-span-3">
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
                  <SelectTrigger className="w-full">
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
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="customer-name" className="sm:text-right text-sm font-medium">
                  Customer Name
                </Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="sm:col-span-3"
                  placeholder="Enter customer name"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                <Label htmlFor="customer-phone" className="sm:text-right text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="sm:col-span-3"
                  placeholder="Enter phone number"
                />
              </div>
            </>
          )}
          
          <Separator className="my-2" />
          
          {/* Order Items Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium mb-3">Order Items</h4>
            
            <div className="max-h-[300px] overflow-y-auto pr-1 space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id} 
                  className="grid grid-cols-12 gap-2 items-end pb-3 border-b border-gray-100 last:border-0"
                >
                  <div className="col-span-12 sm:col-span-5">
                    <Label htmlFor={`item-type-${item.id}`} className="text-xs mb-1 block">Item</Label>
                    <Select 
                      value={item.type} 
                      onValueChange={(value) => updateItemType(item.id, value)}
                    >
                      <SelectTrigger className="h-9 text-sm w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-5 sm:col-span-3">
                    <Label htmlFor={`item-qty-${item.id}`} className="text-xs mb-1 block">Qty (kg)</Label>
                    <Input
                      id={`item-qty-${item.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  
                  <div className="col-span-5 sm:col-span-2">
                    <Label htmlFor={`item-rate-${item.id}`} className="text-xs mb-1 block">Rate (₹)</Label>
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
                      className="h-9 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="col-span-10 sm:col-span-4">
                    <Label htmlFor={`item-details-${item.id}`} className="text-xs mb-1 block">Details</Label>
                    <Input
                      id={`item-details-${item.id}`}
                      type="text"
                      value={item.details || ''}
                      onChange={(e) => updateItem(item.id, 'details', e.target.value)}
                      className="h-9 text-sm"
                      placeholder="Additional details about the meat"
                    />
                  </div>
                  
                  <div className="col-span-2 sm:col-span-1 flex justify-center items-center">
                    {index === 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full"
                        onClick={addItem}
                        title="Add item"
                      >
                        <i className="fas fa-plus"></i>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeItem(item.id)}
                        title="Remove item"
                      >
                        <i className="fas fa-minus"></i>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total Amount */}
            <div className="mt-4 bg-slate-50 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total Amount:</span>
                <span className="text-lg font-bold text-gray-900">₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>
            
            {/* Order Date */}
            <div className="mt-4">
              <Label htmlFor="order-date" className="block text-sm font-medium mb-2">
                Order Date
              </Label>
              <Input
                id="order-date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full"
              />
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
        
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Creating...' : 'Create Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
