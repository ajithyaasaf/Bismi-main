import { IStorage } from './storage';
import { enterpriseStorage } from './enterprise-storage';

class StorageManager {
  private static instance: StorageManager;
  private currentStorage: IStorage | null = null;

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<IStorage> {
    if (this.currentStorage) {
      return this.currentStorage;
    }

    try {
      // Check if Firebase credentials are available
      const hasFirebaseCredentials = 
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
        (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

      if (hasFirebaseCredentials) {
        // Use enterprise storage with Firestore
        this.currentStorage = enterpriseStorage;
        console.log(`Storage initialized: ${enterpriseStorage.getStorageType()}`);
        return this.currentStorage;
      } else {
        console.warn('Firebase credentials not found. Please provide Firebase credentials for production deployment.');
        console.warn('Required: FIREBASE_SERVICE_ACCOUNT_KEY or (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY)');
        throw new Error('Firebase credentials required for storage initialization');
      }

    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw error;
    }
  }

  getStorage(): IStorage {
    if (!this.currentStorage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.currentStorage;
  }

  getStorageType(): string {
    return this.currentStorage ? enterpriseStorage.getStorageType() : 'Not initialized';
  }

  isUsingFirestoreStorage(): boolean {
    return this.currentStorage ? enterpriseStorage.isUsingFirestoreStorage() : false;
  }
}

export const storageManager = StorageManager.getInstance();
export default storageManager;