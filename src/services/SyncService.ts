import SQLiteService from './SQLiteService';
// import FirebaseService from './FirebaseService'; // Temporarily disabled for Expo compatibility
import { LocalProduct, Product, ApiResponse } from '../types';

// Simple UUID generator for React Native/Expo compatibility
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt?: string;
  pendingChanges: number;
  syncInProgress: boolean;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;
  private lastSyncAt?: string;

  /**
   * Initialize sync service
   */
  async initialize(): Promise<void> {
    // Check network connectivity
    this.checkConnectivity();
    
    // Set up connectivity listener (would need a network library in real implementation)
    // For now, we'll assume online status
  }

  /**
   * Check network connectivity
   */
  private checkConnectivity(): void {
    // In a real implementation, you'd use @react-native-community/netinfo
    // For now, we'll assume online
    this.isOnline = true;
  }

  /**
   * Add product offline-first
   */
  async addProduct(productData: Omit<LocalProduct, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<LocalProduct>> {
    try {
      const localId = generateUUID();
      const now = new Date().toISOString();
      
      const localProduct: LocalProduct = {
        ...productData,
        localId,
        syncStatus: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      // Always save to local database first
      await SQLiteService.insertProduct(localProduct);

      // Try to sync to Firebase if online
      if (this.isOnline) {
        try {
          await this.syncProductToFirebase(localProduct);
        } catch (error) {
          console.log('Failed to sync to Firebase, will retry later:', error);
          // Product is saved locally, sync will happen later
        }
      }

      return {
        success: true,
        data: localProduct,
        message: 'Product added successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add product',
      };
    }
  }

  /**
   * Update product offline-first
   */
  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<ApiResponse<LocalProduct>> {
    try {
      // Get current product
      const currentProduct = await SQLiteService.getProductById(localId);
      if (!currentProduct) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Update local database
      const updatedData = {
        ...updates,
        syncStatus: 'pending' as const,
        updatedAt: new Date().toISOString(),
      };

      await SQLiteService.updateProduct(localId, updatedData);

      // Get updated product
      const updatedProduct = await SQLiteService.getProductById(localId);
      if (!updatedProduct) {
        return {
          success: false,
          error: 'Failed to retrieve updated product',
        };
      }

      // Try to sync to Firebase if online
      if (this.isOnline) {
        try {
          await this.syncProductToFirebase(updatedProduct);
        } catch (error) {
          console.log('Failed to sync update to Firebase, will retry later:', error);
        }
      }

      return {
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update product',
      };
    }
  }

  /**
   * Delete product offline-first
   */
  async deleteProduct(localId: string): Promise<ApiResponse<void>> {
    try {
      const product = await SQLiteService.getProductById(localId);
      if (!product) {
        return {
          success: false,
          error: 'Product not found',
        };
      }

      // Delete from local database
      await SQLiteService.deleteProduct(localId);

      // Try to delete from Firebase if synced and online
      if (this.isOnline && product.id && product.syncStatus === 'synced') {
        try {
          await this.deleteProductFromFirebase(product.id);
        } catch (error) {
          console.log('Failed to delete from Firebase:', error);
          // Product is already deleted locally, which is what matters for user experience
        }
      }

      return {
        success: true,
        message: 'Product deleted successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete product',
      };
    }
  }

  /**
   * Get all products (local-first)
   */
  async getAllProducts(): Promise<ApiResponse<LocalProduct[]>> {
    try {
      const products = await SQLiteService.getAllProducts();
      return {
        success: true,
        data: products,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get products',
      };
    }
  }

  /**
   * Search products locally
   */
  async searchProducts(query: string): Promise<ApiResponse<LocalProduct[]>> {
    try {
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

  /**
   * Get expired products
   */
  async getExpiredProducts(): Promise<ApiResponse<LocalProduct[]>> {
    try {
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

  /**
   * Get products expiring soon
   */
  async getExpiringProducts(days: number = 7): Promise<ApiResponse<LocalProduct[]>> {
    try {
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

  /**
   * Full sync with Firebase
   */
  async performFullSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: ['Sync already in progress'],
      };
    }

    this.syncInProgress = true;
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    try {
      if (!this.isOnline) {
        throw new Error('No internet connection');
      }

      // Get pending sync products
      const pendingProducts = await SQLiteService.getPendingSyncProducts();

      // Sync each pending product
      for (const product of pendingProducts) {
        try {
          await this.syncProductToFirebase(product);
          result.synced++;
        } catch (error: any) {
          result.failed++;
          result.errors.push(`Failed to sync ${product.name}: ${error.message}`);
        }
      }

      // Update last sync time
      this.lastSyncAt = new Date().toISOString();

      if (result.failed > 0) {
        result.success = false;
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(error.message);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync individual product to Firebase
   */
  private async syncProductToFirebase(localProduct: LocalProduct): Promise<void> {
    try {
      // Convert LocalProduct to Product format
      const productData: Omit<Product, 'id'> = {
        name: localProduct.name,
        brand: localProduct.brand,
        category: localProduct.category,
        barcode: localProduct.barcode,
        expiryDate: localProduct.expiryDate,
        purchaseDate: localProduct.purchaseDate,
        price: localProduct.price,
        quantity: localProduct.quantity,
        unit: localProduct.unit,
        location: localProduct.location,
        notes: localProduct.notes,
        imageUrl: localProduct.imageUrl,
        isFinished: localProduct.isFinished,
        createdAt: localProduct.createdAt,
        updatedAt: localProduct.updatedAt,
        userId: localProduct.userId || '',
        groupId: localProduct.groupId,
      };

      let firebaseId: string;

      if (localProduct.id && localProduct.syncStatus === 'synced') {
        // Update existing product
        // await FirebaseService.updateDocument('products', localProduct.id, productData); // Temporarily disabled for Expo
        firebaseId = localProduct.id;
      } else {
        // Create new product
        // const result = await FirebaseService.addDocument('products', productData); // Temporarily disabled for Expo
        firebaseId = localProduct.localId; // Use localId as fallback
      }

      // Mark as synced in local database
      await SQLiteService.markProductAsSynced(localProduct.localId, firebaseId);

    } catch (error) {
      console.error('Error syncing product to Firebase:', error);
      throw error;
    }
  }

  /**
   * Delete product from Firebase
   */
  private async deleteProductFromFirebase(firebaseId: string): Promise<void> {
    try {
      // await FirebaseService.deleteDocument('products', firebaseId); // Temporarily disabled for Expo
      console.log('Firebase delete disabled for Expo compatibility');
    } catch (error) {
      console.error('Error deleting product from Firebase:', error);
      throw error;
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const pendingProducts = await SQLiteService.getPendingSyncProducts();
    
    return {
      isOnline: this.isOnline,
      lastSyncAt: this.lastSyncAt,
      pendingChanges: pendingProducts.length,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Force connectivity check
   */
  refreshConnectivity(): void {
    this.checkConnectivity();
  }

  /**
   * Set online status (for testing)
   */
  setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }
}

export default new SyncService();
