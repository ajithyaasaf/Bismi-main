import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, Customer, Inventory } from "@shared/types";
import { Button } from "@/components/ui/button";
import OrdersList from "@/components/orders/OrdersList";
import NewOrderModal from "@/components/modals/NewOrderModal";
import ConfirmationDialog from "@/components/modals/ConfirmationDialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { OrdersSkeleton } from "@/components/skeletons";
import { useSkeletonTimer } from "@/hooks/use-skeleton-timer";

export default function OrdersPage() {
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Use skeleton timer for minimum 0.5 second display
  const showSkeleton = useSkeletonTimer(ordersLoading, 500);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  const { data: inventory = [] } = useQuery<Inventory[]>({
    queryKey: ['/api/inventory'],
  });

  const openNewOrderModal = () => setIsNewOrderModalOpen(true);
  const closeNewOrderModal = () => {
    setIsNewOrderModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  };

  const handleDeleteOrder = async (order: Order) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateStatus = async (order: Order) => {
    try {
      // Toggle payment status: paid -> pending, pending -> paid
      const newPaymentStatus = order.paymentStatus === 'paid' ? 'pending' : 'paid';
      
      const response = await apiRequest('PUT', `/api/orders/${order.id}`, {
        paymentStatus: newPaymentStatus
      });
      
      if (response.ok) {
        toast({
          title: "Status updated",
          description: `Order payment status changed to ${newPaymentStatus}.`,
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      } else {
        throw new Error('Failed to update order status');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the order status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      const response = await apiRequest('DELETE', `/api/orders/${orderToDelete.id}`);
      
      if (response.ok) {
        toast({
          title: "Order deleted",
          description: "The order has been successfully deleted.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      } else {
        throw new Error('Failed to delete order');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  const cancelDeleteOrder = () => {
    setIsDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

  if (showSkeleton) {
    return <OrdersSkeleton />;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button onClick={openNewOrderModal}>
          New Order
        </Button>
      </div>

      <OrdersList 
        orders={orders}
        customers={customers}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
      />

      <NewOrderModal 
        isOpen={isNewOrderModalOpen} 
        onClose={() => setIsNewOrderModalOpen(false)} 
        customers={customers || []}
        inventory={inventory || []}
      />

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={confirmDeleteOrder}
        onClose={cancelDeleteOrder}
        title="Delete Order"
        description={orderToDelete ? `Are you sure you want to delete order #${orderToDelete.id}? This action cannot be undone.` : ""}
        variant="destructive"
      />
    </>
  );
}