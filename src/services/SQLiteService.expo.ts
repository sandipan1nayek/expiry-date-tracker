import * as SQLite from 'expo-sqlite';
import { Product, LocalProduct } from '../types';
// for offline storage system - using expo-sqlite for Expo compatibility

export interface DatabaseService {
  initDatabase(): Promise<void>;
  createTables(): Promise<void>;
  insertProduct(product: LocalProduct): Promise<number>;
  updateProduct(localId: string, product: Partial<LocalProduct>): Promise<void>;
  deleteProduct(localId: string): Promise<void>;
  getAllProducts(): Promise<LocalProduct[]>;
  getProductById(localId: string): Promise<LocalProduct | null>;
  getProductsByCategory(category: string): Promise<LocalProduct[]>;
  getExpiredProducts(): Promise<LocalProduct[]>;
  getExpiringProducts(days: number): Promise<LocalProduct[]>;
  searchProducts(query: string): Promise<LocalProduct[]>;
  markProductAsSynced(localId: string, firebaseId: string): Promise<void>;
  getPendingSyncProducts(): Promise<LocalProduct[]>;
  clearAllProducts(): Promise<void>;
  closeDatabase(): Promise<void>;
}

class SQLiteService implements DatabaseService {
  private database: SQLite.SQLiteDatabase | null = null;
  private readonly databaseName = 'ExpiredDateTracker.db';
  private readonly databaseVersion = '1.0';

  /**
   * Initialize database connection
   */
  async initDatabase(): Promise<void> {
    try {
      // Expo SQLite uses openDatabaseAsync
      this.database = await SQLite.openDatabaseAsync(this.databaseName);
      console.log('Database opened successfully');
      await this.createTables();
    } catch (error) {
      console.error('Error opening database:', error);
      throw new Error('Failed to initialize database');
    }
  }

  /**
   * Create database tables
   */
  async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Create products table
      await this.database.runAsync(`
        CREATE TABLE IF NOT EXISTS products (
          localId TEXT PRIMARY KEY,
          id TEXT,
          name TEXT NOT NULL,
          brand TEXT,
          category TEXT,
          barcode TEXT,
          expiryDate TEXT NOT NULL,
          purchaseDate TEXT,
          price REAL,
          quantity INTEGER,
          unit TEXT,
          location TEXT,
          notes TEXT,
          imageUrl TEXT,
          isFinished INTEGER DEFAULT 0,
          syncStatus TEXT DEFAULT 'pending',
          lastSyncAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          userId TEXT
        )
      `);

      // Create categories table
      await this.database.runAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT,
          icon TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create settings table
      await this.database.runAsync(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create sync_log table
      await this.database.runAsync(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT,
          entityType TEXT,
          entityId TEXT,
          status TEXT,
          error TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('Database tables created successfully');
      
      // Insert default categories
      await this.insertDefaultCategories();
      
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  /**
   * Insert default categories
   */
  private async insertDefaultCategories(): Promise<void> {
    if (!this.database) return;

    try {
      const defaultCategories = [
        { id: 'dairy', name: 'Dairy', color: '#FFE4B5', icon: '🥛' },
        { id: 'meat', name: 'Meat & Fish', color: '#FFB6C1', icon: '🥩' },
        { id: 'fruits', name: 'Fruits', color: '#98FB98', icon: '🍎' },
        { id: 'vegetables', name: 'Vegetables', color: '#90EE90', icon: '🥕' },
        { id: 'grains', name: 'Grains & Cereals', color: '#DEB887', icon: '🌾' },
        { id: 'beverages', name: 'Beverages', color: '#87CEEB', icon: '🥤' },
        { id: 'snacks', name: 'Snacks', color: '#F0E68C', icon: '🍿' },
        { id: 'condiments', name: 'Condiments', color: '#DDA0DD', icon: '🧂' },
        { id: 'frozen', name: 'Frozen Foods', color: '#E0E0E0', icon: '🧊' },
        { id: 'other', name: 'Other', color: '#D3D3D3', icon: '📦' }
      ];

      for (const category of defaultCategories) {
        await this.database.runAsync(
          'INSERT OR IGNORE INTO categories (id, name, color, icon) VALUES (?, ?, ?, ?)',
          [category.id, category.name, category.color, category.icon]
        );
      }
    } catch (error) {
      console.error('Error inserting default categories:', error);
    }
  }

  /**
   * Insert a new product
   */
  async insertProduct(product: LocalProduct): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.runAsync(
        `INSERT INTO products (
          localId, id, name, brand, category, barcode, expiryDate, purchaseDate,
          price, quantity, unit, location, notes, imageUrl, isFinished,
          syncStatus, lastSyncAt, createdAt, updatedAt, userId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.localId,
          product.id || null,
          product.name,
          product.brand || null,
          product.category,
          product.barcode || null,
          product.expiryDate,
          product.purchaseDate || null,
          product.price || null,
          product.quantity,
          product.unit,
          product.location || null,
          product.notes || null,
          product.imageUrl || null,
          product.isFinished ? 1 : 0,
          product.syncStatus || 'pending',
          product.lastSyncAt || null,
          product.createdAt || new Date().toISOString(),
          product.updatedAt || new Date().toISOString(),
          product.userId
        ]
      );

      console.log('Product inserted successfully:', product.name);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      // Build dynamic UPDATE query
      const updateFields = Object.keys(updates).filter(key => key !== 'localId');
      const setClause = updateFields.map(field => `${field} = ?`).join(', ');
      const values = updateFields.map(field => {
        const value = updates[field as keyof LocalProduct];
        if (field === 'isFinished') {
          return value ? 1 : 0;
        }
        return value ?? null; // Convert undefined to null
      });
      values.push(new Date().toISOString()); // updatedAt
      values.push(localId); // WHERE condition

      await this.database.runAsync(
        `UPDATE products SET ${setClause}, updatedAt = ? WHERE localId = ?`,
        values as any[]
      );

      console.log('Product updated successfully:', localId);
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(localId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync(
        'DELETE FROM products WHERE localId = ?',
        [localId]
      );

      console.log('Product deleted successfully:', localId);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Get all products
   */
  async getAllProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products ORDER BY createdAt DESC'
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(localId: string): Promise<LocalProduct | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE localId = ? LIMIT 1',
        [localId]
      );

      const products = this.parseProductResults(results);
      return products.length > 0 ? products[0] : null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE category = ? ORDER BY createdAt DESC',
        [category]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw error;
    }
  }

  /**
   * Get expired products
   */
  async getExpiredProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE expiryDate < ? AND isFinished = 0 ORDER BY expiryDate ASC',
        [today]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting expired products:', error);
      throw error;
    }
  }

  /**
   * Get products expiring within specified days
   */
  async getExpiringProducts(days: number): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE expiryDate BETWEEN ? AND ? AND isFinished = 0 ORDER BY expiryDate ASC',
        [todayStr, futureDateStr]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting expiring products:', error);
      throw error;
    }
  }

  /**
   * Search products by name or category
   */
  async searchProducts(query: string): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const searchTerm = `%${query}%`;
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR brand LIKE ? ORDER BY createdAt DESC',
        [searchTerm, searchTerm, searchTerm]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Mark product as synced with Firebase
   */
  async markProductAsSynced(localId: string, firebaseId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync(
        'UPDATE products SET id = ?, syncStatus = ?, lastSyncAt = ? WHERE localId = ?',
        [firebaseId, 'synced', new Date().toISOString(), localId]
      );

      console.log('Product marked as synced:', localId);
    } catch (error) {
      console.error('Error marking product as synced:', error);
      throw error;
    }
  }

  /**
   * Get products that need to be synced
   */
  async getPendingSyncProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE syncStatus = ? ORDER BY createdAt ASC',
        ['pending']
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting pending sync products:', error);
      throw error;
    }
  }

  /**
   * Clear all products (useful for testing or data reset)
   */
  async clearAllProducts(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync('DELETE FROM products');
      console.log('All products cleared successfully');
    } catch (error) {
      console.error('Error clearing all products:', error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query - for backup/migration operations
   */
  async executeQuery(sql: string, params: any[] = []): Promise<any> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.runAsync(sql, params);
      return result;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.database) {
      try {
        await this.database.closeAsync();
        this.database = null;
        console.log('Database closed successfully');
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }

  /**
   * Parse SQL result rows into LocalProduct objects
   */
  private parseProductResults(rows: any[]): LocalProduct[] {
    const products: LocalProduct[] = [];
    
    for (const row of rows) {
      products.push({
        localId: row.localId,
        id: row.id,
        name: row.name,
        brand: row.brand,
        category: row.category,
        barcode: row.barcode,
        expiryDate: row.expiryDate,
        purchaseDate: row.purchaseDate,
        price: row.price,
        quantity: row.quantity,
        unit: row.unit,
        location: row.location,
        notes: row.notes,
        imageUrl: row.imageUrl,
        isFinished: row.isFinished === 1,
        syncStatus: row.syncStatus as 'synced' | 'pending' | 'error',
        lastSyncAt: row.lastSyncAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        userId: row.userId,
      });
    }

    return products;
  }
}

export default new SQLiteService();
