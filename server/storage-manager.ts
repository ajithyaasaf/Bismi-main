import { IStorage } from './storage';
import { memoryStorage } from './memory-storage';

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
      return this.currentStorage;
    }

    // Check if Firebase credentials are available
    const hasFirebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || 
      (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

    if (hasFirebaseCredentials) {
      try {
        const { firestoreStorage } = await import('./firestore-storage');
        this.currentStorage = firestoreStorage;
        this.storageType = 'Firestore';
        console.log('Storage initialized: Firestore');
      } catch (error) {
        console.warn('Failed to initialize Firestore, falling back to memory storage:', error);
        this.currentStorage = memoryStorage;
        this.storageType = 'Memory';
        console.log('Storage initialized: Memory (fallback)');
      }
    } else {
      // Use memory storage as default when Firebase credentials are not available
      this.currentStorage = memoryStorage;
      this.storageType = 'Memory';
      console.log('Storage initialized: Memory (no Firebase credentials)');
    }

    return this.currentStorage;
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