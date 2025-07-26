import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, Minus, AlertCircle } from 'lucide-react';

interface DebtAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  hotelName: string;
  adjustmentType: 'debit' | 'credit';
  onSuccess: () => void;
}

export function DebtAdjustmentModal({
  isOpen,
  onClose,
  hotelId,
  hotelName,
  adjustmentType,
  onSuccess
}: DebtAdjustmentModalProps) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adjustedBy, setAdjustedBy] = useState('');
  const { toast } = useToast();

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: { type: 'debit' | 'credit'; amount: number; reason: string; adjustedBy: string }) => {
      const response = await apiRequest('POST', `/api/hotels/${hotelId}/debt-adjustments`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Adjustment Created',
        description: `Successfully added ${adjustmentType} adjustment for ${hotelName}`,
      });
      onSuccess();
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create debt adjustment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Missing Reason',
        description: 'Please provide a reason for this adjustment',
        variant: 'destructive',
      });
      return;
    }

    createAdjustmentMutation.mutate({
      type: adjustmentType,
      amount: amountNum,
      reason: reason.trim(),
      adjustedBy: adjustedBy.trim() || 'System'
    });
  };

  const handleClose = () => {
    setAmount('');
    setReason('');
    setAdjustedBy('');
    onClose();
  };

  const isDebit = adjustmentType === 'debit';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDebit ? (
              <Plus className="h-5 w-5 text-red-600" />
            ) : (
              <Minus className="h-5 w-5 text-green-600" />
            )}
            {isDebit ? 'Add Charge' : 'Add Credit'} - {hotelName}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Information Alert */}
          <Alert className={isDebit ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isDebit ? (
                <>This will <strong>increase</strong> the hotel's debt by the specified amount.</>
              ) : (
                <>This will <strong>decrease</strong> the hotel's debt by the specified amount.</>
              )}
            </AlertDescription>
          </Alert>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-medium">
              Amount (₹) *
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-base"
              required
            />
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason *
            </Label>
            <Textarea
              id="reason"
              placeholder={isDebit ? 
                "e.g., Additional service charges, Late payment fee, Extra delivery charges" :
                "e.g., Payment received, Discount applied, Refund processed"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-base min-h-[80px]"
              required
            />
          </div>

          {/* Adjusted By Input */}
          <div className="space-y-2">
            <Label htmlFor="adjustedBy" className="text-sm font-medium">
              Adjusted By
            </Label>
            <Input
              id="adjustedBy"
              placeholder="Your name (optional)"
              value={adjustedBy}
              onChange={(e) => setAdjustedBy(e.target.value)}
              className="text-base"
            />
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className={`p-3 rounded-lg border ${isDebit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <div className="text-sm font-medium">Preview:</div>
              <div className={`text-lg font-bold ${isDebit ? 'text-red-600' : 'text-green-600'}`}>
                {isDebit ? '+' : '-'}₹{parseFloat(amount).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">
                {isDebit ? 'Will be added to' : 'Will be subtracted from'} hotel's debt
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createAdjustmentMutation.isPending}
              className={isDebit ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {createAdjustmentMutation.isPending ? (
                'Processing...'
              ) : (
                <>
                  {isDebit ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                  {isDebit ? 'Add Charge' : 'Add Credit'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}