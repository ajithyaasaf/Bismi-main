import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Customer } from "@shared/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as CustomerService from "@/lib/customer-service";  // Import dedicated Customer service

interface CustomerFormProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerForm({ customer, isOpen, onClose }: CustomerFormProps) {
  const [name, setName] = useState(customer?.name || "");
  const [type, setType] = useState(customer?.type || "hotel");
  const [contact, setContact] = useState(customer?.contact || "");
  const [pendingAmount, setPendingAmount] = useState(customer?.pendingAmount?.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditing = Boolean(customer);
  
  const handleSubmit = async () => {
    // Validate
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a customer name",
        variant: "destructive",
      });
      return;
    }
    
    const pendingValue = parseFloat(pendingAmount);
    if (isNaN(pendingValue) || pendingValue < 0) {
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
      const customerData = {
        name,
        type,
        contact,
        pendingAmount: pendingValue,
      };
      
      if (isEditing && customer) {
        // Update via API only - single source of truth
        await apiRequest('PUT', `/api/customers/${customer.id}`, customerData);
        
        toast({
          title: "Customer updated",
          description: `${name} has been updated successfully`,
        });
      } else {
        // Create via API only - single source of truth
        await apiRequest('POST', '/api/customers', customerData);
        
        toast({
          title: "Customer added",
          description: `${name} has been added successfully`,
        });
      }
      
      // Refresh customers data and dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      // Close modal and reset form
      setName("");
      setType("hotel");
      setContact("");
      setPendingAmount("0");
      onClose();
    } catch (error) {
      console.error("Failed to save customer:", error);
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update customer" 
          : "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Customer: ${customer?.name}` : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Enter customer name"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select 
                value={type} 
                onValueChange={setType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contact" className="text-right">
              Contact
            </Label>
            <Input
              id="contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="col-span-3"
              placeholder="Enter contact details"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pendingAmount" className="text-right">
              Pending (₹)
            </Label>
            <Input
              id="pendingAmount"
              type="number"
              value={pendingAmount}
              onChange={(e) => setPendingAmount(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}