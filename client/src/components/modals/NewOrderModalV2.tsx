import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ITEM_TYPES, PAYMENT_STATUS, ORDER_STATUS } from '@shared/constants';
import { Customer } from '@shared/types';
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Calculator, DollarSign } from 'lucide-react';

interface OrderItem {
  type: string;
  quantity: number;
  rate: number;
  details: string;
}

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderData: {
    customerId: string;
    items: OrderItem[];
    totalAmount: number;
    paidAmount?: number;
    paymentStatus: string;
    orderStatus: string;
  }) => Promise<void>;
  customers: Customer[];
}

export default function NewOrderModalV2({ isOpen, onClose, onSubmit, customers }: NewOrderModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([{ type: '', quantity: 0, rate: 0, details: '' }]);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  
  // Calculate payment status based on paid amount
  useEffect(() => {
    if (paidAmount >= totalAmount && totalAmount > 0) {
      setPaymentStatus('paid');
    } else if (paidAmount > 0) {
      setPaymentStatus('partially_paid');
    } else {
      setPaymentStatus('pending');
    }
  }, [paidAmount, totalAmount]);

  // Add new item
  const addItem = () => {
    setItems([...items, { type: '', quantity: 0, rate: 0, details: '' }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item field
  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setItems(items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast({
        title: "Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0 || items.some(item => !item.type || item.quantity <= 0 || item.rate <= 0)) {
      toast({
        title: "Error",
        description: "Please add at least one valid item with quantity and rate.",
        variant: "destructive",
      });
      return;
    }

    if (paidAmount > totalAmount) {
      toast({
        title: "Error",
        description: "Paid amount cannot exceed total amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        customerId,
        items,
        totalAmount,
        paidAmount,
        paymentStatus,
        orderStatus
      });
      handleClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCustomerId('');
    setItems([{ type: '', quantity: 0, rate: 0, details: '' }]);
    setOrderStatus('pending');
    setPaymentStatus('pending');
    setPaidAmount(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto p-3 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Create New Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Customer Selection - Mobile Optimized */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <Label className="text-sm font-medium text-blue-800 mb-2 block">Customer *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="h-12 sm:h-10 text-base sm:text-sm">
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id} className="py-3 sm:py-2">
                      <div className="flex flex-col">
                        <span className="font-medium text-base sm:text-sm">{customer.name}</span>
                        <span className="text-sm sm:text-xs text-gray-500">{customer.contact}</span>
                        <span className="text-xs text-blue-600 capitalize">{customer.type}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Order Items - Mobile First Design */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium">Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <Card key={index} className="border-l-4 border-l-green-500 bg-gray-50">
                    <CardContent className="p-3">
                      <div className="space-y-3">
                        {/* Item Type and Remove Button */}
                        <div className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Label className="text-xs font-medium text-gray-600 mb-1 block">Item Type *</Label>
                            <Select
                              value={item.type}
                              onValueChange={(value) => updateItem(index, 'type', value)}
                            >
                              <SelectTrigger className="h-11 sm:h-9 text-base sm:text-sm">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ITEM_TYPES.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {items.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-11 sm:h-9 w-11 sm:w-9 p-0 text-red-500 hover:text-red-600 mt-5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Quantity and Rate - Side by Side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs font-medium text-gray-600 mb-1 block">Quantity (kg) *</Label>
                            <Input
                              type="number"
                              placeholder="0.0"
                              value={item.quantity || ''}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="h-11 sm:h-9 text-base sm:text-sm"
                              min="0"
                              step="0.1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-gray-600 mb-1 block">Rate (₹/kg) *</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={item.rate || ''}
                              onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                              className="h-11 sm:h-9 text-base sm:text-sm"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        {/* Item Total Display */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-md border">
                          <span className="text-sm font-medium text-gray-700">Item Total:</span>
                          <span className="text-base font-bold text-green-600">
                            ₹{(item.quantity * item.rate).toFixed(2)}
                          </span>
                        </div>

                        {/* Details Field */}
                        <div>
                          <Label className="text-xs font-medium text-gray-600 mb-1 block">Additional Details</Label>
                          <Textarea
                            placeholder="Optional details for this item..."
                            value={item.details}
                            onChange={(e) => updateItem(index, 'details', e.target.value)}
                            className="h-16 text-sm resize-none"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Total */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 mt-4">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Order Total:</span>
                    <span className="text-xl font-bold text-green-700">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Payment Section - Enhanced with Partial Payment */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium text-blue-800">Payment Information</Label>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Order Status</Label>
                    <Select value={orderStatus} onValueChange={setOrderStatus}>
                      <SelectTrigger className="h-11 sm:h-9 text-base sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Payment Amount (₹)</Label>
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
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum: ₹{totalAmount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Payment Status Display */}
                <div className="flex items-center justify-between bg-white p-3 rounded-md border">
                  <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                  <Badge 
                    variant={paymentStatus === 'paid' ? 'default' : paymentStatus === 'partially_paid' ? 'secondary' : 'destructive'}
                    className={`${paymentStatus === 'paid' ? 'bg-green-500' : ''} text-xs sm:text-sm`}
                  >
                    {paymentStatus === 'paid' && 'Fully Paid'}
                    {paymentStatus === 'partially_paid' && 'Partially Paid'}
                    {paymentStatus === 'pending' && 'Pending Payment'}
                  </Badge>
                </div>

                {/* Payment Summary */}
                {totalAmount > 0 && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Total:</span>
                      <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Amount:</span>
                      <span className="font-medium text-green-600">₹{paidAmount.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Remaining Balance:</span>
                      <span className={`${(totalAmount - paidAmount) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{(totalAmount - paidAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || totalAmount === 0}
              className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
            >
              {isSubmitting ? 'Creating Order...' : 'Create Order'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}