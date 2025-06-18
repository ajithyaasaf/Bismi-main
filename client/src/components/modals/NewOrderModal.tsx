import { useState } from 'react';
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
    price: string;
    details?: string;
  }[]>([{ id: '1', type: 'chicken', quantity: '', price: '', details: '' }]);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Item types from centralized constants
  const itemTypes = ITEM_TYPES;
  
  // Hotels (filtered customers)
  const hotels = customers.filter(c => c.customerType === 'hotel');
  
  // Debug logging
  console.log('NewOrderModal Debug:', {
    totalCustomers: customers.length,
    customers: customers,
    customerTypes: customers.map(c => ({id: c.id, name: c.name, customerType: c.customerType})),
    hotelsFiltered: hotels.length,
    hotels: hotels
  });

  // Alternative filtering attempts
  const hotelsWithType = customers.filter(c => c.customerType === 'hotel');
  const hotelsWithTypeAlt = customers.filter(c => (c as any).type === 'hotel');
  
  console.log('Filtering tests:', {
    customerTypeHotel: hotelsWithType.length,
    typeHotel: hotelsWithTypeAlt.length
  });
  
  // Calculate total order amount
  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const rate = parseFloat(item.price) || 0;
      return total + (quantity * rate);
    }, 0);
  };
  
  // Add item to order
  const addItem = () => {
    setItems([
      ...items,
      { 
        id: String(items.length + 1), 
        type: 'chicken', 
        quantity: '', 
        price: '',
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
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Set default rate based on inventory when item type changes
  const updateItemType = (id: string, type: string) => {
    const inventoryItem = inventory.find(item => item.type === type);
    const price = inventoryItem ? String(inventoryItem.price) : '';
    
    setItems(items.map(item => 
      item.id === id ? { ...item, type, price } : item
    ));
  };
  
  // Reset form
  const resetForm = () => {
    setCustomerType('hotel');
    setCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setOrderDate(format(new Date(), 'yyyy-MM-dd'));
    setItems([{ id: '1', type: 'chicken', quantity: '', price: '', details: '' }]);
    setPaymentStatus('paid');
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
        const rate = parseFloat(item.price);
        
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
        
        // Show low stock warning but allow order to proceed (enterprise mode)
        if (inventoryItem && inventoryItem.quantity < quantity) {
          toast({
            title: "Low stock notice",
            description: `Stock will go below available inventory. Available: ${inventoryItem.quantity}kg, Ordered: ${quantity}kg`,
            variant: "default" // Changed from destructive to default (informational)
          });
        }
        
        // If no inventory item exists, we'll create the order anyway but note it
        if (!inventoryItem) {
          toast({
            title: "No inventory record",
            description: `No inventory found for ${item.type}. Order will proceed but inventory will need manual adjustment.`,
            variant: "default"
          });
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
        date: selectedOrderDate.toISOString(),
        total,
        status: paymentStatus,
        type: customerType
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
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'rate', e.target.value)}
                      className="h-9 text-sm"
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
            
            {/* Payment Status */}
            <div className="mt-4">
              <Label htmlFor="payment-status" className="block text-sm font-medium mb-2">
                Payment Status
              </Label>
              <Select 
                value={paymentStatus} 
                onValueChange={setPaymentStatus}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
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
