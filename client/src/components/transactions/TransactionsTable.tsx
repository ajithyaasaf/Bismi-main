import { Transaction, Supplier, Customer } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, ArrowUpCircle, ArrowDownCircle, User, Building } from "lucide-react";
import { format } from "date-fns";

interface TransactionsTableProps {
  transactions: Transaction[];
  suppliers: Supplier[];
  customers: Customer[];
  isLoading: boolean;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
}

export default function TransactionsTable({
  transactions,
  suppliers,
  customers,
  isLoading,
  onDelete,
  onEdit
}: TransactionsTableProps) {
  // Get entity name by ID and type
  const getEntityName = (entityId: string, entityType: string) => {
    if (entityType === 'supplier') {
      const supplier = suppliers.find(s => s.id === entityId);
      return supplier ? supplier.name : 'Unknown Supplier';
    } else {
      const customer = customers.find(c => c.id === entityId);
      return customer ? customer.name : 'Unknown Customer';
    }
  };

  // Get transaction type display info
  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'payment':
        return { label: 'Payment', color: 'destructive', icon: ArrowUpCircle };
      case 'receipt':
        return { label: 'Receipt', color: 'default', icon: ArrowDownCircle };
      case 'purchase':
        return { label: 'Purchase', color: 'secondary', icon: ArrowUpCircle };
      case 'sale':
        return { label: 'Sale', color: 'default', icon: ArrowDownCircle };
      default:
        return { label: type, color: 'outline', icon: ArrowUpCircle };
    }
  };

  // Format amount with proper sign and color
  const formatAmount = (amount: number, type: string) => {
    const isNegative = type === 'payment' || type === 'purchase';
    const displayAmount = isNegative ? -Math.abs(amount) : Math.abs(amount);
    const color = isNegative ? 'text-red-600' : 'text-green-600';
    
    return (
      <span className={`font-medium ${color}`}>
        ₹{Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </span>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ArrowUpCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create your first transaction to get started tracking your business finances.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Date</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => {
                const entityName = getEntityName(transaction.entityId, transaction.entityType);
                const typeInfo = getTransactionTypeInfo(transaction.type);
                const TypeIcon = typeInfo.icon;

                return (
                  <TableRow key={transaction.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span className="text-sm">
                          {format(new Date(transaction.createdAt), 'MMM dd, yyyy')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(transaction.createdAt), 'HH:mm')}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {transaction.entityType === 'supplier' ? (
                          <Building className="h-4 w-4 text-blue-500" />
                        ) : (
                          <User className="h-4 w-4 text-green-500" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{entityName}</span>
                          <span className="text-xs text-gray-500 capitalize">
                            {transaction.entityType}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={typeInfo.color as any} className="flex items-center gap-1 w-fit">
                        <TypeIcon className="h-3 w-3" />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      {formatAmount(transaction.amount, transaction.type)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm text-gray-900 truncate" title={transaction.description}>
                          {transaction.description}
                        </p>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(transaction)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(transaction)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Summary Footer */}
        <div className="border-t bg-gray-50 p-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              Total: {sortedTransactions.length} transactions
            </span>
            <div className="flex space-x-4">
              <span className="text-green-600 font-medium">
                In: ₹{sortedTransactions
                  .filter(t => t.type === 'receipt' || t.type === 'sale')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-red-600 font-medium">
                Out: ₹{sortedTransactions
                  .filter(t => t.type === 'payment' || t.type === 'purchase')
                  .reduce((sum, t) => sum + t.amount, 0)
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span className="font-semibold">
                Net: ₹{(sortedTransactions
                  .filter(t => t.type === 'receipt' || t.type === 'sale')
                  .reduce((sum, t) => sum + t.amount, 0) - 
                sortedTransactions
                  .filter(t => t.type === 'payment' || t.type === 'purchase')
                  .reduce((sum, t) => sum + t.amount, 0))
                  .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}