import DatabaseService from './DatabaseService';
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
      await DatabaseService.initDatabase();
      const products = await DatabaseService.getAllProducts();
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
      await DatabaseService.initDatabase();
      
      const now = new Date().toISOString();
      const product: LocalProduct = {
        ...productData,
        localId: generateUUID(),
        syncStatus: 'synced', // For demo purposes, immediately synced
        createdAt: now,
        updatedAt: now,
      };

      const productId = await DatabaseService.insertProduct(product);
      const savedProduct = { ...product, localId: productId };
      console.log('Product inserted successfully:', savedProduct.name);
      
      // Schedule notifications for expiry reminders
      try {
        await NotificationService.scheduleMultipleReminders(savedProduct);
      } catch (error) {
        console.warn('Failed to schedule notifications:', error);
      }
      
      return {
        success: true,
        data: savedProduct,
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
      await DatabaseService.initDatabase();
      await DatabaseService.updateProduct(localId, updates);
      
      // Get the updated product
      const allProducts = await DatabaseService.getAllProducts();
      const updatedProduct = allProducts.find(p => p.localId === localId);
      
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
      await DatabaseService.initDatabase();
      
      // Cancel any scheduled notifications for this product
      try {
        await NotificationService.cancelExpiryReminder(localId);
      } catch (error) {
        console.warn('Failed to cancel notifications:', error);
      }
      
      await DatabaseService.deleteProduct(localId);
      
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
      await DatabaseService.initDatabase();
      const products = await DatabaseService.searchProducts(query);
      
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
      await DatabaseService.initDatabase();
      const products = await DatabaseService.getExpiredProducts();
      
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
      await DatabaseService.initDatabase();
      const products = await DatabaseService.getExpiringProducts(days);
      
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
      await DatabaseService.initDatabase();
      const products = await DatabaseService.getProductsByCategory(category);
      
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
      await DatabaseService.initDatabase();
      const allProducts = await DatabaseService.getAllProducts();
      const product = allProducts.find(p => p.localId === localId);
      
      return {
        success: true,
        data: product || null,
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
      await DatabaseService.initDatabase();
      const allProducts = await DatabaseService.getAllProducts();
      const pendingProducts = allProducts.filter(p => p.syncStatus === 'pending');
      
      return {
        success: true,
        data: pendingProducts,
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
      await DatabaseService.initDatabase();
      const updateData: Partial<LocalProduct> = { 
        syncStatus: 'synced',
        updatedAt: new Date().toISOString()
      };
      
      // If we had a cloud ID, we would store it in the id field
      if (cloudId) {
        updateData.id = cloudId;
      }
      
      await DatabaseService.updateProduct(localId, updateData);
      
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
      await DatabaseService.initDatabase();
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
          await this.markProductAsSynced(product.localId);
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
      await DatabaseService.initDatabase();
      const pendingResult = await this.getPendingSyncProducts();
      const pendingCount = pendingResult.success && pendingResult.data ? pendingResult.data.length : 0;
      
      return {
        isOnline: true, // For demo purposes
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
      await DatabaseService.initDatabase();
      await DatabaseService.clearAllProducts();
      
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
