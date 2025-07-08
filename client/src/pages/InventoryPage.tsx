import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inventory } from "@shared/types";
import { Button } from "@/components/ui/button";
import InventoryForm from "@/components/inventory/InventoryForm";
import InventoryList from "@/components/inventory/InventoryList";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { InventorySkeleton } from "@/components/skeletons";
import { useSkeletonTimer } from "@/hooks/use-skeleton-timer";

export default function InventoryPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Inventory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch inventory from API
  const { data: inventory = [], isLoading } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  // Use skeleton timer for minimum 0.5 second display
  const showSkeleton = useSkeletonTimer(isLoading, 500);

  const handleAddClick = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: Inventory) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (item: Inventory) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClick = async () => {
    if (!itemToDelete) return;
    
    try {
      console.log(`Deleting inventory item: ${itemToDelete.id}`);
      
      await apiRequest('DELETE', `/api/inventory/${itemToDelete.id}`, undefined);
      
      toast({
        title: "Item deleted",
        description: `${itemToDelete.type} has been successfully deleted`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      
    } catch (error) {
      console.error("Error during inventory item deletion:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('ITEM_NOT_FOUND');
      
      if (isNotFoundError) {
        console.log("Item was already deleted, updating UI accordingly");
        toast({
          title: "Item deleted",
          description: `${itemToDelete.type} has been successfully removed`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      } else {
        console.error("Actual deletion error occurred:", error);
        toast({
          title: "Error",
          description: "Failed to delete inventory item. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    // Invalidate and refetch inventory data
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  };

  if (showSkeleton) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-sans">Inventory</h1>
          <p className="mt-1 text-sm text-gray-500">Manage stock levels and prices</p>
        </div>
        <Button onClick={handleAddClick}>
          <i className="fas fa-plus mr-2"></i> Add Item
        </Button>
      </div>

      <InventoryList 
        items={inventory}
        isLoading={false}
        onEdit={handleEditClick}
        onDelete={handleDeleteRequest}
      />

      <InventoryForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        item={selectedItem}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteClick}
        title="Delete Inventory Item"
        description={
          itemToDelete 
            ? `Are you sure you want to delete "${itemToDelete.type}"? This action cannot be undone.`
            : ""
        }
        variant="destructive"
      />
    </div>
  );
}