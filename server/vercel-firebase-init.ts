import admin from 'firebase-admin';

/**
 * Robust Firebase initialization specifically designed for Vercel serverless functions
 * Handles multiple authentication methods and common deployment issues
 */
export class VercelFirebaseInitializer {
  private static instance: admin.app.App | null = null;

  static async initialize(): Promise<admin.app.App> {
    if (this.instance) {
      return this.instance;
    }

    console.log('Starting Vercel Firebase initialization...');
    
    try {
      // Method 1: Try service account JSON (most reliable for Vercel)
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      
      if (serviceAccountKey) {
        console.log('Attempting service account JSON authentication...');
        this.instance = await this.initWithServiceAccountJson(serviceAccountKey);
        return this.instance;
      }

      // Method 2: Try individual environment variables
      console.log('Attempting individual environment variables authentication...');
      this.instance = await this.initWithIndividualVars();
      return this.instance;

    } catch (error) {
      console.error('All Firebase initialization methods failed:', error);
      throw new Error(`Firebase initialization failed: ${(error as Error).message}`);
    }
  }

  private static async initWithServiceAccountJson(serviceAccountKey: string): Promise<admin.app.App> {
    try {
      let serviceAccount;
      
      // Handle different JSON formats
      if (typeof serviceAccountKey === 'string') {
        serviceAccount = JSON.parse(serviceAccountKey);
      } else {
        serviceAccount = serviceAccountKey;
      }

      // Validate required fields
      const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
      const missingFields = requiredFields.filter(field => !serviceAccount[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required service account fields: ${missingFields.join(', ')}`);
      }

      console.log('Service account validation passed, initializing Firebase...');
      
      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log('Firebase initialized successfully with service account JSON');
      return app;

    } catch (error) {
      console.error('Service account JSON initialization failed:', error);
      throw error;
    }
  }

  private static async initWithIndividualVars(): Promise<admin.app.App> {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing required individual Firebase environment variables');
    }

    // Handle Vercel private key formatting issues
    privateKey = this.formatPrivateKey(privateKey);

    console.log('Individual variables validation passed, initializing Firebase...');

    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });

    console.log('Firebase initialized successfully with individual environment variables');
    return app;
  }

  private static formatPrivateKey(privateKey: string): string {
    // Replace escaped newlines with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Remove trailing newlines after END marker
    if (privateKey.endsWith('-----END PRIVATE KEY-----\n')) {
      privateKey = privateKey.slice(0, -1);
    }

    // Ensure proper formatting
    if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = privateKey
        .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
        .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    }

    // Validate final format
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----') || 
        !privateKey.endsWith('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid private key format after processing');
    }

    return privateKey;
  }

  static getFirestore(): admin.firestore.Firestore {
    if (!this.instance) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return admin.firestore();
  }

  static isInitialized(): boolean {
    return this.instance !== null;
  }
}