// App constants
export const APP_NAME = 'Expiry Date Tracker';
export const APP_VERSION = '1.0.0';

// Storage keys
export const STORAGE_KEYS = {
  USER_TOKEN: 'userToken',
  USER_DATA: 'userData',
  THEME_PREFERENCE: 'themePreference',
  LAST_SYNC: 'lastSync',
  OFFLINE_QUEUE: 'offlineQueue',
} as const;

// Firebase collections
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  PRODUCTS: 'products',
  GROUPS: 'groups',
  NOTIFICATIONS: 'notifications',
} as const;

// Product categories
export const PRODUCT_CATEGORIES = [
  'Dairy',
  'Meat & Seafood',
  'Fruits & Vegetables',
  'Bakery',
  'Beverages',
  'Canned Goods',
  'Frozen Foods',
  'Snacks',
  'Condiments & Sauces',
  'Personal Care',
  'Household',
  'Medications',
  'Other',
] as const;

// Date constants
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  INPUT: 'YYYY-MM-DD',
  TIMESTAMP: 'YYYY-MM-DD HH:mm:ss',
} as const;

// Expiry status thresholds (in days)
export const EXPIRY_THRESHOLDS = {
  EXPIRED: 0,
  EXPIRING_SOON: 7,
  WARNING: 14,
} as const;

// API endpoints (for external services)
export const API_ENDPOINTS = {
  BARCODE_LOOKUP: 'https://api.upcitemdb.com/prod/trial/lookup',
  PRODUCT_DATA: 'https://world.openfoodfacts.org/api/v0/product',
} as const;

// Navigation route names
export const ROUTES = {
  // Auth Stack
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  FORGOT_PASSWORD: 'ForgotPassword',
  
  // Main Tab
  INVENTORY_TAB: 'InventoryTab',
  SCANNER: 'Scanner',
  PROFILE: 'Profile',
  
  // Inventory Stack
  INVENTORY_LIST: 'InventoryList',
  ADD_PRODUCT: 'AddProduct',
  PRODUCT_DETAIL: 'ProductDetail',
  EDIT_PRODUCT: 'EditProduct',
  
  // Modal Screens
  CAMERA: 'Camera',
  BARCODE_SCANNER: 'BarcodeScanner',
  DATE_PICKER: 'DatePicker',
  GROUP_MANAGEMENT: 'GroupManagement',
} as const;

// Notification types
export const NOTIFICATION_TYPES = {
  EXPIRY_WARNING: 'expiry_warning',
  EXPIRY_ALERT: 'expiry_alert',
  SYNC_SUCCESS: 'sync_success',
  SYNC_ERROR: 'sync_error',
  GROUP_INVITATION: 'group_invitation',
  PRODUCT_SHARED: 'product_shared',
} as const;

// Theme colors
export const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#FFC107',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  INFO: '#2196F3',
  
  // Status colors
  EXPIRED: '#F44336',
  EXPIRING_SOON: '#FF9800',
  FRESH: '#4CAF50',
  
  // Neutral colors
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_LIGHT: '#F5F5F5',
  GRAY_MEDIUM: '#9E9E9E',
  GRAY_DARK: '#424242',
} as const;

// Sorting options
export const SORT_OPTIONS = [
  { label: 'Name', value: 'name' },
  { label: 'Expiry Date', value: 'expiryDate' },
  { label: 'Date Added', value: 'createdAt' },
  { label: 'Quantity', value: 'quantity' },
] as const;

// Validation rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  PRODUCT_NAME_MAX_LENGTH: 100,
  PRODUCT_NAME_MIN_LENGTH: 1,
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 9999,
} as const;
