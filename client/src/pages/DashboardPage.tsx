import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Supplier, Customer, Inventory, Order, Transaction } from "@shared/schema";
import Dashboard from "@/components/dashboard/Dashboard";
import AddStockModal from "@/components/modals/AddStockModal";
import NewOrderModal from "@/components/modals/NewOrderModal";

export default function DashboardPage() {
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Data fetch from API only
  const { data: suppliers = [], isLoading: suppliersLoading, error: suppliersError } = useQuery<Supplier[]>({ 
    queryKey: ['/api/suppliers'],
  });
  
  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryError } = useQuery<Inventory[]>({ 
    queryKey: ['/api/inventory'],
  });
  
  const { data: customers = [], isLoading: customersLoading, error: customersError } = useQuery<Customer[]>({ 
    queryKey: ['/api/customers'],
  });
  
  const { data: orders = [], isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({ 
    queryKey: ['/api/orders'],
  });
  
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useQuery<Transaction[]>({ 
    queryKey: ['/api/transactions'],
  });

  // Check if any data is loading
  const isLoading = suppliersLoading || inventoryLoading || customersLoading || ordersLoading || transactionsLoading;
  
  // Check for errors
  const hasErrors = suppliersError || inventoryError || customersError || ordersError || transactionsError;
  
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
  const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const supplierDebts = suppliers.reduce((sum, supplier) => sum + (supplier.debt || 0), 0);
  const pendingPayments = customers.reduce((sum, customer) => sum + (customer.pendingAmount || 0), 0);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = orders.filter(order => {
    if (!order.date) return false;
    try {
      const orderDate = new Date(order.date.toString());
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    } catch {
      return false;
    }
  });
  
  const todaysSales = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  
  // Enterprise stock monitoring: Show negative stock and low stock items
  const lowStockItems = inventory.filter(item => item.quantity < 5)
    .sort((a, b) => a.quantity - b.quantity); // Sort by quantity (negative first, then lowest positive)
  
  // Recent orders (last 5)
  const recentOrders = [...orders]
    .filter(order => order.date)
    .sort((a, b) => {
      try {
        return new Date(b.date!.toString()).getTime() - new Date(a.date!.toString()).getTime();
      } catch {
        return 0;
      }
    })
    .slice(0, 5);
  
  // Suppliers with debt
  const suppliersWithDebt = suppliers
    .filter(supplier => (supplier.debt || 0) > 0)
    .sort((a, b) => (b.debt || 0) - (a.debt || 0));

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your business data...</p>
        </div>
      </div>
    );
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
