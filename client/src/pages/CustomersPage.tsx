import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Customer, Order } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersList from "@/components/customers/CustomersList";
import PaymentModal from "@/components/modals/PaymentModal";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { CustomerInvoice } from "@/components/invoices/CustomerInvoice";

export default function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<{id: string, name: string, pendingAmount: number} | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsFormOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const response = await apiRequest('DELETE', `/api/customers/${customerToDelete.id}`);
      
      if (response.ok) {
        toast({
          title: "Customer deleted",
          description: "The customer has been successfully deleted.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      } else {
        throw new Error('Failed to delete customer');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
  };

  const handleMakePayment = (customer: {id: string, name: string, pendingAmount: number}) => {
    setPaymentCustomer(customer);
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentCustomer(null);
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  };

  const handleGenerateInvoice = (customer: Customer) => {
    setInvoiceCustomer(customer);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceCustomer(null);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button onClick={handleAddCustomer}>
          Add Customer
        </Button>
      </div>

      <CustomersList 
        customers={customers}
        isLoading={isLoading}
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onMakePayment={handleMakePayment}
        onGenerateInvoice={handleGenerateInvoice}
      />

      {isFormOpen && (
        <CustomerForm 
          isOpen={isFormOpen}
          onClose={closeForm}
          customer={selectedCustomer}
        />
      )}

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        title="Delete Customer"
        description={customerToDelete ? `Are you sure you want to delete ${customerToDelete.name}? This action cannot be undone.` : ""}
      />

      {paymentModalOpen && paymentCustomer && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={closePaymentModal}
          entityType="customer"
          entityId={paymentCustomer.id}
          entityName={paymentCustomer.name}
          currentDebt={paymentCustomer.pendingAmount}
        />
      )}

      {isInvoiceModalOpen && invoiceCustomer && (
        <CustomerInvoice
          isOpen={isInvoiceModalOpen}
          onClose={closeInvoiceModal}
          customer={invoiceCustomer}
          orders={orders.filter(order => order.customerId === invoiceCustomer.id)}
        />
      )}
    </>
  );
}