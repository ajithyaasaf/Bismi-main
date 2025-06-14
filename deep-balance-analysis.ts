import { storageManager } from './server/storage-manager';
import { BalanceValidator } from './server/balance-validator';

interface DeepBalanceAnalysis {
  basicValidation: any;
  transactionConsistency: {
    totalTransactions: number;
    receiptTransactions: number;
    expenseTransactions: number;
    paymentTransactions: number;
    totalReceiptAmount: number;
    totalExpenseAmount: number;
    totalPaymentAmount: number;
    orphanedTransactions: any[];
    duplicateTransactions: any[];
    invalidAmountTransactions: any[];
  };
  orderConsistency: {
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    totalPaidAmount: number;
    totalPendingAmount: number;
    ordersWithoutCustomers: any[];
    ordersWithInvalidItems: any[];
    ordersWithZeroTotal: any[];
  };
  customerDataIntegrity: {
    totalCustomers: number;
    customersWithOrders: number;
    customersWithTransactions: number;
    customersWithNegativeBalance: any[];
    customersWithLargeDiscrepancies: any[];
    customersWithoutRelatedData: any[];
  };
  supplierDataIntegrity: {
    totalSuppliers: number;
    suppliersWithTransactions: number;
    suppliersWithNegativeDebt: any[];
    suppliersWithLargeDiscrepancies: any[];
    suppliersWithoutRelatedData: any[];
  };
  crossReferenceValidation: {
    transactionCustomerMismatches: any[];
    transactionSupplierMismatches: any[];
    orderCustomerMismatches: any[];
    dateInconsistencies: any[];
  };
  potentialIssues: string[];
  recommendations: string[];
}

async function performDeepBalanceAnalysis(): Promise<DeepBalanceAnalysis> {
  console.log('\n🔍 STARTING DEEP BALANCE ANALYSIS');
  console.log('=====================================');
  
  const storage = await storageManager.initialize();
  const validator = new BalanceValidator(storage);
  
  // Get basic validation first
  const basicValidation = await validator.validateAllBalances();
  
  // Fetch all data for deep analysis
  const customers = await storage.getAllCustomers();
  const suppliers = await storage.getAllSuppliers();
  const orders = await storage.getAllOrders();
  const transactions = await storage.getAllTransactions();
  
  console.log(`\n📊 DATA OVERVIEW:`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Suppliers: ${suppliers.length}`);
  console.log(`   Orders: ${orders.length}`);
  console.log(`   Transactions: ${transactions.length}`);
  
  const analysis: DeepBalanceAnalysis = {
    basicValidation,
    transactionConsistency: analyzeTransactionConsistency(transactions, customers, suppliers),
    orderConsistency: analyzeOrderConsistency(orders, customers),
    customerDataIntegrity: analyzeCustomerDataIntegrity(customers, orders, transactions),
    supplierDataIntegrity: analyzeSupplierDataIntegrity(suppliers, transactions),
    crossReferenceValidation: analyzeCrossReferences(transactions, orders, customers, suppliers),
    potentialIssues: [],
    recommendations: []
  };
  
  // Generate issues and recommendations based on findings
  generateIssuesAndRecommendations(analysis);
  
  return analysis;
}

function analyzeTransactionConsistency(transactions: any[], customers: any[], suppliers: any[]) {
  console.log('\n💰 ANALYZING TRANSACTION CONSISTENCY');
  
  const receiptTransactions = transactions.filter(t => t.type === 'receipt');
  const expenseTransactions = transactions.filter(t => t.type === 'expense');
  const paymentTransactions = transactions.filter(t => t.type === 'payment');
  
  const totalReceiptAmount = receiptTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenseAmount = expenseTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPaymentAmount = paymentTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Find orphaned transactions
  const orphanedTransactions = transactions.filter(transaction => {
    if (transaction.entityType === 'customer') {
      return !customers.find(c => c.id === transaction.entityId);
    } else if (transaction.entityType === 'supplier') {
      return !suppliers.find(s => s.id === transaction.entityId);
    }
    return false;
  });
  
  // Find duplicate transactions (same amount, entity, date)
  const duplicateTransactions = [];
  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < transactions.length; j++) {
      const t1 = transactions[i];
      const t2 = transactions[j];
      if (t1.amount === t2.amount && 
          t1.entityId === t2.entityId && 
          t1.type === t2.type &&
          new Date(t1.date).getTime() === new Date(t2.date).getTime()) {
        duplicateTransactions.push({ transaction1: t1, transaction2: t2 });
      }
    }
  }
  
  // Find transactions with invalid amounts
  const invalidAmountTransactions = transactions.filter(t => 
    !t.amount || t.amount <= 0 || isNaN(t.amount)
  );
  
  console.log(`   Total Transactions: ${transactions.length}`);
  console.log(`   Receipts: ${receiptTransactions.length} (₹${totalReceiptAmount.toFixed(2)})`);
  console.log(`   Expenses: ${expenseTransactions.length} (₹${totalExpenseAmount.toFixed(2)})`);
  console.log(`   Payments: ${paymentTransactions.length} (₹${totalPaymentAmount.toFixed(2)})`);
  console.log(`   Orphaned: ${orphanedTransactions.length}`);
  console.log(`   Duplicates: ${duplicateTransactions.length}`);
  console.log(`   Invalid Amounts: ${invalidAmountTransactions.length}`);
  
  return {
    totalTransactions: transactions.length,
    receiptTransactions: receiptTransactions.length,
    expenseTransactions: expenseTransactions.length,
    paymentTransactions: paymentTransactions.length,
    totalReceiptAmount,
    totalExpenseAmount,
    totalPaymentAmount,
    orphanedTransactions,
    duplicateTransactions,
    invalidAmountTransactions
  };
}

function analyzeOrderConsistency(orders: any[], customers: any[]) {
  console.log('\n📋 ANALYZING ORDER CONSISTENCY');
  
  const paidOrders = orders.filter(o => o.status === 'paid');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  
  const totalPaidAmount = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalPendingAmount = pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  // Find orders without corresponding customers
  const ordersWithoutCustomers = orders.filter(order =>
    !customers.find(c => c.id === order.customerId)
  );
  
  // Find orders with invalid items or totals
  const ordersWithInvalidItems = orders.filter(order =>
    !order.items || !Array.isArray(order.items) || order.items.length === 0
  );
  
  const ordersWithZeroTotal = orders.filter(order =>
    !order.total || order.total <= 0
  );
  
  console.log(`   Total Orders: ${orders.length}`);
  console.log(`   Paid Orders: ${paidOrders.length} (₹${totalPaidAmount.toFixed(2)})`);
  console.log(`   Pending Orders: ${pendingOrders.length} (₹${totalPendingAmount.toFixed(2)})`);
  console.log(`   Orders without customers: ${ordersWithoutCustomers.length}`);
  console.log(`   Orders with invalid items: ${ordersWithInvalidItems.length}`);
  console.log(`   Orders with zero total: ${ordersWithZeroTotal.length}`);
  
  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    pendingOrders: pendingOrders.length,
    totalPaidAmount,
    totalPendingAmount,
    ordersWithoutCustomers,
    ordersWithInvalidItems,
    ordersWithZeroTotal
  };
}

function analyzeCustomerDataIntegrity(customers: any[], orders: any[], transactions: any[]) {
  console.log('\n👥 ANALYZING CUSTOMER DATA INTEGRITY');
  
  const customersWithOrders = customers.filter(c =>
    orders.some(o => o.customerId === c.id)
  ).length;
  
  const customersWithTransactions = customers.filter(c =>
    transactions.some(t => t.entityType === 'customer' && t.entityId === c.id)
  ).length;
  
  const customersWithNegativeBalance = customers.filter(c =>
    c.pendingAmount && c.pendingAmount < 0
  );
  
  const customersWithLargeDiscrepancies = customers.filter(c => {
    // Calculate expected balance
    const customerOrders = orders.filter(o => o.customerId === c.id && o.status === 'pending');
    const customerTransactions = transactions.filter(t => t.entityType === 'customer' && t.entityId === c.id);
    
    const expectedBalance = customerOrders.reduce((sum, o) => sum + (o.total || 0), 0) -
                           customerTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const actualBalance = c.pendingAmount || 0;
    const difference = Math.abs(expectedBalance - actualBalance);
    
    return difference > 100; // Large discrepancy threshold
  });
  
  const customersWithoutRelatedData = customers.filter(c =>
    !orders.some(o => o.customerId === c.id) &&
    !transactions.some(t => t.entityType === 'customer' && t.entityId === c.id)
  );
  
  console.log(`   Total Customers: ${customers.length}`);
  console.log(`   Customers with orders: ${customersWithOrders}`);
  console.log(`   Customers with transactions: ${customersWithTransactions}`);
  console.log(`   Customers with negative balance: ${customersWithNegativeBalance.length}`);
  console.log(`   Customers with large discrepancies: ${customersWithLargeDiscrepancies.length}`);
  console.log(`   Customers without related data: ${customersWithoutRelatedData.length}`);
  
  return {
    totalCustomers: customers.length,
    customersWithOrders,
    customersWithTransactions,
    customersWithNegativeBalance,
    customersWithLargeDiscrepancies,
    customersWithoutRelatedData
  };
}

function analyzeSupplierDataIntegrity(suppliers: any[], transactions: any[]) {
  console.log('\n🏭 ANALYZING SUPPLIER DATA INTEGRITY');
  
  const suppliersWithTransactions = suppliers.filter(s =>
    transactions.some(t => t.entityType === 'supplier' && t.entityId === s.id)
  ).length;
  
  const suppliersWithNegativeDebt = suppliers.filter(s =>
    s.debt && s.debt < 0
  );
  
  const suppliersWithLargeDiscrepancies = suppliers.filter(s => {
    const supplierTransactions = transactions.filter(t => t.entityType === 'supplier' && t.entityId === s.id);
    const expenses = supplierTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const payments = supplierTransactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const expectedDebt = expenses - payments;
    const actualDebt = s.debt || 0;
    const difference = Math.abs(expectedDebt - actualDebt);
    
    return difference > 100; // Large discrepancy threshold
  });
  
  const suppliersWithoutRelatedData = suppliers.filter(s =>
    !transactions.some(t => t.entityType === 'supplier' && t.entityId === s.id)
  );
  
  console.log(`   Total Suppliers: ${suppliers.length}`);
  console.log(`   Suppliers with transactions: ${suppliersWithTransactions}`);
  console.log(`   Suppliers with negative debt: ${suppliersWithNegativeDebt.length}`);
  console.log(`   Suppliers with large discrepancies: ${suppliersWithLargeDiscrepancies.length}`);
  console.log(`   Suppliers without related data: ${suppliersWithoutRelatedData.length}`);
  
  return {
    totalSuppliers: suppliers.length,
    suppliersWithTransactions,
    suppliersWithNegativeDebt,
    suppliersWithLargeDiscrepancies,
    suppliersWithoutRelatedData
  };
}

function analyzeCrossReferences(transactions: any[], orders: any[], customers: any[], suppliers: any[]) {
  console.log('\n🔗 ANALYZING CROSS-REFERENCE VALIDATION');
  
  // Find transaction-customer mismatches
  const transactionCustomerMismatches = transactions
    .filter(t => t.entityType === 'customer')
    .filter(t => !customers.find(c => c.id === t.entityId))
    .map(t => ({ transaction: t, issue: 'Customer not found' }));
  
  // Find transaction-supplier mismatches
  const transactionSupplierMismatches = transactions
    .filter(t => t.entityType === 'supplier')
    .filter(t => !suppliers.find(s => s.id === t.entityId))
    .map(t => ({ transaction: t, issue: 'Supplier not found' }));
  
  // Find order-customer mismatches
  const orderCustomerMismatches = orders
    .filter(o => !customers.find(c => c.id === o.customerId))
    .map(o => ({ order: o, issue: 'Customer not found' }));
  
  // Find date inconsistencies
  const dateInconsistencies = [];
  const now = new Date();
  
  // Check for future-dated transactions
  transactions.forEach(t => {
    if (new Date(t.date) > now) {
      dateInconsistencies.push({ 
        type: 'transaction', 
        id: t.id, 
        issue: 'Future date',
        date: t.date 
      });
    }
  });
  
  // Check for future-dated orders
  orders.forEach(o => {
    if (new Date(o.date) > now) {
      dateInconsistencies.push({ 
        type: 'order', 
        id: o.id, 
        issue: 'Future date',
        date: o.date 
      });
    }
  });
  
  console.log(`   Transaction-customer mismatches: ${transactionCustomerMismatches.length}`);
  console.log(`   Transaction-supplier mismatches: ${transactionSupplierMismatches.length}`);
  console.log(`   Order-customer mismatches: ${orderCustomerMismatches.length}`);
  console.log(`   Date inconsistencies: ${dateInconsistencies.length}`);
  
  return {
    transactionCustomerMismatches,
    transactionSupplierMismatches,
    orderCustomerMismatches,
    dateInconsistencies
  };
}

function generateIssuesAndRecommendations(analysis: DeepBalanceAnalysis) {
  console.log('\n⚠️  GENERATING ISSUES AND RECOMMENDATIONS');
  
  const issues = [];
  const recommendations = [];
  
  // Check basic validation issues
  if (!analysis.basicValidation.isValid) {
    issues.push(`Balance validation failed with ${analysis.basicValidation.errors.length} errors`);
    recommendations.push('Run balance correction using /api/fix-balances endpoint');
  }
  
  // Check transaction issues
  if (analysis.transactionConsistency.orphanedTransactions.length > 0) {
    issues.push(`Found ${analysis.transactionConsistency.orphanedTransactions.length} orphaned transactions`);
    recommendations.push('Clean up orphaned transactions by either creating missing entities or removing invalid transactions');
  }
  
  if (analysis.transactionConsistency.duplicateTransactions.length > 0) {
    issues.push(`Found ${analysis.transactionConsistency.duplicateTransactions.length} duplicate transactions`);
    recommendations.push('Review and remove duplicate transactions to prevent double-counting');
  }
  
  if (analysis.transactionConsistency.invalidAmountTransactions.length > 0) {
    issues.push(`Found ${analysis.transactionConsistency.invalidAmountTransactions.length} transactions with invalid amounts`);
    recommendations.push('Fix or remove transactions with zero, negative, or non-numeric amounts');
  }
  
  // Check order issues
  if (analysis.orderConsistency.ordersWithoutCustomers.length > 0) {
    issues.push(`Found ${analysis.orderConsistency.ordersWithoutCustomers.length} orders without corresponding customers`);
    recommendations.push('Either create missing customers or remove orphaned orders');
  }
  
  if (analysis.orderConsistency.ordersWithZeroTotal.length > 0) {
    issues.push(`Found ${analysis.orderConsistency.ordersWithZeroTotal.length} orders with zero total`);
    recommendations.push('Review and fix orders with zero totals');
  }
  
  // Check customer integrity
  if (analysis.customerDataIntegrity.customersWithLargeDiscrepancies.length > 0) {
    issues.push(`Found ${analysis.customerDataIntegrity.customersWithLargeDiscrepancies.length} customers with large balance discrepancies`);
    recommendations.push('Investigate customers with balance differences > ₹100');
  }
  
  // Check supplier integrity
  if (analysis.supplierDataIntegrity.suppliersWithLargeDiscrepancies.length > 0) {
    issues.push(`Found ${analysis.supplierDataIntegrity.suppliersWithLargeDiscrepancies.length} suppliers with large debt discrepancies`);
    recommendations.push('Investigate suppliers with debt differences > ₹100');
  }
  
  // Check cross-reference issues
  const totalMismatches = 
    analysis.crossReferenceValidation.transactionCustomerMismatches.length +
    analysis.crossReferenceValidation.transactionSupplierMismatches.length +
    analysis.crossReferenceValidation.orderCustomerMismatches.length;
    
  if (totalMismatches > 0) {
    issues.push(`Found ${totalMismatches} cross-reference mismatches`);
    recommendations.push('Fix broken references between entities');
  }
  
  if (analysis.crossReferenceValidation.dateInconsistencies.length > 0) {
    issues.push(`Found ${analysis.crossReferenceValidation.dateInconsistencies.length} date inconsistencies`);
    recommendations.push('Review and correct future-dated records');
  }
  
  // Data quality recommendations
  if (analysis.customerDataIntegrity.customersWithoutRelatedData.length > 0) {
    recommendations.push(`Consider archiving ${analysis.customerDataIntegrity.customersWithoutRelatedData.length} customers with no orders or transactions`);
  }
  
  if (analysis.supplierDataIntegrity.suppliersWithoutRelatedData.length > 0) {
    recommendations.push(`Consider archiving ${analysis.supplierDataIntegrity.suppliersWithoutRelatedData.length} suppliers with no transactions`);
  }
  
  analysis.potentialIssues = issues;
  analysis.recommendations = recommendations;
  
  console.log(`\n🚨 POTENTIAL ISSUES: ${issues.length}`);
  issues.forEach((issue, index) => console.log(`   ${index + 1}. ${issue}`));
  
  console.log(`\n💡 RECOMMENDATIONS: ${recommendations.length}`);
  recommendations.forEach((rec, index) => console.log(`   ${index + 1}. ${rec}`));
}

// Execute the analysis
performDeepBalanceAnalysis()
  .then(analysis => {
    console.log('\n✅ DEEP BALANCE ANALYSIS COMPLETED');
    console.log('=====================================');
    
    if (analysis.potentialIssues.length === 0) {
      console.log('🎉 No critical issues found in financial data integrity!');
    } else {
      console.log(`⚠️  Found ${analysis.potentialIssues.length} potential issues that need attention.`);
    }
    
    // Save detailed analysis to file for review
    require('fs').writeFileSync(
      'balance-analysis-report.json', 
      JSON.stringify(analysis, null, 2)
    );
    console.log('\n📄 Detailed report saved to: balance-analysis-report.json');
  })
  .catch(error => {
    console.error('❌ Deep balance analysis failed:', error);
    process.exit(1);
  });