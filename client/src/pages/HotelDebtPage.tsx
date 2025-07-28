import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Building2, Plus, Minus, TrendingUp, Receipt, History, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Customer, DebtAdjustment, Order } from '@shared/types';

export default function HotelDebtPage() {
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adjustedBy, setAdjustedBy] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all customers (to filter hotels)
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Filter hotels only
  const hotels = customers?.filter(c => c.type === 'hotel') || [];

  // Get all orders for selected hotel
  const { data: orders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: !!selectedHotelId,
  });

  // Get debt adjustments for selected hotel
  const { data: adjustments } = useQuery<DebtAdjustment[]>({
    queryKey: [`/api/hotels/${selectedHotelId}/debt-adjustments`],
    enabled: !!selectedHotelId,
  });

  // Calculate hotel debt
  const hotelOrders = orders?.filter(order => order.customerId === selectedHotelId) || [];
  const hotelAdjustments = adjustments || [];
  
  // Calculate total debt: ONLY unpaid order amounts + adjustments
  // CRITICAL FIX: Only count orders that are not fully paid
  const orderDebt = hotelOrders
    .filter(order => order.paymentStatus !== 'paid') // Only unpaid orders
    .reduce((sum, order) => {
      const totalAmount = order.totalAmount || 0;
      const paidAmount = order.paidAmount || 0;
      const balance = Math.round((totalAmount - paidAmount + Number.EPSILON) * 100) / 100;
      return Math.round((sum + balance + Number.EPSILON) * 100) / 100;
    }, 0);
  
  const adjustmentBalance = hotelAdjustments.reduce((sum, adj) => {
    const amount = adj.type === 'debit' ? adj.amount : -adj.amount;
    return Math.round((sum + amount + Number.EPSILON) * 100) / 100;
  }, 0);
  
  const totalOwed = Math.round((orderDebt + adjustmentBalance + Number.EPSILON) * 100) / 100;

  // Auto-select first hotel if available and none selected
  useEffect(() => {
    if (hotels.length > 0 && !selectedHotelId) {
      // Look for "Arab Hotel" specifically, or use first hotel
      const arabHotel = hotels.find(h => h.name.toLowerCase().includes('arab'));
      setSelectedHotelId(arabHotel?.id || hotels[0].id);
    }
  }, [hotels, selectedHotelId]);

  // Create debt adjustment mutation
  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: { type: 'debit' | 'credit'; amount: number; reason: string; adjustedBy: string }) => {
      const response = await apiRequest('POST', `/api/hotels/${selectedHotelId}/debt-adjustments`, data);
      const result = await response.json();
      
      // Handle wrapped response format from backend
      if (result.success === false) {
        throw new Error(result.message || 'Failed to create debt adjustment');
      }
      
      // If wrapped in success format, extract the data
      return result.data || result;
    },
    onSuccess: () => {
      toast({
        title: 'Adjustment Added',
        description: `Successfully ${adjustmentType === 'debit' ? 'increased' : 'decreased'} hotel debt by ₹${amount}`,
      });
      // Clear form
      setAmount('');
      setReason('');
      setAdjustedBy('');
      // Refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/hotels/${selectedHotelId}/debt-adjustments`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add debt adjustment',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount',
        variant: 'destructive',
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: 'Missing Reason',
        description: 'Please provide a reason for this adjustment',
        variant: 'destructive',
      });
      return;
    }

    createAdjustmentMutation.mutate({
      type: adjustmentType,
      amount: amountNum,
      reason: reason.trim(),
      adjustedBy: adjustedBy.trim() || 'System'
    });
  };

  const selectedHotel = hotels.find(h => h.id === selectedHotelId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Hotel Debt Tracker</h1>
          <p className="text-muted-foreground">Manage individual hotel debt amounts and adjustments</p>
        </div>
      </div>

      {/* Hotel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Select Hotel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full max-w-md">
            <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a hotel to manage..." />
              </SelectTrigger>
              <SelectContent>
                {hotels.map(hotel => (
                  <SelectItem key={hotel.id} value={hotel.id}>
                    {hotel.name} - {hotel.contact}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Only show if hotel is selected */}
      {selectedHotelId && selectedHotel ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Debt Display */}
          <Card className="lg:col-span-2">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold">{selectedHotel.name}</h2>
                  <p className="text-muted-foreground">{selectedHotel.contact}</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Current Total Amount Owed</p>
                  <div className={`text-6xl font-bold ${totalOwed >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Math.abs(totalOwed).toFixed(2)}
                  </div>
                  <Badge variant={totalOwed > 0 ? 'destructive' : totalOwed < 0 ? 'default' : 'secondary'} className="text-sm">
                    {totalOwed > 0 ? 'Amount Due' : totalOwed < 0 ? 'Credit Balance' : 'Balanced'}
                  </Badge>
                </div>

                <div className="flex justify-center gap-8 pt-4 text-sm text-muted-foreground border-t">
                  <div className="text-center">
                    <div className="font-semibold">{hotelOrders.length}</div>
                    <div>Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{hotelAdjustments.length}</div>
                    <div>Manual Adjustments</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">₹{orderDebt.toFixed(2)}</div>
                    <div>Order Debt</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Manual Adjustment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Manual Adjustment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Adjustment Type */}
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select value={adjustmentType} onValueChange={(value: 'debit' | 'credit') => setAdjustmentType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">
                        <div className="flex items-center gap-2">
                          <Plus className="h-4 w-4 text-red-600" />
                          <span>Add Charge (Increase Debt)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="credit">
                        <div className="flex items-center gap-2">
                          <Minus className="h-4 w-4 text-green-600" />
                          <span>Add Credit (Decrease Debt)</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason *</Label>
                  <Textarea
                    id="reason"
                    placeholder={adjustmentType === 'debit' ? 
                      "e.g., Late delivery charges, Additional service fee, Extra cleaning charges" :
                      "e.g., Payment received, Discount applied, Refund processed"
                    }
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                {/* Adjusted By */}
                <div className="space-y-2">
                  <Label htmlFor="adjustedBy">Adjusted By</Label>
                  <Input
                    id="adjustedBy"
                    placeholder="Your name (optional)"
                    value={adjustedBy}
                    onChange={(e) => setAdjustedBy(e.target.value)}
                  />
                </div>

                {/* Preview */}
                {amount && parseFloat(amount) > 0 && (
                  <div className={`p-3 rounded-lg border ${adjustmentType === 'debit' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Preview:
                    </div>
                    <div className={`text-lg font-bold ${adjustmentType === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                      {adjustmentType === 'debit' ? '+' : '-'}₹{parseFloat(amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      New total will be: ₹{(totalOwed + (adjustmentType === 'debit' ? parseFloat(amount) : -parseFloat(amount))).toFixed(2)}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={createAdjustmentMutation.isPending}
                  className={`w-full ${adjustmentType === 'debit' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {createAdjustmentMutation.isPending ? (
                    'Processing...'
                  ) : (
                    <>
                      {adjustmentType === 'debit' ? <Plus className="h-4 w-4 mr-2" /> : <Minus className="h-4 w-4 mr-2" />}
                      {adjustmentType === 'debit' ? 'Add Charge' : 'Add Credit'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hotelAdjustments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2" />
                  <p>No adjustments yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {hotelAdjustments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((adjustment) => (
                    <div key={adjustment.id} className="flex justify-between items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{adjustment.reason}</div>
                        <div className="text-xs text-muted-foreground">
                          By {adjustment.adjustedBy} • {formatDistanceToNow(new Date(adjustment.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${adjustment.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                          {adjustment.type === 'debit' ? '+' : '-'}₹{adjustment.amount.toFixed(2)}
                        </div>
                        <Badge variant={adjustment.type === 'debit' ? 'destructive' : 'default'} className="text-xs">
                          {adjustment.type === 'debit' ? 'Charge' : 'Credit'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Hotel</h3>
          <p className="text-muted-foreground">Choose a hotel from the dropdown above to manage their debt.</p>
        </Card>
      )}
    </div>
  );
}