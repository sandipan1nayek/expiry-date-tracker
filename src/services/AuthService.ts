import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import FirebaseService from './FirebaseService';
import StorageService, { StoredAuthData } from './StorageService';
import { User, ApiResponse } from '../types';

export interface AuthResult {
  user: User;
  isNewUser?: boolean;
}

export class AuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string, rememberMe: boolean = true): Promise<ApiResponse<AuthResult>> {
    try {
      const userCredential = await FirebaseService.signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;
      
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      };

      // Save auth data to local storage if remember me is enabled
      if (rememberMe) {
        await this.saveAuthData(user, true);
      }

      return {
        success: true,
        data: { user },
        message: 'Successfully signed in',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Sign in failed',
      };
    }
  }

  /**
   * Sign up with email and password
   */
  static async signUp(email: string, password: string, displayName?: string): Promise<ApiResponse<AuthResult>> {
    try {
      const userCredential = await FirebaseService.createUserWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      // Update display name if provided
      if (displayName) {
        await firebaseUser.updateProfile({
          displayName: displayName,
        });
      }

      // Create user profile in Firestore
      await this.createUserProfile(firebaseUser.uid, {
        email: firebaseUser.email!,
        displayName: displayName || firebaseUser.displayName || undefined,
        createdAt: new Date().toISOString(),
      });

      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: displayName || firebaseUser.displayName || undefined,
        photoURL: firebaseUser.photoURL || undefined,
        createdAt: new Date().toISOString(),
      };

      // Save auth data for new user
      await this.saveAuthData(user, true);

      return {
        success: true,
        data: { user, isNewUser: true },
        message: 'Account created successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.getAuthErrorMessage(error.code) || error.message || 'Sign up failed',
      };
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<ApiResponse<void>> {
    try {
      await FirebaseService.signOut();
      // Clear stored authentication data
      await this.clearStoredAuthData();
      return {
        success: true,
        message: 'Successfully signed out',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Sign out failed',
      };
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string): Promise<ApiResponse<void>> {
    try {
      await FirebaseService.sendPasswordResetEmail(email);
      return {
        success: true,
        message: 'Password reset email sent',
      };
    } catch (error: any) {
      return {
        success: false,
        error: this.getAuthErrorMessage(error.code) || error.message || 'Failed to send reset email',
      };
    }
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    const firebaseUser = FirebaseService.getCurrentUser();
    if (!firebaseUser) return null;

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    };
  }

  /**
   * Listen for authentication state changes
   */
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return FirebaseService.onAuthStateChanged((firebaseUser: FirebaseAuthTypes.User | null) => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: { displayName?: string; photoURL?: string }): Promise<ApiResponse<User>> {
    try {
      const firebaseUser = FirebaseService.getCurrentUser();
      if (!firebaseUser) {
        return {
          success: false,
          error: 'No authenticated user',
        };
      }

      await firebaseUser.updateProfile(updates);

      // Update user profile in Firestore
      await this.updateUserProfile(firebaseUser.uid, updates);

      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: updates.displayName || firebaseUser.displayName || undefined,
        photoURL: updates.photoURL || firebaseUser.photoURL || undefined,
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      };

      return {
        success: true,
        data: user,
        message: 'Profile updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  }

  /**
   * Create user profile in Firestore
   */
  private static async createUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    try {
      await FirebaseService.doc(`users/${userId}`).set({
        ...userData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Don't throw error as this is not critical for auth flow
    }
  }

  /**
   * Update user profile in Firestore
   */
  private static async updateUserProfile(userId: string, userData: Partial<User>): Promise<void> {
    try {
      await FirebaseService.doc(`users/${userId}`).update({
        ...userData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      // Don't throw error as this is not critical for auth flow
    }
  }

  /**
   * Get user-friendly error messages for Firebase auth errors
   */
  private static getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return 'Authentication failed. Please try again';
    }
  }

  /**
   * Check if email is valid format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if password meets requirements
   */
  static isValidPassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 6) {
      return { valid: false, message: 'Password must be at least 6 characters long' };
    }
    return { valid: true };
  }

  /**
   * Validate signup form
   */
  static validateSignupForm(email: string, password: string, confirmPassword: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    if (!password) {
      errors.push('Password is required');
    } else {
      const passwordValidation = this.isValidPassword(password);
      if (!passwordValidation.valid) {
        errors.push(passwordValidation.message!);
      }
    }

    if (!confirmPassword) {
      errors.push('Please confirm your password');
    } else if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate login form
   */
  static validateLoginForm(email: string, password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!email) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(email)) {
      errors.push('Please enter a valid email address');
    }

    if (!password) {
      errors.push('Password is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Save authentication data to local storage
   */
  static async saveAuthData(user: User, isAuthenticated: boolean): Promise<void> {
    try {
      const authData: StoredAuthData = {
        user,
        isAuthenticated,
        lastLoginAt: new Date().toISOString(),
      };
      await StorageService.saveAuthData(authData);
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }

  /**
   * Get stored authentication data
   */
  static async getStoredAuthData(): Promise<StoredAuthData | null> {
    try {
      return await StorageService.getAuthData();
    } catch (error) {
      console.error('Error getting stored auth data:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication data
   */
  static async clearStoredAuthData(): Promise<void> {
    try {
      await StorageService.clearAuthData();
    } catch (error) {
      console.error('Error clearing stored auth data:', error);
    }
  }

  /**
   * Check if user should be automatically signed in
   */
  static async shouldAutoSignIn(): Promise<boolean> {
    try {
      const storedData = await this.getStoredAuthData();
      if (!storedData || !storedData.isAuthenticated) {
        return false;
      }

      // Check if login is not too old (30 days)
      const lastLogin = new Date(storedData.lastLoginAt);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return lastLogin > thirtyDaysAgo;
    } catch (error) {
      console.error('Error checking auto sign in:', error);
      return false;
    }
  }
}

export default AuthService;
