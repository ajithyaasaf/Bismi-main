import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Order, Customer, Inventory } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, Search, X } from "lucide-react";
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
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

  // Filter orders based on selected customer
  const filteredOrders = useMemo(() => {
    if (selectedCustomerId === "all") {
      return orders;
    }
    return orders.filter(order => order.customerId === selectedCustomerId);
  }, [orders, selectedCustomerId]);

  // Get customer order counts for display
  const customerOrderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(order => {
      counts[order.customerId] = (counts[order.customerId] || 0) + 1;
    });
    return counts;
  }, [orders]);

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) {
      return customers.filter(customer => customerOrderCounts[customer.id] > 0);
    }
    return customers.filter(customer => 
      customerOrderCounts[customer.id] > 0 && 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, customerOrderCounts, searchTerm]);

  // Get customer name by ID
  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  // Get selected customer display text
  const getSelectedCustomerText = () => {
    if (selectedCustomerId === "all") {
      return "All Customers";
    }
    const customer = customers.find(c => c.id === selectedCustomerId);
    return customer ? customer.name : "Select customer...";
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setSearchTerm("");
    setIsPopoverOpen(false);
  };

  // Clear filter
  const clearFilter = () => {
    setSelectedCustomerId("all");
    setSearchTerm("");
  };

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
      const totalAmount = order.totalAmount || 0;
      const paidAmount = order.paidAmount || 0;
      const remainingBalance = totalAmount - paidAmount;

      if (order.paymentStatus === 'paid') {
        // SMART STATE RESTORATION: Revert to previous partial payment state
        const revertAmount = (order as any).originalPaidAmount || 0;
        const newStatus = revertAmount > 0 ? 'partially_paid' : 'pending';
        
        const response = await apiRequest('PUT', `/api/orders/${order.id}`, {
          paymentStatus: newStatus,
          paidAmount: revertAmount,
          originalPaidAmount: null // Clear the saved state
        });
        
        if (response.ok) {
          toast({
            title: "Payment reverted",
            description: revertAmount > 0 
              ? `Order reverted to partially paid state. Remaining balance: ₹${(totalAmount - revertAmount).toFixed(2)}`
              : "Order payment status changed to pending.",
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        } else {
          throw new Error('Failed to update order status');
        }
      } else {
        // SMART STATE PRESERVATION: Save current partial payment before marking as paid
        const response = await apiRequest('PUT', `/api/orders/${order.id}`, {
          originalPaidAmount: paidAmount, // Save current partial payment
          paymentStatus: 'paid',
          paidAmount: totalAmount // Pay the full amount
        });
        
        if (response.ok) {
          toast({
            title: "Payment completed",
            description: `Order marked as fully paid. Remaining balance of ₹${remainingBalance.toFixed(2)} has been settled.`,
          });
          
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
        } else {
          throw new Error('Failed to update order status');
        }
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

  const handleEditDate = async (orderId: string, newDate: string) => {
    try {
      const response = await apiRequest('PUT', `/api/orders/${orderId}`, {
        createdAt: newDate
      });
      
      if (response.ok) {
        toast({
          title: "Date updated",
          description: "Order date has been successfully updated.",
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      } else {
        throw new Error('Failed to update order date');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the order date. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let modal handle the error
    }
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

      {/* Searchable Customer Filter */}
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-64 justify-start text-left font-normal"
              onClick={() => setIsPopoverOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              {getSelectedCustomerText()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="p-2">
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto">
                {/* All Customers Option */}
                <div
                  className={`px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded ${
                    selectedCustomerId === "all" ? "bg-gray-100 font-medium" : ""
                  }`}
                  onClick={() => handleCustomerSelect("all")}
                >
                  All Customers ({orders.length} orders)
                </div>
                
                {/* Filtered Customers */}
                {filteredCustomers
                  .sort((a, b) => (customerOrderCounts[b.id] || 0) - (customerOrderCounts[a.id] || 0))
                  .map(customer => (
                    <div
                      key={customer.id}
                      className={`px-2 py-2 text-sm cursor-pointer hover:bg-gray-100 rounded ${
                        selectedCustomerId === customer.id ? "bg-gray-100 font-medium" : ""
                      }`}
                      onClick={() => handleCustomerSelect(customer.id)}
                    >
                      {customer.name} ({customerOrderCounts[customer.id]} orders)
                    </div>
                  ))
                }
                
                {/* No results */}
                {searchTerm.trim() && filteredCustomers.length === 0 && (
                  <div className="px-2 py-2 text-sm text-gray-500">
                    No customers found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Clear filter button */}
        {selectedCustomerId !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            className="h-8 px-2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        
        {selectedCustomerId !== "all" && (
          <span className="text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </span>
        )}
      </div>

      <OrdersList 
        orders={filteredOrders}
        customers={customers}
        onUpdateStatus={handleUpdateStatus}
        onDeleteOrder={handleDeleteOrder}
        onEditDate={handleEditDate}
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