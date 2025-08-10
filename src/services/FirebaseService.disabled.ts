// FirebaseService temporarily disabled for Expo compatibility
// This entire service will be re-enabled when the backend is ready
// All Firebase functionality is currently mocked in MockFirebaseService

// TODO: Re-enable when integrating with real Firebase backend
// Original FirebaseService.ts has been temporarily disabled to prevent Expo runtime errors

console.log('FirebaseService is temporarily disabled for Expo compatibility');

export class FirebaseService {
  static async signInWithEmailAndPassword() {
    throw new Error('FirebaseService is disabled. Use MockFirebaseService instead.');
  }

  static async createUserWithEmailAndPassword() {
    throw new Error('FirebaseService is disabled. Use MockFirebaseService instead.');
  }

  static async signOut() {
    throw new Error('FirebaseService is disabled. Use MockFirebaseService instead.');
  }

  static getCurrentUser() {
    throw new Error('FirebaseService is disabled. Use MockFirebaseService instead.');
  }

  static onAuthStateChanged() {
    throw new Error('FirebaseService is disabled. Use MockFirebaseService instead.');
  }

  // All other methods similarly disabled
  static doc() { throw new Error('FirebaseService is disabled.'); }
  static collection() { throw new Error('FirebaseService is disabled.'); }
  static addDocument() { throw new Error('FirebaseService is disabled.'); }
  static updateDocument() { throw new Error('FirebaseService is disabled.'); }
  static deleteDocument() { throw new Error('FirebaseService is disabled.'); }
  static getDocument() { throw new Error('FirebaseService is disabled.'); }
  static getCollection() { throw new Error('FirebaseService is disabled.'); }
  static queryCollection() { throw new Error('FirebaseService is disabled.'); }
}

export default FirebaseService;
