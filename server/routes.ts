import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storageManager } from "./storage-manager";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";

// Validation schemas
const insertSupplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  pendingAmount: z.number().optional().default(0)
});

const insertInventorySchema = z.object({
  type: z.string().min(1),
  quantity: z.number().min(0),
  price: z.number().min(0)
});

const insertCustomerSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  customerType: z.string().min(1),
  pendingAmount: z.number().optional().default(0)
});

const insertOrderSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(z.object({
    type: z.string().min(1),
    quantity: z.number().min(1),
    rate: z.number().min(0),
    details: z.string().optional()
  })),
  totalAmount: z.number().min(0),
  paymentStatus: z.string().min(1),
  orderStatus: z.string().min(1)
});

const insertTransactionSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.string().min(1),
  type: z.string().min(1),
  amount: z.number(),
  description: z.string().min(1)
});

// Use enterprise storage with Firestore exclusively
async function getStorage() {
  return await storageManager.initialize();
}

export async function registerRoutes(app: Express): Promise<Server | void> {
  // Add middleware to ensure all API responses are JSON
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
  });

  // API routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  apiRouter.get("/health", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      res.json({ 
        status: "healthy", 
        storage: storageManager.getStorageType(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        status: "unhealthy", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Supplier routes
  apiRouter.get("/suppliers", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const suppliers = await storage.getAllSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Failed to get suppliers:", error);
      res.status(500).json({ message: "Failed to get suppliers" });
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
      console.error("Failed to get supplier:", error);
      res.status(500).json({ message: "Failed to get supplier" });
    }
  });

  apiRouter.post("/suppliers", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const storage = await getStorage();
      const supplier = await storage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Failed to create supplier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  apiRouter.put("/suppliers/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const storage = await getStorage();
      const supplier = await storage.updateSupplier(req.params.id, validatedData);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Failed to update supplier:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  apiRouter.delete("/suppliers/:id", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const success = await storage.deleteSupplier(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Failed to delete supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  apiRouter.post("/suppliers/:id/payment", async (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const storage = await getStorage();
      const supplier = await storage.getSupplier(req.params.id);
      
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      // Create transaction record
      const transactionData = {
        type: "payment",
        amount: parseFloat(amount),
        entityId: req.params.id,
        entityType: "supplier",
        description: description || `Payment to supplier: ${supplier.name}`
      };

      const transaction = await storage.createTransaction(transactionData);

      // Update supplier pending amount
      const newAmount = (supplier.pendingAmount || 0) - parseFloat(amount);
      await storage.updateSupplier(req.params.id, { pendingAmount: Math.max(0, newAmount) });

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Failed to process supplier payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Inventory routes
  apiRouter.get("/inventory", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const inventory = await storage.getAllInventory();
      res.json(inventory);
    } catch (error) {
      console.error("Failed to get inventory:", error);
      res.status(500).json({ message: "Failed to get inventory" });
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
      console.error("Failed to get inventory item:", error);
      res.status(500).json({ message: "Failed to get inventory item" });
    }
  });

  apiRouter.post("/inventory", async (req: Request, res: Response) => {
    try {
      const validatedData = insertInventorySchema.parse(req.body);
      const storage = await getStorage();
      const item = await storage.createInventoryItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Failed to create inventory item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  apiRouter.put("/inventory/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = insertInventorySchema.partial().parse(req.body);
      const storage = await getStorage();
      const item = await storage.updateInventoryItem(req.params.id, validatedData);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Failed to update inventory item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  apiRouter.delete("/inventory/:id", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const success = await storage.deleteInventoryItem(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json({ message: "Inventory item deleted successfully" });
    } catch (error) {
      console.error("Failed to delete inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  apiRouter.post("/add-stock", async (req: Request, res: Response) => {
    try {
      const { itemId, quantity } = req.body;
      
      if (!itemId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "Valid item ID and quantity are required" });
      }

      const storage = await getStorage();
      const item = await storage.getInventoryItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      // Update item quantity
      const updatedItem = await storage.updateInventoryItem(itemId, {
        quantity: item.quantity + parseInt(quantity)
      });

      res.json(updatedItem);
    } catch (error) {
      console.error("Failed to add stock:", error);
      res.status(500).json({ message: "Failed to add stock" });
    }
  });

  // Customer routes
  apiRouter.get("/customers", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      console.error("Failed to get customers:", error);
      res.status(500).json({ message: "Failed to get customers" });
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
      console.error("Failed to get customer:", error);
      res.status(500).json({ message: "Failed to get customer" });
    }
  });

  apiRouter.post("/customers", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      const storage = await getStorage();
      const customer = await storage.createCustomer(validatedData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Failed to create customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  apiRouter.put("/customers/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = insertCustomerSchema.partial().parse(req.body);
      const storage = await getStorage();
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Failed to update customer:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  apiRouter.delete("/customers/:id", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const success = await storage.deleteCustomer(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Failed to delete customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  apiRouter.post("/customers/:id/payment", async (req: Request, res: Response) => {
    try {
      const { amount, description } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const storage = await getStorage();
      const customer = await storage.getCustomer(req.params.id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Create transaction record
      const transactionData = {
        type: "payment",
        amount: parseFloat(amount),
        entityId: req.params.id,
        entityType: "customer",
        description: description || `Payment from customer: ${customer.name}`
      };

      const transaction = await storage.createTransaction(transactionData);

      // Update customer pending amount
      const newAmount = (customer.pendingAmount || 0) - parseFloat(amount);
      await storage.updateCustomer(req.params.id, { pendingAmount: Math.max(0, newAmount) });

      res.status(201).json(transaction);
    } catch (error) {
      console.error("Failed to process customer payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Order routes
  apiRouter.get("/orders", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error("Failed to get orders:", error);
      res.status(500).json({ message: "Failed to get orders" });
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
      console.error("Failed to get order:", error);
      res.status(500).json({ message: "Failed to get order" });
    }
  });

  apiRouter.post("/orders", async (req: Request, res: Response) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const storage = await getStorage();
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Failed to create order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  apiRouter.put("/orders/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = insertOrderSchema.partial().parse(req.body);
      const storage = await getStorage();
      const order = await storage.updateOrder(req.params.id, validatedData);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Failed to update order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  apiRouter.delete("/orders/:id", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const success = await storage.deleteOrder(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json({ message: "Order deleted successfully" });
    } catch (error) {
      console.error("Failed to delete order:", error);
      res.status(500).json({ message: "Failed to delete order" });
    }
  });

  // Completely rebuilt transaction routes with robust error handling
  apiRouter.get("/transactions", async (req: Request, res: Response) => {
    // Set JSON headers immediately to prevent HTML responses
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    try {
      console.log("[TRANSACTIONS API] GET /api/transactions called");
      
      const storage = await getStorage();
      
      // Get all transactions with extensive error handling
      let transactions: any[] = [];
      try {
        transactions = await storage.getAllTransactions();
        console.log(`[TRANSACTIONS API] Retrieved ${transactions.length} transactions from storage`);
      } catch (storageError) {
        console.error("[TRANSACTIONS API] Storage error:", storageError);
        return res.status(500).json({ 
          success: false,
          message: "Database connection failed",
          error: "Could not retrieve transactions from storage",
          timestamp: new Date().toISOString()
        });
      }

      // Ensure we have a valid array
      if (!Array.isArray(transactions)) {
        console.warn("[TRANSACTIONS API] Storage returned non-array:", typeof transactions);
        transactions = [];
      }

      // Safely serialize each transaction
      const safeTransactions = transactions.map((transaction, index) => {
        try {
          return {
            id: String(transaction.id || ''),
            entityId: String(transaction.entityId || ''),
            entityType: String(transaction.entityType || ''),
            type: String(transaction.type || ''),
            amount: Number(transaction.amount) || 0,
            description: String(transaction.description || ''),
            createdAt: transaction.createdAt instanceof Date 
              ? transaction.createdAt.toISOString()
              : new Date(transaction.createdAt || Date.now()).toISOString()
          };
        } catch (serializationError) {
          console.error(`[TRANSACTIONS API] Failed to serialize transaction ${index}:`, serializationError);
          return null;
        }
      }).filter(Boolean); // Remove any null entries

      console.log(`[TRANSACTIONS API] Successfully serialized ${safeTransactions.length} transactions`);
      
      // Return the response
      res.status(200).json(safeTransactions);
      
    } catch (error) {
      console.error("[TRANSACTIONS API] Unexpected error:", error);
      
      // Always return JSON, never HTML
      const errorResponse = {
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
      
      try {
        res.status(500).json(errorResponse);
      } catch (finalError) {
        // Last resort: send minimal JSON string
        res.status(500).send('{"success":false,"message":"Critical server error"}');
      }
    }
  });

  apiRouter.get("/transactions/:id", async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log(`[TRANSACTIONS API] GET /api/transactions/${req.params.id}`);
      
      const storage = await getStorage();
      const transaction = await storage.getTransaction(req.params.id);
      
      if (!transaction) {
        return res.status(404).json({ 
          success: false,
          message: "Transaction not found" 
        });
      }
      
      // Safely serialize the transaction
      const safeTransaction = {
        id: String(transaction.id || ''),
        entityId: String(transaction.entityId || ''),
        entityType: String(transaction.entityType || ''),
        type: String(transaction.type || ''),
        amount: Number(transaction.amount) || 0,
        description: String(transaction.description || ''),
        createdAt: transaction.createdAt instanceof Date 
          ? transaction.createdAt.toISOString() 
          : new Date(transaction.createdAt || Date.now()).toISOString()
      };
      
      res.status(200).json(safeTransaction);
    } catch (error) {
      console.error("[TRANSACTIONS API] Failed to get transaction:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to get transaction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  apiRouter.post("/transactions", async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log("[TRANSACTIONS API] POST /api/transactions", req.body);
      
      // Validate request data
      const validatedData = insertTransactionSchema.parse(req.body);
      
      const storage = await getStorage();
      const transaction = await storage.createTransaction(validatedData);
      
      // Safely serialize the new transaction
      const safeTransaction = {
        id: String(transaction.id || ''),
        entityId: String(transaction.entityId || ''),
        entityType: String(transaction.entityType || ''),
        type: String(transaction.type || ''),
        amount: Number(transaction.amount) || 0,
        description: String(transaction.description || ''),
        createdAt: transaction.createdAt instanceof Date 
          ? transaction.createdAt.toISOString() 
          : new Date(transaction.createdAt || Date.now()).toISOString()
      };
      
      console.log("[TRANSACTIONS API] Transaction created successfully:", safeTransaction.id);
      res.status(201).json(safeTransaction);
      
    } catch (error) {
      console.error("[TRANSACTIONS API] Failed to create transaction:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid data provided", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Failed to create transaction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add DELETE endpoint for transactions
  apiRouter.delete("/transactions/:id", async (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log(`[TRANSACTIONS API] DELETE /api/transactions/${req.params.id}`);
      
      const storage = await getStorage();
      const success = await storage.deleteTransaction(req.params.id);
      
      if (!success) {
        return res.status(404).json({ 
          success: false,
          message: "Transaction not found" 
        });
      }
      
      res.status(200).json({ 
        success: true,
        message: "Transaction deleted successfully" 
      });
      
    } catch (error) {
      console.error("[TRANSACTIONS API] Failed to delete transaction:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to delete transaction",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Simple reports endpoint without balance validation
  apiRouter.get("/reports", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const storage = await getStorage();
      
      const [suppliers, customers, orders, transactions] = await Promise.all([
        storage.getAllSuppliers(),
        storage.getAllCustomers(),
        storage.getAllOrders(),
        storage.getAllTransactions()
      ]);

      // Serialize all dates to ISO strings to prevent JSON issues
      const serializeDate = (obj: any) => ({
        ...obj,
        createdAt: obj.createdAt instanceof Date 
          ? obj.createdAt.toISOString() 
          : new Date(obj.createdAt).toISOString()
      });

      const report = {
        summary: {
          totalSuppliers: suppliers.length,
          totalCustomers: customers.length,
          totalOrders: orders.length,
          totalTransactions: transactions.length,
          totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
          totalSupplierDebt: suppliers.reduce((sum, supplier) => sum + supplier.pendingAmount, 0),
          totalCustomerDebt: customers.reduce((sum, customer) => sum + customer.pendingAmount, 0)
        },
        suppliers: suppliers.map(serializeDate),
        customers: customers.map(serializeDate),
        orders: orders.map(serializeDate),
        transactions: transactions.map(serializeDate)
      };

      res.json(report);
    } catch (error) {
      console.error("Failed to generate reports:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to generate reports" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}