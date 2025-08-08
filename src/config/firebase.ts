import firebase from '@react-native-firebase/app';
import '@react-native-firebase/auth';
import '@react-native-firebase/firestore';
import '@react-native-firebase/storage';
import '@react-native-firebase/messaging';

// Firebase configuration will be loaded from google-services.json (Android) 
// and GoogleService-Info.plist (iOS) files
// These files should be downloaded from Firebase Console

// Initialize Firebase app
const app = firebase.app();

// Export Firebase services
export const auth = firebase.auth;
export const firestore = firebase.firestore;
export const storage = firebase.storage;
export const messaging = firebase.messaging;

export default app;
