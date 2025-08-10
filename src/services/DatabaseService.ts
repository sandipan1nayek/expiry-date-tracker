import AsyncStorageService from './AsyncStorageService';
import { LocalProduct } from '../types';

class DatabaseService {
  async initDatabase(): Promise<void> {
    try {
      await AsyncStorageService.initDatabase();
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    try {
      return await AsyncStorageService.getAllProducts();
    } catch (error) {
      console.error('Failed to get all products:', error);
      return [];
    }
  }

  async insertProduct(product: Partial<LocalProduct>): Promise<string> {
    try {
      return await AsyncStorageService.insertProduct(product);
    } catch (error) {
      console.error('Failed to insert product:', error);
      throw error;
    }
  }

  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    try {
      await AsyncStorageService.updateProduct(localId, updates);
    } catch (error) {
      console.error('Failed to update product:', error);
      throw error;
    }
  }

  async deleteProduct(localId: string): Promise<void> {
    try {
      await AsyncStorageService.deleteProduct(localId);
    } catch (error) {
      console.error('Failed to delete product:', error);
      throw error;
    }
  }

  async getExpiredProducts(): Promise<LocalProduct[]> {
    try {
      return await AsyncStorageService.getExpiredProducts();
    } catch (error) {
      console.error('Failed to get expired products:', error);
      return [];
    }
  }

  async getExpiringProducts(days: number = 7): Promise<LocalProduct[]> {
    try {
      return await AsyncStorageService.getExpiringProducts(days);
    } catch (error) {
      console.error('Failed to get expiring products:', error);
      return [];
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    try {
      return await AsyncStorageService.searchProducts(query);
    } catch (error) {
      console.error('Failed to search products:', error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    try {
      return await AsyncStorageService.getProductsByCategory(category);
    } catch (error) {
      console.error('Failed to get products by category:', error);
      return [];
    }
  }

  async getDashboardStats() {
    try {
      return await AsyncStorageService.getDashboardStats();
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      return { total: 0, expired: 0, expiring: 0, fresh: 0, categories: {} };
    }
  }

  async clearAllProducts(): Promise<void> {
    try {
      await AsyncStorageService.clearAllProducts();
    } catch (error) {
      console.error('Failed to clear all products:', error);
    }
  }
}

export default new DatabaseService();