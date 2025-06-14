import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { Supplier, Customer, Inventory, Order, Transaction } from "@shared/schema";
import Dashboard from "@/components/dashboard/Dashboard";
import AddStockModal from "@/components/modals/AddStockModal";
import NewOrderModal from "@/components/modals/NewOrderModal";
import * as SupplierService from "@/lib/supplier-service";
import * as CustomerService from "@/lib/customer-service";
import * as InventoryService from "@/lib/inventory-service";
import * as OrderService from "@/lib/order-service";
import * as TransactionService from "@/lib/transaction-service";

export default function DashboardPage() {
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isFirestoreLoading, setIsFirestoreLoading] = useState(true);
  
  // State for Firestore data
  const [firestoreSuppliers, setFirestoreSuppliers] = useState<any[]>([]);
  const [firestoreInventory, setFirestoreInventory] = useState<any[]>([]);
  const [firestoreCustomers, setFirestoreCustomers] = useState<any[]>([]);
  const [firestoreOrders, setFirestoreOrders] = useState<any[]>([]);
  const [firestoreTransactions, setFirestoreTransactions] = useState<any[]>([]);
  
  // Load data from Firestore directly
  const loadFirestoreData = async () => {
    try {
      setIsFirestoreLoading(true);
      
      // Load suppliers
      const suppliers = await SupplierService.getSuppliers();
      console.log("Loaded suppliers directly from Firestore:", suppliers);
      setFirestoreSuppliers(suppliers);
      
      // Load inventory
      const inventory = await InventoryService.getInventoryItems();
      console.log("Loaded inventory directly from Firestore:", inventory);
      setFirestoreInventory(inventory);
      
      // Load customers
      const customers = await CustomerService.getCustomers();
      console.log("Loaded customers directly from Firestore:", customers);
      setFirestoreCustomers(customers);
      
      // Load orders
      const orders = await OrderService.getOrders();
      console.log("Loaded orders directly from Firestore:", orders);
      setFirestoreOrders(orders);
      
      // Load transactions
      const transactions = await TransactionService.getTransactions();
      console.log("Loaded transactions directly from Firestore:", transactions);
      setFirestoreTransactions(transactions);
    } catch (error) {
      console.error("Error loading data from Firestore:", error);
    } finally {
      setIsFirestoreLoading(false);
    }
  };

  useEffect(() => {
    loadFirestoreData();
  }, []);
  
  // Backup data fetch from API (fallback mechanism)
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
  
  // Use Firestore data if available, otherwise use API data
  const effectiveSuppliers = firestoreSuppliers.length > 0 ? firestoreSuppliers : suppliers;
  const effectiveInventory = firestoreInventory.length > 0 ? firestoreInventory : inventory;
  const effectiveCustomers = firestoreCustomers.length > 0 ? firestoreCustomers : customers;
  const effectiveOrders = firestoreOrders.length > 0 ? firestoreOrders : orders;
  const effectiveTransactions = firestoreTransactions.length > 0 ? firestoreTransactions : transactions;

  // Calculate totals
  const totalStock = effectiveInventory.reduce((sum, item) => sum + item.quantity, 0);
  const supplierDebts = effectiveSuppliers.reduce((sum, supplier) => sum + (supplier.debt || 0), 0);
  const pendingPayments = effectiveCustomers.reduce((sum, customer) => sum + (customer.pendingAmount || 0), 0);
  
  // Get today's orders
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaysOrders = effectiveOrders.filter(order => {
    const orderDate = new Date(order.date);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });
  
  const todaysSales = todaysOrders.reduce((sum, order) => sum + order.total, 0);
  
  // Enterprise stock monitoring: Show negative stock and low stock items
  const lowStockItems = effectiveInventory.filter(item => item.quantity < 5)
    .sort((a, b) => a.quantity - b.quantity); // Sort by quantity (negative first, then lowest positive)
  
  // Recent orders (last 5)
  const recentOrders = [...effectiveOrders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  
  // Suppliers with debt
  const suppliersWithDebt = effectiveSuppliers
    .filter(supplier => (supplier.debt || 0) > 0)
    .sort((a, b) => (b.debt || 0) - (a.debt || 0));

  // Handle modal toggling
  const openAddStockModal = () => setIsAddStockModalOpen(true);
  const closeAddStockModal = () => {
    setIsAddStockModalOpen(false);
    // Refresh data after stock operations
    loadFirestoreData();
  };
  
  const openNewOrderModal = () => setIsNewOrderModalOpen(true);
  const closeNewOrderModal = () => {
    setIsNewOrderModalOpen(false);
    // Refresh data after order operations
    loadFirestoreData();
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
        customers={effectiveCustomers}
        inventory={effectiveInventory}
        onAddStock={openAddStockModal}
        onNewOrder={openNewOrderModal}
      />
      
      {isAddStockModalOpen && (
        <AddStockModal 
          isOpen={isAddStockModalOpen} 
          onClose={closeAddStockModal} 
          suppliers={effectiveSuppliers}
        />
      )}
      
      {isNewOrderModalOpen && (
        <NewOrderModal 
          isOpen={isNewOrderModalOpen} 
          onClose={closeNewOrderModal} 
          customers={effectiveCustomers}
          inventory={effectiveInventory}
        />
      )}
    </>
  );
}
