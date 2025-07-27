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
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Building2, 
  Plus, 
  Minus, 
  TrendingUp, 
  Receipt, 
  History, 
  AlertCircle, 
  Calendar,
  User,
  IndianRupee,
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  CreditCard,
  FileText
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Customer, DebtAdjustment, Order } from '@shared/types';

export default function HotelDebtPageEnhanced() {
  const [selectedHotelId, setSelectedHotelId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('debit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [adjustedBy, setAdjustedBy] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get all customers (to filter hotels)
  const { data: customers, isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Filter hotels only
  const hotels = customers?.filter(c => c.type === 'hotel') || [];

  // Get all orders for selected hotel
  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
    enabled: !!selectedHotelId,
  });

  // Get debt adjustments for selected hotel
  const { data: adjustments, isLoading: loadingAdjustments } = useQuery<DebtAdjustment[]>({
    queryKey: [`/api/hotels/${selectedHotelId}/debt-adjustments`],
    enabled: !!selectedHotelId,
  });

  // Calculate hotel debt
  const hotelOrders = orders?.filter(order => order.customerId === selectedHotelId) || [];
  const hotelAdjustments = adjustments || [];
  
  // Calculate total debt: unpaid order amounts + adjustments
  const orderDebt = hotelOrders.reduce((sum, order) => sum + (order.totalAmount - order.paidAmount), 0);
  const adjustmentBalance = hotelAdjustments.reduce((sum, adj) => 
    sum + (adj.type === 'debit' ? adj.amount : -adj.amount), 0
  );
  const totalOwed = orderDebt + adjustmentBalance;

  // Auto-select Ar Rahman Hotel if available
  useEffect(() => {
    if (hotels.length > 0 && !selectedHotelId) {
      const arRahmanHotel = hotels.find(h => 
        h.name.toLowerCase().includes('ar rahman') || 
        h.name.toLowerCase().includes('arab')
      );
      setSelectedHotelId(arRahmanHotel?.id || hotels[0].id);
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
        title: 'Success!',
        description: `${adjustmentType === 'debit' ? 'Charge' : 'Credit'} of ₹${amount} added successfully`,
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
  const isLoading = loadingCustomers || loadingOrders || loadingAdjustments;

  if (loadingCustomers) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Hotel Debt Management</h1>
            <p className="text-muted-foreground">Professional debt tracking and adjustment system</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Hotel Debt Management</h1>
            <p className="text-lg text-muted-foreground mt-2">Professional debt tracking and adjustment system</p>
          </div>
        </div>

        {/* Hotel Selection Card */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Select Hotel</h2>
                <p className="text-sm text-muted-foreground">Choose a hotel to manage their debt</p>
              </div>
            </div>
            
            <div className="max-w-md">
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Choose a hotel..." />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map(hotel => (
                    <SelectItem key={hotel.id} value={hotel.id} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{hotel.name}</span>
                        <span className="text-sm text-muted-foreground">{hotel.contact}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {selectedHotelId && selectedHotel ? (
          <div className="space-y-8">
            {/* Enhanced Debt Overview Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-6 md:p-8">
                {/* Hotel Header */}
                <div className="text-center space-y-4 mb-6">
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-sm font-medium bg-white/80">
                      Hotel Account
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{selectedHotel.name}</h2>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="text-sm md:text-base">{selectedHotel.contact}</span>
                    </div>
                  </div>
                </div>

                {/* Total Debt Display */}
                <div className="text-center space-y-4 mb-8">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Outstanding Balance
                  </p>
                  <div className="relative">
                    <div className={`text-4xl md:text-6xl lg:text-7xl font-bold transition-colors ${
                      totalOwed > 0 ? 'text-red-600' : totalOwed < 0 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      ₹{Math.abs(totalOwed).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="flex items-center justify-center mt-3">
                      <Badge 
                        variant={totalOwed > 0 ? 'destructive' : totalOwed < 0 ? 'default' : 'secondary'} 
                        className="text-sm md:text-base px-3 md:px-4 py-1 md:py-2 font-medium"
                      >
                        {totalOwed > 0 && <AlertCircle className="h-4 w-4 mr-2" />}
                        {totalOwed > 0 ? 'Amount Due' : totalOwed < 0 ? 'Credit Balance' : 'Balanced'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Debt Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                  {/* Order Debt Breakdown */}
                  <div className="bg-white/60 rounded-xl p-4 md:p-6 border border-blue-100">
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Receipt className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
                        </div>
                        <span className="font-medium text-sm md:text-base text-gray-700">Order Debt</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-2xl md:text-3xl font-bold text-blue-600">
                          ₹{orderDebt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          From {hotelOrders.length} unpaid order{hotelOrders.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Manual Adjustments Breakdown */}
                  <div className="bg-white/60 rounded-xl p-4 md:p-6 border border-purple-100">
                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <TrendingUp className="h-4 md:h-5 w-4 md:w-5 text-purple-600" />
                        </div>
                        <span className="font-medium text-sm md:text-base text-gray-700">Manual Adjustments</span>
                      </div>
                      <div className="space-y-1">
                        <div className={`text-2xl md:text-3xl font-bold ${
                          adjustmentBalance > 0 ? 'text-purple-600' : adjustmentBalance < 0 ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {adjustmentBalance >= 0 ? '+' : ''}₹{adjustmentBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          From {hotelAdjustments.length} manual adjustment{hotelAdjustments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-lg md:text-xl font-bold text-gray-900">{hotelOrders.length}</div>
                      <p className="text-xs md:text-sm text-muted-foreground">Orders</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg md:text-xl font-bold text-gray-900">{hotelAdjustments.length}</div>
                      <p className="text-xs md:text-sm text-muted-foreground">Adjustments</p>
                    </div>
                    <div className="space-y-1">
                      <div className="text-lg md:text-xl font-bold text-gray-900">
                        ₹{(orderDebt + Math.abs(adjustmentBalance)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground">Total Activity</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
              {/* Enhanced Manual Adjustment Form */}
              <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-4 px-4 md:px-6">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3 text-lg md:text-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <span>Manual Adjustment</span>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          Add charges or credits to the account
                        </p>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 px-4 md:px-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Adjustment Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-medium">Adjustment Type</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={adjustmentType === 'debit' ? 'default' : 'outline'}
                          onClick={() => setAdjustmentType('debit')}
                          className={`h-14 md:h-16 flex-col gap-2 min-h-[56px] ${
                            adjustmentType === 'debit' 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                          }`}
                        >
                          <Plus className="h-4 md:h-5 w-4 md:w-5" />
                          <span className="text-sm font-medium">Add Charge</span>
                        </Button>
                        <Button
                          type="button"
                          variant={adjustmentType === 'credit' ? 'default' : 'outline'}
                          onClick={() => setAdjustmentType('credit')}
                          className={`h-14 md:h-16 flex-col gap-2 min-h-[56px] ${
                            adjustmentType === 'credit' 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'hover:bg-green-50 hover:border-green-200 hover:text-green-700'
                          }`}
                        >
                          <Minus className="h-4 md:h-5 w-4 md:w-5" />
                          <span className="text-sm font-medium">Add Credit</span>
                        </Button>
                      </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-base font-medium">
                        Amount (₹) *
                      </Label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-12 md:h-14 text-lg pl-10 pr-4"
                          required
                        />
                      </div>
                    </div>

                    {/* Reason Input */}
                    <div className="space-y-3">
                      <Label htmlFor="reason" className="text-base font-medium">
                        Reason *
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder={adjustmentType === 'debit' ? 
                          "e.g., Late delivery charge, Extra service fee, Cleaning charges, Transportation cost" :
                          "e.g., Payment received, Discount applied, Refund processed, Goodwill credit"
                        }
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="min-h-[100px] md:min-h-[80px] resize-none text-base"
                        required
                      />
                    </div>

                    {/* Adjusted By Input */}
                    <div className="space-y-3">
                      <Label htmlFor="adjustedBy" className="text-base font-medium">
                        Adjusted By
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="adjustedBy"
                          placeholder="Your name (optional)"
                          value={adjustedBy}
                          onChange={(e) => setAdjustedBy(e.target.value)}
                          className="h-12 md:h-14 pl-10 pr-4"
                        />
                      </div>
                    </div>

                    {/* Enhanced Preview */}
                    {amount && parseFloat(amount) > 0 && (
                      <div className={`p-4 md:p-6 rounded-xl border-2 transition-all ${
                        adjustmentType === 'debit' 
                          ? 'bg-gradient-to-r from-red-50 to-red-50/50 border-red-200' 
                          : 'bg-gradient-to-r from-green-50 to-green-50/50 border-green-200'
                      }`}>
                        <div className="flex items-center gap-2 text-sm font-medium mb-3">
                          <AlertCircle className="h-4 w-4" />
                          <span>Preview Changes</span>
                        </div>
                        <div className="space-y-3">
                          <div className={`text-2xl md:text-3xl font-bold ${
                            adjustmentType === 'debit' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {adjustmentType === 'debit' ? '+' : '-'}₹{parseFloat(amount).toLocaleString('en-IN')}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Current total: ₹{totalOwed.toLocaleString('en-IN')}</div>
                            <div className="font-medium">
                              New total: ₹{(totalOwed + (adjustmentType === 'debit' ? parseFloat(amount) : -parseFloat(amount))).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Submit Button */}
                    <Button
                      type="submit"
                      disabled={createAdjustmentMutation.isPending}
                      className={`w-full h-12 md:h-14 text-base md:text-lg font-medium transition-all ${
                        adjustmentType === 'debit' 
                          ? 'bg-red-600 hover:bg-red-700 active:bg-red-800' 
                          : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
                      }`}
                    >
                      {createAdjustmentMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {adjustmentType === 'debit' ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                          <span>{adjustmentType === 'debit' ? 'Add Charge' : 'Add Credit'}</span>
                        </div>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Enhanced Transaction History */}
              <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm">
                <CardHeader className="pb-4 px-4 md:px-6">
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3 text-lg md:text-xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <History className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <span>Recent Activity</span>
                        <p className="text-sm font-normal text-muted-foreground mt-1">
                          Latest adjustments and changes
                        </p>
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 md:px-6">
                  {loadingAdjustments ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-lg border">
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-6 w-20" />
                        </div>
                      ))}
                    </div>
                  ) : hotelAdjustments.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="p-3 md:p-4 bg-gray-100 rounded-full w-12 h-12 md:w-16 md:h-16 mx-auto mb-4">
                        <FileText className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Adjustments Yet</h3>
                      <p className="text-sm md:text-base text-muted-foreground">Start by adding your first manual adjustment above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 md:space-y-4 max-h-96 overflow-y-auto">
                      {hotelAdjustments.slice(0, 10).map((adjustment) => (
                        <div key={adjustment.id} className="p-4 md:p-5 rounded-xl border bg-gradient-to-r from-white to-gray-50/30 hover:shadow-md transition-all duration-200">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-3">
                                {adjustment.type === 'debit' ? (
                                  <div className="p-1.5 bg-red-100 rounded-lg flex-shrink-0 mt-0.5">
                                    <Plus className="h-3 w-3 text-red-600" />
                                  </div>
                                ) : (
                                  <div className="p-1.5 bg-green-100 rounded-lg flex-shrink-0 mt-0.5">
                                    <Minus className="h-3 w-3 text-green-600" />
                                  </div>
                                )}
                                <span className="font-medium text-sm md:text-base leading-relaxed text-gray-900">
                                  {adjustment.reason}
                                </span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground ml-8">
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3" />
                                  <span>{adjustment.adjustedBy}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" />
                                  <span>{formatDistanceToNow(new Date(adjustment.createdAt), { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-left sm:text-right space-y-1 flex-shrink-0">
                              <div className={`text-lg md:text-xl font-bold ${
                                adjustment.type === 'debit' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {adjustment.type === 'debit' ? '+' : '-'}₹{adjustment.amount.toLocaleString('en-IN')}
                              </div>
                              <Badge 
                                variant={adjustment.type === 'debit' ? 'destructive' : 'default'} 
                                className="text-xs px-2 py-1"
                              >
                                {adjustment.type === 'debit' ? 'Charge' : 'Credit'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardContent className="p-16 text-center">
              <div className="p-6 bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6">
                <Building2 className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Select a Hotel</h3>
              <p className="text-lg text-muted-foreground">Choose a hotel from the dropdown above to manage their debt and view transaction history.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}