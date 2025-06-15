// A simplified version of the server for Vercel deployment
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storageManager } from "./storage-manager";
import { BalanceValidator } from "./balance-validator";
import { v4 as uuidv4 } from 'uuid';
import { 
  insertSupplierSchema, 
  insertInventorySchema, 
  insertCustomerSchema, 
  insertOrderSchema, 
  insertTransactionSchema 
} from "../shared/schema";
import path from "path";

// Initialize storage
let storage: any;
async function getStorage() {
  if (!storage) {
    storage = await storageManager.initialize();
  }
  return storage;
}

const app = express();

// Parse JSON request body
app.use(express.json());

// API routes
const apiRouter = express.Router();
app.use("/api", apiRouter);

// Supplier routes
apiRouter.get("/suppliers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const suppliers = await storage.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

apiRouter.get("/suppliers/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/suppliers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(data);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

apiRouter.put("/suppliers/:id", async (req: Request, res: Response) => {
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

apiRouter.delete("/suppliers/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/suppliers/:id/payment", async (req: Request, res: Response) => {
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
apiRouter.get("/inventory", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

apiRouter.get("/inventory/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/inventory", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertInventorySchema.parse(req.body);
    const item = await storage.createInventoryItem(data);
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: "Invalid inventory data", error });
  }
});

apiRouter.put("/inventory/:id", async (req: Request, res: Response) => {
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

apiRouter.delete("/inventory/:id", async (req: Request, res: Response) => {
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
apiRouter.get("/customers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const customers = await storage.getAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

apiRouter.get("/customers/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/customers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(data);
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ message: "Invalid customer data", error });
  }
});

apiRouter.put("/customers/:id", async (req: Request, res: Response) => {
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

apiRouter.delete("/customers/:id", async (req: Request, res: Response) => {
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

// Order routes
apiRouter.get("/orders", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

apiRouter.get("/orders/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/orders", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(data);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: "Invalid order data", error });
  }
});

apiRouter.put("/orders/:id", async (req: Request, res: Response) => {
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

apiRouter.delete("/orders/:id", async (req: Request, res: Response) => {
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

// Transaction routes (THIS WAS MISSING - causing the Vercel error)
apiRouter.get("/transactions", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

apiRouter.get("/transactions/:id", async (req: Request, res: Response) => {
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

apiRouter.post("/transactions", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertTransactionSchema.parse(req.body);
    const transaction = await storage.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: "Invalid transaction data", error });
  }
});

// Health check endpoint
apiRouter.get("/health", async (req: Request, res: Response) => {
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

// Add stock endpoint
apiRouter.post("/add-stock", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const { type, quantity, rate, supplierId, description } = req.body;
    
    if (!type || quantity === undefined || rate === undefined) {
      return res.status(400).json({ message: "Type, quantity, and rate are required" });
    }

    // Find existing inventory item by type
    const allInventory = await storage.getAllInventory();
    let inventoryItem = allInventory.find((item: any) => item.type === type);
    
    if (inventoryItem) {
      // Update existing item
      const newQuantity = (inventoryItem.quantity || 0) + quantity;
      inventoryItem = await storage.updateInventoryItem(inventoryItem.id, {
        quantity: newQuantity,
        rate,
        updatedAt: new Date()
      });
    } else {
      // Create new inventory item
      inventoryItem = await storage.createInventoryItem({
        type,
        quantity,
        rate
      });
    }

    // Record transaction if supplier is provided
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

// Customer payment endpoint
apiRouter.post("/customers/:id/payment", async (req: Request, res: Response) => {
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

// Balance validation endpoints
apiRouter.get("/validate-balances", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    const report = await validator.validateAllBalances();
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: "Failed to validate balances", error });
  }
});

apiRouter.post("/fix-balances", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    await validator.fixDiscrepancies();
    res.json({ message: "Balance discrepancies fixed successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to fix balances", error });
  }
});

// Reports endpoint
apiRouter.get("/reports", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const { startDate, endDate, type } = req.query;
    
    const customers = await storage.getAllCustomers();
    const suppliers = await storage.getAllSuppliers();
    const orders = await storage.getAllOrders();
    const transactions = await storage.getAllTransactions();
    const inventory = await storage.getAllInventory();
    
    // Calculate totals
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

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Configure for serverless
export default app;