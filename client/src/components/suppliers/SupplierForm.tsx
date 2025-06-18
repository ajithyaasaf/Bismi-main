import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Supplier } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as SupplierService from "@/lib/supplier-service"; // Import Supplier Firestore service

interface SupplierFormProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SupplierForm({ supplier, isOpen, onClose }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || "");
  const [contact, setContact] = useState(supplier?.contact || "");
  const [pendingAmount, setPendingAmount] = useState(supplier?.pendingAmount.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditing = Boolean(supplier);
  
  const handleSubmit = async () => {
    // Validate
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a supplier name",
        variant: "destructive",
      });
      return;
    }
    
    const pendingAmountValue = parseFloat(pendingAmount);
    if (isNaN(pendingAmountValue) || pendingAmountValue < 0) {
      toast({
        title: "Invalid pending amount",
        description: "Pending amount must be a valid positive number or zero",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data
      const supplierData = {
        name,
        contact,
        pendingAmount: pendingAmountValue,
      };
      
      if (isEditing && supplier) {
        // Update via API only - single source of truth
        await apiRequest('PUT', `/api/suppliers/${supplier.id}`, supplierData);
        
        toast({
          title: "Supplier updated",
          description: `${name} has been updated successfully`,
        });
      } else {
        // Create via API only - single source of truth
        await apiRequest('POST', '/api/suppliers', supplierData);
        
        toast({
          title: "Supplier added",
          description: `${name} has been added successfully`,
        });
      }
      
      // Refresh suppliers data and dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Close modal and reset form
      setName("");
      setContact("");
      setPendingAmount("0");
      onClose();
    } catch (error) {
      console.error("Error in supplier form submission:", error);
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update supplier" 
          : "Failed to add supplier",
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
            {isEditing ? `Edit Supplier: ${supplier?.name}` : "Add New Supplier"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="name" className="text-sm font-medium sm:text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="sm:col-span-3"
              placeholder="Enter supplier name"
            />
          </div>
          
          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="contact" className="text-sm font-medium sm:text-right">
              Contact
            </Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="sm:col-span-3"
              placeholder="Enter contact details"
            />
          </div>
          
          {/* Debt */}
          <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
            <Label htmlFor="pendingAmount" className="text-sm font-medium sm:text-right">
              Debt (₹)
            </Label>
            <Input
              id="pendingAmount"
              type="number"
              value={pendingAmount}
              onChange={(e) => setPendingAmount(e.target.value)}
              className="sm:col-span-3"
              placeholder="0.00"
              min="0"
              step="0.01"
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
