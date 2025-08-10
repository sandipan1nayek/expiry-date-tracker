import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalProduct } from '../types';
import SettingsService from './SettingsService';

// Simple AsyncStorage-based database service for reliable offline functionality
class AsyncStorageService {
  private readonly PRODUCTS_KEY = 'expiry_tracker_products';
  
  async initDatabase(): Promise<void> {
    try {
      console.log('AsyncStorage database initialized successfully');
    } catch (error) {
      console.error('Error initializing AsyncStorage:', error);
      throw error;
    }
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    try {
      const data = await AsyncStorage.getItem(this.PRODUCTS_KEY);
      if (!data) {
        return [];
      }
      
      const products = JSON.parse(data);
      return Array.isArray(products) ? products : [];
    } catch (error) {
      console.error('Error getting all products:', error);
      return [];
    }
  }

  async insertProduct(product: Partial<LocalProduct>): Promise<string> {
    try {
      const products = await this.getAllProducts();
      
      const localId = product.localId || this.generateLocalId();
      const now = new Date().toISOString();
      
      const newProduct: LocalProduct = {
        localId,
        id: localId,
        name: product.name || '',
        category: product.category || '',
        expiryDate: product.expiryDate || '',
        quantity: product.quantity || 1,
        createdAt: now,
        updatedAt: now,
        // Default values
        brand: product.brand || '',
        barcode: product.barcode || '',
        purchaseDate: product.purchaseDate || '',
        price: product.price || 0,
        unit: product.unit || 'piece',
        location: product.location || '',
        notes: product.notes || '',
        imageUrl: product.imageUrl || '',
        isFinished: product.isFinished || false,
        syncStatus: 'synced',
        lastSyncAt: undefined,
        userId: product.userId || 'offline-user',
      };

      products.push(newProduct);
      await AsyncStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
      
      console.log('Product inserted successfully:', localId);
      return localId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw error;
    }
  }

  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    try {
      const products = await this.getAllProducts();
      const index = products.findIndex(p => p.localId === localId);
      
      if (index === -1) {
        throw new Error('Product not found');
      }

      products[index] = {
        ...products[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  async deleteProduct(localId: string): Promise<void> {
    try {
      const products = await this.getAllProducts();
      const filteredProducts = products.filter(p => p.localId !== localId);
      
      await AsyncStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(filteredProducts));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async getExpiredProducts(): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const today = new Date().toISOString().split('T')[0];
      
      return products.filter(product => product.expiryDate < today);
    } catch (error) {
      console.error('Error getting expired products:', error);
      return [];
    }
  }

  async getExpiringProducts(days: number = 7): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      return products.filter(product => 
        product.expiryDate >= todayStr && product.expiryDate <= futureDateStr
      );
    } catch (error) {
      console.error('Error getting expiring products:', error);
      return [];
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    try {
      if (!query.trim()) {
        return this.getAllProducts();
      }

      const products = await this.getAllProducts();
      const searchQuery = query.toLowerCase();
      
      return products.filter(product =>
        product.name.toLowerCase().includes(searchQuery) ||
        product.category.toLowerCase().includes(searchQuery) ||
        (product.brand && product.brand.toLowerCase().includes(searchQuery)) ||
        (product.notes && product.notes.toLowerCase().includes(searchQuery))
      );
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      return products.filter(product => product.category === category);
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  }

  async getDashboardStats(): Promise<{
    total: number;
    expired: number;
    expiring: number;
    warning: number;
    fresh: number;
    categories: { [key: string]: number };
  }> {
    try {
      const products = await this.getAllProducts();
      
      if (products.length === 0) {
        return { total: 0, expired: 0, expiring: 0, warning: 0, fresh: 0, categories: {} };
      }

      let expired = 0;
      let expiring = 0;
      let warning = 0;
      let fresh = 0;
      const categories: { [key: string]: number } = {};

      // Get user's custom thresholds
      const thresholds = await SettingsService.getExpiryThresholds();

      for (const product of products) {
        // Count categories
        const category = product.category || 'Unknown';
        categories[category] = (categories[category] || 0) + 1;

        // Use settings-based categorization
        const status = await SettingsService.categorizeProduct(product.expiryDate);
        
        switch (status) {
          case 'expired':
            expired++;
            break;
          case 'expiring':
            expiring++;
            break;
          case 'warning':
            warning++;
            break;
          case 'fresh':
            fresh++;
            break;
        }
      }

      return {
        total: products.length,
        expired,
        expiring,
        warning,
        fresh,
        categories
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { total: 0, expired: 0, expiring: 0, warning: 0, fresh: 0, categories: {} };
    }
  }

  // New methods that use SettingsService for categorization
  async getExpiredProductsWithSettings(): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const expiredProducts: LocalProduct[] = [];
      
      for (const product of products) {
        const status = await SettingsService.categorizeProduct(product.expiryDate);
        if (status === 'expired') {
          expiredProducts.push(product);
        }
      }
      
      return expiredProducts;
    } catch (error) {
      console.error('Error getting expired products with settings:', error);
      return [];
    }
  }

  async getExpiringProductsWithSettings(): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const expiringProducts: LocalProduct[] = [];
      
      for (const product of products) {
        const status = await SettingsService.categorizeProduct(product.expiryDate);
        if (status === 'expiring') {
          expiringProducts.push(product);
        }
      }
      
      return expiringProducts;
    } catch (error) {
      console.error('Error getting expiring products with settings:', error);
      return [];
    }
  }

  async getWarningProductsWithSettings(): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const warningProducts: LocalProduct[] = [];
      
      for (const product of products) {
        const status = await SettingsService.categorizeProduct(product.expiryDate);
        if (status === 'warning') {
          warningProducts.push(product);
        }
      }
      
      return warningProducts;
    } catch (error) {
      console.error('Error getting warning products with settings:', error);
      return [];
    }
  }

  async getFreshProductsWithSettings(): Promise<LocalProduct[]> {
    try {
      const products = await this.getAllProducts();
      const freshProducts: LocalProduct[] = [];
      
      for (const product of products) {
        const status = await SettingsService.categorizeProduct(product.expiryDate);
        if (status === 'fresh') {
          freshProducts.push(product);
        }
      }
      
      return freshProducts;
    } catch (error) {
      console.error('Error getting fresh products with settings:', error);
      return [];
    }
  }

  async clearAllProducts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PRODUCTS_KEY);
      console.log('All products cleared');
    } catch (error) {
      console.error('Error clearing products:', error);
    }
  }

  async closeDatabase(): Promise<void> {
    // Nothing to close for AsyncStorage
    console.log('AsyncStorage database closed');
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default new AsyncStorageService();
