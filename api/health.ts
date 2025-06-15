import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storageManager } from '../server/storage-manager';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('[Health API] Health check request');
    
    // Test Firebase connection
    const storage = await storageManager.initialize();
    
    return res.status(200).json({
      status: 'healthy',
      storage: 'firestore',
      storageType: storageManager.getStorageType(),
      timestamp: new Date().toISOString(),
      environment: 'vercel'
    });
  } catch (error) {
    console.error('[Health API] Error:', error);
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      environment: 'vercel'
    });
  }
}