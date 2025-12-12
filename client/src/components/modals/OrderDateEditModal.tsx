import { useState, useEffect } from 'react';
import { Order } from '@shared/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OrderDateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSave: (orderId: string, newDate: string) => Promise<void>;
}

export default function OrderDateEditModal({ 
  isOpen, 
  onClose, 
  order, 
  onSave 
}: OrderDateEditModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Initialize selectedDate when modal opens with an order
  useEffect(() => {
    if (order && isOpen) {
      try {
        const orderDate = typeof order.createdAt === 'string' ? 
          parseISO(order.createdAt) : 
          order.createdAt instanceof Date ? order.createdAt : new Date();
        setSelectedDate(orderDate);
      } catch (error) {
        console.error('Error parsing order date:', error);
        setSelectedDate(new Date());
      }
    }
  }, [order, isOpen]);

  const handleSave = async () => {
    if (!order || !selectedDate) {
      toast({
        title: "Error",
        description: "Please select a valid date.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert to ISO string for backend
      const isoDateString = selectedDate.toISOString();
      await onSave(order.id, isoDateString);
      
      toast({
        title: "Date Updated",
        description: `Order date changed to ${format(selectedDate, 'PPP')}`,
      });
      
      onClose();
    } catch (error) {
      console.error('Error updating order date:', error);
      toast({
        title: "Update Failed",
        description: "Could not update the order date. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      setIsCalendarOpen(false);
    }
  };

  if (!order) return null;

  const currentDateDisplay = selectedDate ? format(selectedDate, 'PPP') : 'Select date';
  const originalDate = typeof order.createdAt === 'string' ? 
    parseISO(order.createdAt) : 
    order.createdAt instanceof Date ? order.createdAt : new Date();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader className="text-center sm:text-left">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-blue-600" />
            Edit Order Date
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Order ID:</span>
              <span className="ml-2 font-mono text-gray-900">
                {order.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Current Date:</span>
              <span className="ml-2 text-gray-900">
                {format(originalDate, 'PPP')}
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="orderDate" className="text-sm font-medium">
              New Date
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="orderDate"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                  disabled={isSaving}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentDateDisplay}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setIsCalendarOpen(false);
                  }}
                  initialFocus
                  disabled={(date) => 
                    date > new Date() || date < new Date('2020-01-01')
                  }
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500">
              Select the correct date for this order
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !selectedDate}
            className="w-full sm:w-auto"
          >
            {isSaving ? 'Updating...' : 'Update Date'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}