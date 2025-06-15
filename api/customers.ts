import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storageManager } from '../server/storage-manager';

let storage: any;

async function getStorage() {
  if (!storage) {
    storage = await storageManager.initialize();
  }
  return storage;
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
    console.log(`[Customers API] ${req.method} request`);
    const storage = await getStorage();

    if (req.method === 'GET') {
      const customers = await storage.getAllCustomers();
      console.log(`[Customers API] Found ${customers.length} customers`);
      return res.status(200).json(customers);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Customers API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch customers',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}