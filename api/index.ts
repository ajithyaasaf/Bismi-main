// Vercel serverless function for all API routes
import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { storageManager } from '../server/storage-manager';
import { BalanceValidator } from '../server/balance-validator';
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
    res.status(500).json({ message: "Failed to fetch supplier" });
  }
});

apiRouter.post("/suppliers", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(data);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

apiRouter.put("/suppliers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertSupplierSchema.partial().parse(req.body);
    const supplier = await storage.updateSupplier(req.params.id, data);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

apiRouter.delete("/suppliers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteSupplier(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete supplier" });
  }
});

apiRouter.post("/suppliers/:id/payment", async (req, res) => {
  try {
    const storage = await getStorage();
    const { amount, description } = req.body;
    const supplierId = req.params.id;
    
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    const transaction = await storage.createTransaction({
      type: 'payment',
      amount,
      entityId: supplierId,
      entityType: 'supplier',
      description,
      date: new Date()
    });
    
    const updatedSupplier = await storage.getSupplier(supplierId);
    res.status(201).json({ 
      transaction, 
      supplier: updatedSupplier 
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid payment data", error });
  }
});

// Inventory routes
apiRouter.get("/inventory", async (req, res) => {
  try {
    const storage = await getStorage();
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
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
    res.status(500).json({ message: "Failed to fetch inventory item" });
  }
});

apiRouter.post("/inventory", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertInventorySchema.parse(req.body);
    const item = await storage.createInventoryItem(data);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Invalid inventory data", error });
  }
});

apiRouter.put("/inventory/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertInventorySchema.partial().parse(req.body);
    const item = await storage.updateInventoryItem(req.params.id, data);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(400).json({ message: "Invalid inventory data", error });
  }
});

apiRouter.delete("/inventory/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteInventoryItem(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

// Customer routes
apiRouter.get("/customers", async (req, res) => {
  try {
    const storage = await getStorage();
    const customers = await storage.getAllCustomers();
    res.json(customers);
  } catch (error) {
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
    res.status(500).json({ message: "Failed to fetch customer" });
  }
});

apiRouter.post("/customers", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(data);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: "Invalid customer data", error });
  }
});

apiRouter.put("/customers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertCustomerSchema.partial().parse(req.body);
    const customer = await storage.updateCustomer(req.params.id, data);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    res.status(400).json({ message: "Invalid customer data", error });
  }
});

apiRouter.delete("/customers/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

apiRouter.post("/customers/:id/payment", async (req, res) => {
  try {
    const storage = await getStorage();
    const { amount, description } = req.body;
    const customerId = req.params.id;
    
    const customer = await storage.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    
    const transaction = await storage.createTransaction({
      type: 'receipt',
      amount,
      entityId: customerId,
      entityType: 'customer',
      description,
      date: new Date()
    });
    
    const updatedCustomer = await storage.getCustomer(customerId);
    res.status(201).json({ 
      transaction, 
      customer: updatedCustomer 
    });
  } catch (error) {
    res.status(400).json({ message: "Invalid payment data", error });
  }
});

// Order routes
apiRouter.get("/orders", async (req, res) => {
  try {
    const storage = await getStorage();
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
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
    res.status(500).json({ message: "Failed to fetch order" });
  }
});

apiRouter.post("/orders", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(data);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: "Invalid order data", error });
  }
});

apiRouter.put("/orders/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const data = insertOrderSchema.partial().parse(req.body);
    const order = await storage.updateOrder(req.params.id, data);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: "Invalid order data", error });
  }
});

apiRouter.delete("/orders/:id", async (req, res) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: "Failed to delete order" });
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

// Stock management
apiRouter.post("/add-stock", async (req, res) => {
  try {
    const storage = await getStorage();
    const { type, quantity, rate, supplierId, description } = req.body;
    
    if (!type || quantity === undefined || rate === undefined) {
      return res.status(400).json({ message: "Type, quantity, and rate are required" });
    }

    const allInventory = await storage.getAllInventory();
    let inventoryItem = allInventory.find((item: any) => item.type === type);
    
    if (inventoryItem) {
      const newQuantity = (inventoryItem.quantity || 0) + quantity;
      inventoryItem = await storage.updateInventoryItem(inventoryItem.id, {
        quantity: newQuantity,
        rate,
        updatedAt: new Date()
      });
    } else {
      inventoryItem = await storage.createInventoryItem({
        type,
        quantity,
        rate
      });
    }

    if (supplierId) {
      await storage.createTransaction({
        type: 'expense',
        amount: quantity * rate,
        entityId: supplierId,
        entityType: 'supplier',
        description: description || `Stock purchase: ${quantity} kg of ${type} at ₹${rate}/kg`,
        date: new Date()
      });
    }

    res.status(201).json(inventoryItem);
  } catch (error) {
    res.status(400).json({ message: "Failed to add stock", error });
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

// Reports
apiRouter.get("/reports", async (req, res) => {
  try {
    const storage = await getStorage();
    
    const customers = await storage.getAllCustomers();
    const suppliers = await storage.getAllSuppliers();
    const orders = await storage.getAllOrders();
    const transactions = await storage.getAllTransactions();
    const inventory = await storage.getAllInventory();
    
    const totalPendingCustomers = customers.reduce((sum: number, c: any) => sum + (c.pendingAmount || 0), 0);
    const totalDebtSuppliers = suppliers.reduce((sum: number, s: any) => sum + (s.debt || 0), 0);
    const totalInventoryValue = inventory.reduce((sum: number, i: any) => sum + ((i.quantity || 0) * (i.rate || 0)), 0);
    
    const report = {
      summary: {
        totalCustomers: customers.length,
        totalSuppliers: suppliers.length,
        totalOrders: orders.length,
        totalTransactions: transactions.length,
        totalPendingAmount: totalPendingCustomers,
        totalDebt: totalDebtSuppliers,
        totalInventoryValue
      },
      customers,
      suppliers,
      orders,
      transactions,
      inventory
    };
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Failed to generate report", error });
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