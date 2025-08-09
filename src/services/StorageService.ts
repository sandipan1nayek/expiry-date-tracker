import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const AUTH_STORAGE_KEY = '@expiry_tracker_auth';
const USER_PREFERENCES_KEY = '@expiry_tracker_preferences';

export interface StoredAuthData {
  user: User | null;
  isAuthenticated: boolean;
  lastLoginAt: string;
}

export interface UserPreferences {
  rememberMe: boolean;
  biometricEnabled: boolean;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark';
}

class StorageService {
  /**
   * Save authentication data to local storage
   */
  static async saveAuthData(authData: StoredAuthData): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }

  /**
   * Get authentication data from local storage
   */
  static async getAuthData(): Promise<StoredAuthData | null> {
    try {
      const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting auth data:', error);
      return null;
    }
  }

  /**
   * Clear authentication data from local storage
   */
  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const data = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return null;
    }
  }

  /**
   * Clear all app data
   */
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([AUTH_STORAGE_KEY, USER_PREFERENCES_KEY]);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }

  /**
   * Get app info for debugging
   */
  static async getStorageInfo(): Promise<{ keys: readonly string[]; size: string }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const data = await AsyncStorage.multiGet(keys);
      const size = JSON.stringify(data).length;
      
      return {
        keys,
        size: `${(size / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { keys: [], size: '0 KB' };
    }
  }
}

export default StorageService;
