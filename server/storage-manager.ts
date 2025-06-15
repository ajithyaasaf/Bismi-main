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
      // Use enterprise storage with Firestore exclusively
      this.currentStorage = enterpriseStorage;
      console.log(`Storage initialized: ${enterpriseStorage.getStorageType()}`);
      return this.currentStorage;

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