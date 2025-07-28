import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
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

  // Extract data from batched response with comprehensive error handling
  const suppliers = useMemo(() => {
    const data = dashboardData?.suppliers?.data;
    return Array.isArray(data) ? data.filter(Boolean) : [];
  }, [dashboardData?.suppliers?.data]);

  const inventory = useMemo(() => {
    const data = dashboardData?.inventory?.data;
    return Array.isArray(data) ? data.filter(Boolean) : [];
  }, [dashboardData?.inventory?.data]);

  const customers = useMemo(() => {
    const data = dashboardData?.customers?.data;
    return Array.isArray(data) ? data.filter(Boolean) : [];
  }, [dashboardData?.customers?.data]);

  const orders = useMemo(() => {
    const data = dashboardData?.orders?.data;
    return Array.isArray(data) ? data.filter(Boolean) : [];
  }, [dashboardData?.orders?.data]);

  const transactions = useMemo(() => {
    const data = dashboardData?.transactions?.data;
    return Array.isArray(data) ? data.filter(Boolean) : [];
  }, [dashboardData?.transactions?.data]);

  // Use skeleton timer for minimum 0.3 second display (reduced for speed)
  const showSkeleton = useSkeletonTimer(isLoading, 300);
  
  // Check for batched errors
  const hasErrors = error || 
    (dashboardData && Object.values(dashboardData).some((result: any) => !result.success));
  
  // Debug logging with more detail
  console.log('Dashboard Data Debug:', {
    suppliers: suppliers.length,
    inventory: inventory.length,
    customers: customers.length,
    orders: orders.length,
    transactions: transactions.length,
    isLoading,
    hasErrors,
    rawData: dashboardData ? Object.keys(dashboardData) : 'no data',
    inventoryIsArray: Array.isArray(inventory),
    inventoryValue: inventory
  });

  // Calculate totals with memoized safety checks
  const totalStock = useMemo(() => {
    return inventory.reduce((sum: number, item: any) => sum + (item?.quantity || 0), 0);
  }, [inventory]);

  const supplierDebts = useMemo(() => {
    return suppliers.reduce((sum: number, supplier: any) => {
      if (!supplier || typeof supplier.pendingAmount !== 'number') return sum;
      return sum + supplier.pendingAmount;
    }, 0);
  }, [suppliers]);

  const pendingPayments = useMemo(() => {
    return customers.reduce((sum: number, customer: any) => {
      if (!customer || typeof customer.pendingAmount !== 'number') return sum;
      return sum + customer.pendingAmount;
    }, 0);
  }, [customers]);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = useMemo(() => {
    return orders.filter((order: any) => {
      if (!order.createdAt) return false;
      try {
        const orderDate = new Date(order.createdAt.toString());
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      } catch {
        return false;
      }
    });
  }, [orders, today]);
  
  const todaysSales = useMemo(() => {
    return todaysOrders.reduce((sum: number, order: any) => {
      const amount = order?.totalAmount || 0;
      return Math.round((sum + amount + Number.EPSILON) * 100) / 100;
    }, 0);
  }, [todaysOrders]);
  
  // Enterprise stock monitoring: Show negative stock and low stock items
  const lowStockItems = useMemo(() => {
    return inventory
      .filter((item: any) => item && item.quantity < 5)
      .sort((a: any, b: any) => (a?.quantity || 0) - (b?.quantity || 0)); // Sort by quantity (negative first, then lowest positive)
  }, [inventory]);
  
  // Recent orders (last 5)
  const recentOrders = useMemo(() => {
    return [...orders]
      .filter(order => order && order.createdAt)
      .sort((a, b) => {
        try {
          return new Date(b.createdAt!.toString()).getTime() - new Date(a.createdAt!.toString()).getTime();
        } catch {
          return 0;
        }
      })
      .slice(0, 5);
  }, [orders]);
  
  // Suppliers with pendingAmount
  const suppliersWithDebt = useMemo(() => {
    return suppliers
      .filter((supplier: any) => 
        supplier && 
        typeof supplier.pendingAmount === 'number' && 
        supplier.pendingAmount > 0
      )
      .sort((a: any, b: any) => (b.pendingAmount || 0) - (a.pendingAmount || 0));
  }, [suppliers]);

  // Handle modal toggling
  const openAddStockModal = () => setIsAddStockModalOpen(true);
  const closeAddStockModal = () => {
    setIsAddStockModalOpen(false);
    // Invalidate batched dashboard data for refresh
    queryClient.invalidateQueries({ queryKey: ['dashboard-batch'] });
  };
  
  const openNewOrderModal = () => setIsNewOrderModalOpen(true);
  const closeNewOrderModal = () => {
    setIsNewOrderModalOpen(false);
    // Invalidate batched dashboard data for refresh
    queryClient.invalidateQueries({ queryKey: ['dashboard-batch'] });
  };

  // Early return for loading state
  if (showSkeleton) {
    return <DashboardSkeleton />;
  }

  // Early return for error state
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

  // Safety check: Don't render if data is not ready
  if (!dashboardData) {
    return <DashboardSkeleton />;
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
