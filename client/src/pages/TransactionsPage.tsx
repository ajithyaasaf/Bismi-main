import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, Supplier, Customer } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import TransactionFormModal from "@/components/transactions/TransactionFormModal";
import TransactionsTable from "@/components/transactions/TransactionsTable";
import { getApiUrl } from "@/lib/config";
import { fetchTransactionsWithDiagnostics } from "@/lib/api-diagnostics";

interface TransactionFilters {
  search: string;
  entityType: string;
  transactionType: string;
  dateRange: string;
}

export default function TransactionsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    search: "",
    entityType: "all",
    transactionType: "all",
    dateRange: "all"
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch transactions using the new robust service
  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError } = useQuery({
    queryKey: ['transactions-v2'],
    queryFn: async () => {
      const url = 'https://bismi-main.onrender.com/api/transactions';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch transactions`);
      }

      const text = await response.text();
      
      // Check if response starts with HTML
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        throw new Error('Server returned HTML page instead of JSON data');
      }
      
      try {
        const data = JSON.parse(text);
        
        if (!Array.isArray(data)) {
          return [];
        }

        return data.map((transaction: any) => ({
          id: String(transaction.id || ''),
          entityId: String(transaction.entityId || ''),
          entityType: String(transaction.entityType || ''),
          type: String(transaction.type || ''),
          amount: Number(transaction.amount) || 0,
          description: String(transaction.description || ''),
          createdAt: new Date(transaction.createdAt || Date.now())
        }));
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        console.error('Response text:', text.substring(0, 500));
        throw new Error('Invalid JSON response from server');
      }
    },
    retry: 2,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['/api/suppliers'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/suppliers'), {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    },
    retry: 1,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/customers'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/customers'), {
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
    retry: 1,
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: any) => {
      const response = await fetch(getApiUrl('/api/transactions'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create transaction: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-v2'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setIsFormOpen(false);
      setEditingTransaction(null);
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(getApiUrl(`/api/transactions/${id}`), {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions-v2'] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter transactions
  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
                         transaction.entityId.toLowerCase().includes(filters.search.toLowerCase());
    const matchesEntityType = filters.entityType === 'all' || transaction.entityType === filters.entityType;
    const matchesTransactionType = filters.transactionType === 'all' || transaction.type === filters.transactionType;
    
    return matchesSearch && matchesEntityType && matchesTransactionType;
  });

  const handleCreateTransaction = (data: any) => {
    createTransactionMutation.mutate(data);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      deleteTransactionMutation.mutate(transaction.id);
    }
  };

  const handleExportTransactions = () => {
    const csv = [
      'Date,Entity Type,Entity,Type,Amount,Description',
      ...filteredTransactions.map(t => {
        const entityName = t.entityType === 'supplier' 
          ? suppliers.find((s: Supplier) => s.id === t.entityId)?.name || 'Unknown'
          : customers.find((c: Customer) => c.id === t.entityId)?.name || 'Unknown';
        
        return `${t.createdAt.toLocaleDateString()},${t.entityType},${entityName},${t.type},${t.amount},"${t.description}"`;
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (transactionsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Transactions</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Transactions</h3>
            <p className="text-sm text-gray-500 mb-4">
              {transactionsError.message}
            </p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/transactions'] })}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportTransactions}
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search transactions..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>
            
            <Select
              value={filters.entityType}
              onValueChange={(value) => setFilters({ ...filters, entityType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="customer">Customers</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.transactionType}
              onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Transaction Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-gray-500 flex items-center">
              {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <TransactionsTable
        transactions={filteredTransactions}
        suppliers={suppliers}
        customers={customers}
        isLoading={transactionsLoading}
        onDelete={handleDeleteTransaction}
        onEdit={setEditingTransaction}
      />

      {/* Transaction Form Modal */}
      {isFormOpen && (
        <TransactionFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateTransaction}
          suppliers={suppliers}
          customers={customers}
          isLoading={createTransactionMutation.isPending}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}