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
    console.log(`[Transactions API] ${req.method} request`);
    const storage = await getStorage();

    if (req.method === 'GET') {
      const transactions = await storage.getAllTransactions();
      console.log(`[Transactions API] Found ${transactions.length} transactions`);
      return res.status(200).json(transactions);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Transactions API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch transactions',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}