import { dbService, COLLECTIONS } from './firebase';

// Storage keys
export const STORAGE_KEYS = {
  initialized: 'heritage_initialized',
  assets: 'heritage_assets',
  transactions: 'heritage_transactions',
  personnel: 'heritage_personnel',
  settings: 'heritage_settings'
};

// Check if Firebase is configured
const isFirebaseConfigured = () => {
  const config = import.meta.env;
  return config.VITE_FIREBASE_API_KEY && 
         config.VITE_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
         config.VITE_FIREBASE_PROJECT_ID && 
         config.VITE_FIREBASE_PROJECT_ID !== "YOUR_PROJECT_ID";
};

// Firebase-based storage (for production)
const firebaseStorage = {
  async get(key) {
    try {
      const collectionMap = {
        [STORAGE_KEYS.assets]: COLLECTIONS.ASSETS,
        [STORAGE_KEYS.transactions]: COLLECTIONS.TRANSACTIONS,
        [STORAGE_KEYS.personnel]: COLLECTIONS.PERSONNEL,
        [STORAGE_KEYS.settings]: COLLECTIONS.SETTINGS,
        [STORAGE_KEYS.initialized]: COLLECTIONS.SETTINGS
      };
      
      const collection = collectionMap[key];
      if (!collection) return null;
      
      const doc = await dbService.getDocument(collection, 'main');
      return doc ? doc.data : null;
    } catch (error) {
      console.error('Firebase get error:', error);
      return null;
    }
  },

  async set(key, value) {
    try {
      const collectionMap = {
        [STORAGE_KEYS.assets]: COLLECTIONS.ASSETS,
        [STORAGE_KEYS.transactions]: COLLECTIONS.TRANSACTIONS,
        [STORAGE_KEYS.personnel]: COLLECTIONS.PERSONNEL,
        [STORAGE_KEYS.settings]: COLLECTIONS.SETTINGS,
        [STORAGE_KEYS.initialized]: COLLECTIONS.SETTINGS
      };
      
      const collection = collectionMap[key];
      if (!collection) return false;
      
      await dbService.setDocument(collection, 'main', { data: value });
      return true;
    } catch (error) {
      console.error('Firebase set error:', error);
      return false;
    }
  }
};

// LocalStorage-based storage (for development)
const localStorageStorage = {
  get(key) {
    try {
      const result = localStorage.getItem(key);
      return result ? JSON.parse(result) : null;
    } catch {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
};

// Active storage backend (auto-detect)
const useFirebase = isFirebaseConfigured();

export const storage = {
  get(key) {
    if (useFirebase) {
      // For Firebase, we need async handling - this is a sync fallback
      return localStorageStorage.get(key);
    }
    return localStorageStorage.get(key);
  },

  set(key, value) {
    if (useFirebase) {
      // Fire and forget for Firebase - sync fallback
      firebaseStorage.set(key, value).catch(console.error);
    }
    return localStorageStorage.set(key, value);
  },

  // Async versions for proper Firebase support
  async getAsync(key) {
    if (useFirebase) {
      return await firebaseStorage.get(key);
    }
    return localStorageStorage.get(key);
  },

  async setAsync(key, value) {
    if (useFirebase) {
      return await firebaseStorage.set(key, value);
    }
    return localStorageStorage.set(key, value);
  }
};

export default storage;