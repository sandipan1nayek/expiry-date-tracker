import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocalProduct } from '../../types';

export interface InventoryState {
  products: LocalProduct[];
  searchResults: LocalProduct[];
  expiredProducts: LocalProduct[];
  expiringProducts: LocalProduct[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string | null;
  syncStatus: {
    isOnline: boolean;
    lastSyncAt: string | null;
    pendingChanges: number;
    syncInProgress: boolean;
  };
  filters: {
    showExpired: boolean;
    showFinished: boolean;
    sortBy: 'name' | 'expiryDate' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  };
}

const initialState: InventoryState = {
  products: [],
  searchResults: [],
  expiredProducts: [],
  expiringProducts: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
  syncStatus: {
    isOnline: true,
    lastSyncAt: null,
    pendingChanges: 0,
    syncInProgress: false,
  },
  filters: {
    showExpired: true,
    showFinished: false,
    sortBy: 'expiryDate',
    sortOrder: 'asc',
  },
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Products management
    setProducts: (state, action: PayloadAction<LocalProduct[]>) => {
      state.products = action.payload;
      state.isLoading = false;
      state.error = null;
    },

    addProduct: (state, action: PayloadAction<LocalProduct>) => {
      state.products.unshift(action.payload);
      state.syncStatus.pendingChanges += 1;
    },

    updateProduct: (state, action: PayloadAction<{ localId: string; updates: Partial<LocalProduct> }>) => {
      const { localId, updates } = action.payload;
      const index = state.products.findIndex(p => p.localId === localId);
      if (index !== -1) {
        state.products[index] = { ...state.products[index], ...updates };
        if (updates.syncStatus === 'pending') {
          state.syncStatus.pendingChanges += 1;
        }
      }
    },

    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.localId !== action.payload);
    },

    markProductAsSynced: (state, action: PayloadAction<{ localId: string; firebaseId: string }>) => {
      const { localId, firebaseId } = action.payload;
      const index = state.products.findIndex(p => p.localId === localId);
      if (index !== -1) {
        state.products[index].id = firebaseId;
        state.products[index].syncStatus = 'synced';
        state.products[index].lastSyncAt = new Date().toISOString();
        state.syncStatus.pendingChanges = Math.max(0, state.syncStatus.pendingChanges - 1);
      }
    },

    // Search and filtering
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setSearchResults: (state, action: PayloadAction<LocalProduct[]>) => {
      state.searchResults = action.payload;
    },

    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },

    setExpiredProducts: (state, action: PayloadAction<LocalProduct[]>) => {
      state.expiredProducts = action.payload;
    },

    setExpiringProducts: (state, action: PayloadAction<LocalProduct[]>) => {
      state.expiringProducts = action.payload;
    },

    // Filters
    updateFilters: (state, action: PayloadAction<Partial<InventoryState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },

    toggleShowExpired: (state) => {
      state.filters.showExpired = !state.filters.showExpired;
    },

    toggleShowFinished: (state) => {
      state.filters.showFinished = !state.filters.showFinished;
    },

    setSortBy: (state, action: PayloadAction<'name' | 'expiryDate' | 'createdAt'>) => {
      if (state.filters.sortBy === action.payload) {
        // Toggle sort order if same field
        state.filters.sortOrder = state.filters.sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        state.filters.sortBy = action.payload;
        state.filters.sortOrder = 'asc';
      }
    },

    // Sync status
    updateSyncStatus: (state, action: PayloadAction<Partial<InventoryState['syncStatus']>>) => {
      state.syncStatus = { ...state.syncStatus, ...action.payload };
    },

    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.syncInProgress = action.payload;
    },

    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.syncStatus.isOnline = action.payload;
    },

    setLastSyncAt: (state, action: PayloadAction<string>) => {
      state.syncStatus.lastSyncAt = action.payload;
    },

    setPendingChanges: (state, action: PayloadAction<number>) => {
      state.syncStatus.pendingChanges = action.payload;
    },

    // Bulk operations
    clearAllProducts: (state) => {
      state.products = [];
      state.searchResults = [];
      state.expiredProducts = [];
      state.expiringProducts = [];
      state.syncStatus.pendingChanges = 0;
    },

    resetInventoryState: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  markProductAsSynced,
  setSearchQuery,
  setSearchResults,
  setSelectedCategory,
  setExpiredProducts,
  setExpiringProducts,
  updateFilters,
  toggleShowExpired,
  toggleShowFinished,
  setSortBy,
  updateSyncStatus,
  setSyncInProgress,
  setOnlineStatus,
  setLastSyncAt,
  setPendingChanges,
  clearAllProducts,
  resetInventoryState,
} = inventorySlice.actions;

export default inventorySlice.reducer;
