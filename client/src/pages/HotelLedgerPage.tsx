import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Search, Plus, CreditCard, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import type { HotelDebtSummary } from '@shared/types';

export default function HotelLedgerPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: hotelSummaries, isLoading } = useQuery<HotelDebtSummary[]>({
    queryKey: ['/api/hotels/debt-summaries'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const filteredHotels = hotelSummaries?.filter(summary =>
    summary.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    summary.customer.contact.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalDebt = hotelSummaries?.reduce((sum, summary) => sum + summary.totalOwed, 0) || 0;
  const totalHotels = hotelSummaries?.length || 0;
  const hotelsWithDebt = hotelSummaries?.filter(summary => summary.totalOwed > 0).length || 0;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Hotel Debt Ledger</h1>
        </div>

        {/* Summary Cards Skeleton */}
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

        {/* Hotels List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Hotel Debt Ledger</h1>
        </div>
        <Link href="/customers">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Hotel Customer
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalDebt.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all hotels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHotels}</div>
            <p className="text-xs text-muted-foreground">Registered hotel customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hotels with Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{hotelsWithDebt}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Debt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalHotels > 0 ? (totalDebt / totalHotels).toFixed(2) : '0.00'}</div>
            <p className="text-xs text-muted-foreground">Per hotel</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search hotels..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Hotels Grid */}
      {filteredHotels.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Hotels Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? 'No hotels match your search criteria.' : 'No hotel customers registered yet.'}
          </p>
          <Link href="/customers">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel Customer
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHotels.map((summary) => (
            <Card key={summary.customer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{summary.customer.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{summary.customer.contact}</p>
                  </div>
                  <Badge variant={summary.totalOwed > 0 ? 'destructive' : 'secondary'}>
                    {summary.totalOwed > 0 ? 'Debt' : 'Clear'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debt Amount */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Owed:</span>
                  <span className={`text-lg font-bold ${summary.totalOwed > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{summary.totalOwed.toFixed(2)}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="text-sm font-semibold">{summary.totalOrders}</div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold">{summary.recentActivity.length}</div>
                    <div className="text-xs text-muted-foreground">Recent Activity</div>
                  </div>
                </div>

                {/* Last Activity */}
                {summary.lastOrderDate && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Last Order: {new Date(summary.lastOrderDate).toLocaleDateString()}
                  </div>
                )}

                {/* Action Button */}
                <Link href={`/hotel-ledger/${summary.customer.id}`}>
                  <Button className="w-full" variant={summary.totalOwed > 0 ? 'default' : 'outline'}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Ledger
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}