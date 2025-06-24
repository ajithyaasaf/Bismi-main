import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Customer, Order } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { processCustomerPayment } from "@/lib/customer-service";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersList from "@/components/customers/CustomersList";
import SmartPaymentModal from "@/components/modals/SmartPaymentModal";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { CustomerInvoice } from "@/components/invoices/CustomerInvoice";
import { CustomersSkeleton } from "@/components/skeletons";
import { useSkeletonTimer } from "@/hooks/use-skeleton-timer";

export default function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [smartPaymentCustomer, setSmartPaymentCustomer] = useState<Customer | null>(null);
  const [isSmartPaymentModalOpen, setIsSmartPaymentModalOpen] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Use skeleton timer for minimum 0.5 second display
  const showSkeleton = useSkeletonTimer(isLoading, 500);

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

  const handleMakePayment = (customerId: string, customerName: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSmartPaymentCustomer(customer);
      setIsSmartPaymentModalOpen(true);
    }
  };

  const handleSmartPaymentSubmit = async (payments: Array<{orderId: string, amount: number, description: string}>) => {
    if (!smartPaymentCustomer) return;

    try {
      // Process multiple order payments in sequence
      for (const payment of payments) {
        await processCustomerPayment(
          smartPaymentCustomer.id, 
          payment.amount, 
          payment.description,
          payment.orderId
        );
      }
      
      setIsSmartPaymentModalOpen(false);
      setSmartPaymentCustomer(null);
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
    } catch (error) {
      console.error('Smart payment failed:', error);
      toast({
        title: "Payment failed",
        description: "Failed to process payment allocation. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let modal handle the error
    }
  };

  const closeSmartPaymentModal = () => {
    setIsSmartPaymentModalOpen(false);
    setSmartPaymentCustomer(null);
  };

  const handleGenerateInvoice = (customer: Customer) => {
    setInvoiceCustomer(customer);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceCustomer(null);
  };

  if (showSkeleton) {
    return <CustomersSkeleton />;
  }

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
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
        onPayment={handleMakePayment}
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
        onClose={cancelDelete}
        title="Delete Customer"
        description={customerToDelete ? `Are you sure you want to delete ${customerToDelete.name}? This action cannot be undone.` : ""}
        variant="destructive"
      />

      {isSmartPaymentModalOpen && smartPaymentCustomer && (
        <SmartPaymentModal
          isOpen={isSmartPaymentModalOpen}
          onClose={closeSmartPaymentModal}
          onSubmit={handleSmartPaymentSubmit}
          customer={smartPaymentCustomer}
          orders={orders}
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