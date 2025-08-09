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
