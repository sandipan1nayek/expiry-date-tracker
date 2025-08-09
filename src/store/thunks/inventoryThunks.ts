import { createAsyncThunk } from '@reduxjs/toolkit';
import SyncService from '../../services/SyncService';
import SQLiteService from '../../services/SQLiteService';
import { LocalProduct } from '../../types';
import { RootState } from '../store';

// Initialize database
export const initializeDatabase = createAsyncThunk(
  'inventory/initializeDatabase',
  async (_, { rejectWithValue }) => {
    try {
      await SQLiteService.initDatabase();
      return true;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to initialize database');
    }
  }
);

// Load all products
export const loadProducts = createAsyncThunk(
  'inventory/loadProducts',
  async (_, { rejectWithValue }) => {
    try {
      const result = await SyncService.getAllProducts();
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to load products');
      }
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load products');
    }
  }
);

// Add new product
export const addProductThunk = createAsyncThunk(
  'inventory/addProduct',
  async (productData: Omit<LocalProduct, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt'>, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.id;
      
      if (!userId) {
        return rejectWithValue('User not authenticated');
      }

      const result = await SyncService.addProduct({
        ...productData,
        userId,
      });

      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to add product');
      }

      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to add product');
    }
  }
);

// Update product
export const updateProductThunk = createAsyncThunk(
  'inventory/updateProduct',
  async ({ localId, updates }: { localId: string; updates: Partial<LocalProduct> }, { rejectWithValue }) => {
    try {
      const result = await SyncService.updateProduct(localId, updates);
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update product');
      }
      return { localId, updates: result.data! };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update product');
    }
  }
);

// Delete product
export const deleteProductThunk = createAsyncThunk(
  'inventory/deleteProduct',
  async (localId: string, { rejectWithValue }) => {
    try {
      const result = await SyncService.deleteProduct(localId);
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to delete product');
      }
      return localId;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete product');
    }
  }
);

// Search products
export const searchProductsThunk = createAsyncThunk(
  'inventory/searchProducts',
  async (query: string, { rejectWithValue }) => {
    try {
      if (!query.trim()) {
        return [];
      }

      const result = await SyncService.searchProducts(query);
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to search products');
      }
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to search products');
    }
  }
);

// Get expired products
export const getExpiredProductsThunk = createAsyncThunk(
  'inventory/getExpiredProducts',
  async (_, { rejectWithValue }) => {
    try {
      const result = await SyncService.getExpiredProducts();
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to get expired products');
      }
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get expired products');
    }
  }
);

// Get expiring products
export const getExpiringProductsThunk = createAsyncThunk(
  'inventory/getExpiringProducts',
  async (days: number = 7, { rejectWithValue }) => {
    try {
      const result = await SyncService.getExpiringProducts(days);
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to get expiring products');
      }
      return result.data!;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get expiring products');
    }
  }
);

// Get products by category
export const getProductsByCategoryThunk = createAsyncThunk(
  'inventory/getProductsByCategory',
  async (category: string, { rejectWithValue }) => {
    try {
      const products = await SQLiteService.getProductsByCategory(category);
      return products;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get products by category');
    }
  }
);

// Perform full sync
export const performFullSyncThunk = createAsyncThunk(
  'inventory/performFullSync',
  async (_, { rejectWithValue }) => {
    try {
      const result = await SyncService.performFullSync();
      return result;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Sync failed');
    }
  }
);

// Get sync status
export const getSyncStatusThunk = createAsyncThunk(
  'inventory/getSyncStatus',
  async (_, { rejectWithValue }) => {
    try {
      const status = await SyncService.getSyncStatus();
      return status;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get sync status');
    }
  }
);

// Mark product as finished
export const markProductAsFinishedThunk = createAsyncThunk(
  'inventory/markProductAsFinished',
  async ({ localId, isFinished }: { localId: string; isFinished: boolean }, { rejectWithValue }) => {
    try {
      const result = await SyncService.updateProduct(localId, { 
        isFinished,
        updatedAt: new Date().toISOString(),
      });
      
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to update product');
      }
      
      return { localId, isFinished };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update product');
    }
  }
);

// Bulk operations
export const bulkDeleteProductsThunk = createAsyncThunk(
  'inventory/bulkDeleteProducts',
  async (localIds: string[], { rejectWithValue }) => {
    try {
      const results = await Promise.allSettled(
        localIds.map(localId => SyncService.deleteProduct(localId))
      );

      const successfulDeletes: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          successfulDeletes.push(localIds[index]);
        } else {
          const error = result.status === 'rejected' 
            ? result.reason 
            : (result.value as any).error;
          errors.push(`Failed to delete product: ${error}`);
        }
      });

      return { successfulDeletes, errors };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Bulk delete failed');
    }
  }
);

// Export products (for backup/sharing)
export const exportProductsThunk = createAsyncThunk(
  'inventory/exportProducts',
  async (_, { rejectWithValue }) => {
    try {
      const result = await SyncService.getAllProducts();
      if (!result.success) {
        return rejectWithValue(result.error || 'Failed to export products');
      }

      const exportData = {
        products: result.data,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to export products');
    }
  }
);
