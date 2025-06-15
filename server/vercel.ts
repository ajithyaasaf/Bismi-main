// A simplified version of the server for Vercel deployment
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { storageManager } from "./storage-manager";
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
    const data = insertSupplierSchema.parse(req.body);
    const supplier = await storage.createSupplier(data);
    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: "Invalid supplier data", error });
  }
});

apiRouter.put("/suppliers/:id", async (req: Request, res: Response) => {
  try {
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
    const { amount, description } = req.body;
    const supplierId = req.params.id;
    
    // Check if supplier exists
    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    // Create a payment transaction
    const transaction = await storage.createTransaction({
      type: 'payment',
      amount,
      entityId: supplierId,
      entityType: 'supplier',
      description,
      date: new Date()
    });
    
    // Return updated supplier with new debt amount
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
    const inventory = await storage.getAllInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch inventory" });
  }
});

// Rest of routes omitted for brevity...
// All other routes from server/routes.ts would be included here

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Configure for serverless
export default app;