import { storageManager } from './server/storage-manager';

async function fixBalanceDiscrepancies() {
  console.log('\n=== FIXING BALANCE DISCREPANCIES ===\n');

  try {
    // Get enterprise storage instance using Firebase Admin SDK
    const storage = await storageManager.initialize();
    
    // Fetch all data
    const customers = await storage.getAllCustomers();
    const suppliers = await storage.getAllSuppliers();
    const orders = await storage.getAllOrders();
    const transactions = await storage.getAllTransactions();

    console.log('Fixing customer balance discrepancies...');

    // Fix customer balances
    for (const customer of customers) {
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const unpaidOrders = customerOrders.filter(o => o.status !== 'paid');
      const customerPayments = transactions.filter(t => 
        t.entityType === 'customer' && t.entityId === customer.id && t.type === 'receipt'
      );

      const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const totalPayments = customerPayments.reduce((sum, p) => sum + p.amount, 0);
      const calculatedBalance = unpaidAmount - totalPayments;
      const actualBalance = customer.pendingAmount || 0;

      if (Math.abs(actualBalance - calculatedBalance) > 0.01) {
        console.log(`Fixing ${customer.name}: ${actualBalance} -> ${calculatedBalance}`);
        await storage.updateCustomer(customer.id, {
          pendingAmount: Math.max(0, calculatedBalance)
        });
      }
    }

    // Fix supplier balances
    console.log('Fixing supplier balance discrepancies...');
    for (const supplier of suppliers) {
      const supplierTransactions = transactions.filter(t => 
        t.entityType === 'supplier' && t.entityId === supplier.id
      );
      const expenses = supplierTransactions.filter(t => t.type === 'expense');
      const payments = supplierTransactions.filter(t => t.type === 'payment');

      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      const calculatedDebt = totalExpenses - totalPayments;
      const actualDebt = supplier.debt || 0;

      if (Math.abs(actualDebt - calculatedDebt) > 0.01) {
        console.log(`Fixing ${supplier.name}: ${actualDebt} -> ${calculatedDebt}`);
        await storage.updateSupplier(supplier.id, {
          debt: Math.max(0, calculatedDebt)
        });
      }
    }

    // Remove orphaned orders
    console.log('Removing orphaned orders...');
    const orphanedOrders = orders.filter(order => 
      !customers.find(customer => customer.id === order.customerId)
    );
    
    for (const order of orphanedOrders) {
      console.log(`Removing orphaned order ${order.id}`);
      await storage.deleteOrder(order.id);
    }

    // Remove orphaned transactions
    console.log('Removing orphaned transactions...');
    const orphanedTransactions = transactions.filter(transaction =>
      (transaction.entityType === 'customer' && !customers.find(c => c.id === transaction.entityId)) ||
      (transaction.entityType === 'supplier' && !suppliers.find(s => s.id === transaction.entityId))
    );

    for (const transaction of orphanedTransactions) {
      console.log(`Removing orphaned transaction ${transaction.id}`);
      await storage.deleteTransaction(transaction.id);
    }

    console.log('\n=== ALL DISCREPANCIES FIXED ===\n');

  } catch (error) {
    console.error('Failed to fix discrepancies:', error);
  }
}

// Run the fix
fixBalanceDiscrepancies().then(() => {
  console.log('Balance discrepancy fix completed.');
  process.exit(0);
}).catch(error => {
  console.error('Failed to run fix:', error);
  process.exit(1);
});