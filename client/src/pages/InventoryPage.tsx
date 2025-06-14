import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Inventory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import InventoryForm from "@/components/inventory/InventoryForm";
import InventoryList from "@/components/inventory/InventoryList";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as InventoryService from "@/lib/inventory-service";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";

export default function InventoryPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [firestoreInventory, setFirestoreInventory] = useState<any[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Inventory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Load inventory from Firestore directly
  useEffect(() => {
    async function loadFirestoreInventory() {
      try {
        setIsFirestoreLoading(true);
        const items = await InventoryService.getInventoryItems();
        console.log("Loaded inventory directly from Firestore:", items);
        setFirestoreInventory(items);
      } catch (error) {
        console.error("Error loading inventory from Firestore:", error);
      } finally {
        setIsFirestoreLoading(false);
      }
    }
    
    loadFirestoreInventory();
  }, []);

  // Fetch inventory from API as backup
  const { data: inventory = [], isLoading } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const handleAddClick = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (item: Inventory) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (item: Inventory) => {
    setItemToDelete(item);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      console.log(`Deleting inventory item via API with ID: ${itemToDelete.id}`);
      
      // Use API as the single source of truth for enterprise-level consistency
      await apiRequest('DELETE', `/api/inventory/${itemToDelete.id}`, undefined);
      
      toast({
        title: "Item deleted",
        description: `${itemToDelete.type} has been successfully deleted`,
      });
      
      // Update local state immediately for instant UI feedback
      setFirestoreInventory((prev: any) => prev.filter((i: any) => i.id !== itemToDelete.id));
      
      // Refresh data via query cache to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      
      // Close dialog immediately on success
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      
      // Refresh Firestore data in background to maintain dual-source sync
      setTimeout(async () => {
        try {
          const refreshedInventory = await InventoryService.getInventoryItems();
          console.log("Background refresh after deletion:", refreshedInventory.length, "items");
          setFirestoreInventory(refreshedInventory);
        } catch (error) {
          console.error("Background refresh failed:", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error during inventory item deletion:", error);
      
      // Enhanced error handling for different scenarios
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('ITEM_NOT_FOUND');
      
      if (isNotFoundError) {
        // Item was already deleted or doesn't exist, treat as success
        console.log("Item was already deleted, updating UI accordingly");
        toast({
          title: "Item deleted",
          description: `${itemToDelete.type} has been successfully removed`,
        });
        
        // Update local state
        setFirestoreInventory((prev: any) => prev.filter((i: any) => i.id !== itemToDelete.id));
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      } else {
        // Actual deletion error
        console.error("Actual deletion error occurred:", error);
        toast({
          title: "Error",
          description: "Failed to delete inventory item. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    // Always close the dialog and cleanup state
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    
    // Refresh Firestore data
    async function refreshFirestoreInventory() {
      try {
        const items = await InventoryService.getInventoryItems();
        console.log("Refreshed inventory from Firestore:", items);
        setFirestoreInventory(items);
      } catch (error) {
        console.error("Error refreshing inventory from Firestore:", error);
      }
    }
    
    refreshFirestoreInventory();
  };

  // Determine which inventory items to display
  const displayItems = firestoreInventory.length > 0 ? firestoreInventory : inventory;
  const isPageLoading = isFirestoreLoading && isLoading;

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

      {isPageLoading ? (
        <div className="text-center py-10">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-600">Loading inventory...</p>
        </div>
      ) : (
        <>
          <InventoryList 
            items={displayItems as Inventory[]} 
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </>
      )}

      {isFormOpen && (
        <InventoryForm
          item={selectedItem}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
        />
      )}
      
      {itemToDelete && (
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          description={`Are you sure you want to delete ${itemToDelete.type}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}
    </div>
  );
}
