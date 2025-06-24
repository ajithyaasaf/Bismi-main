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

        <div className="space-y-4">
          {/* Order Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order Total:</span>
              <span className="font-medium">₹{order.totalAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paid Amount:</span>
              <span className="font-medium text-green-600">₹{order.paidAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span className="text-gray-900 font-medium">Remaining Balance:</span>
              <span className="font-bold text-red-600">₹{remainingBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900">Order Items:</h4>
            <div className="text-sm text-gray-600">
              {order.items?.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <span>{item.quantity}kg {item.type}</span>
                  <span>@ ₹{item.rate}/kg</span>
                </div>
              )) || 'No items'}
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="amount">Payment Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter payment amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                max={remainingBalance}
                step="0.01"
                required
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum: ₹{remainingBalance.toFixed(2)}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !amount}
              >
                {isSubmitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}