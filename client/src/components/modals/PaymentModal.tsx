import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => Promise<void>;
  entityName: string;
  entityType: 'supplier' | 'customer';
  currentAmount?: number;
  title?: string;
  description?: string;
}

export default function PaymentModal({
  isOpen,
  onClose,
  onSubmit,
  entityName,
  entityType,
  currentAmount = 0,
  title = "Record Payment",
  description
}: PaymentModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAmount(''); // Always start with empty field
      setIsSubmitting(false);
    } else {
      setAmount('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      return; // Form validation will handle this
    }
    
    setIsSubmitting(true);
    try {
      console.log(`[PaymentModal] Submitting payment of ₹${numAmount} for ${entityName}`);
      await onSubmit(numAmount);
      console.log(`[PaymentModal] Payment submission successful, closing modal`);
      // Reset form and close modal on success
      setAmount('');
      onClose();
    } catch (error) {
      console.error('[PaymentModal] Payment submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description || `Enter the payment amount for ${entityName}`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-4">
          {/* Current Amount Display */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border">
            <div className="flex justify-between items-center">
              <span className="text-base sm:text-sm text-gray-600 font-medium">
                Current {entityType === 'supplier' ? 'Debt' : 'Pending'} Amount:
              </span>
              <span className="font-bold text-xl sm:text-lg text-gray-900">
                ₹{currentAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium text-foreground">
              Payment Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-base sm:text-sm">
                ₹
              </span>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                required
                className="pl-8 h-11 sm:h-10 text-base sm:text-sm"
                placeholder="0.00"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              {entityType === 'supplier' ? 
                'This amount will be deducted from the supplier\'s debt' : 
                'This amount will be deducted from the customer\'s pending amount'}
            </p>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
            >
              {isSubmitting ? 'Recording Payment...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}