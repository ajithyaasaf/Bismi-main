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
    
    // Report metadata section
    lines.push('BISMI CHICKEN SHOP - SALES REPORT');
    lines.push('Generated on,' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    lines.push('Report Period,' + dateRangeText);
    lines.push('Report Type,Sales Analysis');
    lines.push('');
    
    // Executive summary section
    lines.push('EXECUTIVE SUMMARY');
    lines.push('Total Sales Revenue,₹' + report.totalSales.toFixed(2));
    lines.push('Total Orders Count,' + report.orderCount);
    lines.push('Average Order Value,₹' + report.averageOrderValue.toFixed(2));
    lines.push('Data Export Time,' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    lines.push('');
    
    // Detailed orders section
    lines.push('DETAILED ORDERS');
    const orderHeaders = [
      'Order ID',
      'Date',
      'Time',
      'Customer Name', 
      'Customer ID',
      'Payment Status',
      'Order Status',
      'Total Amount (₹)',
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
          (order.totalAmount || 0).toFixed(2),
          itemsCount
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push('No orders found for the selected period');
    }
    
    lines.push('');
    lines.push('END OF REPORT');
    
    return lines.join('\n');
  };

  // Generate comprehensive debts CSV
  const generateDebtsCSV = () => {
    const lines: string[] = [];
    
    // Report metadata section
    lines.push('BISMI CHICKEN SHOP - DEBTS & RECEIVABLES REPORT');
    lines.push('Generated on,' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    lines.push('Report Date,' + dateRangeText);
    lines.push('Report Type,Financial Position Analysis');
    lines.push('');
    
    // Financial summary section
    lines.push('FINANCIAL SUMMARY');
    lines.push('Total Supplier Debts,₹' + report.totalSupplierDebt.toFixed(2));
    lines.push('Total Customer Receivables,₹' + report.totalCustomerPending.toFixed(2));
    lines.push('Net Position,₹' + (report.totalCustomerPending - report.totalSupplierDebt).toFixed(2));
    lines.push('');
    
    // Supplier debts section
    lines.push('SUPPLIER DEBTS');
    const supplierHeaders = [
      'Supplier ID',
      'Supplier Name', 
      'Contact Number',
      'Outstanding Amount (₹)',
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
          amount.toFixed(2),
          status
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push('No outstanding supplier debts');
    }
    
    lines.push('');
    
    // Customer receivables section  
    lines.push('CUSTOMER RECEIVABLES');
    const customerHeaders = [
      'Customer ID',
      'Customer Name',
      'Customer Type', 
      'Contact Number',
      'Pending Amount (₹)',
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
          amount.toFixed(2),
          status
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    } else {
      lines.push('No pending customer payments');
    }
    
    lines.push('');
    lines.push('END OF REPORT');
    
    return lines.join('\n');
  };

  // Generate detailed analytics CSV
  const generateAnalyticsCSV = () => {
    const lines: string[] = [];
    
    lines.push('BISMI CHICKEN SHOP - BUSINESS ANALYTICS');
    lines.push('Generated on,' + format(new Date(), 'yyyy-MM-dd HH:mm:ss'));
    lines.push('Analysis Period,' + dateRangeText);
    lines.push('');
    
    // Business metrics
    lines.push('KEY PERFORMANCE INDICATORS');
    lines.push('Revenue,₹' + report.totalSales.toFixed(2));
    lines.push('Order Volume,' + report.orderCount);
    lines.push('Average Transaction,₹' + report.averageOrderValue.toFixed(2));
    lines.push('Outstanding Receivables,₹' + report.totalCustomerPending.toFixed(2));
    lines.push('Supplier Liabilities,₹' + report.totalSupplierDebt.toFixed(2));
    
    if (report.orderCount > 0) {
      lines.push('Revenue per Order,₹' + (report.totalSales / report.orderCount).toFixed(2));
    }
    
    lines.push('');
    
    // Customer analysis
    if (report.customers && report.customers.length > 0) {
      lines.push('TOP CUSTOMERS BY PENDING AMOUNT');
      lines.push('Customer Name,Pending Amount (₹),Customer Type');
      
      const sortedCustomers = [...report.customers]
        .sort((a, b) => (b.pendingAmount || 0) - (a.pendingAmount || 0))
        .slice(0, 10);
        
      sortedCustomers.forEach((customer: any) => {
        const row = [
          customer.name,
          (customer.pendingAmount || 0).toFixed(2),
          customer.type
        ];
        lines.push(row.map(escapeCSV).join(','));
      });
    }
    
    lines.push('');
    lines.push('Report generated by Bismi Chicken Shop Management System');
    
    return lines.join('\n');
  };
  
  // Download function with progress indication
  const downloadFile = async (content: string, filename: string, type: string) => {
    setIsExporting(true);
    
    try {
      // Add small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const blob = new Blob([content], { type: `text/${type};charset=utf-8;` });
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
    lines.push('BISMI CHICKEN SHOP - EXECUTIVE SUMMARY');
    lines.push('Report Period,' + dateRangeText);
    lines.push('Total Revenue,₹' + report.totalSales.toFixed(2));
    lines.push('Total Orders,' + report.orderCount);
    lines.push('Customer Receivables,₹' + report.totalCustomerPending.toFixed(2));
    lines.push('Supplier Payables,₹' + report.totalSupplierDebt.toFixed(2));
    
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
