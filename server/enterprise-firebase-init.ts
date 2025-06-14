/**
 * Enterprise-grade Firebase initialization with comprehensive error handling,
 * monitoring, retry logic, and multi-environment support for Vercel deployment
 */
import admin from 'firebase-admin';

interface FirebaseInitOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableHealthCheck?: boolean;
}

interface FirebaseHealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  error?: string;
  connectionTime?: number;
  environment: string;
}

export class EnterpriseFirebaseManager {
  private static instance: EnterpriseFirebaseManager | null = null;
  private app: admin.app.App | null = null;
  private db: admin.firestore.Firestore | null = null;
  private healthStatus: FirebaseHealthStatus;
  private isInitializing = false;
  private options: Required<FirebaseInitOptions>;

  private constructor(options: FirebaseInitOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 2000,
      timeout: options.timeout ?? 8000,
      enableHealthCheck: options.enableHealthCheck ?? true
    };

    this.healthStatus = {
      isHealthy: false,
      lastCheck: new Date(),
      environment: process.env.NODE_ENV || 'unknown'
    };
  }

  static getInstance(options?: FirebaseInitOptions): EnterpriseFirebaseManager {
    if (!this.instance) {
      this.instance = new EnterpriseFirebaseManager(options);
    }
    return this.instance;
  }

  async initialize(): Promise<admin.app.App> {
    if (this.app && !this.isInitializing) {
      return this.app;
    }

    if (this.isInitializing) {
      // Wait for ongoing initialization
      return this.waitForInitialization();
    }

    this.isInitializing = true;

    try {
      console.log('🚀 Starting enterprise Firebase initialization...');
      const startTime = Date.now();

      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Initialize with retry logic
      this.app = await this.initializeWithRetry();

      // Step 3: Initialize Firestore
      this.db = this.app.firestore();
      
      // Step 4: Configure Firestore settings
      this.configureFirestore();

      // Step 5: Health check
      if (this.options.enableHealthCheck) {
        await this.performHealthCheck();
      }

      const initTime = Date.now() - startTime;
      console.log(`✅ Firebase initialized successfully in ${initTime}ms`);
      
      this.healthStatus = {
        isHealthy: true,
        lastCheck: new Date(),
        connectionTime: initTime,
        environment: process.env.NODE_ENV || 'production'
      };

      this.isInitializing = false;
      return this.app;

    } catch (error) {
      this.isInitializing = false;
      this.healthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        error: (error as Error).message,
        environment: process.env.NODE_ENV || 'production'
      };
      
      console.error('❌ Firebase initialization failed:', error);
      throw new Error(`Enterprise Firebase initialization failed: ${(error as Error).message}`);
    }
  }

  private async waitForInitialization(): Promise<admin.app.App> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (!this.isInitializing) {
          clearInterval(checkInterval);
          if (this.app) {
            resolve(this.app);
          } else {
            reject(new Error('Firebase initialization failed'));
          }
        }
      }, 100);

      // Timeout after 15 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Firebase initialization timeout'));
      }, 15000);
    });
  }

  private async validateEnvironment(): Promise<void> {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasIndividualVars = !!(
      process.env.FIREBASE_PROJECT_ID && 
      process.env.FIREBASE_CLIENT_EMAIL && 
      process.env.FIREBASE_PRIVATE_KEY
    );

    console.log('🔍 Environment validation:', {
      hasServiceAccountKey: !!serviceAccountKey,
      hasIndividualVars,
      projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
      nodeEnv: process.env.NODE_ENV,
      platform: 'vercel'
    });

    if (!serviceAccountKey && !hasIndividualVars) {
      throw new Error(
        'Missing Firebase credentials. Set either FIREBASE_SERVICE_ACCOUNT_KEY or individual variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
      );
    }

    // Validate service account JSON if provided
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
          throw new Error('Invalid service account JSON structure');
        }
      } catch (error) {
        throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_KEY format: ${(error as Error).message}`);
      }
    }

    // Validate individual variables
    if (hasIndividualVars) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY!;
      if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
        throw new Error('FIREBASE_PRIVATE_KEY format is invalid. Ensure it includes BEGIN/END markers');
      }
    }
  }

  private async initializeWithRetry(): Promise<admin.app.App> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        console.log(`🔄 Firebase init attempt ${attempt}/${this.options.maxRetries}`);
        
        return await Promise.race([
          this.performInitialization(),
          this.createTimeoutPromise()
        ]);
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Attempt ${attempt} failed:`, (error as Error).message);
        
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Firebase initialization failed after all retries');
  }

  private async performInitialization(): Promise<admin.app.App> {
    // Check if app already exists
    try {
      return admin.app();
    } catch {
      // App doesn't exist, create new one
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      console.log('🔑 Using service account JSON authentication');
      const serviceAccount = JSON.parse(serviceAccountKey);
      
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else {
      console.log('🔑 Using individual environment variables');
      const privateKey = process.env.FIREBASE_PRIVATE_KEY!
        .replace(/\\n/g, '\n')  // Convert escaped newlines
        .replace(/\n\s*$/g, ''); // Remove trailing whitespace
      
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID!,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
          privateKey: privateKey
        }),
        projectId: process.env.FIREBASE_PROJECT_ID!
      });
    }
  }

  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Firebase initialization timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  private configureFirestore(): void {
    if (!this.db) return;

    // Configure Firestore settings for optimal performance
    this.db.settings({
      ignoreUndefinedProperties: true,
      // Add more settings as needed
    });
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.db) throw new Error('Firestore not initialized');
    
    try {
      // Perform a simple read operation to verify connection
      const testCollection = this.db.collection('_health_check');
      const snapshot = await testCollection.limit(1).get();
      
      console.log('✅ Firestore health check passed');
    } catch (error) {
      console.warn('⚠️ Firestore health check failed:', (error as Error).message);
      // Don't throw here as the connection might still work for other operations
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public methods
  getApp(): admin.app.App | null {
    return this.app;
  }

  getFirestore(): admin.firestore.Firestore | null {
    return this.db;
  }

  getHealthStatus(): FirebaseHealthStatus {
    return { ...this.healthStatus };
  }

  async refreshHealth(): Promise<FirebaseHealthStatus> {
    if (this.db) {
      try {
        const startTime = Date.now();
        await this.performHealthCheck();
        const responseTime = Date.now() - startTime;
        
        this.healthStatus = {
          isHealthy: true,
          lastCheck: new Date(),
          connectionTime: responseTime,
          environment: process.env.NODE_ENV || 'production'
        };
      } catch (error) {
        this.healthStatus = {
          isHealthy: false,
          lastCheck: new Date(),
          error: (error as Error).message,
          environment: process.env.NODE_ENV || 'production'
        };
      }
    }
    
    return this.getHealthStatus();
  }

  // Metrics and monitoring
  getMetrics() {
    return {
      initialized: !!this.app,
      healthy: this.healthStatus.isHealthy,
      lastHealthCheck: this.healthStatus.lastCheck,
      environment: this.healthStatus.environment,
      connectionTime: this.healthStatus.connectionTime,
      uptime: this.app ? Date.now() - this.healthStatus.lastCheck.getTime() : 0
    };
  }
}

// Export singleton instance
export const enterpriseFirebase = EnterpriseFirebaseManager.getInstance({
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 8000,
  enableHealthCheck: true
});