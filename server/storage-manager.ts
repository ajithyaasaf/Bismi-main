import { IStorage } from './storage';
import { createFirestoreStorage } from './firestore-storage';

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
      throw new Error(`Storage initialization failed: ${error.message}`);
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
