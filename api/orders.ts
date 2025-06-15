import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storageManager } from '../server/storage-manager';

let storage: any;
let storagePromise: Promise<any> | null = null;

async function getStorage() {
  if (storage) {
    return storage;
  }
  
  if (storagePromise) {
    return storagePromise;
  }
  
  storagePromise = initializeStorage();
  storage = await storagePromise;
  storagePromise = null;
  
  return storage;
}

async function initializeStorage() {
  try {
    console.log('[Orders API] Initializing storage...');
    const instance = await storageManager.initialize();
    console.log('[Orders API] Storage initialized successfully');
    return instance;
  } catch (error) {
    console.error('[Orders API] Storage initialization failed:', error);
    storage = null;
    storagePromise = null;
    throw new Error(`Storage initialization failed: ${error.message}`);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log(`[Orders API] ${req.method} request`);
    const storage = await getStorage();

    if (req.method === 'GET') {
      const orders = await storage.getAllOrders();
      console.log(`[Orders API] Found ${orders.length} orders`);
      return res.status(200).json(orders);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Orders API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch orders',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}