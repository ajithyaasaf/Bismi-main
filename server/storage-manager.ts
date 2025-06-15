import { IStorage } from './storage';
import { firestoreStorage } from './firestore-storage';

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
      // Use Firestore storage directly
      this.currentStorage = firestoreStorage;
      console.log('Storage initialized: Firestore');
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
    return 'Firestore';
  }

  isUsingFirestoreStorage(): boolean {
    return true;
  }
}

export const storageManager = StorageManager.getInstance();
export default storageManager;