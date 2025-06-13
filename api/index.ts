// Vercel API handler (serverless function)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { storageManager } from '../server/storage-manager';
import {
  Supplier, InsertSupplier,
  Inventory, InsertInventory,
  Customer, InsertCustomer,
  Order, InsertOrder,
  Transaction, InsertTransaction
} from '../shared/schema';

// Demo data
const suppliers: Supplier[] = [
  {
    id: uuidv4(),
    name: "Fresh Farm Foods",
    debt: 1200,
    contact: "555-123-4567",
    createdAt: new Date()
  }
];

const inventory: InventoryItem[] = [
  {
    id: uuidv4(),
    type: "chicken",
    quantity: 50,
    rate: 150,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "eeral",
    quantity: 75,
    rate: 180,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "leg-piece",
    quantity: 60,
    rate: 200,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "goat",
    quantity: 50,
    rate: 300,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "kadai",
    quantity: 40,
    rate: 250,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "beef",
    quantity: 80,
    rate: 220,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "kodal",
    quantity: 30,
    rate: 160,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "chops",
    quantity: 45,
    rate: 240,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "boneless",
    quantity: 35,
    rate: 280,
    updatedAt: new Date()
  },
  {
    id: uuidv4(),
    type: "order",
    quantity: 25,
    rate: 320,
    updatedAt: new Date()
  }
];

const customers: Customer[] = [
  {
    id: uuidv4(),
    name: "Spice Restaurant",
    type: "restaurant",
    contact: "555-987-6543",
    pendingAmount: 2500,
    createdAt: new Date()
  }
];

const orders: Order[] = [
  {
    id: uuidv4(),
    customerId: customers[0]?.id || uuidv4(),
    items: [{ id: uuidv4(), itemId: inventory[0]?.id, quantity: 10, rate: 120 }],
    date: new Date(),
    total: 1200,
    status: "completed",
    type: "takeaway"
  }
];

const transactions: Transaction[] = [
  {
    id: uuidv4(),
    type: "income",
    amount: 1200,
    entityId: customers[0]?.id || uuidv4(),
    entityType: "customer",
    date: new Date(),
    description: "Payment received"
  }
];

// Helper function for responses
function sendResponse(res: VercelResponse, data: any, status = 200) {
  return res.status(status).json(data);
}

// Main handler function for all API requests
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request (for CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract path from the request
  const path = req.url?.split('?')[0] || '';
  
  // Basic route for testing
  if (req.method === 'GET' && path === '/api/hello') {
    return sendResponse(res, { message: 'Hello from Vercel Serverless API!', timestamp: new Date() });
  }
  
  // API Routes
  try {
    // Supplier routes
    if (path === '/api/suppliers') {
      if (req.method === 'GET') {
        return sendResponse(res, suppliers);
      } else if (req.method === 'POST') {
        const newSupplier: Supplier = {
          id: uuidv4(),
          name: req.body?.name || 'New Supplier',
          debt: req.body?.debt || 0,
          contact: req.body?.contact,
          createdAt: new Date()
        };
        suppliers.push(newSupplier);
        return sendResponse(res, newSupplier, 201);
      }
    }
    
    // Inventory routes
    if (path === '/api/inventory') {
      if (req.method === 'GET') {
        return sendResponse(res, inventory);
      } else if (req.method === 'POST') {
        const newItem: InventoryItem = {
          id: uuidv4(),
          type: req.body?.type || 'unknown',
          quantity: req.body?.quantity || 0,
          rate: req.body?.rate || 0,
          updatedAt: new Date()
        };
        inventory.push(newItem);
        return sendResponse(res, newItem, 201);
      }
    }
    
    // Customer routes
    if (path === '/api/customers') {
      if (req.method === 'GET') {
        return sendResponse(res, customers);
      } else if (req.method === 'POST') {
        const newCustomer: Customer = {
          id: uuidv4(),
          name: req.body?.name || 'New Customer',
          type: req.body?.type || 'hotel',
          contact: req.body?.contact,
          pendingAmount: req.body?.pendingAmount || 0,
          createdAt: new Date()
        };
        customers.push(newCustomer);
        return sendResponse(res, newCustomer, 201);
      }
    }
    
    // Order routes
    if (path === '/api/orders') {
      if (req.method === 'GET') {
        return sendResponse(res, orders);
      } else if (req.method === 'POST') {
        const newOrder: Order = {
          id: uuidv4(),
          customerId: req.body?.customerId || '',
          items: req.body?.items || [],
          total: req.body?.total || 0,
          status: req.body?.status || 'pending',
          type: req.body?.type || 'dine-in',
          date: new Date()
        };
        orders.push(newOrder);
        return sendResponse(res, newOrder, 201);
      }
    }
    
    // Transaction routes
    if (path === '/api/transactions') {
      if (req.method === 'GET') {
        return sendResponse(res, transactions);
      } else if (req.method === 'POST') {
        const newTransaction: Transaction = {
          id: uuidv4(),
          type: req.body?.type || 'expense',
          amount: req.body?.amount || 0,
          entityId: req.body?.entityId || '',
          entityType: req.body?.entityType || 'customer',
          description: req.body?.description,
          date: new Date()
        };
        transactions.push(newTransaction);
        return sendResponse(res, newTransaction, 201);
      }
    }

    // Reports route
    if (req.method === 'GET' && path === '/api/reports') {
      const reportData = {
        totalSales: orders.reduce((sum, order) => sum + order.total, 0),
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalInventory: inventory.reduce((sum, item) => sum + item.quantity, 0),
        totalSuppliers: suppliers.length,
        totalTransactions: transactions.length,
        recentOrders: orders.slice(-5),
        recentTransactions: transactions.slice(-5)
      };
      return sendResponse(res, reportData);
    }
    
    // Fallback for all other routes
    return res.status(404).json({ error: 'Route not found', path });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}