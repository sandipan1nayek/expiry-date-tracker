import * as SQLite from 'expo-sqlite';
import { LocalProduct } from '../types';

class SQLiteService {
  private database: SQLite.SQLiteDatabase | null = null;
  private readonly databaseName = 'ExpiredDateTracker.db';

  async initDatabase(): Promise<void> {
    try {
      this.database = await SQLite.openDatabaseAsync(this.databaseName);
      console.log('Database opened successfully');
      await this.createTables();
    } catch (error) {
      console.error('Error opening database:', error);
      throw new Error('Failed to initialize database');
    }
  }

  async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.execAsync(`
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

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw new Error('Failed to create database tables');
    }
  }

  async insertProduct(product: LocalProduct): Promise<number> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.runAsync(
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

      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw new Error('Failed to insert product');
    }
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products ORDER BY expiryDate ASC'
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting all products:', error);
      throw new Error('Failed to get products');
    }
  }

  private parseProductResults(rows: any[]): LocalProduct[] {
    const products: LocalProduct[] = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
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

  async getProductById(localId: string): Promise<LocalProduct | null> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const result = await this.database.getFirstAsync(
        'SELECT * FROM products WHERE localId = ?',
        [localId]
      );

      if (!result) {
        return null;
      }

      return this.parseProductResults([result])[0];
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw new Error('Failed to get product');
    }
  }

  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const setClause = Object.keys(updates)
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.values(updates);
      values.push(localId);

      await this.database.runAsync(
        `UPDATE products SET ${setClause}, updatedAt = ? WHERE localId = ?`,
        [...values.slice(0, -1), new Date().toISOString(), localId]
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(localId: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync(
        'DELETE FROM products WHERE localId = ?',
        [localId]
      );
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        `SELECT * FROM products 
         WHERE name LIKE ? OR brand LIKE ? OR category LIKE ? OR notes LIKE ?
         ORDER BY expiryDate ASC`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  async getExpiredProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE expiryDate < ? ORDER BY expiryDate ASC',
        [today]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting expired products:', error);
      throw new Error('Failed to get expired products');
    }
  }

  async getExpiringProducts(days: number = 7): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE expiryDate BETWEEN ? AND ? ORDER BY expiryDate ASC',
        [todayStr, futureDateStr]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting expiring products:', error);
      throw new Error('Failed to get expiring products');
    }
  }

  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE category = ? ORDER BY expiryDate ASC',
        [category]
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting products by category:', error);
      throw new Error('Failed to get products by category');
    }
  }

  async getPendingSyncProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const results = await this.database.getAllAsync(
        'SELECT * FROM products WHERE syncStatus = ? ORDER BY updatedAt ASC',
        ['pending']
      );

      return this.parseProductResults(results);
    } catch (error) {
      console.error('Error getting pending sync products:', error);
      throw new Error('Failed to get pending sync products');
    }
  }

  async markProductAsSynced(localId: string, cloudId?: string): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      const now = new Date().toISOString();
      await this.database.runAsync(
        'UPDATE products SET syncStatus = ?, lastSyncAt = ?, id = ?, updatedAt = ? WHERE localId = ?',
        ['synced', now, cloudId || null, now, localId]
      );
    } catch (error) {
      console.error('Error marking product as synced:', error);
      throw new Error('Failed to mark product as synced');
    }
  }

  async clearAllProducts(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
      await this.database.runAsync('DELETE FROM products');
    } catch (error) {
      console.error('Error clearing all products:', error);
      throw new Error('Failed to clear all products');
    }
  }

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
}

export default new SQLiteService();
