import { IStorage } from './storage';
import { firestoreStorage } from './firestore-storage';
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

    try {
      // Try to use Firestore storage first
      this.currentStorage = firestoreStorage;
      this.storageType = 'Firestore';
      console.log('Storage initialized: Firestore');
      return this.currentStorage;

    } catch (error) {
      console.warn('Firestore storage initialization failed, falling back to memory storage:', error.message);
      
      // Fallback to memory storage
      this.currentStorage = memoryStorage;
      this.storageType = 'Memory';
      console.log('Storage initialized: Memory (fallback)');
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