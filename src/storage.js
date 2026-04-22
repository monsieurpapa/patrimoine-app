import { dbService, COLLECTIONS, authService } from './firebase';

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

// Get current user ID for data isolation
const getUserId = () => {
  const user = authService.getCurrentUser();
  return user ? user.uid : null;
};

// Firebase-based storage (for production) - user-specific
const firebaseStorage = {
  async get(key) {
    try {
      const userId = getUserId();
      if (!userId) return null; // Not logged in
      
      const collectionMap = {
        [STORAGE_KEYS.assets]: COLLECTIONS.ASSETS,
        [STORAGE_KEYS.transactions]: COLLECTIONS.TRANSACTIONS,
        [STORAGE_KEYS.personnel]: COLLECTIONS.PERSONNEL,
        [STORAGE_KEYS.settings]: COLLECTIONS.SETTINGS,
        [STORAGE_KEYS.initialized]: COLLECTIONS.SETTINGS
      };
      
      const collection = collectionMap[key];
      if (!collection) return null;
      
      // Use user ID as document ID for data isolation
      const doc = await dbService.getDocument(collection, userId);
      return doc ? doc.data : null;
    } catch (error) {
      console.error('Firebase get error:', error);
      return null;
    }
  },

  async set(key, value) {
    try {
      const userId = getUserId();
      if (!userId) return false; // Not logged in
      
      const collectionMap = {
        [STORAGE_KEYS.assets]: COLLECTIONS.ASSETS,
        [STORAGE_KEYS.transactions]: COLLECTIONS.TRANSACTIONS,
        [STORAGE_KEYS.personnel]: COLLECTIONS.PERSONNEL,
        [STORAGE_KEYS.settings]: COLLECTIONS.SETTINGS,
        [STORAGE_KEYS.initialized]: COLLECTIONS.SETTINGS
      };
      
      const collection = collectionMap[key];
      if (!collection) return false;
      
      // Use user ID as document ID for data isolation
      await dbService.setDocument(collection, userId, { data: value });
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
  // Sync versions (for backward compatibility)
  get(key) {
    if (useFirebase) {
      return localStorageStorage.get(key);
    }
    return localStorageStorage.get(key);
  },

  set(key, value) {
    if (useFirebase) {
      firebaseStorage.set(key, value).catch(console.error);
    }
    return localStorageStorage.set(key, value);
  },

  // Async versions for proper Firebase support with user isolation
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

export default storage;