import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Supplier, Customer, Inventory, Order, Transaction } from "@shared/types";
import Dashboard from "@/components/dashboard/Dashboard";
import AddStockModal from "@/components/modals/AddStockModal";
import NewOrderModal from "@/components/modals/NewOrderModal";
import { DashboardSkeleton } from "@/components/skeletons";
import { useSkeletonTimer } from "@/hooks/use-skeleton-timer";
import { fetchDashboardData } from "@/lib/api-batch";

export default function DashboardPage() {
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Optimized batched data fetching
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-batch'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  // Extract data from batched response
  const suppliers = dashboardData?.suppliers?.data || [];
  const inventory = dashboardData?.inventory?.data || [];
  const customers = dashboardData?.customers?.data || [];
  const orders = dashboardData?.orders?.data || [];
  const transactions = dashboardData?.transactions?.data || [];

  // Use skeleton timer for minimum 0.3 second display (reduced for speed)
  const showSkeleton = useSkeletonTimer(isLoading, 300);
  
  // Check for batched errors
  const hasErrors = error || 
    (dashboardData && Object.values(dashboardData).some((result: any) => !result.success));
  
  // Debug logging
  console.log('Dashboard Data Debug:', {
    suppliers: suppliers.length,
    inventory: inventory.length,
    customers: customers.length,
    orders: orders.length,
    transactions: transactions.length,
    isLoading,
    hasErrors
  });

  // Calculate totals
  const totalStock = inventory.reduce((sum: number, item: any) => sum + item.quantity, 0);
  const supplierDebts = suppliers.reduce((sum: number, supplier: any) => sum + (supplier.pendingAmount || 0), 0);
  const pendingPayments = customers.reduce((sum: number, customer: any) => sum + (customer.pendingAmount || 0), 0);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = orders.filter((order: any) => {
    if (!order.createdAt) return false;
    try {
      const orderDate = new Date(order.createdAt.toString());
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    } catch {
      return false;
    }
  });
  
  const todaysSales = todaysOrders.reduce((sum: number, order: any) => sum + order.totalAmount, 0);
  
  // Enterprise stock monitoring: Show negative stock and low stock items
  const lowStockItems = inventory.filter((item: any) => item.quantity < 5)
    .sort((a: any, b: any) => a.quantity - b.quantity); // Sort by quantity (negative first, then lowest positive)
  
  // Recent orders (last 5)
  const recentOrders = [...orders]
    .filter(order => order.createdAt)
    .sort((a, b) => {
      try {
        return new Date(b.createdAt!.toString()).getTime() - new Date(a.createdAt!.toString()).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 5);
  
  // Suppliers with pendingAmount
  const suppliersWithDebt = suppliers
    .filter((supplier: any) => (supplier.pendingAmount || 0) > 0)
    .sort((a: any, b: any) => (b.pendingAmount || 0) - (a.pendingAmount || 0));

  // Handle modal toggling
  const openAddStockModal = () => setIsAddStockModalOpen(true);
  const closeAddStockModal = () => {
    setIsAddStockModalOpen(false);
    // Refresh data after stock operations
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
  };
  
  const openNewOrderModal = () => setIsNewOrderModalOpen(true);
  const closeNewOrderModal = () => {
    setIsNewOrderModalOpen(false);
    // Refresh data after order operations
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
  };

  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  if (hasErrors) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠</div>
          <p className="text-red-600 mb-2">Error loading data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Dashboard 
        totalStock={totalStock} 
        todaysSales={todaysSales} 
        supplierDebts={supplierDebts}
        pendingPayments={pendingPayments}
        lowStockItems={lowStockItems}
        recentOrders={recentOrders}
        suppliersWithDebt={suppliersWithDebt}
        customers={customers}
        inventory={inventory}
        onAddStock={openAddStockModal}
        onNewOrder={openNewOrderModal}
      />
      
      {isAddStockModalOpen && (
        <AddStockModal 
          isOpen={isAddStockModalOpen} 
          onClose={closeAddStockModal} 
          suppliers={suppliers}
        />
      )}
      
      {isNewOrderModalOpen && (
        <NewOrderModal 
          isOpen={isNewOrderModalOpen} 
          onClose={closeNewOrderModal} 
          customers={customers}
          inventory={inventory}
        />
      )}
    </>
  );
}
