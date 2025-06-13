// Main API handler for Vercel serverless deployment
import express, { Request, Response, NextFunction } from "express";
import { storageManager } from "../server/storage-manager";
import { BalanceValidator } from "../server/balance-validator";
import { v4 as uuidv4 } from 'uuid';
import { 
  insertSupplierSchema, 
  insertInventorySchema, 
  insertCustomerSchema, 
  insertOrderSchema, 
  insertTransactionSchema 
} from "../shared/schema";
import { z } from "zod";

const app = express();

// Parse JSON request body
app.use(express.json());

// Use enterprise storage with Firestore exclusively
async function getStorage() {
  return await storageManager.initialize();
}

// Health check endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    res.json({
      status: "healthy",
      storage: "firestore",
      storageType: storageManager.getStorageType(),
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

// Supplier routes
app.get("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const suppliers = await storage.getAllSuppliers();
    res.json(suppliers);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

app.get("/api/suppliers/:id", async (req: Request, res: Response) => {
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

app.post("/api/suppliers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(data);
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Failed to create supplier:", error);
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

app.put("/api/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertSupplierSchema.partial().parse(req.body);
    const supplier = await storage.updateSupplier(req.params.id, data);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    console.error("Failed to update supplier:", error);
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

app.delete("/api/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteSupplier(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete supplier:", error);
    res.status(500).json({ message: "Failed to delete supplier" });
  }
});

app.post("/api/suppliers/:id/payment", async (req: Request, res: Response) => {
  try {
    const { amount, description } = req.body;
    const storage = await getStorage();
    const supplier = await storage.getSupplier(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const transactionData = {
      type: "payment" as const,
      amount: parseFloat(amount),
      entityId: req.params.id,
      entityType: "supplier" as const,
      description: description || `Payment to supplier: ${supplier.name}`,
      date: new Date()
    };

    const transaction = await storage.createTransaction(transactionData);
    const newDebt = (supplier.debt || 0) - parseFloat(amount);
    await storage.updateSupplier(req.params.id, { debt: Math.max(0, newDebt) });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to process supplier payment:", error);
    res.status(500).json({ message: "Failed to process payment" });
  }
});

// Inventory routes
app.get("/api/inventory", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

app.get("/api/inventory/:id", async (req: Request, res: Response) => {
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

app.post("/api/inventory", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertInventorySchema.parse(req.body);
    const item = await storage.createInventoryItem(data);
    res.status(201).json(item);
  } catch (error) {
    console.error("Failed to create inventory item:", error);
    res.status(400).json({ message: "Invalid inventory data", error });
  }
});

app.put("/api/inventory/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertInventorySchema.partial().parse(req.body);
    const item = await storage.updateInventoryItem(req.params.id, data);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.json(item);
  } catch (error) {
    console.error("Failed to update inventory item:", error);
    res.status(400).json({ message: "Invalid inventory data", error });
  }
});

app.delete("/api/inventory/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteInventoryItem(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete inventory item:", error);
    res.status(500).json({ message: "Failed to delete inventory item" });
  }
});

app.post("/api/add-stock", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const { itemId, quantity, rate } = req.body;
    
    const item = await storage.getInventoryItem(itemId);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    const updatedQuantity = (item.quantity || 0) + parseFloat(quantity);
    const updatedItem = await storage.updateInventoryItem(itemId, {
      quantity: updatedQuantity,
      rate: rate || item.rate
    });

    res.json(updatedItem);
  } catch (error) {
    console.error("Failed to add stock:", error);
    res.status(500).json({ message: "Failed to add stock" });
  }
});

// Customer routes
app.get("/api/customers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const customers = await storage.getAllCustomers();
    res.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
});

app.get("/api/customers/:id", async (req: Request, res: Response) => {
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

app.post("/api/customers", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertCustomerSchema.parse(req.body);
    const customer = await storage.createCustomer(data);
    res.status(201).json(customer);
  } catch (error) {
    console.error("Failed to create customer:", error);
    res.status(400).json({ message: "Invalid customer data", error });
  }
});

app.put("/api/customers/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertCustomerSchema.partial().parse(req.body);
    const customer = await storage.updateCustomer(req.params.id, data);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.json(customer);
  } catch (error) {
    console.error("Failed to update customer:", error);
    res.status(400).json({ message: "Invalid customer data", error });
  }
});

app.delete("/api/customers/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteCustomer(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete customer:", error);
    res.status(500).json({ message: "Failed to delete customer" });
  }
});

app.post("/api/customers/:id/payment", async (req: Request, res: Response) => {
  try {
    const { amount, description } = req.body;
    const storage = await getStorage();
    const customer = await storage.getCustomer(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const transactionData = {
      type: "payment" as const,
      amount: parseFloat(amount),
      entityId: req.params.id,
      entityType: "customer" as const,
      description: description || `Payment from customer: ${customer.name}`,
      date: new Date()
    };

    const transaction = await storage.createTransaction(transactionData);
    const newPending = Math.max(0, (customer.pendingAmount || 0) - parseFloat(amount));
    await storage.updateCustomer(req.params.id, { pendingAmount: newPending });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to process customer payment:", error);
    res.status(500).json({ message: "Failed to process payment" });
  }
});

// Order routes
app.get("/api/orders", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

app.get("/api/orders/:id", async (req: Request, res: Response) => {
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

app.post("/api/orders", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertOrderSchema.parse(req.body);
    
    // Update inventory for each item based on type
    const allInventory = await storage.getAllInventory();
    for (const item of data.items) {
      const inventoryItem = allInventory.find(inv => inv.type === item.type);
      
      if (inventoryItem) {
        const newQuantity = (inventoryItem.quantity || 0) - item.quantity;
        await storage.updateInventoryItem(inventoryItem.id, { quantity: newQuantity });
      }
    }

    const order = await storage.createOrder(data);
    
    // Update customer pending amount if order is pending
    if (data.status === 'pending' && data.customerId) {
      const customer = await storage.getCustomer(data.customerId);
      if (customer) {
        const newPending = (customer.pendingAmount || 0) + data.total;
        await storage.updateCustomer(data.customerId, { pendingAmount: newPending });
      }
    }

    res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    res.status(400).json({ message: "Invalid order data", error });
  }
});

app.put("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertOrderSchema.partial().parse(req.body);
    const order = await storage.updateOrder(req.params.id, data);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Failed to update order:", error);
    res.status(400).json({ message: "Invalid order data", error });
  }
});

app.delete("/api/orders/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const success = await storage.deleteOrder(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(204).end();
  } catch (error) {
    console.error("Failed to delete order:", error);
    res.status(500).json({ message: "Failed to delete order" });
  }
});

// Transaction routes
app.get("/api/transactions", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const transactions = await storage.getAllTransactions();
    res.json(transactions);
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

app.get("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const transaction = await storage.getTransaction(req.params.id);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    console.error("Failed to fetch transaction:", error);
    res.status(500).json({ message: "Failed to fetch transaction" });
  }
});

app.post("/api/transactions", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const data = insertTransactionSchema.parse(req.body);
    const transaction = await storage.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Failed to create transaction:", error);
    res.status(400).json({ message: "Invalid transaction data", error });
  }
});

// Balance validation routes
app.get("/api/validate-balances", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    const report = await validator.validateAllBalances();
    res.json(report);
  } catch (error) {
    console.error("Failed to validate balances:", error);
    res.status(500).json({ message: "Failed to validate balances" });
  }
});

app.post("/api/fix-balances", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const validator = new BalanceValidator(storage);
    await validator.fixDiscrepancies();
    res.json({ message: "Balance discrepancies fixed successfully" });
  } catch (error) {
    console.error("Failed to fix balances:", error);
    res.status(500).json({ message: "Failed to fix balance discrepancies" });
  }
});

// Reports endpoint
app.get("/api/reports", async (req: Request, res: Response) => {
  try {
    const storage = await getStorage();
    const { startDate, endDate } = req.query;
    
    const orders = await storage.getAllOrders();
    const customers = await storage.getAllCustomers();
    const suppliers = await storage.getAllSuppliers();
    const inventory = await storage.getAllInventory();

    // Filter orders by date range if provided
    let filteredOrders = orders;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      filteredOrders = orders.filter(order => {
        if (!order.date) return false;
        const orderDate = new Date(order.date);
        return orderDate >= start && orderDate <= end;
      });
    }

    // Calculate totals
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const totalCustomers = customers.length;
    const totalSuppliers = suppliers.length;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.rate), 0);

    // Customer debts
    const customerDebts = customers
      .filter(customer => (customer.pendingAmount || 0) > 0)
      .map(customer => ({
        name: customer.name,
        amount: customer.pendingAmount || 0
      }));

    // Supplier debts
    const supplierDebts = suppliers
      .filter(supplier => (supplier.debt || 0) > 0)
      .map(supplier => ({
        name: supplier.name,
        amount: supplier.debt || 0
      }));

    res.json({
      summary: {
        totalSales,
        totalOrders,
        totalCustomers,
        totalSuppliers,
        totalInventoryValue,
        totalCustomerDebt: customerDebts.reduce((sum, debt) => sum + debt.amount, 0),
        totalSupplierDebt: supplierDebts.reduce((sum, debt) => sum + debt.amount, 0)
      },
      customerDebts,
      supplierDebts,
      orders: filteredOrders,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error("Failed to generate reports:", error);
    res.status(500).json({ message: "Failed to generate reports" });
  }
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Export for Vercel serverless
export default app;