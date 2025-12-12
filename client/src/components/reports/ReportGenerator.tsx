import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';

interface ReportGeneratorProps {
  report: any;
  reportType: string;
  startDate: Date;
  endDate: Date;
}

export default function ReportGenerator({ 
  report, 
  reportType, 
  startDate, 
  endDate 
}: ReportGeneratorProps) {
  const [isExporting, setIsExporting] = useState(false);
  
  // Format dates for display
  const formattedStartDate = format(startDate, 'MMM dd, yyyy');
  const formattedEndDate = format(endDate, 'MMM dd, yyyy');
  const sameDay = formattedStartDate === formattedEndDate;
  
  // Generate date range text
  const dateRangeText = sameDay ? formattedStartDate : `${formattedStartDate} - ${formattedEndDate}`;
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  
  // Enhanced CSV escape function for enterprise data safety
  const escapeCSV = (field: any): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Generate comprehensive sales CSV
  const generateSalesCSV = () => {
    const lines: string[] = [];
    
    // Report metadata section with proper escaping
    lines.push(escapeCSV('BISMI CHICKEN SHOP - SALES REPORT'));
    lines.push([escapeCSV('Generated on'), escapeCSV(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))].join(','));
    lines.push([escapeCSV('Report Period'), escapeCSV(dateRangeText)].join(','));
    lines.push([escapeCSV('Report Type'), escapeCSV('Sales Analysis')].join(','));
    lines.push('');
    
    // Executive summary section with proper formatting
    lines.push(escapeCSV('EXECUTIVE SUMMARY'));
    lines.push([escapeCSV('Total Sales Revenue'), escapeCSV('Rs ' + report.totalSales.toFixed(2))].join(','));
    lines.push([escapeCSV('Total Orders Count'), escapeCSV(report.orderCount.toString())].join(','));
    lines.push([escapeCSV('Average Order Value'), escapeCSV('Rs ' + report.averageOrderValue.toFixed(2))].join(','));
    lines.push([escapeCSV('Data Export Time'), escapeCSV(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))].join(','));
    lines.push('');
    
    // Detailed orders section
    lines.push(escapeCSV('DETAILED ORDERS'));
    const orderHeaders = [
      'Order ID',
      'Date',
      'Time',
      'Customer Name', 
      'Customer ID',
      'Payment Status',
      'Order Status',
      'Total Amount',
      'Items Count'
    ];
    lines.push(orderHeaders.map(escapeCSV).join(','));
    
    if (report.orders && report.orders.length > 0) {
      report.orders.forEach((order: any) => {
        const orderDate = new Date(order.createdAt);
        const itemsCount = Array.isArray(order.items) ? order.items.length : 0;
        
        const row = [
          order.id,
          format(orderDate, 'yyyy-MM-dd'),
          format(orderDate, 'HH:mm:ss'),
          order.customerName || 'Unknown',
          order.customerId,
          order.paymentStatus,
          order.orderStatus || 'N/A',
          'Rs ' + (order.totalAmount || 0).toFixed(2),
          itemsCount.toString()
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push(escapeCSV('No orders found for the selected period'));
    }
    
    lines.push('');
    lines.push(escapeCSV('END OF REPORT'));
    
    return lines.join('\n');
  };

  // Generate comprehensive debts CSV
  const generateDebtsCSV = () => {
    const lines: string[] = [];
    
    // Report metadata section with proper escaping
    lines.push(escapeCSV('BISMI CHICKEN SHOP - DEBTS & RECEIVABLES REPORT'));
    lines.push([escapeCSV('Generated on'), escapeCSV(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))].join(','));
    lines.push([escapeCSV('Report Date'), escapeCSV(dateRangeText)].join(','));
    lines.push([escapeCSV('Report Type'), escapeCSV('Financial Position Analysis')].join(','));
    lines.push('');
    
    // Financial summary section with proper formatting
    lines.push(escapeCSV('FINANCIAL SUMMARY'));
    lines.push([escapeCSV('Total Supplier Debts'), escapeCSV('Rs ' + report.totalSupplierDebt.toFixed(2))].join(','));
    lines.push([escapeCSV('Total Customer Receivables'), escapeCSV('Rs ' + report.totalCustomerPending.toFixed(2))].join(','));
    lines.push([escapeCSV('Net Position'), escapeCSV('Rs ' + (report.totalCustomerPending - report.totalSupplierDebt).toFixed(2))].join(','));
    lines.push('');
    
    // Supplier debts section
    lines.push(escapeCSV('SUPPLIER DEBTS'));
    const supplierHeaders = [
      'Supplier ID',
      'Supplier Name', 
      'Contact Number',
      'Outstanding Amount',
      'Account Status'
    ];
    lines.push(supplierHeaders.map(escapeCSV).join(','));
    
    if (report.suppliers && report.suppliers.length > 0) {
      report.suppliers.forEach((supplier: any) => {
        const amount = supplier.pendingAmount || 0;
        const status = amount > 0 ? 'Outstanding' : 'Cleared';
        
        const row = [
          supplier.id,
          supplier.name,
          supplier.contact || 'Not provided',
          'Rs ' + amount.toFixed(2),
          status
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push(escapeCSV('No outstanding supplier debts'));
    }
    
    lines.push('');
    
    // Customer receivables section  
    lines.push(escapeCSV('CUSTOMER RECEIVABLES'));
    const customerHeaders = [
      'Customer ID',
      'Customer Name',
      'Customer Type', 
      'Contact Number',
      'Pending Amount',
      'Account Status'
    ];
    lines.push(customerHeaders.map(escapeCSV).join(','));
    
    if (report.customers && report.customers.length > 0) {
      report.customers.forEach((customer: any) => {
        const amount = customer.pendingAmount || 0;
        const status = amount > 0 ? 'Pending Payment' : 'Paid Up';
        
        const row = [
          customer.id,
          customer.name,
          customer.type,
          customer.contact || 'Not provided',
          'Rs ' + amount.toFixed(2),
          status
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push(escapeCSV('No pending customer payments'));
    }
    
    lines.push('');
    lines.push(escapeCSV('END OF REPORT'));
    
    return lines.join('\n');
  };

  // Generate detailed analytics CSV
  const generateAnalyticsCSV = () => {
    const lines: string[] = [];
    
    lines.push(escapeCSV('BISMI CHICKEN SHOP - BUSINESS ANALYTICS'));
    lines.push([escapeCSV('Generated on'), escapeCSV(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))].join(','));
    lines.push([escapeCSV('Analysis Period'), escapeCSV(dateRangeText)].join(','));
    lines.push('');
    
    // Business metrics with proper formatting
    lines.push(escapeCSV('KEY PERFORMANCE INDICATORS'));
    lines.push([escapeCSV('Revenue'), escapeCSV('Rs ' + report.totalSales.toFixed(2))].join(','));
    lines.push([escapeCSV('Order Volume'), escapeCSV(report.orderCount.toString())].join(','));
    lines.push([escapeCSV('Average Transaction'), escapeCSV('Rs ' + report.averageOrderValue.toFixed(2))].join(','));
    lines.push([escapeCSV('Outstanding Receivables'), escapeCSV('Rs ' + report.totalCustomerPending.toFixed(2))].join(','));
    lines.push([escapeCSV('Supplier Liabilities'), escapeCSV('Rs ' + report.totalSupplierDebt.toFixed(2))].join(','));
    
    if (report.orderCount > 0) {
      lines.push([escapeCSV('Revenue per Order'), escapeCSV('Rs ' + (report.totalSales / report.orderCount).toFixed(2))].join(','));
    }
    
    lines.push('');
    
    // Customer analysis
    if (report.customers && report.customers.length > 0) {
      lines.push(escapeCSV('TOP CUSTOMERS BY PENDING AMOUNT'));
      const customerAnalyticsHeaders = ['Customer Name', 'Pending Amount', 'Customer Type'];
      lines.push(customerAnalyticsHeaders.map(escapeCSV).join(','));
      
      const sortedCustomers = [...report.customers]
        .sort((a, b) => (b.pendingAmount || 0) - (a.pendingAmount || 0))
        .slice(0, 10);
        
      sortedCustomers.forEach((customer: any) => {
        const row = [
          customer.name,
          'Rs ' + (customer.pendingAmount || 0).toFixed(2),
          customer.type
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    }
    
    lines.push('');
    lines.push(escapeCSV('Report generated by Bismi Chicken Shop Management System'));
    
    return lines.join('\n');
  };
  
  // Download function with progress indication and proper encoding
  const downloadFile = async (content: string, filename: string, type: string) => {
    setIsExporting(true);
    
    try {
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add BOM for proper UTF-8 encoding in Excel
      const BOM = '\uFEFF';
      const csvWithBOM = BOM + content;
      
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Export handlers
  const exportDetailedCSV = () => {
    const content = reportType === 'sales' ? generateSalesCSV() : generateDebtsCSV();
    const filename = `bismi-${reportType}-detailed-${timestamp}.csv`;
    downloadFile(content, filename, 'csv');
  };

  const exportAnalytics = () => {
    const content = generateAnalyticsCSV();
    const filename = `bismi-analytics-${timestamp}.csv`;
    downloadFile(content, filename, 'csv');
  };

  const exportSummary = () => {
    const lines: string[] = [];
    lines.push(escapeCSV('BISMI CHICKEN SHOP - EXECUTIVE SUMMARY'));
    lines.push([escapeCSV('Report Period'), escapeCSV(dateRangeText)].join(','));
    lines.push([escapeCSV('Total Revenue'), escapeCSV('Rs ' + report.totalSales.toFixed(2))].join(','));
    lines.push([escapeCSV('Total Orders'), escapeCSV(report.orderCount.toString())].join(','));
    lines.push([escapeCSV('Customer Receivables'), escapeCSV('Rs ' + report.totalCustomerPending.toFixed(2))].join(','));
    lines.push([escapeCSV('Supplier Payables'), escapeCSV('Rs ' + report.totalSupplierDebt.toFixed(2))].join(','));
    
    const content = lines.join('\n');
    const filename = `bismi-summary-${timestamp}.csv`;
    downloadFile(content, filename, 'csv');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="ml-2"
        >
          {isExporting ? (
            <>
              <div className="animate-spin mr-2 h-3 w-3 border border-gray-400 border-t-transparent rounded-full" />
              Exporting...
            </>
          ) : (
            'Export Data'
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={exportDetailedCSV}>
          Detailed Report
          <Badge variant="secondary" className="ml-auto">CSV</Badge>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={exportAnalytics}>
          Business Analytics
          <Badge variant="secondary" className="ml-auto">CSV</Badge>
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={exportSummary}>
          Executive Summary
          <Badge variant="secondary" className="ml-auto">CSV</Badge>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {report.orderCount} orders • {dateRangeText}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
