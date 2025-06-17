import { Button } from "@/components/ui/button";
import { format } from "date-fns";

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
  // Format dates for display
  const formattedStartDate = format(startDate, 'MMM dd, yyyy');
  const formattedEndDate = format(endDate, 'MMM dd, yyyy');
  const sameDay = formattedStartDate === formattedEndDate;
  
  // Generate date range text
  const dateRangeText = sameDay ? formattedStartDate : `${formattedStartDate} - ${formattedEndDate}`;
  
  // Generate CSV content
  const generateCsv = () => {
    let csvContent = '';
    
    if (reportType === 'sales') {
      // Add header
      csvContent += 'Report Type,Sales Report\n';
      csvContent += `Date Range,${dateRangeText}\n`;
      csvContent += `Total Sales,₹${report.totalSales.toFixed(2)}\n`;
      csvContent += `Order Count,${report.orderCount}\n\n`;
      
      // Add orders
      csvContent += 'Order Date,Customer ID,Status,Total\n';
      
      if (report.orders && report.orders.length > 0) {
        report.orders.forEach((order: any) => {
          const orderDate = format(new Date(order.date), 'yyyy-MM-dd HH:mm:ss');
          csvContent += `${orderDate},${order.customerId},${order.status},₹${order.total.toFixed(2)}\n`;
        });
      }
    } else if (reportType === 'debts') {
      // Add header
      csvContent += 'Report Type,Debts Report\n';
      csvContent += `Date,${format(new Date(), 'yyyy-MM-dd')}\n`;
      csvContent += `Total Supplier Debts,₹${report.totalSupplierDebt.toFixed(2)}\n`;
      csvContent += `Total Customer Pending,₹${report.totalCustomerPending.toFixed(2)}\n\n`;
      
      // Add supplier debts
      csvContent += 'Supplier Debts\n';
      csvContent += 'Supplier ID,Supplier Name,Debt Amount\n';
      
      if (report.suppliers && report.suppliers.length > 0) {
        report.suppliers.forEach((supplier: any) => {
          csvContent += `${supplier.id},${supplier.name},₹${supplier.pendingAmount.toFixed(2)}\n`;
        });
      }
      
      csvContent += '\nCustomer Pending Payments\n';
      csvContent += 'Customer ID,Customer Name,Type,Pending Amount\n';
      
      if (report.customers && report.customers.length > 0) {
        report.customers.forEach((customer: any) => {
          csvContent += `${customer.id},${customer.name},${customer.type},₹${customer.pendingAmount.toFixed(2)}\n`;
        });
      }
    }
    
    return csvContent;
  };
  
  // Handle export to CSV
  const exportToCsv = () => {
    const csvContent = generateCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger click
    const link = document.createElement('a');
    const filename = `bismi_${reportType}_report_${format(new Date(), 'yyyyMMdd')}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <Button 
      variant="outline" 
      className="ml-2"
      onClick={exportToCsv}
    >
      <i className="fas fa-download mr-2"></i> Export CSV
    </Button>
  );
}
