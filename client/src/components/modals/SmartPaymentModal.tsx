import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Customer, Order } from '@shared/types';
import { format } from 'date-fns';
import { getItemLabel } from '@shared/constants';

interface SmartPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payments: PaymentAllocation[]) => Promise<void>;
  customer: Customer;
  orders: Order[];
}

interface PaymentAllocation {
  orderId: string;
  amount: number;
  description: string;
}

interface OrderPaymentEntry {
  order: Order;
  requestedAmount: number;
  remainingBalance: number;
  selected: boolean;
}

export default function SmartPaymentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  customer,
  orders 
}: SmartPaymentModalProps) {
  const [totalPaymentAmount, setTotalPaymentAmount] = useState('');
  const [orderEntries, setOrderEntries] = useState<OrderPaymentEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter and prepare unpaid orders
  const unpaidOrders = orders.filter(order => 
    order.customerId === customer.id && order.paymentStatus !== 'paid'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (isOpen) {
      // Initialize order entries with remaining balances
      const entries = unpaidOrders.map(order => ({
        order,
        requestedAmount: 0,
        remainingBalance: (order.totalAmount || 0) - (order.paidAmount || 0),
        selected: false
      }));
      setOrderEntries(entries);
      setTotalPaymentAmount('');
    }
  }, [isOpen, unpaidOrders.length]);

  // Auto-distribute payment amount across selected orders
  const distributePayment = (amount: number) => {
    const selectedEntries = orderEntries.filter(entry => entry.selected);
    if (selectedEntries.length === 0) return;

    let remainingAmount = amount;
    const updatedEntries = orderEntries.map(entry => {
      if (!entry.selected || remainingAmount <= 0) {
        return { ...entry, requestedAmount: 0 };
      }

      const allocation = Math.min(remainingAmount, entry.remainingBalance);
      remainingAmount -= allocation;
      
      return { ...entry, requestedAmount: allocation };
    });

    setOrderEntries(updatedEntries);
  };

  // Handle total payment amount change
  const handleTotalAmountChange = (value: string) => {
    setTotalPaymentAmount(value);
    const amount = parseFloat(value) || 0;
    distributePayment(amount);
  };

  // Toggle order selection
  const toggleOrderSelection = (orderId: string, selected: boolean) => {
    const updatedEntries = orderEntries.map(entry => {
      if (entry.order.id === orderId) {
        return { ...entry, selected };
      }
      return entry;
    });
    setOrderEntries(updatedEntries);

    // Redistribute payment
    const amount = parseFloat(totalPaymentAmount) || 0;
    setTimeout(() => distributePayment(amount), 0);
  };

  // Handle individual order amount change
  const handleOrderAmountChange = (orderId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const updatedEntries = orderEntries.map(entry => {
      if (entry.order.id === orderId) {
        return { 
          ...entry, 
          requestedAmount: Math.min(numAmount, entry.remainingBalance),
          selected: numAmount > 0
        };
      }
      return entry;
    });
    setOrderEntries(updatedEntries);

    // Update total amount
    const newTotal = updatedEntries.reduce((sum, entry) => sum + entry.requestedAmount, 0);
    setTotalPaymentAmount(newTotal.toString());
  };

  // Calculate totals
  const allocatedAmount = orderEntries.reduce((sum, entry) => sum + entry.requestedAmount, 0);
  const totalPending = unpaidOrders.reduce((sum, order) => 
    sum + ((order.totalAmount || 0) - (order.paidAmount || 0)), 0
  );

  // Format order items for display
  const formatOrderItems = (items: any[]) => {
    if (!items || items.length === 0) return 'No items';
    return items.slice(0, 2).map(item => 
      `${item.quantity}kg ${getItemLabel(item.type)}`
    ).join(', ') + (items.length > 2 ? '...' : '');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPayments = orderEntries
      .filter(entry => entry.selected && entry.requestedAmount > 0)
      .map(entry => ({
        orderId: entry.order.id,
        amount: entry.requestedAmount,
        description: `Payment for order #${entry.order.id.substring(0, 8)} - ${formatOrderItems(entry.order.items)}`
      }));

    if (selectedPayments.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to apply payment to.",
        variant: "destructive",
      });
      return;
    }

    if (allocatedAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedPayments);
      onClose();
      toast({
        title: "Payment processed",
        description: `₹${allocatedAmount.toFixed(2)} allocated across ${selectedPayments.length} order(s)`,
      });
    } catch (error) {
      console.error('Smart payment error:', error);
      toast({
        title: "Payment failed",
        description: "Failed to process payment allocation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTotalPaymentAmount('');
    setOrderEntries([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Smart Payment Allocation - {customer.name}</DialogTitle>
          <DialogDescription>
            Allocate payment amount across specific orders for clear tracking
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">₹{totalPending.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Pending</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">₹{allocatedAmount.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Allocated Amount</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{(totalPending - allocatedAmount).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Remaining Balance</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Payment Input */}
          <div>
            <Label htmlFor="total-amount" className="block text-sm font-medium mb-2">
              Total Payment Amount (₹)
            </Label>
            <Input
              id="total-amount"
              type="number"
              placeholder="Enter total payment amount"
              value={totalPaymentAmount}
              onChange={(e) => handleTotalAmountChange(e.target.value)}
              className="text-lg"
              min="0"
              step="0.01"
              max={totalPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: ₹{totalPending.toFixed(2)}
            </p>
          </div>

          {/* Orders List */}
          <div>
            <h3 className="text-lg font-medium mb-4">Select Orders for Payment Allocation</h3>
            {unpaidOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pending orders found for this customer
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {orderEntries.map((entry) => (
                  <Card key={entry.order.id} className={`transition-all ${entry.selected ? 'ring-2 ring-blue-500' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={entry.selected}
                          onCheckedChange={(checked) => 
                            toggleOrderSelection(entry.order.id, checked as boolean)
                          }
                        />
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <div className="font-medium text-sm">
                              Order #{entry.order.id.substring(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(entry.order.createdAt), 'dd MMM yyyy')}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-sm">
                              {formatOrderItems(entry.order.items)}
                            </div>
                            <Badge variant={entry.order.paymentStatus === 'partially_paid' ? 'secondary' : 'destructive'}>
                              {entry.order.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Pending'}
                            </Badge>
                          </div>
                          
                          <div>
                            <div className="text-sm">
                              <span className="text-gray-600">Total: </span>
                              <span className="font-medium">₹{(entry.order.totalAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Paid: </span>
                              <span className="text-green-600">₹{(entry.order.paidAmount || 0).toFixed(2)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Balance: </span>
                              <span className="text-red-600 font-medium">₹{entry.remainingBalance.toFixed(2)}</span>
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-xs text-gray-600">Payment Amount (₹)</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={entry.requestedAmount || ''}
                              onChange={(e) => handleOrderAmountChange(entry.order.id, e.target.value)}
                              className="mt-1"
                              min="0"
                              max={entry.remainingBalance}
                              step="0.01"
                              disabled={!entry.selected}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // Select all orders
                  const updatedEntries = orderEntries.map(entry => ({ ...entry, selected: true }));
                  setOrderEntries(updatedEntries);
                  const amount = parseFloat(totalPaymentAmount) || 0;
                  setTimeout(() => distributePayment(amount), 0);
                }}
                disabled={isSubmitting}
              >
                Select All
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || allocatedAmount <= 0}
                className="min-w-[120px]"
              >
                {isSubmitting ? 'Processing...' : `Process Payment ₹${allocatedAmount.toFixed(2)}`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}