import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storageManager } from "./storage-manager";
import { createPendingCalculator } from "./utils/pending-calculator";
import { DataRepairService } from "./utils/data-repair";
import { createInventoryManager } from "./utils/inventory-manager";
import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
import { 
  supplierValidationSchema, 
  inventoryValidationSchema, 
  customerValidationSchema, 
  orderValidationSchema, 
  transactionValidationSchema,
  paymentValidationSchema,
  validateAndSanitizeInput,
  validateStockAvailability,
  validateBusinessRules,
  createValidationError
} from "../shared/validation";
import { authenticateApiKey, rateLimiter, requestLogger } from "./middleware/auth";

// Enhanced error handling middleware
function handleValidationError(error: any, res: Response) {
  if (error instanceof z.ZodError) {
    const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    return res.status(400).json({ 
      success: false,
      message: "Validation failed", 
      errors: messages,
      timestamp: new Date().toISOString()
    });
  }
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false,
      message: error.message,
      field: error.field,
      timestamp: new Date().toISOString()
    });
  }
  
  console.error("Unexpected error:", error);
  return res.status(500).json({ 
    success: false,
    message: "Internal server error",
    timestamp: new Date().toISOString()
  });
}

// Use enterprise storage with Firestore exclusively

export async function registerRoutes(app: Express): Promise<Server | void> {
  // Add security and logging middleware
  app.use('/api', requestLogger);
  app.use('/api', rateLimiter(200, 60000)); // 200 requests per minute
  app.use('/api', authenticateApiKey);
  
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

  async function getInventoryManager() {
    const storage = await getStorage();
    return createInventoryManager(storage);
  }

  async function getDataRepairService() {
    const storage = await getStorage();
    return new DataRepairService(storage);
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
      res.status(200).json({ 
        status: "healthy", 
        storage: storageManager.getStorageType(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        message: "Health check failed",
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
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
      const validatedData = validateAndSanitizeInput(supplierValidationSchema, req.body);
      validateBusinessRules(validatedData, 'stock');
      
      const storage = await getStorage();
      const supplier = await storage.createSupplier(validatedData);
      
      console.log(`Supplier created successfully: ${supplier.name} (ID: ${supplier.id})`);
      res.status(201).json(supplier);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  apiRouter.put("/suppliers/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = validateAndSanitizeInput(supplierValidationSchema.partial(), req.body);
      const storage = await getStorage();
      
      // Verify supplier exists
      const existingSupplier = await storage.getSupplier(req.params.id);
      if (!existingSupplier) {
        return res.status(404).json({ 
          success: false,
          message: "Supplier not found",
          timestamp: new Date().toISOString()
        });
      }
      
      const supplier = await storage.updateSupplier(req.params.id, validatedData);
      console.log(`Supplier updated successfully: ${supplier?.name} (ID: ${req.params.id})`);
      res.json(supplier);
    } catch (error) {
      return handleValidationError(error, res);
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
      const validatedPayment = validateAndSanitizeInput(paymentValidationSchema, req.body);
      validateBusinessRules(validatedPayment, 'payment');
      
      const storage = await getStorage();
      const supplier = await storage.getSupplier(req.params.id);
      
      if (!supplier) {
        return res.status(404).json({ 
          success: false,
          message: "Supplier not found",
          timestamp: new Date().toISOString()
        });
      }

      // Create supplier payment transaction with correct type
      const transaction = await storage.createTransaction({
        entityId: req.params.id,
        entityType: "supplier",
        type: "supplier_payment",
        amount: validatedPayment.amount,
        description: validatedPayment.description || `Payment to supplier: ${supplier.name}`
      });

      // Update supplier pending amount
      const pendingCalculator = await getPendingCalculator();
      const newPendingAmount = await pendingCalculator.syncSupplierPendingAmount(req.params.id);

      console.log(`Supplier payment processed: ${supplier.name} - ₹${validatedPayment.amount}`);
      res.status(201).json({
        message: "Payment processed successfully",
        transaction,
        updatedPendingAmount: newPendingAmount
      });
    } catch (error) {
      return handleValidationError(error, res);
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
      const validatedData = validateAndSanitizeInput(inventoryValidationSchema, req.body);
      validateBusinessRules(validatedData, 'stock');
      
      const storage = await getStorage();
      
      // Validate supplier exists if provided
      if (validatedData.supplierId) {
        const supplier = await storage.getSupplier(validatedData.supplierId);
        if (!supplier) {
          throw createValidationError("Supplier not found", "supplierId");
        }
      }
      
      const item = await storage.createInventoryItem(validatedData);
      console.log(`Inventory item created: ${item.name} - ${item.quantity}${item.unit}`);
      res.status(201).json(item);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  apiRouter.put("/inventory/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = validateAndSanitizeInput(inventoryValidationSchema.partial(), req.body);
      const storage = await getStorage();
      
      // Verify item exists
      const existingItem = await storage.getInventoryItem(req.params.id);
      if (!existingItem) {
        return res.status(404).json({ 
          success: false,
          message: "Inventory item not found",
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate supplier exists if being updated
      if (validatedData.supplierId) {
        const supplier = await storage.getSupplier(validatedData.supplierId);
        if (!supplier) {
          throw createValidationError("Supplier not found", "supplierId");
        }
      }
      
      const item = await storage.updateInventoryItem(req.params.id, validatedData);
      console.log(`Inventory item updated: ${item?.name} (ID: ${req.params.id})`);
      res.json(item);
    } catch (error) {
      return handleValidationError(error, res);
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
      const validatedData = validateAndSanitizeInput(customerValidationSchema, req.body);
      const storage = await getStorage();
      const customer = await storage.createCustomer(validatedData);
      
      console.log(`Customer created successfully: ${customer.name} (${customer.type}) - ID: ${customer.id}`);
      res.status(201).json(customer);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  apiRouter.put("/customers/:id", async (req: Request, res: Response) => {
    try {
      const validatedData = validateAndSanitizeInput(customerValidationSchema.partial(), req.body);
      const storage = await getStorage();
      
      // Verify customer exists
      const existingCustomer = await storage.getCustomer(req.params.id);
      if (!existingCustomer) {
        return res.status(404).json({ 
          success: false,
          message: "Customer not found",
          timestamp: new Date().toISOString()
        });
      }
      
      const customer = await storage.updateCustomer(req.params.id, validatedData);
      console.log(`Customer updated successfully: ${customer?.name} (ID: ${req.params.id})`);
      res.json(customer);
    } catch (error) {
      return handleValidationError(error, res);
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
      
      // Enhanced validation
      const numAmount = parseFloat(amount);
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ message: "Valid payment amount greater than 0 is required" });
      }
      
      if (numAmount > 1000000) {
        return res.status(400).json({ message: "Payment amount cannot exceed ₹10,00,000" });
      }

      const storage = await getStorage();
      const pendingCalculator = await getPendingCalculator();
      const dataRepair = await getDataRepairService();
      const customer = await storage.getCustomer(req.params.id);
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Validate and repair data integrity before processing payment
      const integrityCheck = await dataRepair.validateFinancialIntegrity(req.params.id);
      if (!integrityCheck.isValid && integrityCheck.issues.length > 0) {
        console.warn(`Data integrity issues found for customer ${req.params.id}:`, integrityCheck.issues);
      }

      // Process payment with enhanced error handling
      const paymentResult = await pendingCalculator.processCustomerPayment(
        req.params.id,
        numAmount,
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
      
      // Enhanced error response
      if (error instanceof Error) {
        return res.status(400).json({ 
          message: error.message.includes('Invalid payment amount') ? error.message : "Failed to process payment",
          error: error.message
        });
      }
      
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
      const validatedData = validateAndSanitizeInput(orderValidationSchema, req.body);
      validateBusinessRules(validatedData, 'order');
      
      const storage = await getStorage();
      const pendingCalculator = await getPendingCalculator();
      
      // Verify customer exists
      const customer = await storage.getCustomer(validatedData.customerId);
      if (!customer) {
        throw createValidationError("Customer not found", "customerId");
      }
      
      // Validate inventory availability using inventory manager
      const inventoryManager = await getInventoryManager();
      await inventoryManager.validateStockAvailability(validatedData.items);
      
      // Create the order
      const order = await storage.createOrder(validatedData);
      
      // Auto-deduct inventory for all orders (business rule: deduct stock immediately)
      console.log(`Deducting stock for order ${order.id} with status: ${order.orderStatus}`);
      await inventoryManager.deductStock(validatedData.items, order.id);
      
      // Update customer's pending amount if payment is pending
      if (order.paymentStatus === 'pending') {
        await pendingCalculator.syncCustomerPendingAmount(order.customerId);
      }
      
      console.log(`Order created successfully: ${order.id} for customer ${customer.name}`);
      res.status(201).json(order);
    } catch (error) {
      return handleValidationError(error, res);
    }
  });

  apiRouter.put("/orders/:id", async (req: Request, res: Response) => {
    try {
      // Define partial order schema locally with type safety
      const partialOrderSchema = z.object({
        customerId: z.string().min(1).max(100).optional(),
        items: z.array(z.object({
          type: z.string().min(1).max(50),
          quantity: z.number().min(0.001).max(10000),
          rate: z.number().min(0).max(100000),
          details: z.string().max(200).optional()
        })).min(1).max(50).optional(),
        totalAmount: z.number().min(0.01).max(10000000).optional(),
        paidAmount: z.number().min(0).max(10000000).optional(),
        paymentStatus: z.enum(['paid', 'partially_paid', 'pending']).optional(),
        orderStatus: z.enum(['confirmed', 'processing', 'completed', 'cancelled']).optional()
      });
      
      const validatedData = partialOrderSchema.parse(req.body);
      type ValidatedOrderUpdate = z.infer<typeof partialOrderSchema>;
      const storage = await getStorage();
      const pendingCalculator = await getPendingCalculator();
      
      // Get original order to track changes
      const originalOrder = await storage.getOrder(req.params.id);
      if (!originalOrder) {
        return res.status(404).json({ 
          success: false,
          message: "Order not found",
          timestamp: new Date().toISOString()
        });
      }
      
      // Validate customer exists if being updated
      if (validatedData.customerId) {
        const customer = await storage.getCustomer(validatedData.customerId);
        if (!customer) {
          throw createValidationError("Customer not found", "customerId");
        }
      }
      
      // Handle inventory adjustments for status changes using inventory manager
      if (validatedData.orderStatus && validatedData.orderStatus !== originalOrder.orderStatus) {
        const inventoryManager = await getInventoryManager();
        
        // If changing from confirmed to cancelled, restore inventory
        if (originalOrder.orderStatus === 'confirmed' && validatedData.orderStatus === 'cancelled') {
          await inventoryManager.restoreStock(originalOrder.items, originalOrder.id);
        }
        
        // If changing to confirmed, deduct inventory
        if (validatedData.orderStatus === 'confirmed' && originalOrder.orderStatus !== 'confirmed') {
          await inventoryManager.validateStockAvailability(originalOrder.items);
          await inventoryManager.deductStock(originalOrder.items, originalOrder.id);
        }
      }
      
      // Update the order with proper type casting
      const order = await storage.updateOrder(req.params.id, validatedData as any);
      
      // If payment status changed, recalculate customer pending amount
      if (validatedData.paymentStatus && validatedData.paymentStatus !== originalOrder.paymentStatus) {
        await pendingCalculator.syncCustomerPendingAmount(order!.customerId);
      }
      
      console.log(`Order updated successfully: ${req.params.id}`);
      res.json(order);
    } catch (error) {
      return handleValidationError(error, res);
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
      const validatedData = validateAndSanitizeInput(transactionValidationSchema, req.body);
      
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
  // Data repair endpoints for admin use
  apiRouter.post("/admin/repair-customer/:id", async (req: Request, res: Response) => {
    try {
      const dataRepair = await getDataRepairService();
      const repairResult = await dataRepair.validateFinancialIntegrity(req.params.id);
      
      res.json({
        customerId: req.params.id,
        isValid: repairResult.isValid,
        issues: repairResult.issues,
        repairs: repairResult.repairs,
        message: repairResult.isValid ? "Data integrity validated successfully" : "Data issues found and repairs attempted"
      });
    } catch (error) {
      console.error("Failed to repair customer data:", error);
      res.status(500).json({ message: "Failed to repair customer data" });
    }
  });

  apiRouter.post("/admin/repair-order/:id", async (req: Request, res: Response) => {
    try {
      const dataRepair = await getDataRepairService();
      const repairResult = await dataRepair.repairOrder(req.params.id);
      
      res.json({
        orderId: req.params.id,
        wasCorrupted: repairResult.wasCorrupted,
        repairs: repairResult.repairs,
        message: repairResult.wasCorrupted ? "Order data repaired successfully" : "Order data is valid"
      });
    } catch (error) {
      console.error("Failed to repair order data:", error);
      res.status(500).json({ message: "Failed to repair order data" });
    }
  });

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