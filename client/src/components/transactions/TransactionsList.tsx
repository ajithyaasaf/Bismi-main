import { Transaction, Supplier, Customer } from "@shared/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface TransactionsListProps {
  transactions: Transaction[];
  suppliers: Supplier[];
  customers: Customer[];
  onDelete: (transaction: Transaction) => void;
}

export default function TransactionsList({ 
  transactions, 
  suppliers, 
  customers, 
  onDelete 
}: TransactionsListProps) {
  // Sort transactions by date (newest first)
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
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

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <i className="fas fa-exchange-alt text-gray-400 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-gray-900">No transactions found</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first transaction to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>
                  {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell className="font-medium">
                  {getEntityName(transaction.entityId, transaction.entityType)}
                </TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium
                    ${transaction.type === 'payment' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {transaction.type === 'payment' ? 'Payment' : 'Receipt'}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ₹{transaction.amount.toFixed(2)}
                </TableCell>
                <TableCell className="truncate max-w-[200px]" title={transaction.description || ''}>
                  {transaction.description || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-600" 
                      onClick={() => onDelete(transaction)}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
