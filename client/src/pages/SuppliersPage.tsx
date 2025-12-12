import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Supplier } from "@shared/types";
import { Button } from "@/components/ui/button";
import SupplierForm from "@/components/suppliers/SupplierForm";
import SuppliersList from "@/components/suppliers/SuppliersList";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import PaymentModal from "@/components/modals/PaymentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { processSupplierPayment } from "@/lib/supplier-service";
import { SuppliersSkeleton } from "@/components/skeletons";
import { useSkeletonTimer } from "@/hooks/use-skeleton-timer";

export default function SuppliersPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [supplierForPayment, setSupplierForPayment] = useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Use skeleton timer for minimum 0.5 second display
  const showSkeleton = useSkeletonTimer(isLoading, 500);

  const openForm = (supplier?: Supplier) => {
    setSelectedSupplier(supplier || null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedSupplier(null);
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
  };

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;

    try {
      setIsDeletingSupplier(true);
      const response = await apiRequest('DELETE', `/api/suppliers/${supplierToDelete.id}`);
      
      if (response.ok) {
        toast({
          title: "Supplier deleted",
          description: "The supplier has been successfully deleted.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      } else {
        throw new Error('Failed to delete supplier');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the supplier. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingSupplier(false);
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    }
  };

  const cancelDeleteSupplier = () => {
    setIsDeleteDialogOpen(false);
    setSupplierToDelete(null);
  };

  const openPaymentModal = (supplier: Supplier) => {
    setSupplierForPayment(supplier);
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSupplierForPayment(null);
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  };

  const handlePaymentSubmit = async (amount: number) => {
    if (!supplierForPayment) return;

    try {
      console.log(`[UI] Starting payment of ₹${amount} for supplier ${supplierForPayment.name} (ID: ${supplierForPayment.id})`);
      console.log(`[UI] Current pending amount before payment: ₹${supplierForPayment.pendingAmount}`);
      
      await processSupplierPayment(
        supplierForPayment.id,
        amount,
        `Payment to ${supplierForPayment.name}`
      );

      console.log(`[UI] Payment completed, invalidating queries`);
      
      // Force immediate cache refresh
      await queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      await queryClient.refetchQueries({ queryKey: ['/api/suppliers'] });

      toast({
        title: "Payment recorded",
        description: `Payment of ₹${amount.toFixed(2)} has been recorded for ${supplierForPayment.name}.`,
      });
    } catch (error) {
      console.error('[UI] Payment error:', error);
      toast({
        title: "Error",
        description: "Failed to record the payment. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (showSkeleton) {
    return <SuppliersSkeleton />;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Suppliers</h1>
        <Button onClick={() => openForm()}>
          Add Supplier
        </Button>
      </div>

      <SuppliersList 
        suppliers={suppliers}
        isLoading={false}
        onEdit={openForm}
        onDelete={handleDeleteSupplier}
        onPayment={(supplierId, supplierName) => {
          const supplier = suppliers.find(s => s.id === supplierId);
          if (supplier) openPaymentModal(supplier);
        }}
      />

      {isFormOpen && (
        <SupplierForm 
          isOpen={isFormOpen}
          onClose={closeForm}
          supplier={selectedSupplier}
        />
      )}

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={confirmDeleteSupplier}
        onClose={cancelDeleteSupplier}
        title="Delete Supplier"
        description={supplierToDelete ? `Are you sure you want to delete ${supplierToDelete.name}? This action cannot be undone.` : ""}
        isLoading={isDeletingSupplier}
        variant="destructive"
      />

      {isPaymentModalOpen && supplierForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          onSubmit={handlePaymentSubmit}
          entityType="supplier"
          entityName={supplierForPayment.name}
          currentAmount={supplierForPayment.pendingAmount || 0}
        />
      )}
    </>
  );
}