import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Inventory } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface InventoryFormProps {
  item: Inventory | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function InventoryForm({ item, isOpen, onClose }: InventoryFormProps) {
  const [type, setType] = useState(item?.type || "chicken");
  const [quantity, setQuantity] = useState(item?.quantity.toString() || "0");
  const [rate, setRate] = useState(item?.rate.toString() || "0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isEditing = Boolean(item);
  
  // Item types
  const itemTypes = [
    { value: 'chicken', label: 'Chicken' },
    { value: 'eeral', label: 'Eeral' },
    { value: 'leg-piece', label: 'Leg Piece' },
    { value: 'goat', label: 'Goat' },
    { value: 'kadai', label: 'Kadai' },
    { value: 'beef', label: 'Beef' }
  ];
  
  const handleSubmit = async () => {
    // Validate
    if (!type) {
      toast({
        title: "Type required",
        description: "Please select an item type",
        variant: "destructive",
      });
      return;
    }
    
    const quantityValue = parseFloat(quantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be a valid positive number or zero",
        variant: "destructive",
      });
      return;
    }
    
    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: "Invalid rate",
        description: "Rate must be a valid positive number",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare data
      const itemData = {
        type,
        quantity: quantityValue,
        rate: rateValue,
      };
      
      if (isEditing && item) {
        // Update existing item
        await apiRequest('PUT', `/api/inventory/${item.id}`, itemData);
        toast({
          title: "Inventory updated",
          description: `${type} has been updated successfully`,
        });
      } else {
        // Create new item
        await apiRequest('POST', '/api/inventory', itemData);
        toast({
          title: "Item added",
          description: `${type} has been added to inventory`,
        });
      }
      
      // Refresh inventory data
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      
      // Close modal
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing 
          ? "Failed to update inventory" 
          : "Failed to add inventory item",
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
            {isEditing ? `Edit Inventory: ${item?.type}` : "Add New Inventory Item"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <div className="col-span-3">
              <Select 
                value={type} 
                onValueChange={setType}
                disabled={isEditing} // Can't change type when editing
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  {itemTypes.map(item => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Quantity (kg)
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rate" className="text-right">
              Rate (₹/kg)
            </Label>
            <Input
              id="rate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
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
