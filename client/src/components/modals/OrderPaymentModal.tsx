import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Order } from '@shared/types';
import { format } from 'date-fns';

interface OrderPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number, orderId: string) => Promise<void>;
  order: Order;
  customerName: string;
}

export default function OrderPaymentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  order,
  customerName 
}: OrderPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const remainingBalance = (order.totalAmount || 0) - (order.paidAmount || 0);
  const formattedDate = format(new Date(order.createdAt), 'dd MMM yyyy');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount.",
        variant: "destructive",
      });
      return;
    }

    if (paymentAmount > remainingBalance) {
      toast({
        title: "Amount exceeds balance",
        description: `Payment amount cannot exceed remaining balance of ₹${remainingBalance.toFixed(2)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(paymentAmount, order.id);
      setAmount('');
      onClose();
      // Note: Success toast is now handled in OrdersList component to prevent duplicates
    } catch (error) {
      console.error('Payment modal error:', error);
      toast({
        title: "Payment failed",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for Order</DialogTitle>
          <DialogDescription>
            Record payment for {customerName}'s order from {formattedDate}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-4">
          {/* Order Details */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 space-y-3">
            <div className="flex justify-between text-base sm:text-sm">
              <span className="text-gray-700 font-medium">Order Total:</span>
              <span className="font-bold text-gray-900">₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-base sm:text-sm">
              <span className="text-gray-700 font-medium">Paid Amount:</span>
              <span className="font-bold text-green-600">₹{order.paidAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-base sm:text-sm border-t border-blue-200 pt-2">
              <span className="text-gray-900 font-bold">Remaining Balance:</span>
              <span className="font-bold text-xl sm:text-lg text-red-600">₹{remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <h4 className="text-base sm:text-sm font-medium text-gray-900">Order Items:</h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-1 text-sm text-gray-600">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="font-medium">{item.quantity}kg {item.type}</span>
                    <span>@ ₹{item.rate}/kg</span>
                  </div>
                )) || 'No items'}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                Payment Amount (₹)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter payment amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                max={remainingBalance}
                step="0.01"
                className="h-11 sm:h-10 text-base sm:text-sm text-right"
                required
                disabled={isSubmitting}
                autoFocus
              />
              <p className="text-xs text-gray-500">
                Maximum payment: ₹{remainingBalance.toFixed(2)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end sm:gap-2 pt-2">
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
                disabled={isSubmitting || !amount}
                className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
              >
                {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}