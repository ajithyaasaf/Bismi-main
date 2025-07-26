import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, ArrowLeft, Plus, Minus, Receipt, CreditCard, Calendar, TrendingUp, Activity } from 'lucide-react';
import { DebtAdjustmentModal } from '@/components/hotel-ledger/DebtAdjustmentModal';
import { formatDistanceToNow } from 'date-fns';
import type { HotelDebtSummary, HotelLedgerEntry } from '@shared/types';

export default function HotelDetailPage() {
  const [, params] = useRoute('/hotel-ledger/:id');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('debit');
  const queryClient = useQueryClient();

  const hotelId = params?.id;

  const { data: hotelSummary, isLoading: isLoadingSummary } = useQuery<HotelDebtSummary>({
    queryKey: [`/api/hotels/${hotelId}/debt-summary`],
    enabled: !!hotelId,
    refetchInterval: 30000,
  });

  const { data: ledgerEntries, isLoading: isLoadingLedger } = useQuery<HotelLedgerEntry[]>({
    queryKey: [`/api/hotels/${hotelId}/ledger`],
    enabled: !!hotelId,
    refetchInterval: 30000,
  });

  const handleAdjustmentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/hotels/${hotelId}/debt-summary`] });
    queryClient.invalidateQueries({ queryKey: [`/api/hotels/${hotelId}/ledger`] });
    queryClient.invalidateQueries({ queryKey: ['/api/hotels/debt-summaries'] });
    setShowAdjustmentModal(false);
  };

  const openAdjustmentModal = (type: 'debit' | 'credit') => {
    setAdjustmentType(type);
    setShowAdjustmentModal(true);
  };

  if (isLoadingSummary || isLoadingLedger) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hotelSummary) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/hotel-ledger">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hotels
            </Button>
          </Link>
        </div>
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Hotel Not Found</h3>
          <p className="text-muted-foreground">This hotel customer doesn't exist or is not a hotel type.</p>
        </Card>
      </div>
    );
  }

  const getEntryIcon = (entryType: string) => {
    switch (entryType) {
      case 'order':
        return <Receipt className="h-4 w-4 text-blue-600" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-green-600" />;
      case 'adjustment':
        return <Activity className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getEntryColor = (entryType: string, amount: number) => {
    if (entryType === 'payment' || amount < 0) return 'text-green-600';
    if (entryType === 'adjustment') return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/hotel-ledger">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Hotels
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">{hotelSummary.customer.name}</h1>
              <p className="text-muted-foreground">{hotelSummary.customer.contact}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => openAdjustmentModal('credit')}
            className="text-green-600 border-green-200 hover:bg-green-50"
          >
            <Minus className="h-4 w-4 mr-2" />
            Add Credit
          </Button>
          <Button 
            variant="outline" 
            onClick={() => openAdjustmentModal('debit')}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Charge
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${hotelSummary.totalOwed >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{Math.abs(hotelSummary.totalOwed).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {hotelSummary.totalOwed >= 0 ? 'Amount due' : 'Credit balance'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hotelSummary.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Historical orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hotelSummary.recentActivity.length}</div>
            <p className="text-xs text-muted-foreground">Last 10 entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last Order
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hotelSummary.lastOrderDate ? (
              <>
                <div className="text-sm font-bold">
                  {formatDistanceToNow(new Date(hotelSummary.lastOrderDate), { addSuffix: true })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(hotelSummary.lastOrderDate).toLocaleDateString()}
                </p>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-muted-foreground">No orders</div>
                <p className="text-xs text-muted-foreground">yet</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ledger Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Account Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ledgerEntries || ledgerEntries.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Activity</h3>
              <p className="text-muted-foreground">No ledger entries found for this hotel.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {ledgerEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getEntryIcon(entry.entryType)}
                    <div>
                      <div className="font-medium">{entry.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} · 
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getEntryColor(entry.entryType, entry.amount)}`}>
                      {entry.amount >= 0 ? '+' : ''}₹{entry.amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Balance: ₹{entry.runningBalance.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debt Adjustment Modal */}
      <DebtAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => setShowAdjustmentModal(false)}
        hotelId={hotelId!}
        hotelName={hotelSummary.customer.name}
        adjustmentType={adjustmentType}
        onSuccess={handleAdjustmentSuccess}
      />
    </div>
  );
}