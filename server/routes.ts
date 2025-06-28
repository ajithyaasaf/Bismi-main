import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storageManager } from "./storage-manager";
import { createPendingCalculator } from "./utils/pending-calculator";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";

// Validation schemas
const insertSupplierSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  pendingAmount: z.number().optional().default(0)
});

const insertInventorySchema = z.object({
  name: z.string().optional(),
  type: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().optional().default("kg"),
  price: z.number().min(0),
  supplierId: z.string().optional().default("")
});

const insertCustomerSchema = z.object({
  name: z.string().min(1),
  contact: z.string().min(1),
  type: z.string().min(1),
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
  paidAmount: z.number().min(0).optional(),
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

export async function registerRoutes(app: Express): Promise<Server | void> {
  // Add middleware to ensure all API responses are JSON with standardized format
  app.use('/api', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    
    // Override res.json to standardize responses
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // If already standardized, use as-is
      if (data && typeof data === 'object' && 'success' in data) {
        return originalJson(data);
      }
      
      // Standardize successful responses
      const standardizedResponse = {
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      return originalJson(standardizedResponse);
    };
    
    next();
  });

  // API routes
  const apiRouter = express.Router();
  app.use("/api", apiRouter);

  async function getStorage() {
    try {
      // Always ensure storage is initialized first
      const storage = await storageManager.initialize();
      console.log('Storage initialized successfully, type:', storageManager.getStorageType());
      return storage;
    } catch (error) {
      console.error('Storage initialization error:', error);
      throw error;
    }
  }

  async function getPendingCalculator() {
    const storage = await getStorage();
    return createPendingCalculator(storage);
  }

  // Batch endpoint for multiple requests
  apiRouter.post("/batch", async (req: Request, res: Response) => {
    try {
      const { requests } = req.body;
      const results: Record<string, any> = {};
      
      // Process requests in parallel for better performance
      const promises = Object.entries(requests).map(async ([key, requestData]: [string, any]) => {
        try {
          const storage = await getStorage();
          let result;
          
          switch (requestData.endpoint) {
            case '/suppliers':
              result = await storage.getAllSuppliers();
              break;
            case '/inventory':
              result = await storage.getAllInventory();
              break;
            case '/customers':
              result = await storage.getAllCustomers();
              break;
            case '/orders':
              result = await storage.getAllOrders();
              break;
            case '/transactions':
              result = await storage.getAllTransactions();
              break;
            default:
              throw new Error(`Unsupported endpoint: ${requestData.endpoint}`);
          }
          
          return { key, success: true, data: result };
        } catch (error) {
          return { 
            key, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
      });
      
      const responses = await Promise.all(promises);
      responses.forEach(({ key, success, data, error }) => {
        results[key] = success ? { success: true, data } : { success: false, error };
      });
      
      res.json(results);
    } catch (error) {
      console.error("Batch request failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Batch request failed",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  apiRouter.get("/health", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      
      // Generate deployment version based on server start time or environment
      const deploymentVersion = process.env.VERCEL_GIT_COMMIT_SHA || 
                               process.env.DEPLOYMENT_ID || 
                               process.env.SERVER_START_TIME || 
                               Date.now().toString();
      
      res.status(200).json({ 
        status: "healthy", 
        storage: storageManager.getStorageType(),
        timestamp: new Date().toISOString(),
        version: deploymentVersion,
        deployment: {
          sha: process.env.VERCEL_GIT_COMMIT_SHA,
          branch: process.env.VERCEL_GIT_COMMIT_REF,
          url: process.env.VERCEL_URL,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        version: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString()
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
      const pendingCalculator = await getPendingCalculator();
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

      // Recalculate and sync supplier pending amount
      const newPendingAmount = await pendingCalculator.syncSupplierPendingAmount(req.params.id);

      res.status(201).json({
        transaction,
        updatedPendingAmount: newPendingAmount
      });
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
      const { type, quantity, price, supplierId } = req.body;
      
      if (!type || !quantity || quantity <= 0 || !price || price <= 0 || !supplierId) {
        return res.status(400).json({ message: "Valid item type, quantity, price, and supplier are required" });
      }

      const storage = await getStorage();
      
      // Check if supplier exists
      const supplier = await storage.getSupplier(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      // Find existing inventory item of this type
      const allInventory = await storage.getAllInventory();
      const existingItem = allInventory.find(item => item.type === type);
      
      let updatedItem;
      const totalCost = parseFloat(quantity) * parseFloat(price);
      
      if (existingItem) {
        // Update existing inventory item
        const newQuantity = existingItem.quantity + parseFloat(quantity);
        updatedItem = await storage.updateInventoryItem(existingItem.id, {
          quantity: newQuantity,
          price: parseFloat(price), // Update price to latest
          supplierId: supplierId // Update supplier relationship
        });
      } else {
        // Create new inventory item with proper supplier relationship
        updatedItem = await storage.createInventoryItem({
          name: type,
          type,
          quantity: parseFloat(quantity),
          unit: "kg",
          price: parseFloat(price),
          supplierId: supplierId
        });
      }
      
      // Create transaction record first
      await storage.createTransaction({
        entityId: supplierId,
        entityType: "supplier",
        type: "purchase",
        amount: totalCost,
        description: `Stock purchase: ${quantity}kg ${type} @ ₹${price}/kg`
      });

      // Update supplier pending amount after transaction
      const pendingCalculator = await getPendingCalculator();
      await pendingCalculator.syncSupplierPendingAmount(supplierId);
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Failed to add stock:", error);
      res.status(500).json({ message: "Failed to add stock" });
    }
  });

  // Customer routes with filtering support
  apiRouter.get("/customers", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const customers = await storage.getAllCustomers();
      
      // Support query filtering to reduce data transfer
      const { type, fields } = req.query;
      let filteredCustomers = customers;
      
      if (type) {
        filteredCustomers = customers.filter(customer => customer.type === type);
      }
      
      // Support field selection to reduce payload size
      if (fields && typeof fields === 'string') {
        const selectedFields = fields.split(',');
        filteredCustomers = filteredCustomers.map(customer => {
          const filtered: any = { id: customer.id }; // Always include ID
          selectedFields.forEach(field => {
            if (field in customer) {
              filtered[field] = (customer as any)[field];
            }
          });
          return filtered;
        });
      }
      
      res.json(filteredCustomers);
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
      
      // Return stored pending amount to match UI display
      res.json(customer);
    } catch (error) {
      console.error("Failed to get customer:", error);
      res.status(500).json({ message: "Failed to get customer" });
    }
  });

  // Add new endpoint for WhatsApp customer data with accurate pending amounts
  apiRouter.get("/customers/:id/whatsapp", async (req: Request, res: Response) => {
    try {
      const pendingCalculator = await getPendingCalculator();
      const customerData = await pendingCalculator.getCustomerForWhatsApp(req.params.id);
      
      if (!customerData) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customerData);
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
      const { amount, description, targetOrderId } = req.body;
      
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }

      const storage = await getStorage();
      const pendingCalculator = await getPendingCalculator();
      const customer = await storage.getCustomer(req.params.id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Process payment with order-specific partial payment tracking
      const paymentResult = await pendingCalculator.processCustomerPayment(
        req.params.id,
        parseFloat(amount),
        description || `Payment from customer: ${customer.name}`,
        targetOrderId
      );

      res.status(201).json({
        message: "Payment processed successfully",
        appliedAmount: paymentResult.appliedAmount,
        remainingCredit: paymentResult.remainingCredit,
        updatedOrders: paymentResult.updatedOrders,
        totalOrdersUpdated: paymentResult.updatedOrders.length
      });
    } catch (error) {
      console.error("Failed to process customer payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Order routes with customer filtering
  apiRouter.get("/orders", async (req: Request, res: Response) => {
    try {
      const storage = await getStorage();
      const { customerId, status, limit } = req.query;
      
      if (customerId) {
        // Optimized endpoint for customer-specific orders
        const orders = await storage.getOrdersByCustomer(customerId as string);
        return res.json(orders);
      }
      
      let orders = await storage.getAllOrders();
      
      // Server-side filtering to reduce data transfer
      if (status) {
        orders = orders.filter(order => order.orderStatus === status);
      }
      
      // Limit results for pagination
      if (limit) {
        const limitNum = parseInt(limit as string, 10);
        if (!isNaN(limitNum)) {
          orders = orders.slice(0, limitNum);
        }
      }
      
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
      const pendingCalculator = await getPendingCalculator();
      
      // Create the order
      const order = await storage.createOrder(validatedData);
      
      // If order is pending, update customer's pending amount
      if (order.paymentStatus === 'pending') {
        await pendingCalculator.syncCustomerPendingAmount(order.customerId);
      }
      
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
      const pendingCalculator = await getPendingCalculator();
      
      // Get original order to track payment status changes
      const originalOrder = await storage.getOrder(req.params.id);
      if (!originalOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Update the order
      const order = await storage.updateOrder(req.params.id, validatedData);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // If payment status changed, recalculate customer pending amount
      if (validatedData.paymentStatus && validatedData.paymentStatus !== originalOrder.paymentStatus) {
        await pendingCalculator.syncCustomerPendingAmount(order.customerId);
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
              : (transaction.createdAt ? new Date(transaction.createdAt).toISOString() : new Date().toISOString())
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

  // Enterprise reports endpoint with real-time calculations and date filtering
  apiRouter.get("/reports", async (req: Request, res: Response) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      const storage = await getStorage();
      const pendingCalculator = await getPendingCalculator();
      
      // Parse query parameters
      const { type = 'sales', startDate, endDate } = req.query;
      
      console.log(`[REPORTS API] Generating ${type} report for ${startDate} to ${endDate}`);
      
      // Get all data
      const [suppliers, customers, orders, transactions] = await Promise.all([
        storage.getAllSuppliers(),
        storage.getAllCustomers(),
        storage.getAllOrders(),
        storage.getAllTransactions()
      ]);

      // Filter orders by date range if provided
      let filteredOrders = orders;
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999); // Include full end date
        
        filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= start && orderDate <= end;
        });
      }

      // Serialize dates safely
      const serializeDate = (obj: any) => ({
        ...obj,
        createdAt: obj.createdAt instanceof Date 
          ? obj.createdAt.toISOString() 
          : new Date(obj.createdAt || Date.now()).toISOString()
      });

      // Get customer names for orders
      const enrichedOrders = await Promise.all(
        filteredOrders.map(async (order) => {
          const customer = customers.find(c => c.id === order.customerId);
          return {
            ...serializeDate(order),
            customerName: customer?.name || order.customerId
          };
        })
      );

      // Calculate real-time pending amounts using the calculator
      const enrichedCustomers = await Promise.all(
        customers.map(async (customer) => {
          const realTimePending = await pendingCalculator.calculateCustomerPendingAmount(customer.id);
          return {
            ...serializeDate(customer),
            pendingAmount: realTimePending
          };
        })
      );

      const enrichedSuppliers = await Promise.all(
        suppliers.map(async (supplier) => {
          const realTimePending = await pendingCalculator.calculateSupplierPendingAmount(supplier.id);
          return {
            ...serializeDate(supplier),
            pendingAmount: realTimePending
          };
        })
      );

      // Calculate metrics based on filtered data
      const totalSales = filteredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const orderCount = filteredOrders.length;
      const totalSupplierDebt = enrichedSuppliers.reduce((sum, supplier) => sum + (supplier.pendingAmount || 0), 0);
      const totalCustomerPending = enrichedCustomers.reduce((sum, customer) => sum + (customer.pendingAmount || 0), 0);

      // Filter customers and suppliers with non-zero pending amounts for debt reports
      const customersWithPending = enrichedCustomers.filter(customer => customer.pendingAmount > 0);
      const suppliersWithDebt = enrichedSuppliers.filter(supplier => supplier.pendingAmount > 0);

      const report = {
        // Metrics for the frontend
        totalSales,
        orderCount,
        totalSupplierDebt,
        totalCustomerPending,
        averageOrderValue: orderCount > 0 ? totalSales / orderCount : 0,
        
        // Data arrays
        orders: enrichedOrders,
        customers: customersWithPending,
        suppliers: suppliersWithDebt,
        transactions: transactions.map(serializeDate),
        
        // Summary for comprehensive reporting
        summary: {
          dateRange: startDate && endDate ? `${startDate} to ${endDate}` : 'All time',
          reportType: type,
          totalSuppliers: suppliers.length,
          totalCustomers: customers.length,
          totalOrders: orders.length,
          filteredOrders: filteredOrders.length,
          totalTransactions: transactions.length,
          generatedAt: new Date().toISOString()
        }
      };

      console.log(`[REPORTS API] Report generated: ${orderCount} orders, ₹${totalSales} total sales`);
      res.json(report);
      
    } catch (error) {
      console.error("Failed to generate reports:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false,
        message: "Failed to generate reports",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}