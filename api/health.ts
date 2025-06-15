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
    console.log('[Health API] Environment variables check:');
    console.log('[Health API] FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('[Health API] Key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);
    
    // Test Firebase connection
    const storage = await storageManager.initialize();
    
    return res.status(200).json({
      status: 'healthy',
      storage: 'firestore',
      storageType: storageManager.getStorageType(),
      timestamp: new Date().toISOString(),
      environment: 'vercel',
      hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    });
  } catch (error) {
    console.error('[Health API] Error:', error);
    console.error('[Health API] Error stack:', error.stack);
    return res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      environment: 'vercel',
      hasFirebaseKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    });
  }
}