import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Customer, Order } from '@shared/types';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

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
  paymentAmount: number;
  selected: boolean;
  remainingBalance: number;
}

export default function SmartPaymentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  customer, 
  orders 
}: SmartPaymentModalProps) {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [orderEntries, setOrderEntries] = useState<OrderPaymentEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Filter unpaid orders and calculate totals
  const unpaidOrders = orders.filter(order => 
    order && order.customerId === customer?.id && order.paymentStatus !== 'paid'
  );

  const unpaidOrdersTotal = unpaidOrders.reduce((sum, order) => {
    const totalAmount = order.totalAmount || 0;
    const paidAmount = order.paidAmount || 0;
    const remaining = Math.round((totalAmount - paidAmount + Number.EPSILON) * 100) / 100;
    return Math.round((sum + remaining + Number.EPSILON) * 100) / 100;
  }, 0);

  const customerPending = Math.round(((customer?.pendingAmount || 0) + Number.EPSILON) * 100) / 100;
  const totalPending = Math.max(customerPending, unpaidOrdersTotal);

  const ordersAllocated = orderEntries.reduce((sum, entry) => {
    const amount = entry.selected ? entry.paymentAmount : 0;
    return Math.round((sum + amount + Number.EPSILON) * 100) / 100;
  }, 0);

  // If there are no unpaid orders, totalAllocated is the entered paymentAmount
  const extraAllocated = unpaidOrders.length === 0 
    ? (parseFloat(paymentAmount) || 0)
    : Math.max(0, Math.round(((parseFloat(paymentAmount) || 0) - ordersAllocated + Number.EPSILON) * 100) / 100);

  const totalAllocated = unpaidOrders.length === 0
    ? (parseFloat(paymentAmount) || 0)
    : Math.min(totalPending, Math.round((ordersAllocated + extraAllocated + Number.EPSILON) * 100) / 100);

  useEffect(() => {
    if (isOpen) {
      if (unpaidOrders.length > 0) {
        const entries = unpaidOrders.map(order => ({
          order,
          paymentAmount: 0,
          selected: false,
          remainingBalance: Math.round(((order.totalAmount || 0) - (order.paidAmount || 0) + Number.EPSILON) * 100) / 100
        }));
        setOrderEntries(entries);
      } else {
        setOrderEntries([]);
      }
      setPaymentAmount('');
    }
  }, [isOpen, unpaidOrders.length]);

  const handlePaymentAmountChange = (value: string) => {
    setPaymentAmount(value);
    const amount = parseFloat(value) || 0;
    
    if (unpaidOrders.length === 0) return;

    if (amount === 0) {
      // Clear all selections
      setOrderEntries(entries => entries.map(entry => ({
        ...entry,
        paymentAmount: 0,
        selected: false
      })));
      return;
    }

    // Auto-distribute payment (oldest orders first)
    let remaining = amount;
    const updatedEntries = [...orderEntries]
      .sort((a, b) => new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime())
      .map(entry => {
        if (remaining <= 0) {
          return { ...entry, paymentAmount: 0, selected: false };
        }
        
        const allocation = Math.min(remaining, entry.remainingBalance);
        remaining = Math.round((remaining - allocation + Number.EPSILON) * 100) / 100;
        
        return {
          ...entry,
          paymentAmount: allocation,
          selected: allocation > 0
        };
      });

    // Restore original order
    const finalEntries = orderEntries.map(originalEntry => {
      const updated = updatedEntries.find(entry => entry.order.id === originalEntry.order.id);
      return updated || originalEntry;
    });

    setOrderEntries(finalEntries);
  };

  const handleOrderSelection = (orderId: string, selected: boolean) => {
    setOrderEntries(entries => entries.map(entry => {
      if (entry.order.id === orderId) {
        return {
          ...entry,
          selected,
          paymentAmount: selected ? entry.remainingBalance : 0
        };
      }
      return entry;
    }));
  };

  const handleOrderAmountChange = (orderId: string, amount: string) => {
    const numAmount = Math.min(parseFloat(amount) || 0, 
      orderEntries.find(e => e.order.id === orderId)?.remainingBalance || 0
    );
    
    setOrderEntries(entries => entries.map(entry => {
      if (entry.order.id === orderId) {
        return {
          ...entry,
          paymentAmount: numAmount,
          selected: numAmount > 0
        };
      }
      return entry;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let allocations: PaymentAllocation[] = [];

    if (unpaidOrders.length === 0) {
      const amountNum = parseFloat(paymentAmount) || 0;
      if (amountNum <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid payment amount.",
          variant: "destructive",
        });
        return;
      }
      allocations = [{
        orderId: 'account',
        amount: amountNum,
        description: `Payment towards account balance for ${customer.name}`
      }];
    } else {
      allocations = orderEntries
        .filter(entry => entry.selected && entry.paymentAmount > 0)
        .map(entry => ({
          orderId: entry.order.id,
          amount: entry.paymentAmount,
          description: `Payment for Order #${entry.order.id.substring(0, 8)}`
        }));

      // If user provided a payment that exceeds selected orders and customer has remaining non-order debt
      if (extraAllocated > 0 && customerPending > unpaidOrdersTotal) {
        allocations.push({
          orderId: 'account',
          amount: extraAllocated,
          description: `Payment towards account balance for ${customer.name}`
        });
      }

      if (allocations.length === 0) {
        toast({
          title: "No orders selected",
          description: "Please select at least one order to process payment.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(allocations);
      onClose();
      toast({
        title: "Payment processed successfully",
        description: `₹${totalAllocated.toFixed(2)} applied successfully`,
      });
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error?.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setPaymentAmount('');
    setOrderEntries([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl h-[90vh] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle>Payment for {customer.name}</DialogTitle>
          <DialogDescription>
            Allocate payment across pending orders
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <div className="space-y-6">
              {/* Payment Amount Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                    <div className="text-lg font-bold text-red-600">₹{totalPending.toFixed(2)}</div>
                    <div className="text-xs text-red-600">Total Pending</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-lg font-bold text-blue-600">₹{totalAllocated.toFixed(2)}</div>
                    <div className="text-xs text-blue-600">Allocated</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-lg font-bold text-green-600">₹{(totalPending - totalAllocated).toFixed(2)}</div>
                    <div className="text-xs text-green-600">Remaining</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Payment Amount (₹)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    placeholder="Enter payment amount"
                    value={paymentAmount}
                    onChange={(e) => handlePaymentAmountChange(e.target.value)}
                    className="h-11 sm:h-10 text-base sm:text-sm text-center"
                    min="0"
                    step="0.01"
                    max={totalPending}
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[100, 500, 1000].map(amount => 
                    totalPending >= amount && (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        onClick={() => handlePaymentAmountChange(amount.toString())}
                        className="h-9 text-sm"
                        disabled={isSubmitting}
                      >
                        ₹{amount}
                      </Button>
                    )
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handlePaymentAmountChange(totalPending.toString())}
                    className="h-9 text-sm"
                    disabled={isSubmitting}
                  >
                    Pay All
                  </Button>
                </div>
              </div>

              {/* Orders List / Account Balance Notice */}
              {unpaidOrders.length === 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 text-center space-y-2">
                  <div className="font-semibold text-blue-900 text-base">Account Balance Settlement</div>
                  <p className="text-sm text-blue-700">
                    This customer has an outstanding balance of <span className="font-bold">₹{customerPending.toFixed(2)}</span> (opening balance or manual adjustments).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enter the payment amount above and click &quot;Process Payment&quot; to credit their account directly.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Pending Orders ({unpaidOrders.length})</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const allSelected = orderEntries.every(entry => entry.selected);
                        if (allSelected) {
                          setOrderEntries(entries => entries.map(entry => ({
                            ...entry,
                            selected: false,
                            paymentAmount: 0
                          })));
                        } else {
                          setOrderEntries(entries => entries.map(entry => ({
                            ...entry,
                            selected: true,
                            paymentAmount: entry.remainingBalance
                          })));
                        }
                      }}
                      disabled={isSubmitting}
                    >
                      {orderEntries.every(entry => entry.selected) ? 'Unselect All' : 'Select All'}
                    </Button>
                  </div>

                  <div className="space-y-2 border rounded-lg p-3">
                    {orderEntries.map((entry) => (
                      <div
                        key={entry.order.id}
                        className={`border rounded-lg p-3 transition-all ${
                          entry.selected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={entry.selected}
                              onCheckedChange={(checked) => 
                                handleOrderSelection(entry.order.id, !!checked)
                              }
                            />
                            <div>
                              <div className="font-medium text-sm">
                                Order #{entry.order.id.substring(0, 8)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(entry.order.createdAt), 'dd MMM yyyy')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-red-600 text-sm">
                              ₹{entry.remainingBalance.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">pending</div>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground mb-3 bg-gray-50 p-2 rounded">
                          {entry.order.items.map((item: any) => `${item.quantity}kg ${item.type}`).join(', ')}
                        </div>

                        {entry.selected && (
                          <div className="flex items-center space-x-2 pt-3 border-t">
                            <Label className="text-xs font-medium min-w-fit">Payment:</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={entry.paymentAmount || ''}
                              onChange={(e) => handleOrderAmountChange(entry.order.id, e.target.value)}
                              className="flex-1 h-8 text-xs"
                              min="0"
                              max={entry.remainingBalance}
                              step="0.01"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOrderAmountChange(entry.order.id, entry.remainingBalance.toString())}
                              className="text-xs px-2 h-8"
                            >
                              Full
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
            )}
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 p-6 pt-4 border-t bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || totalAllocated <= 0}
              className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
            >
              {isSubmitting ? 'Processing...' : `Process Payment ₹${totalAllocated.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}