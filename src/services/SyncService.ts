import SQLiteService from './SQLiteService';
import NotificationService from './NotificationService';
import { LocalProduct } from '../types';
import { generateUUID } from '../utils/uuid';

export interface SyncResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt: string | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

class SyncService {
  async getAllProducts(): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.getAllProducts();
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get all products',
      };
    }
  }

  async addProduct(productData: Omit<LocalProduct, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt'>): Promise<SyncResult<LocalProduct>> {
    try {
      await SQLiteService.initDatabase();
      
      const now = new Date().toISOString();
      const product: LocalProduct = {
        ...productData,
        localId: generateUUID(),
        syncStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      await SQLiteService.insertProduct(product);
      console.log('Product inserted successfully:', product.name);
      
      // Schedule notifications for expiry reminders
      try {
        await NotificationService.scheduleMultipleReminders(product);
      } catch (error) {
        console.warn('Failed to schedule notifications:', error);
      }
      
      // Mark as synced for demo purposes
      await SQLiteService.markProductAsSynced(product.localId);
      console.log('Product marked as synced');
      
      return {
        success: true,
        data: product,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add product',
      };
    }
  }

  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<SyncResult<LocalProduct>> {
    try {
      await SQLiteService.initDatabase();
      await SQLiteService.updateProduct(localId, updates);
      
      const updatedProduct = await SQLiteService.getProductById(localId);
      if (!updatedProduct) {
        return {
          success: false,
          error: 'Product not found after update',
        };
      }

      // If expiry date was updated, reschedule notifications
      if (updates.expiryDate) {
        try {
          await NotificationService.cancelExpiryReminder(localId);
          await NotificationService.scheduleMultipleReminders(updatedProduct);
        } catch (error) {
          console.warn('Failed to reschedule notifications:', error);
        }
      }

      return {
        success: true,
        data: updatedProduct,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update product',
      };
    }
  }

  async deleteProduct(localId: string): Promise<SyncResult<void>> {
    try {
      await SQLiteService.initDatabase();
      
      // Cancel any scheduled notifications for this product
      try {
        await NotificationService.cancelExpiryReminder(localId);
      } catch (error) {
        console.warn('Failed to cancel notifications:', error);
      }
      
      await SQLiteService.deleteProduct(localId);
      
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete product',
      };
    }
  }

  async searchProducts(query: string): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.searchProducts(query);
      
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search products',
      };
    }
  }

  async getExpiredProducts(): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.getExpiredProducts();
      
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get expired products',
      };
    }
  }

  async getExpiringProducts(days: number = 7): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.getExpiringProducts(days);
      
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get expiring products',
      };
    }
  }

  async getProductsByCategory(category: string): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.getProductsByCategory(category);
      
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get products by category',
      };
    }
  }

  async getProductById(localId: string): Promise<SyncResult<LocalProduct | null>> {
    try {
      await SQLiteService.initDatabase();
      const product = await SQLiteService.getProductById(localId);
      
      return {
        success: true,
        data: product,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get product',
      };
    }
  }

  async getPendingSyncProducts(): Promise<SyncResult<LocalProduct[]>> {
    try {
      await SQLiteService.initDatabase();
      const products = await SQLiteService.getPendingSyncProducts();
      
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get pending sync products',
      };
    }
  }

  async markProductAsSynced(localId: string, cloudId?: string): Promise<SyncResult<void>> {
    try {
      await SQLiteService.initDatabase();
      await SQLiteService.markProductAsSynced(localId, cloudId);
      
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark product as synced',
      };
    }
  }

  async performFullSync(): Promise<SyncResult<{ 
    syncedProducts: number; 
    errors: string[]; 
  }>> {
    try {
      await SQLiteService.initDatabase();
      const pendingResult = await this.getPendingSyncProducts();
      if (!pendingResult.success || !pendingResult.data) {
        return {
          success: false,
          error: 'Failed to get pending products for sync',
        };
      }

      const pendingProducts = pendingResult.data;
      
      // For demo purposes, mark all pending products as synced
      let syncedCount = 0;
      const errors: string[] = [];

      for (const product of pendingProducts) {
        try {
          await SQLiteService.markProductAsSynced(product.localId);
          syncedCount++;
        } catch (error: any) {
          errors.push(`Failed to sync ${product.name}: ${error.message}`);
        }
      }

      return {
        success: true,
        data: {
          syncedProducts: syncedCount,
          errors,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to perform full sync',
      };
    }
  }

  async getSyncStatus(): Promise<SyncStatus> {
    try {
      await SQLiteService.initDatabase();
      const pendingResult = await this.getPendingSyncProducts();
      const pendingCount = pendingResult.success && pendingResult.data ? pendingResult.data.length : 0;
      
      return {
        isOnline: true, // For demo purposes - always offline
        lastSyncAt: new Date().toISOString(),
        pendingChanges: pendingCount,
        syncInProgress: false,
      };
    } catch (error) {
      return {
        isOnline: false,
        lastSyncAt: null,
        pendingChanges: 0,
        syncInProgress: false,
      };
    }
  }

  async clearAllProducts(): Promise<SyncResult<void>> {
    try {
      await SQLiteService.initDatabase();
      await SQLiteService.clearAllProducts();
      
      // Cancel all notifications
      try {
        await NotificationService.cancelAllNotifications();
      } catch (error) {
        console.warn('Failed to cancel notifications:', error);
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to clear all products',
      };
    }
  }
}

export default new SyncService();
