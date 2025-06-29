import { IStorage } from './storage';
import { createFirestoreStorage } from './firestore-storage';
import { createMockStorage } from './mock-storage';

class StorageManager {
  private static instance: StorageManager;
  private currentStorage: IStorage | null = null;
  private storageType: string = 'unknown';

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  async initialize(): Promise<IStorage> {
    if (this.currentStorage) {
      console.log('[StorageManager] Returning existing storage instance');
      return this.currentStorage;
    }

    // Check if Firebase credentials are available in production
    const hasFirebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
                                   process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (hasFirebaseCredentials) {
      try {
        console.log('[StorageManager] Creating new Firestore storage instance');
        this.currentStorage = createFirestoreStorage();
        this.storageType = 'Firestore';
        console.log('[StorageManager] Storage initialized: Firestore');
        return this.currentStorage;
      } catch (error) {
        console.error('[StorageManager] Failed to initialize Firestore storage:', error);
        // Reset state on failure for serverless retry capability
        this.currentStorage = null;
        this.storageType = 'unknown';
        throw new Error(`Storage initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      console.warn('[StorageManager] Firebase credentials not found. For production, please provide FIREBASE_SERVICE_ACCOUNT_KEY.');
      console.log('[StorageManager] Creating mock storage for development testing');
      this.currentStorage = createMockStorage();
      this.storageType = 'Mock';
      console.log('[StorageManager] Storage initialized: Mock (for development testing)');
      return this.currentStorage;
    }
  }

  getStorage(): IStorage {
    if (!this.currentStorage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.currentStorage;
  }

  getStorageType(): string {
    return this.storageType;
  }

  isUsingFirestoreStorage(): boolean {
    return this.storageType === 'Firestore';
  }
}

export const storageManager = StorageManager.getInstance();
export default storageManager;
