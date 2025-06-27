import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { Supplier } from '@shared/types';
import { ITEM_TYPES } from '@shared/constants';
import { apiRequest } from '@/lib/queryClient';
import * as InventoryService from '@/lib/inventory-service';
import * as SupplierService from '@/lib/supplier-service';
import * as TransactionService from '@/lib/transaction-service';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
}

export default function AddStockModal({ isOpen, onClose, suppliers }: AddStockModalProps) {
  const [supplier, setSupplier] = useState('');
  const [type, setType] = useState('chicken');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [total, setTotal] = useState('0.00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Item types from centralized constants
  const itemTypes = ITEM_TYPES;
  
  // Calculate total when quantity or rate changes
  useEffect(() => {
    if (quantity && rate) {
      const totalValue = parseFloat(quantity) * parseFloat(rate);
      setTotal(totalValue.toFixed(2));
    } else {
      setTotal('0.00');
    }
  }, [quantity, rate]);
  
  // Reset form
  const resetForm = () => {
    setSupplier('');
    setType('chicken');
    setQuantity('');
    setRate('');
    setTotal('0.00');
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validate inputs
      if (!supplier) {
        toast({
          title: "Missing supplier",
          description: "Please select a supplier",
          variant: "destructive"
        });
        return;
      }

      // Validate supplier exists
      const selectedSupplier = suppliers.find(s => s.id === supplier);
      if (!selectedSupplier) {
        toast({
          title: "Invalid supplier",
          description: "Selected supplier not found",
          variant: "destructive"
        });
        return;
      }
      
      if (!type) {
        toast({
          title: "Missing item type",
          description: "Please select an item type",
          variant: "destructive"
        });
        return;
      }
      
      const qtyNum = parseFloat(quantity);
      if (isNaN(qtyNum)) {
        toast({
          title: "Invalid quantity",
          description: "Please enter a valid number (negative values allowed for stock adjustments)",
          variant: "destructive"
        });
        return;
      }
      
      const rateNum = parseFloat(rate);
      if (isNaN(rateNum) || rateNum <= 0) {
        toast({
          title: "Invalid rate",
          description: "Please enter a valid positive rate",
          variant: "destructive"
        });
        return;
      }
      
      setIsSubmitting(true);
      
      // Add stock via API - single source of truth
      // The API will handle inventory updates, supplier pendingAmount, and transaction creation
      await apiRequest('POST', '/api/add-stock', {
        type,
        quantity: qtyNum,
        price: rateNum,
        supplierId: supplier
      });
      
      // Show success message
      toast({
        title: "Stock added",
        description: `Added ${qtyNum} kg of ${type} to inventory`
      });
      
      // Refresh queries and dashboard data
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Close modal and reset form
      resetForm();
      onClose();
      
    } catch (error) {
      toast({
        title: "Error adding stock",
        description: "There was an error adding stock to inventory",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
          <DialogDescription>
            Add new stock items to your inventory
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 sm:space-y-4 py-2">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="stock-supplier" className="text-sm font-medium text-foreground">
              Supplier
            </Label>
            <Select 
              value={supplier} 
              onValueChange={setSupplier}
            >
              <SelectTrigger className="w-full h-11 sm:h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Item Type */}
          <div className="space-y-2">
            <Label htmlFor="stock-type" className="text-sm font-medium text-foreground">
              Item Type
            </Label>
            <Select 
              value={type} 
              onValueChange={setType}
            >
              <SelectTrigger className="w-full h-11 sm:h-10 text-base sm:text-sm">
                <SelectValue placeholder="Select item type" />
              </SelectTrigger>
              <SelectContent>
                {itemTypes.map(item => (
                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Quantity and Rate - Grid on mobile for space efficiency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stock-quantity" className="text-sm font-medium text-foreground">
                Quantity (kg)
              </Label>
              <Input
                id="stock-quantity"
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11 sm:h-10 text-base sm:text-sm"
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="stock-rate" className="text-sm font-medium text-foreground">
                Rate (₹ per kg)
              </Label>
              <Input
                id="stock-rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="h-11 sm:h-10 text-base sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {/* Total Amount - Highlighted */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Total Amount (₹)
            </Label>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="text-center">
                <span className="text-2xl sm:text-xl font-bold text-green-800">₹{total}</span>
                <p className="text-xs text-green-600 mt-1">Calculated automatically</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation" 
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full sm:w-auto h-11 sm:h-10 text-base sm:text-sm font-medium touch-manipulation"
          >
            {isSubmitting ? 'Adding Stock...' : 'Add Stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
