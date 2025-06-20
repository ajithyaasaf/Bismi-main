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
      await onSubmit(numAmount);
      // Reset form and close modal on success
      setAmount('');
      onClose();
    } catch (error) {
      console.error('Payment submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md p-5 sm:p-6 rounded-xl">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {description || `Enter the payment amount for ${entityName}`}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="amount" className="sm:text-right text-sm font-medium">
                Amount
              </Label>
              <div className="sm:col-span-3 relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
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
                  className="pl-7 h-11 text-base"
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              {entityType === 'supplier' ? (
                <p>This amount will be deducted from the {entityType}'s outstanding pendingAmount.</p>
              ) : (
                <p>This amount will be deducted from the {entityType}'s pending amount.</p>
              )}
              
              {currentAmount > 0 && (
                <p className="mt-2 font-medium">
                  Current {entityType === 'supplier' ? 'pendingAmount' : 'pending amount'}: ₹{currentAmount.toFixed(2)}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex-col space-y-2 sm:space-y-0 sm:flex-row mt-4 sm:mt-6">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 text-sm font-medium"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 text-sm font-medium"
            >
              {isSubmitting ? 'Processing...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}