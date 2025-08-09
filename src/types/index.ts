// Product types
export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  barcode?: string;
  expiryDate: string;
  purchaseDate?: string;
  price?: number;
  quantity: number;
  unit: string;
  location?: string;
  notes?: string;
  imageUrl?: string;
  isFinished: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  groupId?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

// Group types
export interface Group {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Database types
export interface LocalProduct extends Omit<Product, 'id'> {
  localId: string;
  id?: string; // Firebase ID when synced
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAt?: string;
}

// Navigation types (extending the existing ones)
export type ScreenNavigationProp<T extends keyof any> = {
  navigate: (screen: T, params?: any) => void;
  goBack: () => void;
  reset: (state: any) => void;
};

// Form types
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}

export interface ProductForm {
  name: string;
  category: string;
  expiryDate: string;
  quantity: number;
  barcode?: string;
  imageUri?: string;
}

// Filter and sort types
export interface ProductFilters {
  category?: string;
  searchTerm?: string;
  expiryStatus?: 'all' | 'expired' | 'expiring_soon' | 'fresh';
  sortBy: 'name' | 'expiryDate' | 'createdAt' | 'quantity';
  sortOrder: 'asc' | 'desc';
}

// Notification types
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  data?: any;
}

// Sync types
export interface SyncStatus {
  lastSyncAt: string | null;
  pendingChanges: number;
  isOnline: boolean;
  isSyncing: boolean;
}
