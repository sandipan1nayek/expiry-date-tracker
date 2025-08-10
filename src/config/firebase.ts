// Mock Firebase configuration for Expo compatibility
// TODO: Replace with real Firebase imports when backend is ready

// For now, create mock implementations to prevent import errors
console.log('Using mock Firebase config for Expo compatibility');

// Mock Firebase services - matching the original Firebase API structure
export const auth = () => ({
  signInWithEmailAndPassword: (email: string, password: string) => 
    Promise.resolve({ user: { uid: 'mock', email, displayName: 'Mock User' } }),
  createUserWithEmailAndPassword: (email: string, password: string) => 
    Promise.resolve({ user: { uid: 'mock', email, displayName: 'Mock User' } }),
  signOut: () => Promise.resolve(),
  sendPasswordResetEmail: (email: string) => Promise.resolve(),
  currentUser: { uid: 'mock', email: 'demo@example.com', displayName: 'Mock User' },
  onAuthStateChanged: (callback: any) => {
    setTimeout(() => callback({ uid: 'mock', email: 'demo@example.com' }), 100);
    return () => {}; // unsubscribe function
  }
});

export const firestore = () => ({
  collection: (path: string) => ({
    add: (data: any) => Promise.resolve({ id: 'mock-id-' + Date.now() }),
    doc: (id: string) => ({
      set: (data: any) => Promise.resolve(),
      update: (data: any) => Promise.resolve(),
      get: () => Promise.resolve({ exists: false, data: () => null }),
      delete: () => Promise.resolve()
    }),
    where: (field: string, operator: string, value: any) => ({
      get: () => Promise.resolve({ docs: [] })
    }),
    get: () => Promise.resolve({ docs: [] })
  }),
  doc: (path: string) => ({
    set: (data: any) => Promise.resolve(),
    update: (data: any) => Promise.resolve(),
    get: () => Promise.resolve({ exists: false, data: () => null }),
    delete: () => Promise.resolve()
  })
});

// Mock app
const app = {
  name: 'mock-firebase-app',
  options: {}
};

export default app;

// Original Firebase imports (commented out for Expo compatibility)
/*
import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
// Storage and Messaging will be imported in later phases
// import '@react-native-firebase/storage';
// import '@react-native-firebase/messaging';

// Firebase configuration will be loaded from google-services.json (Android) 
// and GoogleService-Info.plist (iOS) files
// These files should be downloaded from Firebase Console

// Initialize Firebase app
const app = firebase.app();

// Export Firebase services (only enabled ones)
export const auth = firebase.auth;
export const firestore = firebase.firestore;
// export const storage = firebase.storage;  // Will be enabled in Phase 9
// export const messaging = firebase.messaging;  // Will be enabled in Phase 6

export default app;
*/
