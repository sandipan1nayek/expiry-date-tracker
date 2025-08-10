import DatabaseService from '../services/DatabaseService';
import { LocalProduct } from '../types';

// Sample products to populate the app with demo data
const sampleProducts: Partial<LocalProduct>[] = [
  {
    name: 'Milk',
    category: 'Dairy',
    expiryDate: '2025-08-15',
    quantity: 2,
    price: 3.99,
    unit: 'liter',
    brand: 'Fresh Farm',
    location: 'Refrigerator',
    notes: 'Organic whole milk',
  },
  {
    name: 'Bread',
    category: 'Bakery',
    expiryDate: '2025-08-12',
    quantity: 1,
    price: 2.50,
    unit: 'loaf',
    brand: 'Wonder Bread',
    location: 'Pantry',
    notes: 'Whole wheat',
  },
  {
    name: 'Yogurt',
    category: 'Dairy',
    expiryDate: '2025-08-20',
    quantity: 6,
    price: 4.99,
    unit: 'cup',
    brand: 'Greek Gods',
    location: 'Refrigerator',
    notes: 'Vanilla flavored',
  },
  {
    name: 'Apples',
    category: 'Fruits',
    expiryDate: '2025-08-18',
    quantity: 8,
    price: 3.49,
    unit: 'piece',
    brand: 'Organic Valley',
    location: 'Fruit Bowl',
    notes: 'Gala apples',
  },
  {
    name: 'Chicken Breast',
    category: 'Meat',
    expiryDate: '2025-08-14',
    quantity: 2,
    price: 8.99,
    unit: 'lb',
    brand: 'Farm Fresh',
    location: 'Freezer',
    notes: 'Boneless, skinless',
  },
  {
    name: 'Canned Beans',
    category: 'Pantry',
    expiryDate: '2026-08-10',
    quantity: 3,
    price: 1.99,
    unit: 'can',
    brand: 'Bush\'s',
    location: 'Pantry',
    notes: 'Black beans',
  },
  {
    name: 'Pasta',
    category: 'Pantry',
    expiryDate: '2026-02-10',
    quantity: 2,
    price: 1.49,
    unit: 'box',
    brand: 'Barilla',
    location: 'Pantry',
    notes: 'Spaghetti',
  },
  {
    name: 'Lettuce',
    category: 'Vegetables',
    expiryDate: '2025-08-13',
    quantity: 1,
    price: 1.99,
    unit: 'head',
    brand: 'Fresh Express',
    location: 'Refrigerator',
    notes: 'Iceberg lettuce',
  },
];

export const initializeSampleData = async (): Promise<void> => {
  try {
    console.log('Initializing sample data...');
    
    // Check if we already have products
    const existingProducts = await DatabaseService.getAllProducts();
    if (existingProducts.length > 0) {
      console.log('Sample data already exists, skipping initialization');
      return;
    }

    // Add sample products
    for (const product of sampleProducts) {
      await DatabaseService.insertProduct(product);
    }
    
    console.log('Sample data initialized successfully!');
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
  }
};

export default sampleProducts;
