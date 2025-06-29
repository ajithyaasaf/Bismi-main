import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, safeJsonResponse } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isYesterday } from "date-fns";
import { DateRange } from "react-day-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReportGenerator from "@/components/reports/ReportGenerator";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("sales");
  const [dateRange, setDateRange] = useState("thisWeek");
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Enhanced date range calculation with better timezone handling
  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    console.log(`[REPORTS] Calculating date range for: ${dateRange}`);
    
    switch (dateRange) {
      case "today":
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        console.log(`[REPORTS] Today range: ${today.toISOString()} to ${todayEnd.toISOString()}`);
        return { from: today, to: todayEnd };
        
      case "yesterday":
        const yesterday = subDays(today, 1);
        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setHours(23, 59, 59, 999);
        console.log(`[REPORTS] Yesterday range: ${yesterday.toISOString()} to ${yesterdayEnd.toISOString()}`);
        return { from: yesterday, to: yesterdayEnd };
        
      case "thisWeek":
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        weekStart.setHours(0, 0, 0, 0);
        weekEnd.setHours(23, 59, 59, 999);
        console.log(`[REPORTS] This week range: ${weekStart.toISOString()} to ${weekEnd.toISOString()}`);
        return { from: weekStart, to: weekEnd };
        
      case "thisMonth":
        const monthStart = startOfMonth(today);
        const monthEnd = endOfMonth(today);
        monthStart.setHours(0, 0, 0, 0);
        monthEnd.setHours(23, 59, 59, 999);
        console.log(`[REPORTS] This month range: ${monthStart.toISOString()} to ${monthEnd.toISOString()}`);
        return { from: monthStart, to: monthEnd };
        
      case "custom":
        if (customDateRange?.from) {
          // Create new dates in local timezone to avoid UTC conversion issues
          const startDate = new Date(customDateRange.from.getFullYear(), customDateRange.from.getMonth(), customDateRange.from.getDate(), 0, 0, 0, 0);
          
          const endDateSource = customDateRange.to || customDateRange.from;
          const endDate = new Date(endDateSource.getFullYear(), endDateSource.getMonth(), endDateSource.getDate(), 23, 59, 59, 999);
          
          console.log(`[REPORTS] Custom range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
          return { from: startDate, to: endDate };
        }
        console.log(`[REPORTS] Custom range fallback to today`);
        const todayFallback = new Date(today);
        todayFallback.setHours(23, 59, 59, 999);
        return { from: today, to: todayFallback };
        
      default:
        console.log(`[REPORTS] Default range (today)`);
        const defaultEnd = new Date(today);
        defaultEnd.setHours(23, 59, 59, 999);
        return { from: today, to: defaultEnd };
    }
  };

  const currentDateRange = getDateRange();
  const { from: startDate, to: endDate } = currentDateRange;

  // Query for report data with enterprise caching and error handling
  const { data: report, isLoading, refetch, isError, error } = useQuery({
    queryKey: ['/api/reports', reportType, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate) {
        throw new Error('Date range is required');
      }
      
      try {
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        
        console.log(`[REPORTS] Generating ${reportType} report from ${startDateStr} to ${endDateStr}`);
        console.log(`[REPORTS] Date objects: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        const apiUrl = `/api/reports?type=${reportType}&startDate=${startDateStr}&endDate=${endDateStr}`;
        console.log(`[REPORTS] API URL: ${apiUrl}`);
        
        const response = await apiRequest('GET', apiUrl);
        console.log(`[REPORTS] API Response status: ${response.status}`);
        
        const data = await safeJsonResponse(response);
        console.log(`[REPORTS] Report data received:`, {
          totalSales: data.totalSales,
          orderCount: data.orderCount,
          ordersLength: data.orders?.length,
          customersLength: data.customers?.length,
          suppliersLength: data.suppliers?.length
        });
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid report data received');
        }
        
        return {
          totalSales: Number(data.totalSales) || 0,
          orderCount: Number(data.orderCount) || 0,
          totalSupplierDebt: Number(data.totalSupplierDebt) || 0,
          totalCustomerPending: Number(data.totalCustomerPending) || 0,
          averageOrderValue: Number(data.averageOrderValue) || 0,
          orders: Array.isArray(data.orders) ? data.orders : [],
          suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
          customers: Array.isArray(data.customers) ? data.customers : [],
          summary: data.summary || {}
        };
      } catch (error) {
        console.error('Report generation failed:', error);
        throw error;
      }
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: 1000
  });

  // Auto-refresh for real-time data
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        refetch();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refetch]);
  
  // Generate report with validation
  const generateReport = () => {
    console.log('Current dateRange:', dateRange);
    console.log('Current customDateRange:', customDateRange);
    
    if (!startDate || !endDate) {
      console.error('Cannot generate report: missing date range', { startDate, endDate, dateRange });
      return;
    }
    
    console.log(`Generating ${reportType} report from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    refetch();
  };

  // Format date range for display
  const formatDateRange = () => {
    if (!startDate || !endDate) return '';
    
    if (startDate.toDateString() === endDate.toDateString()) {
      if (isToday(startDate)) return 'Today';
      if (isYesterday(startDate)) return 'Yesterday';
      return format(startDate, 'MMM dd, yyyy');
    }
    
    return `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  // Render report content based on type
  const renderReportContent = () => {
    if (isLoading) {
      return renderLoadingSkeleton();
    }

    if (isError) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-10">
              <div className="text-red-500 text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900">Failed to Generate Report</h3>
              <p className="text-sm text-gray-500 mt-1">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <Button onClick={generateReport} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (!report) {
      return (
        <div className="text-center py-10">
          <i className="fas fa-file-alt text-gray-400 text-4xl mb-3"></i>
          <h3 className="text-lg font-medium text-gray-900">No report data</h3>
          <p className="text-sm text-gray-500 mt-1">Select report type and date range, then click Generate Report</p>
        </div>
      );
    }
    
    if (reportType === "sales") {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700 flex items-center">
                  💰 Total Sales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-900">₹{report.totalSales.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">Revenue generated</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-700 flex items-center">
                  📦 Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-900">{report.orderCount}</p>
                <p className="text-xs text-green-600 mt-1">Total orders</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-700 flex items-center">
                  📊 Average Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-purple-900">₹{report.averageOrderValue.toFixed(2)}</p>
                <p className="text-xs text-purple-600 mt-1">Per order value</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center">
                  ⚡ Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">
                  {report.orderCount > 0 ? '🔥' : '❄️'}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  {report.orderCount > 0 ? 'Active period' : 'No activity'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>📋 Order Details</span>
                <Badge variant="secondary">{report.orders.length} orders</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.orders.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Date & Time</TableHead>
                        <TableHead className="font-semibold">Customer</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="text-right font-semibold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.orders.map((order: any) => (
                        <TableRow key={order.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {(() => {
                              try {
                                const date = new Date(order.createdAt);
                                return (
                                  <div>
                                    <div>{format(date, 'MMM dd, yyyy')}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(date, 'hh:mm a')}
                                    </div>
                                  </div>
                                );
                              } catch (error) {
                                return <span className="text-red-500">Invalid date</span>;
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-xs text-muted-foreground">
                                ID: {order.customerId.substring(0, 8)}...
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                              {order.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold">₹{Number(order.totalAmount || 0).toFixed(2)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-muted-foreground">No orders found for {formatDateRange()}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try selecting a different date range or check:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('thisWeek')}
                      className="text-xs"
                    >
                      📅 This Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('thisMonth')}
                      className="text-xs"
                    >
                      📅 This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('custom')}
                      className="text-xs"
                    >
                      🗓️ Custom Range
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    } else if (reportType === "debts") {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center">
                  🏭 Total Supplier Debts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-900">₹{report.totalSupplierDebt.toFixed(2)}</p>
                <p className="text-xs text-red-600 mt-1">Amount owed to suppliers</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center">
                  👥 Total Customer Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-900">₹{report.totalCustomerPending.toFixed(2)}</p>
                <p className="text-xs text-amber-600 mt-1">Amount pending from customers</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🏭 Supplier Debts</span>
                  <Badge variant="destructive">{report.suppliers.length} suppliers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.suppliers.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Supplier</TableHead>
                          <TableHead className="text-right font-semibold">Debt Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.suppliers.map((supplier: any) => (
                          <TableRow key={supplier.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <div className="font-medium">{supplier.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Contact: {supplier.contact || 'N/A'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-red-600">₹{Number(supplier.pendingAmount || 0).toFixed(2)}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">🎉</div>
                    <p className="text-muted-foreground">No supplier debts found</p>
                    <p className="text-sm text-muted-foreground mt-1">All suppliers are paid up</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>👥 Customer Pending Payments</span>
                  <Badge variant="secondary">{report.customers.length} customers</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.customers.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Customer</TableHead>
                          <TableHead className="font-semibold">Type</TableHead>
                          <TableHead className="text-right font-semibold">Pending Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.customers.map((customer: any) => (
                          <TableRow key={customer.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  Contact: {customer.contact || 'N/A'}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={customer.type === 'hotel' ? 'default' : 'outline'}>
                                {customer.type === 'hotel' ? '🏨 Hotel' : '🏪 Retail'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-amber-600">₹{Number(customer.pendingAmount || 0).toFixed(2)}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">💰</div>
                    <p className="text-muted-foreground">No pending customer payments</p>
                    <p className="text-sm text-muted-foreground mt-1">All customers have paid their dues</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-sans">Reports</h1>
        <p className="mt-1 text-sm text-gray-500">Generate and view business reports</p>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="report-type" className="block mb-2 font-medium">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">📊 Sales Report</SelectItem>
                    <SelectItem value="debts">💰 Debts Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date-range" className="block mb-2 font-medium">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">📅 Today</SelectItem>
                    <SelectItem value="yesterday">📅 Yesterday</SelectItem>
                    <SelectItem value="thisWeek">📅 This Week</SelectItem>
                    <SelectItem value="thisMonth">📅 This Month</SelectItem>
                    <SelectItem value="custom">🗓️ Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateRange === 'custom' && (
                <div className="lg:col-span-2">
                  <Label className="block mb-2 font-medium">Custom Date Range</Label>
                  <DateRangePicker
                    date={customDateRange}
                    onDateChange={setCustomDateRange}
                    placeholder="Select date range"
                    className="w-full"
                  />
                </div>
              )}
              
              {dateRange !== 'custom' && (
                <div className="lg:col-span-2 flex items-end space-x-2">
                  <div className="flex-1">
                    <Label className="block mb-2 font-medium">Selected Range</Label>
                    <div className="h-10 px-3 py-2 border rounded-md flex items-center bg-muted/50">
                      <Badge variant="secondary" className="font-normal">
                        {formatDateRange()}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={generateReport} 
                  disabled={isLoading}
                  className="px-6"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    '🔄 Generate Report'
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
                >
                  {autoRefresh ? '⏸️ Stop Auto-refresh' : '▶️ Auto-refresh'}
                </Button>
              </div>
              
              {report && (
                <ReportGenerator 
                  report={report} 
                  reportType={reportType} 
                  startDate={startDate || new Date()} 
                  endDate={endDate || new Date()} 
                />
              )}
            </div>
            
            {report && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm:ss')}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    Period: {formatDateRange()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {report.summary?.filteredOrders || 0} orders found
                  </Badge>
                  {report.totalSales > 0 && (
                    <Badge variant="secondary">
                      ₹{report.totalSales.toFixed(0)} revenue
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {renderReportContent()}
    </div>
  );
}
