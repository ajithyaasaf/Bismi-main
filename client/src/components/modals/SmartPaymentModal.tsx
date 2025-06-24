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
import { X } from 'lucide-react';

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

  // Filter and prepare unpaid orders with safety checks
  const unpaidOrders = (orders || []).filter(order => 
    order && order.customerId === customer?.id && order.paymentStatus !== 'paid'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (isOpen && unpaidOrders) {
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

  // Smart payment distribution with priority logic (oldest orders first)
  const distributePayment = (amount: number) => {
    if (amount <= 0) {
      // Clear all amounts when total is 0
      const clearedEntries = orderEntries.map(entry => ({
        ...entry,
        requestedAmount: 0,
        selected: false
      }));
      setOrderEntries(clearedEntries);
      return;
    }

    let remainingAmount = amount;
    const updatedEntries = [...orderEntries]
      .sort((a, b) => new Date(a.order.createdAt).getTime() - new Date(b.order.createdAt).getTime()) // Prioritize older orders
      .map(entry => {
        if (remainingAmount <= 0) {
          return { ...entry, requestedAmount: 0, selected: false };
        }

        const allocation = Math.min(remainingAmount, entry.remainingBalance);
        remainingAmount -= allocation;
        
        return { 
          ...entry, 
          requestedAmount: allocation,
          selected: allocation > 0
        };
      });

    // Restore original order
    const finalEntries = orderEntries.map(originalEntry => {
      const updatedEntry = updatedEntries.find(entry => entry.order.id === originalEntry.order.id);
      return updatedEntry || originalEntry;
    });

    setOrderEntries(finalEntries);
  };

  // Handle total payment amount change with smart distribution
  const handleTotalAmountChange = (value: string) => {
    setTotalPaymentAmount(value);
    const amount = parseFloat(value) || 0;
    
    // Only auto-distribute if user hasn't manually selected specific orders
    const hasManualSelections = orderEntries.some(entry => entry.selected && entry.requestedAmount > 0);
    
    if (!hasManualSelections || amount === 0) {
      distributePayment(amount);
    }
  };

  // Toggle order selection with smart logic
  const toggleOrderSelection = (orderId: string, selected: boolean) => {
    const updatedEntries = orderEntries.map(entry => {
      if (entry.order.id === orderId) {
        return { 
          ...entry, 
          selected,
          requestedAmount: selected ? entry.requestedAmount : 0 // Clear amount when unchecked
        };
      }
      return entry;
    });
    setOrderEntries(updatedEntries);

    // Recalculate total payment amount based on selected entries
    const newTotal = updatedEntries
      .filter(entry => entry.selected)
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);
    setTotalPaymentAmount(newTotal.toString());
  };

  // Handle individual order amount change with smart selection
  const handleOrderAmountChange = (orderId: string, amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const updatedEntries = orderEntries.map(entry => {
      if (entry.order.id === orderId) {
        const cappedAmount = Math.min(numAmount, entry.remainingBalance);
        return { 
          ...entry, 
          requestedAmount: cappedAmount,
          selected: cappedAmount > 0 // Auto-select when amount > 0, auto-unselect when 0
        };
      }
      return entry;
    });
    setOrderEntries(updatedEntries);

    // Update total amount based on all selected entries
    const newTotal = updatedEntries
      .filter(entry => entry.selected)
      .reduce((sum, entry) => sum + entry.requestedAmount, 0);
    setTotalPaymentAmount(newTotal.toString());
  };

  // Calculate totals with safety checks
  const allocatedAmount = (orderEntries || []).reduce((sum, entry) => sum + (entry.requestedAmount || 0), 0);
  const totalPending = (unpaidOrders || []).reduce((sum, order) => 
    sum + ((order.totalAmount || 0) - (order.paidAmount || 0)), 0
  );

  // Format order items for display
  const formatOrderItems = (items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return 'No items';
    return items.slice(0, 2).map(item => 
      `${item?.quantity || 0}kg ${getItemLabel(item?.type || '')}`
    ).join(', ') + (items.length > 2 ? '...' : '');
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPayments = (orderEntries || [])
      .filter(entry => entry && entry.selected && entry.requestedAmount > 0)
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
      <DialogContent className="w-[98vw] sm:w-[95vw] md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-6xl h-[98vh] sm:h-[95vh] md:h-[92vh] overflow-hidden p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 p-4 sm:p-6 border-b bg-white relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 h-9 w-9 p-0 hover:bg-gray-100 rounded-full z-10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-semibold leading-tight pr-12">
              Smart Payment - {customer.name}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-gray-600 mt-2">
              Allocate payment across specific orders
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6 h-full flex flex-col">
              {/* Responsive Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <Card className="border-red-200 bg-red-50/80 hover:bg-red-50 transition-colors">
                  <CardContent className="p-3 md:p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600">
                        ₹{totalPending.toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">Total Pending</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50/80 hover:bg-blue-50 transition-colors">
                  <CardContent className="p-3 md:p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600">
                        ₹{allocatedAmount.toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">Allocated</div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/80 hover:bg-green-50 transition-colors">
                  <CardContent className="p-3 md:p-4">
                    <div className="text-center">
                      <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600">
                        ₹{(totalPending - allocatedAmount).toFixed(2)}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">Remaining</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Payment Input */}
              <div className="space-y-4">
                <Label htmlFor="total-amount" className="block text-sm md:text-base font-semibold text-gray-700">
                  Total Payment Amount (₹)
                </Label>
                <Input
                  id="total-amount"
                  type="number"
                  placeholder="Enter payment amount"
                  value={totalPaymentAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  className="text-base sm:text-lg md:text-xl h-12 md:h-14 text-center border-2 focus:border-blue-500 focus:ring-blue-500/20"
                  min="0"
                  step="0.01"
                  max={totalPending}
                />
                
                {/* Responsive Quick Amount Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                  {totalPending > 100 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTotalAmountChange('100')}
                      disabled={isSubmitting}
                      className="h-10 md:h-12 text-xs md:text-sm font-medium hover:bg-blue-50 border-blue-200"
                    >
                      ₹100
                    </Button>
                  )}
                  {totalPending > 500 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTotalAmountChange('500')}
                      disabled={isSubmitting}
                      className="h-10 md:h-12 text-xs md:text-sm font-medium hover:bg-blue-50 border-blue-200"
                    >
                      ₹500
                    </Button>
                  )}
                  {totalPending > 1000 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTotalAmountChange('1000')}
                      disabled={isSubmitting}
                      className="h-10 md:h-12 text-xs md:text-sm font-medium hover:bg-blue-50 border-blue-200"
                    >
                      ₹1000
                    </Button>
                  )}
                  {totalPending > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleTotalAmountChange(totalPending.toString())}
                      disabled={isSubmitting}
                      className="h-10 md:h-12 text-xs md:text-sm font-medium col-span-2 sm:col-span-1 lg:col-span-2 hover:bg-green-50 border-green-200"
                    >
                      Pay All ₹{totalPending.toFixed(0)}
                    </Button>
                  )}
                </div>
                
                <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
                  <CardContent className="p-3 md:p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm md:text-base">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Maximum:</span>
                        <span className="font-semibold text-gray-800">₹{totalPending.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-medium">Selected:</span>
                        <span className="font-semibold text-blue-600">₹{allocatedAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fully Responsive Orders List */}
              <div className="flex-1 space-y-4 min-h-0">
                <h3 className="text-base md:text-lg lg:text-xl font-semibold text-gray-800">Select Orders for Payment</h3>
                {unpaidOrders.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center py-12">
                    <div className="text-gray-500">
                      <div className="text-lg md:text-xl font-medium">No pending orders found</div>
                      <div className="text-sm md:text-base mt-2">This customer has no unpaid orders</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3 md:space-y-4 overflow-y-auto pr-2">
                    {(orderEntries || []).map((entry) => (
                      <Card key={entry.order.id} className={`transition-all duration-200 hover:shadow-md ${entry.selected ? 'ring-2 ring-blue-500 bg-blue-50/80 shadow-lg' : 'hover:bg-gray-50/50'}`}>
                        <CardContent className="p-3 md:p-4 lg:p-5">
                          {/* Mobile & Tablet Layout (up to lg) */}
                          <div className="space-y-4 lg:hidden">
                            {/* Header with Checkbox and Order Info */}
                            <div className="flex items-start space-x-3">
                              <Checkbox
                                checked={entry.selected}
                                onCheckedChange={(checked) => 
                                  toggleOrderSelection(entry.order.id, !!checked)
                                }
                                className="mt-1 h-5 w-5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="font-semibold text-sm md:text-base">
                                    Order #{entry.order.id.substring(0, 8)}
                                  </div>
                                  <Badge 
                                    variant={entry.order.paymentStatus === 'partially_paid' ? 'secondary' : 'destructive'} 
                                    className="text-xs md:text-sm"
                                  >
                                    {entry.order.paymentStatus === 'partially_paid' ? 'Partial' : 'Pending'}
                                  </Badge>
                                </div>
                                <div className="text-xs md:text-sm text-gray-500 mt-1">
                                  {format(new Date(entry.order.createdAt), 'dd MMM yyyy')}
                                </div>
                                <div className="text-xs md:text-sm text-gray-700 mt-1 line-clamp-2">
                                  {formatOrderItems(entry.order.items)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Amount Summary */}
                            <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200">
                              <CardContent className="p-3">
                                <div className="grid grid-cols-3 gap-3 text-xs md:text-sm">
                                  <div className="text-center">
                                    <div className="text-gray-600 font-medium">Total</div>
                                    <div className="font-bold text-gray-800">₹{(entry.order.totalAmount || 0).toFixed(2)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-600 font-medium">Paid</div>
                                    <div className="font-bold text-green-600">₹{(entry.order.paidAmount || 0).toFixed(2)}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-600 font-medium">Balance</div>
                                    <div className="font-bold text-red-600">₹{entry.remainingBalance.toFixed(2)}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            {/* Payment Input */}
                            <div className="space-y-2">
                              <Label className="text-sm md:text-base font-medium text-gray-700">Payment Amount (₹)</Label>
                              <div className="flex space-x-2">
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={entry.requestedAmount || ''}
                                  onChange={(e) => handleOrderAmountChange(entry.order.id, e.target.value)}
                                  className="h-11 md:h-12 text-center text-base border-2 focus:border-blue-500"
                                  min="0"
                                  max={entry.remainingBalance}
                                  step="0.01"
                                />
                                {entry.remainingBalance !== entry.requestedAmount && entry.remainingBalance > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 md:h-12 px-4 text-sm font-medium whitespace-nowrap border-2 hover:bg-blue-50"
                                    onClick={() => handleOrderAmountChange(entry.order.id, entry.remainingBalance.toString())}
                                  >
                                    Full
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Desktop Layout (lg and up) */}
                          <div className="hidden lg:flex items-center space-x-6">
                            <Checkbox
                              checked={entry.selected}
                              onCheckedChange={(checked) => 
                                toggleOrderSelection(entry.order.id, !!checked)
                              }
                              className="h-5 w-5"
                            />
                            
                            <div className="flex-1 grid grid-cols-4 gap-6 items-center">
                              <div>
                                <div className="font-semibold text-base">
                                  Order #{entry.order.id.substring(0, 8)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(entry.order.createdAt), 'dd MMM yyyy')}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm line-clamp-2 mb-2">
                                  {formatOrderItems(entry.order.items)}
                                </div>
                                <Badge variant={entry.order.paymentStatus === 'partially_paid' ? 'secondary' : 'destructive'}>
                                  {entry.order.paymentStatus === 'partially_paid' ? 'Partially Paid' : 'Pending'}
                                </Badge>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="text-sm flex justify-between">
                                  <span className="text-gray-600">Total:</span>
                                  <span className="font-semibold">₹{(entry.order.totalAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="text-sm flex justify-between">
                                  <span className="text-gray-600">Paid:</span>
                                  <span className="font-semibold text-green-600">₹{(entry.order.paidAmount || 0).toFixed(2)}</span>
                                </div>
                                <div className="text-sm flex justify-between">
                                  <span className="text-gray-600">Balance:</span>
                                  <span className="font-semibold text-red-600">₹{entry.remainingBalance.toFixed(2)}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Payment Amount (₹)</Label>
                                <div className="space-y-2">
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={entry.requestedAmount || ''}
                                    onChange={(e) => handleOrderAmountChange(entry.order.id, e.target.value)}
                                    className="h-10 text-center border-2 focus:border-blue-500"
                                    min="0"
                                    max={entry.remainingBalance}
                                    step="0.01"
                                  />
                                  {entry.remainingBalance !== entry.requestedAmount && entry.remainingBalance > 0 && (
                                    <Button
                                      type="button"
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0 text-sm text-blue-600 hover:text-blue-800"
                                      onClick={() => handleOrderAmountChange(entry.order.id, entry.remainingBalance.toString())}
                                    >
                                      Pay Full (₹{entry.remainingBalance.toFixed(2)})
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Enhanced Sticky Footer */}
              <div className="flex-shrink-0 border-t bg-white p-4 md:p-6 space-y-4">
                {/* Select All Button - All Breakpoints */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      const allSelected = orderEntries.every(entry => entry.selected);
                      if (allSelected) {
                        // Unselect all
                        const clearedEntries = orderEntries.map(entry => ({ 
                          ...entry, 
                          selected: false, 
                          requestedAmount: 0 
                        }));
                        setOrderEntries(clearedEntries);
                        setTotalPaymentAmount('0');
                      } else {
                        // Select all and distribute current amount
                        const amount = parseFloat(totalPaymentAmount) || totalPending;
                        setTotalPaymentAmount(amount.toString());
                        distributePayment(amount);
                      }
                    }}
                    disabled={isSubmitting}
                    className="h-11 md:h-12 font-medium"
                  >
                    {orderEntries.every(entry => entry.selected) ? 'Unselect All Orders' : 'Select All Orders'}
                  </Button>

                  {/* Main Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleClose} 
                      disabled={isSubmitting}
                      className="h-12 md:h-14 order-2 sm:order-1 border-2 font-medium"
                    >
                      Cancel Payment
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || allocatedAmount <= 0}
                      className="h-12 md:h-14 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm md:text-base px-6 md:px-8"
                    >
                      {isSubmitting ? 'Processing Payment...' : `Process Payment ₹${allocatedAmount.toFixed(2)}`}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}