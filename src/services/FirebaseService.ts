import { auth, firestore } from '../config/firebase';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export class FirebaseService {
  // Auth methods
  static async signInWithEmailAndPassword(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
    return auth().signInWithEmailAndPassword(email, password);
  }

  static async createUserWithEmailAndPassword(email: string, password: string): Promise<FirebaseAuthTypes.UserCredential> {
    return auth().createUserWithEmailAndPassword(email, password);
  }

  static async signOut(): Promise<void> {
    return auth().signOut();
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    return auth().sendPasswordResetEmail(email);
  }

  static getCurrentUser(): FirebaseAuthTypes.User | null {
    return auth().currentUser;
  }

  static onAuthStateChanged(callback: (user: FirebaseAuthTypes.User | null) => void) {
    return auth().onAuthStateChanged(callback);
  }

  // Firestore methods
  static getFirestore() {
    return firestore();
  }

  static collection(path: string): FirebaseFirestoreTypes.CollectionReference {
    return firestore().collection(path);
  }

  static doc(path: string): FirebaseFirestoreTypes.DocumentReference {
    return firestore().doc(path);
  }

  // Storage methods (will be implemented in Phase 9)
  /*
  static getStorage() {
    return storage();
  }

  static storageRef(path?: string) {
    return storage().ref(path);
  }
  */

  // Messaging methods (will be implemented in Phase 6)
  /*
  static async getMessaging() {
    return messaging();
  }

  static async requestPermission(): Promise<boolean> {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  }

  static async getToken(): Promise<string> {
    return messaging().getToken();
  }
  */
}

export default FirebaseService;
