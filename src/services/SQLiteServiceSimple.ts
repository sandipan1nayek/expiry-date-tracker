import * as SQLite from 'expo-sqlite';
import { LocalProduct } from '../types';

class SQLiteServiceSimple {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly databaseName = 'expiryTracker.db';
  private isInitialized = false;

  async initDatabase(): Promise<void> {
    try {
      if (this.isInitialized && this.db) {
        return; // Already initialized
      }

      console.log('Initializing database...');
      
      // Open database with proper error handling
      this.db = await SQLite.openDatabaseAsync(this.databaseName);
      
      if (!this.db) {
        throw new Error('Failed to open database');
      }

      console.log('Database opened successfully');
      
      // Create tables with simplified approach
      await this.createTables();
      
      this.isInitialized = true;
      console.log('Database initialization complete');
    } catch (error) {
      console.error('Database initialization error:', error);
      this.isInitialized = false;
      this.db = null;
      throw new Error(`Failed to initialize database: ${error}`);
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not available');
    }

    try {
      // Simple, reliable table creation
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS products (
          localId TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT '',
          expiryDate TEXT NOT NULL DEFAULT '',
          quantity INTEGER DEFAULT 1,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await this.db.execAsync(createTableSQL);
      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw new Error('Failed to create database tables');
    }
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        console.warn('Database not available, returning empty array');
        return [];
      }

      const rows = await this.db.getAllAsync(
        'SELECT * FROM products ORDER BY expiryDate ASC'
      );

      return this.mapRowsToProducts(rows);
    } catch (error) {
      console.error('Error getting all products:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async insertProduct(product: Partial<LocalProduct>): Promise<string> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      const localId = product.localId || this.generateLocalId();
      const now = new Date().toISOString();

      await this.db.runAsync(
        `INSERT OR REPLACE INTO products (
          localId, name, category, expiryDate, quantity, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          localId,
          product.name || '',
          product.category || '',
          product.expiryDate || '',
          product.quantity || 1,
          now,
          now
        ]
      );

      console.log('Product inserted successfully:', localId);
      return localId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw new Error('Failed to insert product');
    }
  }

  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      const now = new Date().toISOString();
      
      await this.db.runAsync(
        `UPDATE products SET 
         name = COALESCE(?, name),
         category = COALESCE(?, category),
         expiryDate = COALESCE(?, expiryDate),
         quantity = COALESCE(?, quantity),
         updatedAt = ?
         WHERE localId = ?`,
        [
          updates.name || null,
          updates.category || null,
          updates.expiryDate || null,
          updates.quantity || null,
          now,
          localId
        ]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(localId: string): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        throw new Error('Database not available');
      }

      await this.db.runAsync('DELETE FROM products WHERE localId = ?', [localId]);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  async getExpiredProducts(): Promise<LocalProduct[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        return [];
      }

      const today = new Date().toISOString().split('T')[0];
      const rows = await this.db.getAllAsync(
        'SELECT * FROM products WHERE expiryDate < ? ORDER BY expiryDate ASC',
        [today]
      );

      return this.mapRowsToProducts(rows);
    } catch (error) {
      console.error('Error getting expired products:', error);
      return [];
    }
  }

  async getExpiringProducts(days: number = 7): Promise<LocalProduct[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        return [];
      }

      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const rows = await this.db.getAllAsync(
        'SELECT * FROM products WHERE expiryDate BETWEEN ? AND ? ORDER BY expiryDate ASC',
        [todayStr, futureDateStr]
      );

      return this.mapRowsToProducts(rows);
    } catch (error) {
      console.error('Error getting expiring products:', error);
      return [];
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.db || !query.trim()) {
        return this.getAllProducts();
      }

      const searchQuery = `%${query.trim()}%`;
      const rows = await this.db.getAllAsync(
        `SELECT * FROM products 
         WHERE name LIKE ? OR category LIKE ?
         ORDER BY expiryDate ASC`,
        [searchQuery, searchQuery]
      );

      return this.mapRowsToProducts(rows);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        return [];
      }

      const rows = await this.db.getAllAsync(
        'SELECT * FROM products WHERE category = ? ORDER BY expiryDate ASC',
        [category]
      );

      return this.mapRowsToProducts(rows);
    } catch (error) {
      console.error('Error getting products by category:', error);
      return [];
    }
  }

  async getDashboardStats(): Promise<{
    total: number;
    expired: number;
    expiring: number;
    fresh: number;
    categories: { [key: string]: number };
  }> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        return { total: 0, expired: 0, expiring: 0, fresh: 0, categories: {} };
      }

      const today = new Date().toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get all counts in one query
      const stats = await this.db.getAllAsync(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN expiryDate < ? THEN 1 ELSE 0 END) as expired,
          SUM(CASE WHEN expiryDate BETWEEN ? AND ? THEN 1 ELSE 0 END) as expiring,
          SUM(CASE WHEN expiryDate > ? THEN 1 ELSE 0 END) as fresh
        FROM products
      `, [today, today, weekFromNow, weekFromNow]);

      // Get category breakdown
      const categoryRows = await this.db.getAllAsync(`
        SELECT category, COUNT(*) as count 
        FROM products 
        GROUP BY category
      `);

      const categories: { [key: string]: number } = {};
      categoryRows.forEach((row: any) => {
        categories[row.category || 'Unknown'] = row.count || 0;
      });

      const stat: any = stats[0] || { total: 0, expired: 0, expiring: 0, fresh: 0 };
      return {
        total: Number(stat.total) || 0,
        expired: Number(stat.expired) || 0,
        expiring: Number(stat.expiring) || 0,
        fresh: Number(stat.fresh) || 0,
        categories
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return { total: 0, expired: 0, expiring: 0, fresh: 0, categories: {} };
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized || !this.db) {
      await this.initDatabase();
    }
  }

  private mapRowsToProducts(rows: any[]): LocalProduct[] {
    return rows.map((row: any) => ({
      localId: row.localId || '',
      id: row.localId || '',
      name: row.name || '',
      category: row.category || '',
      expiryDate: row.expiryDate || '',
      quantity: row.quantity || 1,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      // Default values for optional fields
      brand: '',
      barcode: '',
      purchaseDate: '',
      price: 0,
      unit: 'piece',
      location: '',
      notes: '',
      imageUrl: '',
      isFinished: false,
      syncStatus: 'synced' as const,
      lastSyncAt: undefined,
      userId: '',
    }));
  }

  private generateLocalId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async clearAllProducts(): Promise<void> {
    try {
      await this.ensureInitialized();
      
      if (!this.db) {
        return;
      }

      await this.db.runAsync('DELETE FROM products');
      console.log('All products cleared');
    } catch (error) {
      console.error('Error clearing products:', error);
    }
  }

  async closeDatabase(): Promise<void> {
    try {
      if (this.db) {
        await this.db.closeAsync();
        this.db = null;
        this.isInitialized = false;
        console.log('Database closed successfully');
      }
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

export default new SQLiteServiceSimple();
