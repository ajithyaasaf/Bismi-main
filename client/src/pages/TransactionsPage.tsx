import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Transaction, Supplier, Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import TransactionForm from "@/components/transactions/TransactionForm";
import TransactionsList from "@/components/transactions/TransactionsList";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as TransactionService from "@/lib/transaction-service";
import * as SupplierService from "@/lib/supplier-service";
import * as CustomerService from "@/lib/customer-service";

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load data from API
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch data using service functions
        const [transactionsData, suppliersData, customersData] = await Promise.all([
          TransactionService.getTransactions(),
          SupplierService.getSuppliers(),
          CustomerService.getCustomers(),
        ]);
        
        console.log("Retrieved", transactionsData.length, "transactions via API");
        setTransactions(transactionsData);
        
        console.log("Retrieved", suppliersData.length, "suppliers via API");
        setSuppliers(suppliersData);
        
        console.log("Retrieved", customersData.length, "customers via API");
        setCustomers(customersData);
      } catch (error) {
        console.error("Error loading data via API:", error);
        toast({
          title: "Error",
          description: "Failed to load data.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [toast]);

  const handleAddTransaction = async (newTransaction: any) => {
    try {
      const result = await TransactionService.addTransaction(newTransaction);
      setTransactions(prev => [result, ...prev]);
      setIsFormOpen(false);
      
      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await TransactionService.deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          Add Transaction
        </Button>
      </div>

      {isFormOpen && (
        <TransactionForm
          suppliers={suppliers}
          customers={customers}
          onSubmit={handleAddTransaction}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      <TransactionsList
        transactions={transactions}
        suppliers={suppliers}
        customers={customers}
        onDelete={handleDeleteTransaction}
      />
    </div>
  );
}