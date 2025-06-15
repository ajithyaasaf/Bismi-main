import { useState, useRef, useCallback, useEffect } from 'react';
import { Customer, Order, Transaction } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { Download, Eye, Printer, Mail, Settings, FileText, AlertTriangle } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { generatePDFInvoice, InvoiceData } from './ReactPDFInvoice';

interface CustomerInvoiceProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  orders: Order[];
  transactions?: Transaction[];
}

interface InvoiceSettings {
  showPaid: boolean;
  overdueThresholdDays: number;
  dueDate: string;
  businessInfo: {
    name: string;
    address: string[];
    phone: string;
    gstin: string;
    email: string;
  };
  paymentInfo: {
    upiId: string;
    phone: string;
    accountName: string;
    terms: string[];
  };
}

export function CustomerInvoice({
  isOpen,
  onClose,
  customer,
  orders,
  transactions = []
}: CustomerInvoiceProps) {
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [invoiceNumber] = useState(`INV-${Date.now()}`);
  
  const [settings, setSettings] = useState<InvoiceSettings>({
    showPaid: false,
    overdueThresholdDays: 15,
    dueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    businessInfo: {
      name: "Bismi Broiler's",
      address: ["Near Busstand, Hayarnisha Hospital", "Mudukulathur"],
      phone: "+91 8681087082",
      gstin: "33AADCB1234F1Z5",
      email: "bismi.broilers@gmail.com"
    },
    paymentInfo: {
      upiId: "9514499968@ybl",
      phone: "+91 9514499968",
      accountName: "Bismi Broiler's",
      terms: [
        "Payment is due within 15 days of invoice date",
        "Late payments may be subject to 2% monthly interest charges",
        "For queries regarding this invoice, please contact our accounts department"
      ]
    }
  });

  // Calculate invoice statistics
  const relevantOrders = orders.filter(order => order.customerId === customer.id);
  const unpaidOrders = relevantOrders.filter(order => order.status !== 'paid');
  const totalAmount = relevantOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const pendingAmount = customer.pendingAmount || 0;

  // Progress simulation for better UX
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 200);

      return () => clearInterval(interval);
    } else {
      setGenerationProgress(0);
    }
  }, [isGenerating]);

  const handleGeneratePDF = useCallback(async () => {
    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      setGenerationProgress(30);

      // Prepare data for PDF generation
      const invoiceData: InvoiceData = {
        customer,
        orders,
        currentDate,
        invoiceNumber,
        dueDate: settings.dueDate,
        showPaid: settings.showPaid,
        overdueThresholdDays: settings.overdueThresholdDays,
        payments: transactions,
        businessInfo: settings.businessInfo,
        paymentInfo: settings.paymentInfo
      };

      setGenerationProgress(60);

      // Generate PDF using React PDF
      await generatePDFInvoice(invoiceData);
      setGenerationProgress(100);

      toast({
        title: "PDF Generated Successfully",
        description: `Invoice for ${customer.name} has been downloaded.`
      });

    } catch (error) {
      console.error('PDF generation failed:', error);
      toast({
        title: "PDF Generation Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred while generating the PDF.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
      }, 500);
    }
  }, [customer, orders, currentDate, invoiceNumber, settings, transactions, toast]);

  const handlePrint = useCallback(() => {
    if (!invoiceRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Print Error",
        description: "Could not open print window. Please check your browser settings.",
        variant: "destructive"
      });
      return;
    }

    const invoiceHtml = invoiceRef.current.outerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${customer.name}</title>
          <style>
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
            .bg-white { background-color: white; }
            .text-gray-600 { color: #4b5563; }
            .text-blue-800 { color: #1e40af; }
            .text-red-600 { color: #dc2626; }
            .text-green-600 { color: #16a34a; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .text-lg { font-size: 1.125rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .p-3 { padding: 0.75rem; }
            .p-6 { padding: 1.5rem; }
            .p-8 { padding: 2rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-8 { margin-bottom: 2rem; }
            .border { border-width: 1px; }
            .border-gray-300 { border-color: #d1d5db; }
            .rounded { border-radius: 0.25rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .w-full { width: 100%; }
            table { border-collapse: collapse; width: 100%; }
            td, th { border: 1px solid #d1d5db; padding: 0.75rem; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${invoiceHtml}
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [customer.name, toast]);

  const updateBusinessInfo = (field: keyof InvoiceSettings['businessInfo'], value: string | string[]) => {
    setSettings(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        [field]: value
      }
    }));
  };

  const updatePaymentInfo = (field: keyof InvoiceSettings['paymentInfo'], value: string | string[]) => {
    setSettings(prev => ({
      ...prev,
      paymentInfo: {
        ...prev.paymentInfo,
        [field]: value
      }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="truncate">Invoice for {customer.name}</span>
          </DialogTitle>
        </DialogHeader>



        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="preview" className="text-xs sm:text-sm px-2 py-2">Preview</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-2">Settings</TabsTrigger>
            <TabsTrigger value="actions" className="text-xs sm:text-sm px-2 py-2">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-6">
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-6">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold text-blue-600">
                      ₹{totalAmount.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-600">Total Value</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold text-red-600">
                      ₹{pendingAmount.toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-600">Pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold text-green-600">
                      {relevantOrders.length}
                    </div>
                    <p className="text-xs text-gray-600">Total Orders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-lg sm:text-2xl font-bold text-orange-600">
                      {unpaidOrders.length}
                    </div>
                    <p className="text-xs text-gray-600">Unpaid</p>
                  </CardContent>
                </Card>
              </div>

              {/* PDF Generation Progress */}
              {isGenerating && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="animate-spin h-4 w-4 sm:h-5 sm:w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium">Generating PDF...</p>
                          <Progress value={generationProgress} className="mt-2" />
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 self-end sm:self-auto">{Math.round(generationProgress)}%</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoice Preview */}
              <div className="border rounded-lg overflow-hidden">
                <InvoiceTemplate
                  customer={customer}
                  orders={orders}
                  currentDate={currentDate}
                  invoiceNumber={invoiceNumber}
                  dueDate={settings.dueDate}
                  showPaid={settings.showPaid}
                  overdueThresholdDays={settings.overdueThresholdDays}
                  payments={transactions}
                  businessInfo={settings.businessInfo}
                  paymentInfo={settings.paymentInfo}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Invoice Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Invoice Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="showPaid"
                      checked={settings.showPaid}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, showPaid: !!checked }))
                      }
                    />
                    <Label htmlFor="showPaid" className="text-xs sm:text-sm">Include paid orders</Label>
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="dueDate" className="text-xs sm:text-sm">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={settings.dueDate}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="overdueThreshold" className="text-xs sm:text-sm">Overdue Threshold (days)</Label>
                    <Input
                      id="overdueThreshold"
                      type="number"
                      value={settings.overdueThresholdDays}
                      onChange={(e) => 
                        setSettings(prev => ({ ...prev, overdueThresholdDays: parseInt(e.target.value) || 15 }))
                      }
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Business Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="businessName" className="text-xs sm:text-sm">Business Name</Label>
                    <Input
                      id="businessName"
                      value={settings.businessInfo.name}
                      onChange={(e) => updateBusinessInfo('name', e.target.value)}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="businessPhone" className="text-xs sm:text-sm">Phone</Label>
                    <Input
                      id="businessPhone"
                      value={settings.businessInfo.phone}
                      onChange={(e) => updateBusinessInfo('phone', e.target.value)}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="businessGstin" className="text-xs sm:text-sm">GSTIN</Label>
                    <Input
                      id="businessGstin"
                      value={settings.businessInfo.gstin}
                      onChange={(e) => updateBusinessInfo('gstin', e.target.value)}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-2">
                    <Label htmlFor="businessEmail" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="businessEmail"
                      value={settings.businessInfo.email}
                      onChange={(e) => updateBusinessInfo('email', e.target.value)}
                      className="text-xs sm:text-sm h-8 sm:h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="upiId" className="text-xs sm:text-sm">UPI ID</Label>
                    <Input
                      id="upiId"
                      value={settings.paymentInfo.upiId}
                      onChange={(e) => updatePaymentInfo('upiId', e.target.value)}
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentPhone" className="text-xs sm:text-sm">Payment Phone</Label>
                    <Input
                      id="paymentPhone"
                      value={settings.paymentInfo.phone}
                      onChange={(e) => updatePaymentInfo('phone', e.target.value)}
                      className="text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="accountName" className="text-xs sm:text-sm">Account Name</Label>
                    <Input
                      id="accountName"
                      value={settings.paymentInfo.accountName}
                      onChange={(e) => updatePaymentInfo('accountName', e.target.value)}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGenerating}
                    className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Download PDF'}
                  </Button>

                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                  >
                    <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Print Invoice
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-8 sm:h-10 text-xs sm:text-sm"
                    onClick={() => toast({
                      title: "Feature Coming Soon",
                      description: "Email functionality will be available in the next update."
                    })}
                  >
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                    Email Invoice
                  </Button>
                </CardContent>
              </Card>

              {/* Invoice Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm sm:text-base">Invoice Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <span className="text-gray-600">Invoice #:</span>
                    <span className="font-mono break-all">{invoiceNumber}</span>
                    
                    <span className="text-gray-600">Date:</span>
                    <span>{format(parseISO(currentDate), 'dd/MM/yyyy')}</span>
                    
                    <span className="text-gray-600">Due Date:</span>
                    <span>{format(parseISO(settings.dueDate), 'dd/MM/yyyy')}</span>
                    
                    <span className="text-gray-600">Customer:</span>
                    <span className="truncate">{customer.name}</span>
                    
                    <span className="text-gray-600">Type:</span>
                    <span className="capitalize">{customer.type}</span>
                  </div>

                  {unpaidOrders.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 sm:p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                        <span className="text-xs sm:text-sm font-medium text-yellow-800">
                          {unpaidOrders.length} unpaid order(s)
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex flex-col sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          <Button onClick={handleGeneratePDF} disabled={isGenerating} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Generate PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}