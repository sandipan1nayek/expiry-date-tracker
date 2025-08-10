import SQLite from 'react-native-sqlite-storage';
import { LocalProduct } from '../types';

// Enable promise-based API
SQLite.enablePromise(true);

class SQLiteService {
  private database: SQLite.SQLiteDatabase | null = null;
  private readonly databaseName = 'ExpiredDateTracker.db';

  async initDatabase(): Promise<void> {
    if (this.database) {
      console.log('Database already initialized');
      return;
    }

    try {
      this.database = await SQLite.openDatabase({
        name: this.databaseName,
        location: 'default',
      });

      console.log('Database opened successfully');
      await this.createTables();
    } catch (error) {
      console.error('Error opening database:', error);
      throw error;
    }
  }

  async createTables(): Promise<void> {
    if (!this.database) {
      throw new Error('Database not initialized');
    }

    try {
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
          price REAL DEFAULT 0,
          quantity INTEGER DEFAULT 1,
          unit TEXT DEFAULT 'pcs',
          location TEXT,
          notes TEXT,
          imageUrl TEXT,
          isFinished INTEGER DEFAULT 0,
          syncStatus TEXT DEFAULT 'pending',
          lastSyncAt TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
          userId TEXT NOT NULL
        )
      `);

      console.log('Products table created successfully');
    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async insertProduct(product: LocalProduct): Promise<number> {
    if (!this.database) {
      await this.initDatabase();
    }

    try {
      const result = await this.database!.executeSql(
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
          product.price || 0,
          product.quantity || 1,
          product.unit || 'pcs',
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
      return result[0].insertId;
    } catch (error) {
      console.error('Error inserting product:', error);
      throw error;
    }
  }

  async getAllProducts(): Promise<LocalProduct[]> {
    if (!this.database) {
      await this.initDatabase();
    }

    try {
      const results = await this.database!.executeSql(
        'SELECT * FROM products ORDER BY createdAt DESC'
      );
      
      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error getting all products:', error);
      throw error;
    }
  }

  async deleteProduct(localId: string): Promise<void> {
    if (!this.database) {
      await this.initDatabase();
    }

    try {
      await this.database!.executeSql(
        'DELETE FROM products WHERE localId = ?',
        [localId]
      );
      console.log('Product deleted successfully:', localId);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  async searchProducts(query: string): Promise<LocalProduct[]> {
    if (!this.database) {
      await this.initDatabase();
    }

    try {
      const results = await this.database!.executeSql(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY createdAt DESC',
        [`%${query}%`]
      );
      
      return this.parseProductResults(results[0].rows);
    } catch (error) {
      console.error('Error searching products:', error);
      throw error;
    }
  }

  // Placeholder methods
  async updateProduct(localId: string, updates: Partial<LocalProduct>): Promise<void> {
    console.log('updateProduct not implemented yet');
  }

  async getProductById(localId: string): Promise<LocalProduct | null> {
    console.log('getProductById not implemented yet');
    return null;
  }

  async getProductsByCategory(category: string): Promise<LocalProduct[]> {
    console.log('getProductsByCategory not implemented yet');
    return [];
  }

  async getExpiredProducts(): Promise<LocalProduct[]> {
    console.log('getExpiredProducts not implemented yet');
    return [];
  }

  async getExpiringProducts(days: number): Promise<LocalProduct[]> {
    console.log('getExpiringProducts not implemented yet');
    return [];
  }

  async markProductAsSynced(localId: string, firebaseId: string): Promise<void> {
    console.log('markProductAsSynced not implemented yet');
  }

  async getPendingSyncProducts(): Promise<LocalProduct[]> {
    console.log('getPendingSyncProducts not implemented yet');
    return [];
  }

  async clearAllProducts(): Promise<void> {
    console.log('clearAllProducts not implemented yet');
  }

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

// Create a single instance and export it
const sqliteService = new SQLiteService();
export default sqliteService;
