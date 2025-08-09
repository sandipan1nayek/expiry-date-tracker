import SQLite from 'react-native-sqlite-storage';
import { Product, LocalProduct } from '../types';
// for offline storage system
// Enable promise-based API
SQLite.enablePromise(true);
//yes

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
      this.database = await SQLite.openDatabase({
        name: this.databaseName,
        location: 'default',
        createFromLocation: '~www/ExpiredDateTracker.db',
      });

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
      // Products table
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS products (
          localId TEXT PRIMARY KEY,
          id TEXT,
          name TEXT NOT NULL,
          brand TEXT,
          category TEXT NOT NULL,
          barcode TEXT,
          expiryDate TEXT NOT NULL,
          purchaseDate TEXT,
          price REAL,
          quantity INTEGER DEFAULT 1,
          unit TEXT DEFAULT 'piece',
          location TEXT,
          notes TEXT,
          imageUrl TEXT,
          isFinished INTEGER DEFAULT 0,
          syncStatus TEXT DEFAULT 'pending',
          lastSyncAt TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          userId TEXT
        )
      `);

      // Categories table for quick lookups
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT,
          icon TEXT,
          createdAt TEXT NOT NULL
        )
      `);

      // Settings table for app preferences
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);

      // Sync log table for tracking sync operations
      await this.database.executeSql(`
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          localId TEXT NOT NULL,
          operation TEXT NOT NULL,
          status TEXT NOT NULL,
          error TEXT,
          timestamp TEXT NOT NULL
        )
      `);

      console.log('Database tables created successfully');
      await this.insertDefaultCategories();
    } catch (error) {
      console.error('Error creating tables:', error);
      throw new Error('Failed to create database tables');
    }
  }

  /**
   * Insert default categories
   */
  private async insertDefaultCategories(): Promise<void> {
    if (!this.database) return;

    const defaultCategories = [
      { name: 'Food', color: '#4CAF50', icon: 'food' },
      { name: 'Medicine', color: '#F44336', icon: 'medical' },
      { name: 'Cosmetics', color: '#E91E63', icon: 'beauty' },
      { name: 'Beverages', color: '#2196F3', icon: 'drink' },
      { name: 'Dairy', color: '#FF9800', icon: 'dairy' },
      { name: 'Supplements', color: '#9C27B0', icon: 'supplement' },
      { name: 'Other', color: '#607D8B', icon: 'other' },
    ];

    try {
      for (const category of defaultCategories) {
        await this.database.executeSql(
          `INSERT OR IGNORE INTO categories (name, color, icon, createdAt) 
           VALUES (?, ?, ?, ?)`,
          [category.name, category.color, category.icon, new Date().toISOString()]
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
      const result = await this.database.executeSql(
        `INSERT INTO products (
          localId, id, name, brand, category, barcode, expiryDate, 
          purchaseDate, price, quantity, unit, location, notes, 
          imageUrl, isFinished, syncStatus, lastSyncAt, createdAt, 
          updatedAt, userId
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
          product.syncStatus,
          product.lastSyncAt || null,
          product.createdAt,
          product.updatedAt,
          product.userId || null,
        ]
      );

      return result[0].insertId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw new Error('Failed to insert product');
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
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.values(updates);
      values.push(new Date().toISOString()); // updatedAt
      values.push(localId); // WHERE condition

      await this.database.executeSql(
        `UPDATE products SET ${setClause}, updatedAt = ? WHERE localId = ?`,
        values
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
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
      await this.database.executeSql(
        'DELETE FROM products WHERE localId = ?',
        [localId]
      );
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
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
      const results = await this.database.executeSql(
        'SELECT * FROM products ORDER BY expiryDate ASC'
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting all products:', error);
      throw new Error('Failed to get products');
    }
  }

  /**
   * Get product by local ID
   */
  async getProductById(localId: string): Promise<LocalProduct | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.executeSql(
        'SELECT * FROM products WHERE localId = ?',
        [localId]
      );

      if (results[0].rows.length > 0) {
        return this.parseProductResults(results[0].rows)[0];
      }
      return null;
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw new Error('Failed to get product');
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
      const results = await this.database.executeSql(
        'SELECT * FROM products WHERE category = ? ORDER BY expiryDate ASC',
        [category]
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw new Error('Failed to get products by category');
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
      const results = await this.database.executeSql(
        'SELECT * FROM products WHERE expiryDate < ? AND isFinished = 0 ORDER BY expiryDate DESC',
        [today]
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting expired products:', error);
      throw new Error('Failed to get expired products');
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
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const today = new Date().toISOString().split('T')[0];

      const results = await this.database.executeSql(
        'SELECT * FROM products WHERE expiryDate BETWEEN ? AND ? AND isFinished = 0 ORDER BY expiryDate ASC',
        [today, futureDateStr]
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting expiring products:', error);
      throw new Error('Failed to get expiring products');
    }
  }

  /**
   * Search products by name, brand, or notes
   */
  async searchProducts(query: string): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const searchQuery = `%${query.toLowerCase()}%`;
      const results = await this.database.executeSql(
        `SELECT * FROM products 
         WHERE LOWER(name) LIKE ? 
         OR LOWER(brand) LIKE ? 
         OR LOWER(notes) LIKE ? 
         ORDER BY name ASC`,
        [searchQuery, searchQuery, searchQuery]
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
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
      await this.database.executeSql(
        'UPDATE products SET id = ?, syncStatus = ?, lastSyncAt = ? WHERE localId = ?',
        [firebaseId, 'synced', new Date().toISOString(), localId]
      );
    } catch (error) {
      console.error('Error marking product as synced:', error);
      throw new Error('Failed to mark product as synced');
    }
  }

  /**
   * Get products pending sync
   */
  async getPendingSyncProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.executeSql(
        'SELECT * FROM products WHERE syncStatus = ? ORDER BY updatedAt ASC',
        ['pending']
      );

      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting pending sync products:', error);
      throw new Error('Failed to get pending sync products');
    }
  }

  /**
   * Clear all products
   */
  async clearAllProducts(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.executeSql('DELETE FROM products');
    } catch (error) {
      console.error('Error clearing all products:', error);
      throw new Error('Failed to clear all products');
    }
  }

  /**
   * Close database connection
   */
  async closeDatabase(): Promise<void> {
    if (this.database) {
      try {
        await this.database.close();
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
  private parseProductResults(rows: any): LocalProduct[] {
    const products: LocalProduct[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows.item(i);
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
