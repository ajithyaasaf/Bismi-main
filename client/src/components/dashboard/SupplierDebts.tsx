import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Supplier, Transaction } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { processSupplierPayment } from '@/lib/supplier-service';
import PaymentModal from '@/components/modals/PaymentModal';

export default function SupplierDebts() {
  const [selectedSupplier, setSelectedSupplier] = useState<{id: string, name: string, pendingAmount?: number} | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // API data queries
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });
  
  const openPaymentModal = (supplier: {id: string, name: string, pendingAmount?: number}) => {
    setSelectedSupplier(supplier);
    setPaymentModalOpen(true);
  };
  
  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setSelectedSupplier(null);
  };
  
  const handlePaymentSubmit = async (amount: number) => {
    if (!selectedSupplier) return;
    
    try {
      setIsPaying(selectedSupplier.id);
      
      await processSupplierPayment(
        selectedSupplier.id, 
        amount, 
        `Payment to ${selectedSupplier.name}`
      );
      
      toast({
        title: "Payment recorded",
        description: `Payment of ₹${amount} to ${selectedSupplier.name} has been recorded`,
      });
      
      closePaymentModal();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: "Failed to record payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(null);
    }
  };

  // Use supplier's actual pending amount field with proper null checks
  const supplierDebts = suppliers.filter(supplier => 
    supplier && 
    typeof supplier.pendingAmount === 'number' && 
    supplier.pendingAmount > 0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Supplier Debts</CardTitle>
          <CardDescription>Outstanding amounts owed to suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading supplier debts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Supplier Debts</CardTitle>
          <CardDescription>Outstanding amounts owed to suppliers</CardDescription>
        </CardHeader>
        <CardContent>
          {supplierDebts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No outstanding supplier debts
            </div>
          ) : (
            <div className="space-y-3">
              {supplierDebts.map((supplier) => (
                <div key={supplier.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{supplier.name}</p>
                      <p className="text-sm text-gray-600">{supplier.contact}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="destructive">
                      ₹{(supplier.pendingAmount || 0).toLocaleString()}
                    </Badge>
                    <Button 
                      size="sm" 
                      onClick={() => openPaymentModal(supplier)}
                      disabled={isPaying === supplier.id}
                    >
                      {isPaying === supplier.id ? 'Processing...' : 'Pay'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={closePaymentModal}
        onSubmit={handlePaymentSubmit}
        entityName={selectedSupplier?.name || ''}
        entityType="supplier"
        currentAmount={selectedSupplier?.pendingAmount || 0}
      />
    </>
  );
}