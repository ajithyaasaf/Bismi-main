import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, Customer, Inventory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import OrdersList from "@/components/orders/OrdersList";
import NewOrderModal from "@/components/modals/NewOrderModal";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as OrderService from "@/lib/order-service";
import * as CustomerService from "@/lib/customer-service";
import * as InventoryService from "@/lib/inventory-service";

export default function OrdersPage() {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [firestoreOrders, setFirestoreOrders] = useState<any[]>([]);
  const [firestoreCustomers, setFirestoreCustomers] = useState<any[]>([]);
  const [firestoreInventory, setFirestoreInventory] = useState<any[]>([]);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load data from Firestore directly
  useEffect(() => {
    async function loadFirestoreData() {
      try {
        setIsFirestoreLoading(true);
        
        // Load orders
        const orders = await OrderService.getOrders();
        console.log("Loaded orders directly from Firestore:", orders);
        setFirestoreOrders(orders);
        
        // Load customers
        const customers = await CustomerService.getCustomers();
        console.log("Loaded customers directly from Firestore:", customers);
        setFirestoreCustomers(customers);
        
        // Load inventory
        const inventory = await InventoryService.getInventoryItems();
        console.log("Loaded inventory directly from Firestore:", inventory);
        setFirestoreInventory(inventory);
      } catch (error) {
        console.error("Error loading data from Firestore:", error);
      } finally {
        setIsFirestoreLoading(false);
      }
    }
    
    loadFirestoreData();
  }, []);

  // Fetch orders from API as backup
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Fetch customers for order details from API as backup
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Fetch inventory for order creation from API as backup
  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const handleUpdateStatusClick = async (order: Order) => {
    const newStatus = order.status === "pending" ? "paid" : "pending";
    try {
      // First update in Firestore
      try {
        console.log(`Attempting to update order ${order.id} status to ${newStatus}`);
        const result = await OrderService.updateOrder(order.id, { status: newStatus });
        console.log("Order status updated in Firestore:", result);
        
        // If payment status is changing from pending to paid, update the customer's pending amount
        if (newStatus === 'paid' && order.status === 'pending') {
          console.log(`Order changed to paid, need to update customer pending amount`);
          const customer = displayCustomers.find(c => c.id === order.customerId);
          
          if (customer && customer.pendingAmount) {
            const updatedPendingAmount = Math.max(0, customer.pendingAmount - order.total);
            console.log(`Updating customer ${customer.id} pending amount from ${customer.pendingAmount} to ${updatedPendingAmount}`);
            
            await CustomerService.updateCustomer(customer.id, {
              pendingAmount: updatedPendingAmount
            });
          }
        }
        
        // Success toast after Firestore update
        toast({
          title: "Order updated",
          description: `Order status changed to ${newStatus}`,
        });
        
        // Refresh local state
        setFirestoreOrders(prev => 
          prev.map(o => o.id === order.id ? {...o, status: newStatus} : o)
        );
        
        // Refresh Firestore data after updating
        const updatedOrders = await OrderService.getOrders();
        setFirestoreOrders(updatedOrders);
        
        const updatedCustomers = await CustomerService.getCustomers();
        setFirestoreCustomers(updatedCustomers);
      } catch (firestoreError) {
        console.error("Error updating order status in Firestore:", firestoreError);
        
        // Show error toast for Firestore failure
        toast({
          title: "Error",
          description: "Failed to update order status in database",
          variant: "destructive",
        });
        return; // Exit early if Firestore update fails
      }
      
      // Try to update via API for backward compatibility, but don't fail if it doesn't work
      try {
        await apiRequest('PUT', `/api/orders/${order.id}`, { 
          status: newStatus 
        });
        // Refresh API data via query cache
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      } catch (apiError) {
        console.error("API update failed but Firestore update succeeded:", apiError);
        // No need to show error toast since Firestore update succeeded
      }
    } catch (error) {
      console.error("Error during order status update:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!orderToDelete) return;
    
    try {
      // Delete via API (which handles Firebase backend)
      await apiRequest('DELETE', `/api/orders/${orderToDelete.id}`, undefined);
      
      // Success toast
      toast({
        title: "Order deleted",
        description: "The order has been successfully deleted",
      });
      
      // Refresh local state
      setFirestoreOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      
      // Refresh data via query cache
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      
      // Refresh Firebase data
      const updatedOrders = await OrderService.getOrders();
      setFirestoreOrders(updatedOrders);
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setOrderToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  // For form modal closure, make sure to refresh Firestore data
  const handleModalClose = () => {
    setIsNewOrderModalOpen(false);
    
    // Refresh Firestore data
    async function refreshFirestoreData() {
      try {
        const orders = await OrderService.getOrders();
        console.log("Refreshed orders from Firestore:", orders);
        setFirestoreOrders(orders);
        
        // Also refresh customers and inventory since they might have been updated
        const customers = await CustomerService.getCustomers();
        setFirestoreCustomers(customers);
        
        const inventory = await InventoryService.getInventoryItems();
        setFirestoreInventory(inventory);
      } catch (error) {
        console.error("Error refreshing data from Firestore:", error);
      }
    }
    
    refreshFirestoreData();
  };
  
  // Determine which data to display - prefer Firestore data when available
  const displayOrders = firestoreOrders.length > 0 ? firestoreOrders : orders;
  const displayCustomers = firestoreCustomers.length > 0 ? firestoreCustomers : customers;
  const displayInventory = firestoreInventory.length > 0 ? firestoreInventory : inventory;
  const isPageLoading = isFirestoreLoading && isLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-sans">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage orders and sales</p>
        </div>
        <Button onClick={() => setIsNewOrderModalOpen(true)}>
          <i className="fas fa-plus mr-2"></i> New Order
        </Button>
      </div>

      {isPageLoading ? (
        <div className="text-center py-10">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-600">Loading orders...</p>
        </div>
      ) : (
        <>
          <OrdersList 
            orders={displayOrders as Order[]} 
            customers={displayCustomers as Customer[]}
            onUpdateStatus={handleUpdateStatusClick}
            onDelete={handleDeleteClick}
          />
        </>
      )}

      {isNewOrderModalOpen && (
        <NewOrderModal 
          isOpen={isNewOrderModalOpen} 
          onClose={handleModalClose}
          customers={displayCustomers as Customer[]}
          inventory={displayInventory as Inventory[]}
        />
      )}
      
      {orderToDelete && (
        <ConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
          description="Are you sure you want to delete this order? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}
    </div>
  );
}
