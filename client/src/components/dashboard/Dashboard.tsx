import { Supplier, Customer, Inventory, Order } from "@shared/types";
import StatsCard from "./StatsCard";
import SalesChart from "./SalesChart";
import RecentOrders from "./RecentOrders";
import LowStockAlert from "./LowStockAlert";
import SupplierDebts from "./SupplierDebts";

interface DashboardProps {
  totalStock: number;
  todaysSales: number;
  supplierDebts: number;
  pendingPayments: number;
  lowStockItems: Inventory[];
  recentOrders: Order[];
  suppliersWithDebt: Supplier[];
  customers: Customer[];
  inventory: Inventory[];
  onAddStock: () => void;
  onNewOrder: () => void;
}

export default function Dashboard({
  totalStock,
  todaysSales,
  supplierDebts,
  pendingPayments,
  lowStockItems,
  recentOrders,
  suppliersWithDebt,
  customers,
  inventory,
  onAddStock,
  onNewOrder
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-sans">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of your business performance</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <button 
            onClick={onNewOrder}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <i className="fas fa-plus mr-2"></i> New Order
          </button>
          <button 
            onClick={onAddStock}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
          >
            <i className="fas fa-sync-alt mr-2"></i> Update Stock
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Current Stock"
          value={`${(totalStock || 0).toFixed(1)} kg`}
          icon="boxes"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          linkText="View inventory"
          linkHref="/inventory"
        />
        
        <StatsCard 
          title="Today's Sales"
          value={`₹${(todaysSales || 0).toFixed(0)}`}
          icon="rupee-sign"
          iconBgColor="bg-orange-100"
          iconColor="text-orange-600"
          linkText="View orders"
          linkHref="/orders"
        />
        
        <StatsCard 
          title="Supplier Debts"
          value={`₹${(supplierDebts || 0).toFixed(0)}`}
          icon="truck-loading"
          iconBgColor="bg-red-100"
          iconColor="text-red-600"
          linkText="View suppliers"
          linkHref="/suppliers"
        />
        
        <StatsCard 
          title="Pending Payments"
          value={`₹${(pendingPayments || 0).toFixed(0)}`}
          icon="users"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          linkText="View customers"
          linkHref="/customers"
        />
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sales Trend Chart */}
        <SalesChart />
        
        {/* Recent Orders */}
        <RecentOrders orders={recentOrders} customers={customers} />
      </div>

      {/* Low Stock Alert and Supplier Debt */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <LowStockAlert lowStockItems={lowStockItems} onAddStock={onAddStock} />
        
        {/* Supplier Debts */}
        <SupplierDebts />
      </div>
    </div>
  );
}
