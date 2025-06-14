import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Customer, Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import CustomerForm from "@/components/customers/CustomerForm";
import CustomersList from "@/components/customers/CustomersList";
import PaymentModal from "@/components/modals/PaymentModal";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { CustomerInvoice } from "@/components/invoices/CustomerInvoice";
import * as CustomerService from "@/lib/customer-service";
import * as OrderService from "@/lib/order-service";

export default function CustomersPage() {
  const [firestoreCustomers, setFirestoreCustomers] = useState<any[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<any[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<{
    id: string;
    name: string;
    pendingAmount: number;
  } | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<Customer | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  // Load data from Firestore
  useEffect(() => {
    async function loadFirestoreData() {
      try {
        setIsFirestoreLoading(true);

        // Load customers from Firestore
        const customersData = await CustomerService.getCustomers();
        setFirestoreCustomers(customersData);

        // Load orders from Firestore
        const ordersData = await OrderService.getOrders();
        setFirestoreOrders(ordersData);

        console.log("Loaded customers directly from Firestore:", customersData);
        console.log("Loaded orders directly from Firestore:", ordersData);
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      } finally {
        setIsFirestoreLoading(false);
      }
    }

    loadFirestoreData();
  }, []);

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
      console.log(`Deleting customer via API with ID: ${customerToDelete.id}`);

      // Use API as the single source of truth for enterprise-level consistency
      await apiRequest("DELETE", `/api/customers/${customerToDelete.id}`);

      toast({
        title: "Customer deleted",
        description: `${customerToDelete.name} has been successfully deleted`,
      });

      // Update local state immediately for instant UI feedback
      setFirestoreCustomers((prev) =>
        prev.filter((c) => c.id !== customerToDelete.id),
      );

      // Refresh data via query cache to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      // Close dialog immediately on success
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);

      // Refresh Firestore data in background to maintain dual-source sync
      setTimeout(async () => {
        try {
          const refreshedCustomers = await CustomerService.getCustomers();
          console.log(
            "Background refresh after deletion:",
            refreshedCustomers.length,
            "customers",
          );
          setFirestoreCustomers(refreshedCustomers);
        } catch (error) {
          console.error("Background refresh failed:", error);
        }
      }, 1000);
    } catch (error) {
      console.error("Error during customer deletion:", error);

      // Enhanced error handling for different scenarios
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isNotFoundError =
        errorMessage.includes("404") ||
        errorMessage.includes("CUSTOMER_NOT_FOUND");

      if (isNotFoundError) {
        // Customer was already deleted or doesn't exist, treat as success
        console.log("Customer was already deleted, updating UI accordingly");
        toast({
          title: "Customer deleted",
          description: `${customerToDelete.name} has been successfully removed`,
        });

        // Update local state
        setFirestoreCustomers((prev) =>
          prev.filter((c) => c.id !== customerToDelete.id),
        );
        queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      } else {
        // Actual deletion error
        console.error("Actual deletion error occurred:", error);
        toast({
          title: "Error",
          description: "Failed to delete customer. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Always close the dialog and cleanup state
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const openPaymentModal = (customerId: string, customerName: string) => {
    const customer =
      firestoreCustomers.find((c) => c.id === customerId) ||
      customers.find((c) => c.id === customerId);

    setPaymentCustomer({
      id: customerId,
      name: customerName,
      pendingAmount: customer?.pendingAmount || 0,
    });
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentCustomer(null);
    setIsPaymentProcessing(false);
  };

  const handlePaymentSubmit = async (amount: number) => {
    if (!paymentCustomer) return;

    try {
      const { id: customerId, name: customerName } = paymentCustomer;
      setIsPaymentProcessing(true);

      console.log(
        `Processing payment from customer ${customerId} (${customerName}): ${amount}`,
      );

      // Use API only - single source of truth
      await apiRequest("POST", `/api/customers/${customerId}/payment`, {
        amount,
        description: `Payment from customer: ${customerName}`,
      });

      toast({
        title: "Payment recorded",
        description: `Payment of ₹${amount.toFixed(2)} from ${customerName} has been recorded`,
      });

      // Update local Firestore state immediately for instant UI update
      setFirestoreCustomers((prev) =>
        prev.map((customer) =>
          customer.id === customerId
            ? {
                ...customer,
                pendingAmount: Math.max(
                  0,
                  (customer.pendingAmount || 0) - amount,
                ),
              }
            : customer,
        ),
      );

      // Refresh data via query cache
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      // Refresh Firestore data in background to ensure consistency
      setTimeout(async () => {
        try {
          const updatedCustomers = await CustomerService.getCustomers();
          setFirestoreCustomers(updatedCustomers);
        } catch (error) {
          console.error("Error refreshing customers from Firestore:", error);
        }
      }, 1000);
    } catch (error) {
      console.error("Error during payment processing:", error);
      toast({
        title: "Payment failed",
        description: "There was an error recording the payment",
        variant: "destructive",
      });
    } finally {
      setIsPaymentProcessing(false);
      closePaymentModal();
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedCustomer(null);

    // Refresh Firestore data
    async function refreshFirestoreCustomers() {
      try {
        const customers = await CustomerService.getCustomers();
        console.log("Refreshed customers from Firestore:", customers);
        setFirestoreCustomers(customers);
      } catch (error) {
        console.error("Error refreshing customers from Firestore:", error);
      }
    }

    refreshFirestoreCustomers();
  };

  const openInvoiceModal = (customer: Customer) => {
    setInvoiceCustomer(customer);
    setIsInvoiceModalOpen(true);
  };

  const closeInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setInvoiceCustomer(null);
  };

  // Determine which data to display
  const displayCustomers =
    firestoreCustomers.length > 0 ? firestoreCustomers : customers;
  const isPageLoading = isFirestoreLoading && isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage your customer database and track orders
          </p>
        </div>
        <Button onClick={handleAddCustomer}>Add Customer</Button>
      </div>

      <CustomersList
        customers={displayCustomers}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteCustomer}
        onPayment={openPaymentModal}
        onGenerateInvoice={openInvoiceModal}
      />

      {isFormOpen && (
        <CustomerForm
          customer={selectedCustomer}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
        />
      )}

      {/* Payment Modal */}
      {paymentCustomer && (
        <PaymentModal
          isOpen={paymentModalOpen}
          onClose={closePaymentModal}
          onSubmit={handlePaymentSubmit}
          entityName={paymentCustomer.name}
          entityType="customer"
          currentAmount={paymentCustomer.pendingAmount || 0}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {customerToDelete && (
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          description={`Are you sure you want to delete ${customerToDelete.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}

      {/* Invoice Modal */}
      {invoiceCustomer && (
        <CustomerInvoice
          isOpen={isInvoiceModalOpen}
          onClose={closeInvoiceModal}
          customer={invoiceCustomer}
          orders={firestoreOrders as Order[]}
        />
      )}
    </div>
  );
}

// just
