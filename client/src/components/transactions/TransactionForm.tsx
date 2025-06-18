import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Supplier, Customer } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  customers: Customer[];
}

export default function TransactionForm({ isOpen, onClose, suppliers, customers }: TransactionFormProps) {
  const [entityType, setEntityType] = useState('supplier');
  const [entityId, setEntityId] = useState('');
  const [type, setType] = useState('payment');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEntityType('supplier');
      setEntityId('');
      setType('payment');
      setAmount('');
      setDescription('');
    }
  }, [isOpen]);
  
  // Handle entity type change
  const handleEntityTypeChange = (value: string) => {
    setEntityType(value);
    setEntityId(''); // Reset entity selection when type changes
    
    // Reset transaction type based on entity type with proper defaults
    if (value === 'supplier') {
      setType('payment'); // Default to payment for suppliers
    } else {
      setType('receipt'); // Default to receipt for customers
    }
  };
  
  // Handle transaction type change with proper validation
  const handleTypeChange = (value: string) => {
    // Validate transaction type based on entity type
    if (entityType === 'supplier' && !['payment', 'purchase'].includes(value)) {
      toast({
        title: "Invalid transaction type",
        description: "Suppliers can only have payment or purchase transactions",
        variant: "destructive",
      });
      return;
    }
    if (entityType === 'customer' && !['receipt', 'refund'].includes(value)) {
      toast({
        title: "Invalid transaction type", 
        description: "Customers can only have receipt or refund transactions",
        variant: "destructive",
      });
      return;
    }
    setType(value);
  };
  
  // Get entity options based on type
  const getEntityOptions = () => {
    if (entityType === 'supplier') {
      return suppliers;
    } else {
      return customers;
    }
  };
  
  // Get entity name from ID
  const getEntityName = (id: string) => {
    const entity = getEntityOptions().find(e => e.id === id);
    return entity ? entity.name : '';
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    // Validate
    if (!entityId) {
      toast({
        title: entityType === 'supplier' ? "Supplier required" : "Customer required",
        description: `Please select a ${entityType}`,
        variant: "destructive",
      });
      return;
    }
    
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Invalid amount",
        description: "Amount must be a valid positive number",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data
      const transactionData = {
        entityId,
        entityType,
        amount: amountValue,
        type,
        date: new Date(),
        description: description || `${type === 'payment' ? 'Payment to' : 'Receipt from'} ${getEntityName(entityId)}`
      };
      
      // Create transaction
      await apiRequest('POST', '/api/transactions', transactionData);
      
      // Show success message
      toast({
        title: "Transaction created",
        description: `Transaction has been recorded successfully`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Also invalidate suppliers or customers cache
      if (entityType === 'supplier') {
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      }
      
      // Reset form and close modal
      setEntityType('supplier');
      setEntityId('');
      setType('payment');
      setAmount('');
      setDescription('');
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[450px] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            Add New Transaction
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Entity Type */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="entity-type" className="text-sm font-medium sm:text-right">
              Entity Type
            </Label>
            <div className="sm:col-span-3">
              <Select 
                value={entityType} 
                onValueChange={handleEntityTypeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Entity Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="entity" className="text-sm font-medium sm:text-right">
              {entityType === 'supplier' ? 'Supplier' : 'Customer'}
            </Label>
            <div className="sm:col-span-3">
              <Select 
                value={entityId} 
                onValueChange={setEntityId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select ${entityType}`} />
                </SelectTrigger>
                <SelectContent>
                  {getEntityOptions().map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Transaction Type */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="transaction-type" className="text-sm font-medium sm:text-right">
              Transaction
            </Label>
            <div className="sm:col-span-3">
              <Select 
                value={type} 
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent>
                  {entityType === 'supplier' ? (
                    <>
                      <SelectItem value="payment">Payment (To Supplier)</SelectItem>
                      <SelectItem value="purchase">Purchase (From Supplier)</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="receipt">Receipt (From Customer)</SelectItem>
                      <SelectItem value="refund">Refund (To Customer)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="amount" className="text-sm font-medium sm:text-right">
              Amount (₹)
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="sm:col-span-3"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          
          {/* Description */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2 sm:gap-4">
            <Label htmlFor="description" className="text-sm font-medium sm:text-right pt-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="sm:col-span-3"
              placeholder="Optional description"
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Creating...' : 'Create Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
