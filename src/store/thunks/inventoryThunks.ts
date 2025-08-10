import { createAsyncThunk } from '@reduxjs/toolkit';
import DatabaseService from '../../services/DatabaseService';
import { LocalProduct } from '../../types';
import { RootState } from '../store';

// Initialize database
export const initializeDatabase = createAsyncThunk(
  'inventory/initializeDatabase',
  async (_, { rejectWithValue }) => {
    try {
      await DatabaseService.initDatabase();
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
      const products = await DatabaseService.getAllProducts();
      return products;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load products');
    }
  }
);

// Add new product
export const addProductThunk = createAsyncThunk(
  'inventory/addProduct',
  async (productData: Partial<LocalProduct>, { rejectWithValue }) => {
    try {
      const localId = await DatabaseService.insertProduct({
        ...productData,
        userId: 'offline-user',
        syncStatus: 'synced',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Return the complete product
      const products = await DatabaseService.getAllProducts();
      const newProduct = products.find(p => p.localId === localId);
      
      if (!newProduct) {
        throw new Error('Failed to retrieve added product');
      }

      return newProduct;
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
      await DatabaseService.updateProduct(localId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      
      return { localId, updates };
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
      await DatabaseService.deleteProduct(localId);
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
        const allProducts = await DatabaseService.getAllProducts();
        return allProducts;
      }

      const products = await DatabaseService.searchProducts(query);
      return products;
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
      const products = await DatabaseService.getExpiredProducts();
      return products;
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
      const products = await DatabaseService.getExpiringProducts(days);
      return products;
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
      const products = await DatabaseService.getProductsByCategory(category);
      return products;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to get products by category');
    }
  }
);

// Get dashboard data
export const loadDashboardDataThunk = createAsyncThunk(
  'inventory/loadDashboardData',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await DatabaseService.getDashboardStats();
      return stats;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load dashboard data');
    }
  }
);

// Mark product as finished
export const markProductAsFinishedThunk = createAsyncThunk(
  'inventory/markProductAsFinished',
  async ({ localId, isFinished }: { localId: string; isFinished: boolean }, { rejectWithValue }) => {
    try {
      await DatabaseService.updateProduct(localId, { 
        isFinished,
        updatedAt: new Date().toISOString(),
      });
      
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
        localIds.map(localId => DatabaseService.deleteProduct(localId))
      );

      const successfulDeletes: string[] = [];
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulDeletes.push(localIds[index]);
        } else {
          errors.push(`Failed to delete product: ${result.reason}`);
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
      const products = await DatabaseService.getAllProducts();

      const exportData = {
        products: products,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to export products');
    }
  }
);
