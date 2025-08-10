// Mock Firebase Service for Expo compatibility
// This replaces the real Firebase service during Expo development
// TODO: Replace with real Firebase service when backend is ready

export interface MockUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  metadata: {
    creationTime: string;
  };
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
}

export class MockFirebaseService {
  // Auth methods
  static async signInWithEmailAndPassword(email: string, password: string): Promise<{ user: MockUser }> {
    console.log('Mock Firebase: signInWithEmailAndPassword called');
    return {
      user: {
        uid: 'mock-user-123',
        email,
        displayName: 'Mock User',
        metadata: {
          creationTime: new Date().toISOString()
        },
        updateProfile: async (updates) => {
          console.log('Mock updateProfile called with:', updates);
        }
      }
    };
  }

  static async createUserWithEmailAndPassword(email: string, password: string): Promise<{ user: MockUser }> {
    console.log('Mock Firebase: createUserWithEmailAndPassword called');
    return {
      user: {
        uid: 'mock-user-123',
        email,
        displayName: 'Mock User',
        metadata: {
          creationTime: new Date().toISOString()
        },
        updateProfile: async (updates) => {
          console.log('Mock updateProfile called with:', updates);
        }
      }
    };
  }

  static async signOut(): Promise<void> {
    console.log('Mock Firebase: signOut called');
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    console.log('Mock Firebase: sendPasswordResetEmail called for', email);
  }

  static getCurrentUser(): MockUser | null {
    console.log('Mock Firebase: getCurrentUser called');
    return {
      uid: 'mock-user-123',
      email: 'demo@example.com',
      displayName: 'Mock User',
      metadata: {
        creationTime: new Date().toISOString()
      },
      updateProfile: async (updates) => {
        console.log('Mock updateProfile called with:', updates);
      }
    };
  }

  static onAuthStateChanged(callback: (user: MockUser | null) => void): () => void {
    console.log('Mock Firebase: onAuthStateChanged called');
    // Simulate auth state
    setTimeout(() => callback(this.getCurrentUser()), 100);
    return () => {}; // Unsubscribe function
  }

  // Firestore methods
  static doc(path: string) {
    console.log('Mock Firebase: doc called for path', path);
    return {
      set: async (data: any) => {
        console.log('Mock Firebase: doc.set called with', data);
      },
      update: async (data: any) => {
        console.log('Mock Firebase: doc.update called with', data);
      },
      get: async () => {
        console.log('Mock Firebase: doc.get called');
        return {
          exists: true,
          data: () => ({ mockData: true })
        };
      }
    };
  }

  static collection(path: string) {
    console.log('Mock Firebase: collection called for path', path);
    return {
      add: async (data: any) => {
        console.log('Mock Firebase: collection.add called with', data);
        return { id: 'mock-doc-id-' + Date.now() };
      },
      where: () => ({
        get: async () => ({
          docs: []
        })
      })
    };
  }

  // Product sync methods
  static async addDocument(collection: string, data: any): Promise<{ id: string }> {
    console.log('Mock Firebase: addDocument called', { collection, data });
    return { id: 'mock-doc-id-' + Date.now() };
  }

  static async updateDocument(collection: string, id: string, data: any): Promise<void> {
    console.log('Mock Firebase: updateDocument called', { collection, id, data });
  }

  static async deleteDocument(collection: string, id: string): Promise<void> {
    console.log('Mock Firebase: deleteDocument called', { collection, id });
  }

  static async getDocument(collection: string, id: string): Promise<any> {
    console.log('Mock Firebase: getDocument called', { collection, id });
    return { id, mockData: true };
  }

  static async getCollection(collection: string): Promise<any[]> {
    console.log('Mock Firebase: getCollection called', collection);
    return [];
  }
}

export default MockFirebaseService;
