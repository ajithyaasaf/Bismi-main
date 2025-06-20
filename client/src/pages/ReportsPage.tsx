import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ReportGenerator from "@/components/reports/ReportGenerator";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("sales");
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Update date range based on selection
  const updateDateRange = (range: string) => {
    setDateRange(range);
    
    const today = new Date();
    
    switch (range) {
      case "today":
        setStartDate(today);
        setEndDate(today);
        break;
      case "yesterday":
        const yesterday = subDays(today, 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case "thisWeek":
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case "thisMonth":
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case "custom":
        // Keep current dates for custom range
        break;
    }
  };
  
  // Query for report data
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['/api/reports', reportType, startDate, endDate],
    queryFn: async () => {
      setIsGenerating(true);
      try {
        const startDateStr = format(startDate, 'yyyy-MM-dd');
        const endDateStr = format(endDate, 'yyyy-MM-dd');
        
        const response = await apiRequest(
          'GET', 
          `/api/reports?type=${reportType}&startDate=${startDateStr}&endDate=${endDateStr}`,
          undefined
        );
        return response.json();
      } finally {
        setIsGenerating(false);
      }
    },
    enabled: false, // Don't run automatically
  });
  
  // Generate report
  const generateReport = () => {
    refetch();
  };
  
  // Render report content based on type
  const renderReportContent = () => {
    if (isLoading || isGenerating) {
      return (
        <div className="text-center py-10">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
          <p className="mt-2 text-gray-600">Generating report...</p>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₹{(report?.totalSales || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Order Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{report?.orderCount || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ₹{(report?.orderCount || 0) > 0 ? ((report?.totalSales || 0) / (report?.orderCount || 1)).toFixed(2) : '0.00'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {report.orders && report.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {(() => {
                            // Enterprise timestamp handling - use createdAt first, then date
                            const orderWithTimestamp = order as any;
                            const timestamp = orderWithTimestamp.createdAt || order.date;
                            try {
                              return format(new Date(timestamp), 'MMM dd, yyyy');
                            } catch (error) {
                              return 'Invalid date';
                            }
                          })()}
                        </TableCell>
                        <TableCell>{order.customerName || order.customerId}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full 
                            ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {order.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">₹{(order.totalAmount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-gray-500">No orders found in this period</p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    } else if (reportType === "debts") {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Supplier Debts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">₹{(report?.totalSupplierDebt || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-500">Total Customer Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">₹{(report?.totalCustomerPending || 0).toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Supplier Debts</CardTitle>
              </CardHeader>
              <CardContent>
                {(report?.suppliers || []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-right">Debt Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report?.suppliers || []).map((supplier: any) => (
                        <TableRow key={supplier.id}>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell className="text-right text-red-600">₹{(supplier.pendingAmount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-gray-500">No supplier debts found</p>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Customer Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {(report?.customers || []).length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Pending Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(report?.customers || []).map((customer: any) => (
                        <TableRow key={customer.id}>
                          <TableCell>{customer.name}</TableCell>
                          <TableCell>{customer.type}</TableCell>
                          <TableCell className="text-right text-amber-600">₹{(customer.pendingAmount || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-gray-500">No pending customer payments found</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="report-type" className="block mb-2">Report Type</Label>
              <Select 
                value={reportType} 
                onValueChange={setReportType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales Report</SelectItem>
                  <SelectItem value="debts">Debts Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="date-range" className="block mb-2">Date Range</Label>
              <Select 
                value={dateRange} 
                onValueChange={updateDateRange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="block mb-2">Start Date</Label>
                    <DatePicker
                      selected={startDate}
                      onSelect={setStartDate}
                      className="border border-input"
                    />
                  </div>
                  <div>
                    <Label className="block mb-2">End Date</Label>
                    <DatePicker
                      selected={endDate}
                      onSelect={setEndDate}
                      className="border border-input"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="md:col-span-3 flex justify-end">
              <Button 
                onClick={generateReport} 
                disabled={isLoading || isGenerating}
                className="ml-auto"
              >
                {isGenerating ? 'Generating...' : 'Generate Report'}
              </Button>
              
              {report && (
                <ReportGenerator 
                  report={report} 
                  reportType={reportType} 
                  startDate={startDate} 
                  endDate={endDate} 
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {renderReportContent()}
    </div>
  );
}
