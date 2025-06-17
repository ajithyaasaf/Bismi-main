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
        isLoading={isLoading}
        onEditSupplier={openForm}
        onDeleteSupplier={handleDeleteSupplier}
        onMakePayment={openPaymentModal}
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
        onCancel={cancelDeleteSupplier}
        title="Delete Supplier"
        description={supplierToDelete ? `Are you sure you want to delete ${supplierToDelete.name}? This action cannot be undone.` : ""}
        isLoading={isDeletingSupplier}
      />

      {isPaymentModalOpen && supplierForPayment && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={closePaymentModal}
          entityType="supplier"
          entityId={supplierForPayment.id}
          entityName={supplierForPayment.name}
          currentDebt={supplierForPayment.debt || 0}
        />
      )}
    </>
  );
}