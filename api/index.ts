// Vercel serverless function for all API routes
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
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

// Initialize storage
let storage: any;
async function getStorage() {
  if (!storage) {
    storage = await storageManager.initialize();
  }
  return storage;
}

const app = express();
app.use(express.json());

// API routes
const apiRouter = express.Router();

// Supplier routes
apiRouter.get("/suppliers", async (req, res) => {
  try {
    const storage = await getStorage();
    const suppliers = await storage.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

apiRouter.get("/suppliers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const supplier = await storage.getSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    console.error("Failed to fetch supplier:", error);
    res.status(500).json({ message: "Failed to fetch supplier" });
  }
});

apiRouter.post("/suppliers", async (req, res) => {
  try {
    const result = insertSupplierSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid supplier data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const supplier = await storage.createSupplier(result.data);
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Failed to create supplier:", error);
    res.status(500).json({ message: "Failed to create supplier" });
  }
});

apiRouter.put("/suppliers/:id", async (req, res) => {
  try {
    const result = insertSupplierSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid supplier data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const supplier = await storage.updateSupplier(req.params.id, result.data);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    console.error("Failed to update supplier:", error);
    res.status(500).json({ message: "Failed to update supplier" });
  }
});

apiRouter.delete("/suppliers/:id", async (req, res) => {
  try {
    const supplierId = req.params.id;
    console.log(`API: Processing deletion request for supplier ID: ${supplierId}`);
    
    const storage = await getStorage();
    
    // First check if supplier exists
    const existingSupplier = await storage.getSupplier(supplierId);
    if (!existingSupplier) {
      console.log(`API: Supplier ${supplierId} not found, returning 404`);
      return res.status(404).json({ 
        message: "Supplier not found",
        code: "SUPPLIER_NOT_FOUND",
        supplierId: supplierId
      });
    }
    
    // Proceed with deletion
    const success = await storage.deleteSupplier(supplierId);
    if (!success) {
      console.log(`API: Deletion failed for supplier ${supplierId}`);
      return res.status(500).json({ 
        message: "Failed to delete supplier from database",
        code: "DELETION_FAILED",
        supplierId: supplierId
      });
    }
    
    console.log(`API: Supplier ${supplierId} deleted successfully`);
    res.status(204).send();
    
  } catch (error) {
    console.error("API: Error during supplier deletion:", error);
    res.status(500).json({ 
      message: "Internal server error during deletion",
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Supplier payment route
apiRouter.post("/suppliers/:id/payment", async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const storage = await getStorage();
    const supplier = await storage.getSupplier(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Enterprise-level transaction data preparation
    const transactionData = {
      type: "payment",
      amount: parseFloat(amount),
      entityId: req.params.id,
      entityType: "supplier",
      description: description || `Payment to supplier: ${supplier.name}`,
      date: new Date()
    };

    // Create transaction record
    const transaction = await storage.createTransaction(transactionData);

    // Update supplier debt
    const newDebt = (supplier.debt || 0) - parseFloat(amount);
    await storage.updateSupplier(req.params.id, { debt: Math.max(0, newDebt) });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to process supplier payment:", error);
    res.status(500).json({ message: "Failed to process payment" });
  }
});

// Inventory routes
apiRouter.get("/inventory", async (req, res) => {
  try {
    const storage = await getStorage();
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

apiRouter.get("/inventory/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const item = await storage.getInventoryItem(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Failed to fetch inventory item:", error);
    res.status(500).json({ message: "Failed to fetch inventory item" });
  }
});

apiRouter.post("/inventory", async (req, res) => {
  try {
    const result = insertInventorySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid inventory data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const item = await storage.createInventoryItem(result.data);
    res.status(201).json(item);
  } catch (error) {
    console.error("Failed to create inventory item:", error);
    res.status(500).json({ message: "Failed to create inventory item" });
  }
});

apiRouter.put("/inventory/:id", async (req, res) => {
  try {
    const result = insertInventorySchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid inventory data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const item = await storage.updateInventoryItem(req.params.id, result.data);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Failed to update inventory item:", error);
    res.status(500).json({ message: "Failed to update inventory item" });
  }
});

apiRouter.delete("/inventory/:id", async (req, res) => {
  try {
    const itemId = req.params.id;
    console.log(`API: Processing deletion request for inventory item ID: ${itemId}`);
    
    const storage = await getStorage();
    
    // First check if item exists
    const existingItem = await storage.getInventoryItem(itemId);
    if (!existingItem) {
      console.log(`API: Inventory item ${itemId} not found, returning 404`);
      return res.status(404).json({ 
        message: "Inventory item not found",
        code: "ITEM_NOT_FOUND",
        itemId: itemId
      });
    }
    
    // Proceed with deletion
    const success = await storage.deleteInventoryItem(itemId);
    if (!success) {
      console.log(`API: Deletion failed for inventory item ${itemId}`);
      return res.status(500).json({ 
        message: "Failed to delete inventory item from database",
        code: "DELETION_FAILED",
        itemId: itemId
      });
    }
    
    console.log(`API: Inventory item ${itemId} deleted successfully`);
    res.status(204).send();
    
  } catch (error) {
    console.error("API: Error during inventory item deletion:", error);
    res.status(500).json({ 
      message: "Internal server error during deletion",
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Customer routes
apiRouter.get("/customers", async (req, res) => {
  try {
    const storage = await getStorage();
    const customers = await storage.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

apiRouter.get("/customers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    res.status(500).json({ message: "Failed to fetch customer" });
  }
});

apiRouter.post("/customers", async (req, res) => {
  try {
    const result = insertCustomerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid customer data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const customer = await storage.createCustomer(result.data);
    res.status(201).json(customer);
  } catch (error) {
    console.error("Failed to create customer:", error);
    res.status(500).json({ message: "Failed to create customer" });
  }
});

apiRouter.put("/customers/:id", async (req, res) => {
  try {
    const result = insertCustomerSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid customer data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const customer = await storage.updateCustomer(req.params.id, result.data);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Failed to update customer:", error);
    res.status(500).json({ message: "Failed to update customer" });
  }
});

apiRouter.delete("/customers/:id", async (req, res) => {
  try {
    const customerId = req.params.id;
    console.log(`API: Processing deletion request for customer ID: ${customerId}`);
    
    const storage = await getStorage();
    
    // First check if customer exists
    const existingCustomer = await storage.getCustomer(customerId);
    if (!existingCustomer) {
      console.log(`API: Customer ${customerId} not found, returning 404`);
      return res.status(404).json({ 
        message: "Customer not found",
        code: "CUSTOMER_NOT_FOUND",
        customerId: customerId
      });
    }
    
    // Proceed with deletion
    const success = await storage.deleteCustomer(customerId);
    if (!success) {
      console.log(`API: Deletion failed for customer ${customerId}`);
      return res.status(500).json({ 
        message: "Failed to delete customer from database",
        code: "DELETION_FAILED",
        customerId: customerId
      });
    }
    
    console.log(`API: Customer ${customerId} deleted successfully`);
    res.status(204).send();
    
  } catch (error) {
    console.error("API: Error during customer deletion:", error);
    res.status(500).json({ 
      message: "Internal server error during deletion",
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Customer payment route
apiRouter.post("/customers/:id/payment", async (req, res) => {
  try {
    const { amount, description } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const storage = await getStorage();
    const customer = await storage.getCustomer(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Enterprise-level transaction data preparation
    const transactionData = {
      type: "receipt",
      amount: parseFloat(amount),
      entityId: req.params.id,
      entityType: "customer",
      description: description || `Payment from customer: ${customer.name}`,
      date: new Date()
    };

    // Create transaction record
    const transaction = await storage.createTransaction(transactionData);

    // Update customer pending amount
    const newPending = (customer.pendingAmount || 0) - parseFloat(amount);
    await storage.updateCustomer(req.params.id, { pendingAmount: Math.max(0, newPending) });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to process customer payment:", error);
    res.status(500).json({ message: "Failed to process payment" });
  }
});

// Order routes
apiRouter.get("/orders", async (req, res) => {
  try {
    const storage = await getStorage();
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

apiRouter.get("/orders/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const order = await storage.getOrder(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Failed to fetch order:", error);
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

apiRouter.post("/orders", async (req, res) => {
  try {
    const result = insertOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid order data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const order = await storage.createOrder(result.data);
    res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

apiRouter.put("/orders/:id", async (req, res) => {
  try {
    const result = insertOrderSchema.partial().safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid order data", errors: result.error.errors });
    }
    
    const storage = await getStorage();
    const order = await storage.updateOrder(req.params.id, result.data);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Failed to update order:", error);
    res.status(500).json({ message: "Failed to update order" });
  }
});

apiRouter.delete("/orders/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    console.log(`API: Processing deletion request for order ID: ${orderId}`);
    
    const storage = await getStorage();
    
    // First check if order exists
    const existingOrder = await storage.getOrder(orderId);
    if (!existingOrder) {
      console.log(`API: Order ${orderId} not found, returning 404`);
      return res.status(404).json({ 
        message: "Order not found",
        code: "ORDER_NOT_FOUND",
        orderId: orderId
      });
    }
    
    // Proceed with deletion
    const success = await storage.deleteOrder(orderId);
    if (!success) {
      console.log(`API: Deletion failed for order ${orderId}`);
      return res.status(500).json({ 
        message: "Failed to delete order from database",
        code: "DELETION_FAILED",
        orderId: orderId
      });
    }
    
    console.log(`API: Order ${orderId} deleted successfully`);
    res.status(204).send();
    
  } catch (error) {
    console.error("API: Error during order deletion:", error);
    res.status(500).json({ 
      message: "Internal server error during deletion",
      code: "INTERNAL_ERROR",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Transaction routes
apiRouter.get("/transactions", async (req, res) => {
  try {
    const storage = await getStorage();
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

apiRouter.get("/transactions/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const transaction = await storage.getTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transaction" });
  }
});

apiRouter.post("/transactions", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertTransactionSchema.parse(req.body);
    const transaction = await storage.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: "Invalid transaction data", error });
  }
});

// Add stock route - handles inventory updates, supplier debt, and transaction creation
apiRouter.post("/add-stock", async (req, res) => {
  try {
    const { type, quantity, rate, supplierId } = req.body;
    
    // Validate input
    if (!type || !quantity || !rate || !supplierId) {
      return res.status(400).json({ message: "Missing required fields: type, quantity, rate, supplierId" });
    }
    
    const qtyNum = parseFloat(quantity);
    const rateNum = parseFloat(rate);
    
    if (isNaN(qtyNum) || isNaN(rateNum) || rateNum <= 0) {
      return res.status(400).json({ message: "Invalid quantity or rate values" });
    }

    const storage = await getStorage();
    
    // 1. Find or create inventory item
    const inventoryItems = await storage.getAllInventory();
    const existingItem = inventoryItems.find(item => item.type === type);
    
    let inventoryResult;
    if (existingItem) {
      // Update existing inventory
      const newQuantity = existingItem.quantity + qtyNum;
      inventoryResult = await storage.updateInventoryItem(existingItem.id, {
        quantity: newQuantity,
        rate: rateNum
      });
    } else {
      // Create new inventory item
      inventoryResult = await storage.createInventoryItem({
        type,
        quantity: qtyNum,
        rate: rateNum
      });
    }
    
    // 2. Update supplier debt
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    const totalAmount = qtyNum * rateNum;
    const newDebt = (supplier.debt || 0) + totalAmount;
    
    await storage.updateSupplier(supplierId, { debt: newDebt });
    
    // 3. Create transaction record
    const transaction = await storage.createTransaction({
      type: "expense",
      amount: totalAmount,
      entityId: supplierId,
      entityType: "supplier",
      description: `Stock purchase: ${qtyNum} kg of ${type} at ₹${rateNum}/kg`,
      date: new Date()
    });

    res.status(201).json({
      inventory: inventoryResult,
      transaction,
      supplier: { ...supplier, debt: newDebt }
    });
  } catch (error) {
    console.error("Failed to add stock:", error);
    res.status(500).json({ message: "Failed to add stock" });
  }
});

// Balance validation
apiRouter.get("/validate-balances", async (req, res) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    const report = await validator.validateAllBalances();
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Failed to validate balances", error });
  }
});

apiRouter.post("/fix-balances", async (req, res) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    await validator.fixDiscrepancies();
    res.json({ message: "Balance discrepancies fixed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fix balances", error });
  }
});

// Reports route
apiRouter.get("/reports", async (req, res) => {
  try {
    const storage = await getStorage();
    const [orders, suppliers, customers, inventory, transactions] = await Promise.all([
      storage.getAllOrders(),
      storage.getAllSuppliers(),
      storage.getAllCustomers(),
      storage.getAllInventory(),
      storage.getAllTransactions()
    ]);

    // Calculate metrics
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

    res.json(report);
  } catch (error) {
    console.error("Failed to generate reports:", error);
    res.status(500).json({ message: "Failed to generate reports" });
  }
});

// Health check
apiRouter.get("/health", async (req, res) => {
  try {
    const storage = await getStorage();
    res.json({
      status: "healthy",
      storage: "firestore",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api', apiRouter);

// Export the serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return new Promise((resolve, reject) => {
    app(req as any, res as any, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}