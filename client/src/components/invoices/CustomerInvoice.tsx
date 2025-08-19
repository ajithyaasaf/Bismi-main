import { useState, useRef, useCallback, useEffect } from 'react';
import { Customer, Order, Transaction, DebtAdjustment } from '@shared/types';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format, addDays, parseISO } from 'date-fns';
import { Download, Eye, Printer, Mail, Settings, FileText, AlertTriangle, X } from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { generateCustomerInvoicePDF, InvoiceData } from './ReactPDFInvoice';

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

  // Get debt adjustments for hotel customers
  const { data: debtAdjustments = [] } = useQuery<DebtAdjustment[]>({
    queryKey: [`/api/hotels/${customer.id}/debt-adjustments`],
    enabled: customer.type === 'hotel' && isOpen,
  });
  
  const [settings, setSettings] = useState<InvoiceSettings>({
    showPaid: false,
    overdueThresholdDays: 15,
    dueDate: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    businessInfo: {
      name: "Bismi Broiler's",
      address: ["Near Busstand, Hayarnisha Hospital", "Mudukulathur"],
      phone: "+91 8681087082",
      email: "bismi.broilers@gmail.com"
    },
    paymentInfo: {
      upiId: "barakathnisha004@okicici",
      phone: "+91 9514499968",
      accountName: "Barakath Nisha",
      terms: [
        "For queries regarding this invoice, please contact us"
      ]
    }
  });

  // Calculate invoice statistics
  const relevantOrders = orders.filter(order => order.customerId === customer.id);
  const unpaidOrders = relevantOrders.filter(order => order.paymentStatus !== 'paid');
  const totalAmount = relevantOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
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
        debtAdjustments: debtAdjustments,
        businessInfo: {
          name: settings.businessInfo.name,
          address: settings.businessInfo.address,
          phone: settings.businessInfo.phone,
          email: settings.businessInfo.email
        },
        paymentInfo: settings.paymentInfo
      };

      setGenerationProgress(60);

      // Generate PDF using React PDF
      await generateCustomerInvoicePDF(invoiceData);
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
      <DialogContent className="w-[95vw] max-w-7xl h-[90vh] max-h-[800px] overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="flex-shrink-0 p-3 sm:p-4 lg:p-6 border-b bg-white">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg lg:text-xl font-semibold leading-tight">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Invoice - {customer.name}</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-3 sm:p-4 lg:p-6">



              <Tabs defaultValue="preview" className="w-full h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 h-auto mb-3 sm:mb-4 bg-gradient-to-r from-gray-100 to-blue-50 p-1 rounded-xl shadow-sm">
                  <TabsTrigger value="preview" className="text-xs sm:text-sm px-2 py-3 sm:py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all font-medium min-h-[44px]">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Preview</span>
                    <span className="xs:hidden">View</span>
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm px-2 py-3 sm:py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all font-medium min-h-[44px]">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Settings</span>
                    <span className="xs:hidden">Config</span>
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs sm:text-sm px-2 py-3 sm:py-4 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md transition-all font-medium min-h-[44px]">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Actions</span>
                    <span className="xs:hidden">Export</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="preview" className="flex-1 flex flex-col space-y-3 sm:space-y-4 lg:space-y-6 min-h-0">
                  {/* Enhanced Quick Stats - Mobile First */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-2 sm:p-3 lg:p-4">
                        <div className="text-center">
                          <div className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-blue-600">
                            ₹{totalAmount.toFixed(2)}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Value</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-100 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-2 sm:p-3 lg:p-4">
                        <div className="text-center">
                          <div className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-red-600">
                            ₹{pendingAmount.toFixed(2)}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">Pending</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-2 sm:p-3 lg:p-4">
                        <div className="text-center">
                          <div className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-green-600">
                            {relevantOrders.length}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">Orders</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-2 sm:p-3 lg:p-4">
                        <div className="text-center">
                          <div className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold text-orange-600">
                            {unpaidOrders.length}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">Unpaid</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Enhanced PDF Generation Progress */}
                  {isGenerating && (
                    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                      <CardContent className="p-4 md:p-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="animate-spin h-5 w-5 md:h-6 md:w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                            <p className="text-sm md:text-base font-semibold text-blue-800">Generating PDF Invoice...</p>
                            <span className="text-sm md:text-base text-blue-600 ml-auto font-bold">{Math.round(generationProgress)}%</span>
                          </div>
                          <Progress value={generationProgress} className="h-3 md:h-4" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Responsive Invoice Preview */}
                  <div className="flex-1 border-2 rounded-xl overflow-hidden bg-white shadow-lg min-h-0">
                    <div className="h-full overflow-y-auto">
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

          <TabsContent value="actions" className="mt-4 sm:mt-6 space-y-4">
            {/* Mobile-First Action Buttons */}
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-orange-800">
                  <Download className="h-4 w-4" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isGenerating ? 'Generating PDF...' : 'Download PDF Invoice'}
                </Button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="h-11 border-gray-300 hover:bg-gray-50 font-medium"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Invoice
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 border-gray-300 hover:bg-gray-50 font-medium"
                    onClick={() => toast({
                      title: "Feature Coming Soon",
                      description: "Email functionality will be available in the next update."
                    })}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-Optimized Invoice Information */}
            <Card className="border-gray-200 bg-gray-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-gray-800">
                  <FileText className="h-4 w-4" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-gray-600 font-medium">Invoice #:</span>
                      <span className="font-mono text-blue-800 break-all">{invoiceNumber}</span>
                      
                      <span className="text-gray-600 font-medium">Date:</span>
                      <span>{format(parseISO(currentDate), 'dd/MM/yyyy')}</span>
                      
                      <span className="text-gray-600 font-medium">Due Date:</span>
                      <span className="text-orange-600 font-medium">{format(parseISO(settings.dueDate), 'dd/MM/yyyy')}</span>
                      
                      <span className="text-gray-600 font-medium">Customer:</span>
                      <span className="truncate font-medium">{customer.name}</span>
                      
                      <span className="text-gray-600 font-medium">Type:</span>
                      <Badge variant="secondary" className="w-fit justify-self-start">
                        {customer.type}
                      </Badge>
                    </div>
                  </div>

                  {unpaidOrders.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-800">
                          {unpaidOrders.length} unpaid order{unpaidOrders.length > 1 ? 's' : ''} found
                        </span>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">
                        These orders will be highlighted in the invoice
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Enhanced Sticky Footer */}
          <div className="flex-shrink-0 border-t bg-gradient-to-r from-gray-50 to-blue-50 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="h-12 md:h-14 order-2 sm:order-1 border-2 font-medium text-sm md:text-base"
              >
                Close Invoice
              </Button>
              <Button 
                onClick={handleGeneratePDF} 
                disabled={isGenerating} 
                className="h-12 md:h-14 order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm md:text-base px-6 md:px-8"
              >
                <Download className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                {isGenerating ? 'Generating PDF...' : 'Generate PDF Invoice'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}