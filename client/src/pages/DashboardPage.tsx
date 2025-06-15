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
  const { data: suppliers = [] } = useQuery<Supplier[]>({ 
    queryKey: ['/api/suppliers'],
  });
  
  const { data: inventory = [] } = useQuery<Inventory[]>({ 
    queryKey: ['/api/inventory'],
  });
  
  const { data: customers = [] } = useQuery<Customer[]>({ 
    queryKey: ['/api/customers'],
  });
  
  const { data: orders = [] } = useQuery<Order[]>({ 
    queryKey: ['/api/orders'],
  });
  
  const { data: transactions = [] } = useQuery<Transaction[]>({ 
    queryKey: ['/api/transactions'],
  });

  // Calculate totals
  const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const supplierDebts = suppliers.reduce((sum, supplier) => sum + (supplier.debt || 0), 0);
  const pendingPayments = customers.reduce((sum, customer) => sum + (customer.pendingAmount || 0), 0);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = orders.filter(order => {
    const orderDate = new Date(order.date);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });
  
  const todaysSales = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  
  // Enterprise stock monitoring: Show negative stock and low stock items
  const lowStockItems = inventory.filter(item => item.quantity < 5)
    .sort((a, b) => a.quantity - b.quantity); // Sort by quantity (negative first, then lowest positive)
  
  // Recent orders (last 5)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
