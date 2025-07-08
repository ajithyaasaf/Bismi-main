import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout/Layout";
import { ErrorBoundary } from "@/utils/error-boundary";
import DashboardPage from "@/pages/DashboardPage";
import SuppliersPage from "@/pages/SuppliersPage";
import InventoryPage from "@/pages/InventoryPage";
import OrdersPage from "@/pages/OrdersPage";
import CustomersPage from "@/pages/CustomersPage";
import TransactionsPage from "@/pages/TransactionsPage";
import ReportsPage from "@/pages/ReportsPage";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/suppliers" component={SuppliersPage} />
        <Route path="/inventory" component={InventoryPage} />
        <Route path="/orders" component={OrdersPage} />
        <Route path="/customers" component={CustomersPage} />
        <Route path="/transactions" component={TransactionsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
          
          {/* PWA Features */}
          <InstallPrompt 
            onInstall={() => console.log('App installed successfully')}
            onDismiss={() => console.log('Install prompt dismissed')}
          />
          <OfflineIndicator />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
// test one
