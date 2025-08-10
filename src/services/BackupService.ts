import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLiteService from './SQLiteService';
import { LocalProduct } from '../types';
import { STORAGE_KEYS } from '../constants';

export interface BackupData {
  version: string;
  timestamp: string;
  products: LocalProduct[];
  settings: any;
  metadata: {
    deviceId: string;
    appVersion: string;
    totalProducts: number;
  };
}

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
  version: string;
}

class BackupService {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly BACKUP_KEY = 'app_backup_data';

  /**
   * Create a complete backup of all app data
   */
  static async createBackup(): Promise<{ success: boolean; backupData?: BackupData; error?: string }> {
    try {
      // Get all products from SQLite
      const products = await SQLiteService.getAllProducts();
      
      // Get app settings from AsyncStorage
      const settings = await this.getStoredSettings();

      // Create backup data structure
      const backupData: BackupData = {
        version: this.CURRENT_VERSION,
        timestamp: new Date().toISOString(),
        products: products,
        settings: settings,
        metadata: {
          deviceId: await this.getDeviceId(),
          appVersion: this.CURRENT_VERSION,
          totalProducts: products.length,
        },
      };

      // Store backup in AsyncStorage
      await AsyncStorage.setItem(this.BACKUP_KEY, JSON.stringify(backupData));

      console.log('Backup created successfully:', {
        timestamp: backupData.timestamp,
        productCount: products.length,
      });

      return { success: true, backupData };
    } catch (error: any) {
      console.error('Failed to create backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore data from backup
   */
  static async restoreFromBackup(backupData: BackupData): Promise<{ success: boolean; restored: number; error?: string }> {
    try {
      // Validate backup data
      if (!this.validateBackupData(backupData)) {
        return { success: false, restored: 0, error: 'Invalid backup data format' };
      }

      // Clear existing data (optional - could be made configurable)
      await SQLiteService.clearAllProducts();

      // Restore products
      let restoredCount = 0;
      for (const product of backupData.products) {
        try {
          await SQLiteService.insertProduct(product);
          restoredCount++;
        } catch (error) {
          console.warn('Failed to restore product:', product.name, error);
        }
      }

      // Restore settings
      await this.restoreSettings(backupData.settings);

      console.log('Backup restored successfully:', {
        restoredProducts: restoredCount,
        totalInBackup: backupData.products.length,
      });

      return { success: true, restored: restoredCount };
    } catch (error: any) {
      console.error('Failed to restore backup:', error);
      return { success: false, restored: 0, error: error.message };
    }
  }

  /**
   * Get stored backup data
   */
  static async getStoredBackup(): Promise<BackupData | null> {
    try {
      const backupString = await AsyncStorage.getItem(this.BACKUP_KEY);
      if (!backupString) return null;

      return JSON.parse(backupString) as BackupData;
    } catch (error) {
      console.error('Failed to get stored backup:', error);
      return null;
    }
  }

  /**
   * Export backup data as JSON string (for sharing/external storage)
   */
  static async exportBackupData(): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const result = await this.createBackup();
      if (!result.success || !result.backupData) {
        return { success: false, error: result.error };
      }

      const exportData = JSON.stringify(result.backupData, null, 2);
      return { success: true, data: exportData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Import backup data from JSON string
   */
  static async importBackupData(jsonData: string): Promise<{ success: boolean; restored: number; error?: string }> {
    try {
      const backupData: BackupData = JSON.parse(jsonData);
      return await this.restoreFromBackup(backupData);
    } catch (error: any) {
      return { success: false, restored: 0, error: 'Invalid backup file format' };
    }
  }

  /**
   * Migrate data from older versions
   */
  static async migrateData(fromVersion: string = '0.0.0'): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedCount: 0,
      errors: [],
      version: this.CURRENT_VERSION,
    };

    try {
      console.log(`Starting migration from version ${fromVersion} to ${this.CURRENT_VERSION}`);

      // Get current data version
      const currentDataVersion = await AsyncStorage.getItem('data_version');
      
      if (currentDataVersion === this.CURRENT_VERSION) {
        result.success = true;
        console.log('Data is already up to date');
        return result;
      }

      // Migration logic for different versions
      if (this.shouldMigrateFrom(fromVersion, '0.0.0')) {
        await this.migrateFromV0_0_0();
        result.migratedCount++;
      }

      if (this.shouldMigrateFrom(fromVersion, '0.5.0')) {
        await this.migrateFromV0_5_0();
        result.migratedCount++;
      }

      // Update data version
      await AsyncStorage.setItem('data_version', this.CURRENT_VERSION);
      
      result.success = true;
      console.log('Migration completed successfully');
      
    } catch (error: any) {
      console.error('Migration failed:', error);
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Check if automatic backup is needed
   */
  static async checkAndCreateAutoBackup(): Promise<boolean> {
    try {
      const lastBackupTime = await AsyncStorage.getItem('last_auto_backup');
      const now = new Date().getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000; // 24 hours

      if (!lastBackupTime || (now - parseInt(lastBackupTime)) > oneDayInMs) {
        const result = await this.createBackup();
        if (result.success) {
          await AsyncStorage.setItem('last_auto_backup', now.toString());
          console.log('Automatic backup created');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Auto backup failed:', error);
      return false;
    }
  }

  // Private helper methods

  private static validateBackupData(data: BackupData): boolean {
    return !!(
      data.version &&
      data.timestamp &&
      Array.isArray(data.products) &&
      data.metadata
    );
  }

  private static async getStoredSettings(): Promise<any> {
    try {
      const settings = {};
      const keys = [
        STORAGE_KEYS.THEME_PREFERENCE,
        STORAGE_KEYS.LAST_SYNC,
        'notification_settings',
        'app_preferences',
      ];

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          (settings as any)[key] = value;
        }
      }

      return settings;
    } catch (error) {
      console.error('Failed to get stored settings:', error);
      return {};
    }
  }

  private static async restoreSettings(settings: any): Promise<void> {
    try {
      for (const [key, value] of Object.entries(settings)) {
        if (typeof value === 'string') {
          await AsyncStorage.setItem(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to restore settings:', error);
    }
  }

  private static async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      return 'unknown_device';
    }
  }

  private static shouldMigrateFrom(currentVersion: string, targetVersion: string): boolean {
    // Simple version comparison - in production, use a proper semver library
    return currentVersion <= targetVersion;
  }

  private static async migrateFromV0_0_0(): Promise<void> {
    // Migration logic for version 0.0.0 to current
    console.log('Migrating from v0.0.0 - Initial data setup');
    
    // Example: Convert old product format to new format
    const oldProducts = await AsyncStorage.getItem('old_products');
    if (oldProducts) {
      const products = JSON.parse(oldProducts);
      for (const product of products) {
        // Convert old format to new LocalProduct format
        const newProduct: Partial<LocalProduct> = {
          localId: product.id || ('old_' + Date.now()),
          name: product.name,
          category: product.category || 'Other',
          expiryDate: product.expiry || product.expiryDate,
          quantity: product.quantity || 1,
          unit: product.unit || 'pcs',
          isFinished: product.isFinished || false,
          syncStatus: 'pending',
          userId: 'migrated_user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await SQLiteService.insertProduct(newProduct as LocalProduct);
      }

      // Remove old data
      await AsyncStorage.removeItem('old_products');
    }
  }

  private static async migrateFromV0_5_0(): Promise<void> {
    // Migration logic for version 0.5.0 to current
    console.log('Migrating from v0.5.0 - Adding new fields');
    
    // Example: Add new fields to existing products
    const products = await SQLiteService.getAllProducts();
    for (const product of products) {
      if (!product.brand) {
        await SQLiteService.updateProduct(product.localId, {
          ...product,
          brand: '',
          location: '',
          notes: product.notes || '',
        });
      }
    }
  }
}

export default BackupService;
