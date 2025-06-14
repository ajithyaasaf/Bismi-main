import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Supplier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import SupplierForm from "@/components/suppliers/SupplierForm";
import SuppliersList from "@/components/suppliers/SuppliersList";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import PaymentModal from "@/components/modals/PaymentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as SupplierService from "@/lib/supplier-service";

export default function SuppliersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [firestoreSuppliers, setFirestoreSuppliers] = useState<any[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [supplierForPayment, setSupplierForPayment] = useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load suppliers from Firestore directly
  useEffect(() => {
    async function loadFirestoreSuppliers() {
      try {
        setIsFirestoreLoading(true);
        const suppliers = await SupplierService.getSuppliers();
        console.log("Loaded suppliers directly from Firestore:", suppliers);
        setFirestoreSuppliers(suppliers);
      } catch (error) {
        console.error("Error loading suppliers from Firestore:", error);
      } finally {
        setIsFirestoreLoading(false);
      }
    }
    
    loadFirestoreSuppliers();
  }, []);
  
  // Fetch suppliers from API as backup
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const handleAddClick = () => {
    setSelectedSupplier(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!supplierToDelete || isDeletingSupplier) return;
    
    try {
      setIsDeletingSupplier(true);
      console.log(`Deleting supplier via API with ID: ${supplierToDelete.id}`);
      
      // Use API as the single source of truth for enterprise-level consistency
      await apiRequest('DELETE', `/api/suppliers/${supplierToDelete.id}`, undefined);
      
      toast({
        title: "Supplier deleted",
        description: `${supplierToDelete.name} has been successfully deleted`,
      });
      
      // Update local Firestore state immediately for instant UI feedback
      setFirestoreSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
      
      // Refresh data via query cache to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      
      // Close dialog immediately on success
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
      
      // Refresh Firestore data in background to maintain dual-source sync
      setTimeout(async () => {
        try {
          const refreshedSuppliers = await SupplierService.getSuppliers();
          console.log("Background refresh after deletion:", refreshedSuppliers.length, "suppliers");
          setFirestoreSuppliers(refreshedSuppliers);
        } catch (error) {
          console.error("Background refresh failed:", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error during supplier deletion:", error);
      
      // Enhanced error handling for different scenarios
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isNotFoundError = errorMessage.includes('404') || errorMessage.includes('SUPPLIER_NOT_FOUND');
      
      if (isNotFoundError) {
        // Supplier was already deleted or doesn't exist, treat as success
        console.log("Supplier was already deleted, updating UI accordingly");
        toast({
          title: "Supplier deleted",
          description: `${supplierToDelete.name} has been successfully removed`,
        });
        
        // Update local state
        setFirestoreSuppliers(prev => prev.filter(s => s.id !== supplierToDelete.id));
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      } else {
        // Actual deletion error
        console.error("Actual deletion error occurred:", error);
        toast({
          title: "Error",
          description: "Failed to delete supplier. Please try again.",
          variant: "destructive",
        });
      }
    }
    
    // Always close the dialog and cleanup state
    setIsDeleteDialogOpen(false);
    setSupplierToDelete(null);
    setIsDeletingSupplier(false);
  };

  const handlePayment = (supplierId: string, supplierName: string) => {
    // Find the supplier object to get full details
    const supplier = firestoreSuppliers.find(s => s.id === supplierId) || 
                   suppliers.find(s => s.id === supplierId);
    
    if (supplier) {
      setSupplierForPayment(supplier);
      setIsPaymentModalOpen(true);
    }
  };

  const processPayment = async (amount: number) => {
    if (!supplierForPayment) return;
    
    try {
      console.log(`Processing payment for supplier ${supplierForPayment.id} (${supplierForPayment.name}): ${amount}`);
      
      // Use API only - single source of truth
      await apiRequest('POST', `/api/suppliers/${supplierForPayment.id}/payment`, { 
        amount,
        description: `Payment to supplier: ${supplierForPayment.name}`
      });
      
      toast({
        title: "Payment recorded",
        description: `Payment of ₹${amount.toFixed(2)} to ${supplierForPayment.name} has been recorded`,
      });
      
      // Update local Firestore state immediately for instant UI update
      setFirestoreSuppliers(prev => 
        prev.map(supplier => 
          supplier.id === supplierForPayment.id 
            ? { ...supplier, debt: Math.max(0, (supplier.debt || 0) - amount) }
            : supplier
        )
      );
      
      // Refresh data via query cache
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Refresh Firestore data in background to ensure consistency
      setTimeout(async () => {
        try {
          const updatedSuppliers = await SupplierService.getSuppliers();
          setFirestoreSuppliers(updatedSuppliers);
        } catch (error) {
          console.error("Error refreshing suppliers from Firestore:", error);
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error during payment processing:", error);
      toast({
        title: "Payment failed",
        description: "There was an error recording the payment",
        variant: "destructive",
      });
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    
    // Refresh Firestore data
    async function refreshFirestoreSuppliers() {
      try {
        const suppliers = await SupplierService.getSuppliers();
        console.log("Refreshed suppliers from Firestore:", suppliers);
        setFirestoreSuppliers(suppliers);
      } catch (error) {
        console.error("Error refreshing suppliers from Firestore:", error);
      }
    }
    
    refreshFirestoreSuppliers();
  };

  // Determine which suppliers to display
  const displaySuppliers = firestoreSuppliers.length > 0 ? firestoreSuppliers : suppliers;
  const isPageLoading = isFirestoreLoading && isLoading;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-sans">Suppliers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage supplier information and debts</p>
        </div>
        <Button onClick={handleAddClick}>
          <i className="fas fa-plus mr-2"></i> Add Supplier
        </Button>
      </div>

      {isPageLoading ? (
        <div className="text-center py-10">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-600">Loading suppliers...</p>
        </div>
      ) : (
        <>
          <SuppliersList 
            suppliers={displaySuppliers as Supplier[]} 
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onPayment={handlePayment}
          />
        </>
      )}

      {isFormOpen && (
        <SupplierForm
          supplier={selectedSupplier}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
        />
      )}
      
      {supplierToDelete && (
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => !isDeletingSupplier && setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          description={`Are you sure you want to delete ${supplierToDelete.name}? This action cannot be undone.`}
          confirmText={isDeletingSupplier ? "Deleting..." : "Delete"}
          cancelText="Cancel"
          variant="destructive"
          isLoading={isDeletingSupplier}
        />
      )}
      
      {supplierForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={processPayment}
          title={`Payment to ${supplierForPayment.name}`}
          entityName={supplierForPayment.name}
          entityType="supplier"
          currentAmount={supplierForPayment.debt || 0}
          description={`Record a payment to supplier ${supplierForPayment.name}`}
        />
      )}
    </div>
  );
}
