import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// Firebase configuration - replace with your own config from Firebase Console
// For production, use environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Database collection names
export const COLLECTIONS = {
  SETTINGS: 'settings',
  ASSETS: 'assets',
  TRANSACTIONS: 'transactions',
  PERSONNEL: 'personnel'
};

// Generic CRUD operations
export const dbService = {
  // Get a single document
  async getDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error(`Error getting document from ${collectionName}:`, error);
      throw error;
    }
  },

  // Set or update a document
  async setDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, data, { merge: true });
      return { id: docId, ...data };
    } catch (error) {
      console.error(`Error setting document in ${collectionName}:`, error);
      throw error;
    }
  },

  // Update a document
  async updateDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, data);
      return { id: docId, ...data };
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error);
      throw error;
    }
  },

  // Delete a document
  async deleteDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error);
      throw error;
    }
  },

  // Subscribe to real-time updates
  subscribeToCollection(collectionName, callback) {
    try {
      const colRef = collection(db, collectionName);
      return onSnapshot(colRef, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(docs);
      });
    } catch (error) {
      console.error(`Error subscribing to ${collectionName}:`, error);
      throw error;
    }
  }
};

export { db };
export default app;