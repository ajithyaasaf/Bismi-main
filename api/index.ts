import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storageManager } from '../server/storage-manager';
import { BalanceValidator } from '../server/balance-validator';
import { v4 as uuidv4 } from 'uuid';
import { 
  insertSupplierSchema, 
  insertInventorySchema, 
  insertCustomerSchema, 
  insertOrderSchema, 
  insertTransactionSchema 
} from '../shared/schema';

// Initialize storage with error handling
let storage: any;
async function getStorage() {
  try {
    if (!storage) {
      storage = await storageManager.initialize();
      console.log('Storage initialized successfully in api/index.ts');
    }
    return storage;
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw new Error(`Storage initialization failed: ${error.message}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const path = req.url?.split('?')[0] || '';
    const method = req.method?.toUpperCase();
    const storage = await getStorage();

    // Supplier routes
    if (path === '/api/suppliers' && method === 'GET') {
      const suppliers = await storage.getAllSuppliers();
      return res.status(200).json(suppliers);
    }

    if (path.startsWith('/api/suppliers/') && method === 'GET') {
      const id = path.split('/')[3];
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      return res.status(200).json(supplier);
    }

    if (path === '/api/suppliers' && method === 'POST') {
      const result = insertSupplierSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid supplier data', errors: result.error.errors });
      }
      const supplier = await storage.createSupplier(result.data);
      return res.status(201).json(supplier);
    }

    if (path.startsWith('/api/suppliers/') && method === 'PUT') {
      const id = path.split('/')[3];
      const result = insertSupplierSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid supplier data', errors: result.error.errors });
      }
      const supplier = await storage.updateSupplier(id, result.data);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      return res.status(200).json(supplier);
    }

    if (path.startsWith('/api/suppliers/') && method === 'DELETE') {
      const id = path.split('/')[3];
      console.log(`API: Processing deletion request for supplier ID: ${id}`);
      const existingSupplier = await storage.getSupplier(id);
      if (!existingSupplier) {
        console.log(`API: Supplier ${id} not found, returning 404`);
        return res.status(404).json({ 
          message: 'Supplier not found',
          code: 'SUPPLIER_NOT_FOUND',
          supplierId: id
        });
      }
      const success = await storage.deleteSupplier(id);
      if (!success) {
        console.log(`API: Deletion failed for supplier ${id}`);
        return res.status(500).json({ 
          message: 'Failed to delete supplier from database',
          code: 'DELETION_FAILED',
          supplierId: id
        });
      }
      console.log(`API: Supplier ${id} deleted successfully`);
      return res.status(204).end();
    }

    if (path.startsWith('/api/suppliers/') && path.endsWith('/payment') && method === 'POST') {
      const id = path.split('/')[3];
      const { amount, description } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount' });
      }
      const supplier = await storage.getSupplier(id);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      const transactionData = {
        type: 'payment',
        amount: parseFloat(amount),
        entityId: id,
        entityType: 'supplier',
        description: description || `Payment to supplier: ${supplier.name}`,
        date: new Date()
      };
      const transaction = await storage.createTransaction(transactionData);
      const newDebt = (supplier.debt || 0) - parseFloat(amount);
      await storage.updateSupplier(id, { debt: Math.max(0, newDebt) });
      return res.status(201).json(transaction);
    }

    // Inventory routes
    if (path === '/api/inventory' && method === 'GET') {
      const inventory = await storage.getAllInventory();
      return res.status(200).json(inventory);
    }

    if (path.startsWith('/api/inventory/') && method === 'GET') {
      const id = path.split('/')[3];
      const item = await storage.getInventoryItem(id);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      return res.status(200).json(item);
    }

    if (path === '/api/inventory' && method === 'POST') {
      const result = insertInventorySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid inventory data', errors: result.error.errors });
      }
      const item = await storage.createInventoryItem(result.data);
      return res.status(201).json(item);
    }

    if (path.startsWith('/api/inventory/') && method === 'PUT') {
      const id = path.split('/')[3];
      const result = insertInventorySchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid inventory data', errors: result.error.errors });
      }
      const item = await storage.updateInventoryItem(id, result.data);
      if (!item) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      return res.status(200).json(item);
    }

    if (path.startsWith('/api/inventory/') && method === 'DELETE') {
      const id = path.split('/')[3];
      console.log(`API: Processing deletion request for inventory item ID: ${id}`);
      const existingItem = await storage.getInventoryItem(id);
      if (!existingItem) {
        console.log(`API: Inventory item ${id} not found, returning 404`);
        return res.status(404).json({ 
          message: 'Inventory item not found',
          code: 'ITEM_NOT_FOUND',
          itemId: id
        });
      }
      const success = await storage.deleteInventoryItem(id);
      if (!success) {
        console.log(`API: Deletion failed for inventory item ${id}`);
        return res.status(500).json({ 
          message: 'Failed to delete inventory item from database',
          code: 'DELETION_FAILED',
          itemId: id
        });
      }
      console.log(`API: Inventory item ${id} deleted successfully`);
      return res.status(204).end();
    }

    // Customer routes
    if (path === '/api/customers' && method === 'GET') {
      const customers = await storage.getAllCustomers();
      return res.status(200).json(customers);
    }

    if (path.startsWith('/api/customers/') && method === 'GET') {
      const id = path.split('/')[3];
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      return res.status(200).json(customer);
    }

    if (path === '/api/customers' && method === 'POST') {
      const result = insertCustomerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid customer data', errors: result.error.errors });
      }
      const customer = await storage.createCustomer(result.data);
      return res.status(201).json(customer);
    }

    if (path.startsWith('/api/customers/') && method === 'PUT') {
      const id = path.split('/')[3];
      const result = insertCustomerSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid customer data', errors: result.error.errors });
      }
      const customer = await storage.updateCustomer(id, result.data);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      return res.status(200).json(customer);
    }

    if (path.startsWith('/api/customers/') && method === 'DELETE') {
      const id = path.split('/')[3];
      console.log(`API: Processing deletion request for customer ID: ${id}`);
      const existingCustomer = await storage.getCustomer(id);
      if (!existingCustomer) {
        console.log(`API: Customer ${id} not found, returning 404`);
        return res.status(404).json({ 
          message: 'Customer not found',
          code: 'CUSTOMER_NOT_FOUND',
          customerId: id
        });
      }
      const success = await storage.deleteCustomer(id);
      if (!success) {
        console.log(`API: Deletion failed for customer ${id}`);
        return res.status(500).json({ 
          message: 'Failed to delete customer from database',
          code: 'DELETION_FAILED',
          customerId: id
        });
      }
      console.log(`API: Customer ${id} deleted successfully`);
      return res.status(204).end();
    }

    if (path.startsWith('/api/customers/') && path.endsWith('/payment') && method === 'POST') {
      const id = path.split('/')[3];
      const { amount, description } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid payment amount' });
      }
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      const transactionData = {
        type: 'receipt',
        amount: parseFloat(amount),
        entityId: id,
        entityType: 'customer',
        description: description || `Payment from customer: ${customer.name}`,
        date: new Date()
      };
      const transaction = await storage.createTransaction(transactionData);
      const newPending = (customer.pendingAmount || 0) - parseFloat(amount);
      await storage.updateCustomer(id, { pendingAmount: Math.max(0, newPending) });
      return res.status(201).json(transaction);
    }

    // Order routes
    if (path === '/api/orders' && method === 'GET') {
      const orders = await storage.getAllOrders();
      return res.status(200).json(orders);
    }

    if (path.startsWith('/api/orders/') && method === 'GET') {
      const id = path.split('/')[3];
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.status(200).json(order);
    }

    if (path === '/api/orders' && method === 'POST') {
      console.log('=== ORDER CREATION DEBUG START ===');
      console.log('Full request body:', JSON.stringify(req.body, null, 2));
      console.log('Raw request body date:', req.body.date);
      
      const now = new Date();
      const processedBody = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : now,
        createdAt: now
      };
      
      console.log('Processed body:', JSON.stringify({
        ...processedBody,
        date: processedBody.date.toISOString(),
        createdAt: processedBody.createdAt.toISOString()
      }, null, 2));
      
      const result = insertOrderSchema.safeParse(processedBody);
      if (!result.success) {
        console.error('Order validation failed:', result.error.errors);
        console.log('=== ORDER CREATION DEBUG END (VALIDATION FAILED) ===');
        return res.status(400).json({ 
          message: 'Invalid order data', 
          errors: result.error.errors,
          receivedData: {
            customerId: req.body.customerId,
            items: req.body.items,
            date: req.body.date,
            total: req.body.total,
            status: req.body.status,
            type: req.body.type
          }
        });
      }
      
      console.log('Validation successful, validated data:', JSON.stringify(result.data, null, 2));
      console.log('Storage obtained:', storage.constructor.name);
      
      const orderWithTimestamps = {
        ...result.data,
        createdAt: now
      };
      
      console.log('About to create order with data:', JSON.stringify(orderWithTimestamps, null, 2));
      const order = await storage.createOrder(orderWithTimestamps as any);
      console.log('Order created successfully:', JSON.stringify(order, null, 2));
      
      if (result.data.items && Array.isArray(result.data.items)) {
        console.log('Processing inventory updates...');
        const inventoryItems = await storage.getAllInventory();
        console.log('Current inventory items:', inventoryItems.length);
        
        for (const item of result.data.items) {
          if (item.type && typeof item.quantity === 'number') {
            const inventoryItem = inventoryItems.find(inv => inv.type === item.type);
            if (inventoryItem) {
              const newQuantity = inventoryItem.quantity - item.quantity;
              console.log(`Updating inventory ${item.type}: ${inventoryItem.quantity} - ${item.quantity} = ${newQuantity}`);
              await storage.updateInventoryItem(inventoryItem.id, {
                quantity: newQuantity
              });
            } else {
              console.log(`No inventory item found for type: ${item.type}`);
            }
          }
        }
      }
      
      if (result.data.status === 'pending' && result.data.customerId && result.data.total) {
        console.log('Processing customer pending amount update...');
        const customer = await storage.getCustomer(result.data.customerId);
        if (customer) {
          const newPending = (customer.pendingAmount || 0) + result.data.total;
          console.log(`Updating customer pending: ${customer.pendingAmount || 0} + ${result.data.total} = ${newPending}`);
          await storage.updateCustomer(result.data.customerId, {
            pendingAmount: newPending
          });
        }
      }
      
      console.log('=== ORDER CREATION DEBUG END (SUCCESS) ===');
      return res.status(201).json(order);
    }

    if (path.startsWith('/api/orders/') && method === 'PUT') {
      const id = path.split('/')[3];
      const result = insertOrderSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid order data', errors: result.error.errors });
      }
      const order = await storage.updateOrder(id, result.data);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      return res.status(200).json(order);
    }

    if (path.startsWith('/api/orders/') && method === 'DELETE') {
      const id = path.split('/')[3];
      console.log(`API: Processing deletion request for order ID: ${id}`);
      const existingOrder = await storage.getOrder(id);
      if (!existingOrder) {
        console.log(`API: Order ${id} not found, returning 404`);
        return res.status(404).json({ 
          message: 'Order not found',
          code: 'ORDER_NOT_FOUND',
          orderId: id
        });
      }
      const success = await storage.deleteOrder(id);
      if (!success) {
        console.log(`API: Deletion failed for order ${id}`);
        return res.status(500).json({ 
          message: 'Failed to delete order from database',
          code: 'DELETION_FAILED',
          orderId: id
        });
      }
      console.log(`API: Order ${id} deleted successfully`);
      return res.status(204).end();
    }

    // Transaction routes
    if (path === '/api/transactions' && method === 'GET') {
      const transactions = await storage.getAllTransactions();
      return res.status(200).json(transactions);
    }

    if (path.startsWith('/api/transactions/') && method === 'GET') {
      const id = path.split('/')[3];
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found' });
      }
      return res.status(200).json(transaction);
    }

    if (path === '/api/transactions' && method === 'POST') {
      const result = insertTransactionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: 'Invalid transaction data', errors: result.error.errors });
      }
      const transaction = await storage.createTransaction(result.data);
      return res.status(201).json(transaction);
    }

    // Add stock route
    if (path === '/api/add-stock' && method === 'POST') {
      const { type, quantity, rate, supplierId } = req.body;
      if (!type || !quantity || !rate || !supplierId) {
        return res.status(400).json({ message: 'Missing required fields: type, quantity, rate, supplierId' });
      }
      const qtyNum = parseFloat(quantity);
      const rateNum = parseFloat(rate);
      if (isNaN(qtyNum) || isNaN(rateNum) || rateNum <= 0) {
        return res.status(400).json({ message: 'Invalid quantity or rate values' });
      }
      const inventoryItems = await storage.getAllInventory();
      const existingItem = inventoryItems.find(item => item.type === type);
      let inventoryResult;
      if (existingItem) {
        const newQuantity = existingItem.quantity + qtyNum;
        inventoryResult = await storage.updateInventoryItem(existingItem.id, {
          quantity: newQuantity,
          rate: rateNum
        });
      } else {
        inventoryResult = await storage.createInventoryItem({
          type,
          quantity: qtyNum,
          rate: rateNum
        });
      }
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }
      const totalAmount = qtyNum * rateNum;
      const newDebt = (supplier.debt || 0) + totalAmount;
      await storage.updateSupplier(supplierId, { debt: newDebt });
      const transaction = await storage.createTransaction({
        type: 'expense',
        amount: totalAmount,
        entityId: supplierId,
        entityType: 'supplier',
        description: `Stock purchase: ${qtyNum} kg of ${type} at ₹${rateNum}/kg`,
        date: new Date()
      });
      return res.status(201).json({
        inventory: inventoryResult,
        transaction,
        supplier: { ...supplier, debt: newDebt }
      });
    }

    // Balance validation routes
    if (path === '/api/validate-balances' && method === 'GET') {
      const validator = new BalanceValidator(storage);
      const report = await validator.validateAllBalances();
      return res.status(200).json(report);
    }

    if (path === '/api/fix-balances' && method === 'POST') {
      const validator = new BalanceValidator(storage);
      await validator.fixDiscrepancies();
      return res.status(200).json({ message: 'Balance discrepancies fixed successfully' });
    }

    // Reports route
    if (path === '/api/reports' && method === 'GET') {
      const [orders, suppliers, customers, inventory, transactions] = await Promise.all([
        storage.getAllOrders(),
        storage.getAllSuppliers(),
        storage.getAllCustomers(),
        storage.getAllInventory(),
        storage.getAllTransactions()
      ]);
      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const totalSupplierDebt = suppliers.reduce((sum, supplier) => sum + (supplier.debt || 0), 0);
      const totalCustomerPending = customers.reduce((sum, customer) => sum + (customer.pendingAmount || 0), 0);
      const lowStockItems = inventory.filter(item => item.quantity < 10);
      const report = {
        summary: {
          totalRevenue,
          totalSupplierDebt,
          totalCustomerPending,
          lowStockCount: lowStockItems.length,
          totalOrders: orders.length,
          totalSuppliers: suppliers.length,
          totalCustomers: customers.length,
          totalInventoryItems: inventory.length
        },
        lowStockItems,
        recentTransactions: transactions
          .filter(t => t.date !== null && t.date !== undefined)
          .sort((a, b) => {
            const dateA = new Date(a.date!).getTime();
            const dateB = new Date(b.date!).getTime();
            return dateB - dateA;
          })
          .slice(0, 10)
      };
      return res.status(200).json(report);
    }

    // Health check endpoint
    if (path === '/api/health' && method === 'GET') {
      return res.status(200).json({
        status: 'healthy',
        storage: 'firestore',
        storageType: storageManager.getStorageType(),
        timestamp: new Date().toISOString()
      });
    }

    return res.status(404).json({ message: 'Route not found' });
  } catch (error) {
    console.error('Error in serverless function:', error);
    return res.status(500).json({
      message: 'Internal Server Error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
