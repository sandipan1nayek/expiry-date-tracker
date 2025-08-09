import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
  quantity: number;
  imageUrl?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  filters: {
    category: string | null;
    searchTerm: string;
    sortBy: 'name' | 'expiryDate' | 'createdAt';
    sortOrder: 'asc' | 'desc';
  };
  lastSync: string | null;
}

const initialState: InventoryState = {
  products: [],
  isLoading: false,
  error: null,
  filters: {
    category: null,
    searchTerm: '',
    sortBy: 'expiryDate',
    sortOrder: 'asc',
  },
  lastSync: null,
};

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
      state.error = null;
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload);
    },
    updateProduct: (state, action: PayloadAction<Product>) => {
      const index = state.products.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.products[index] = action.payload;
      }
    },
    removeProduct: (state, action: PayloadAction<string>) => {
      state.products = state.products.filter(p => p.id !== action.payload);
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<InventoryState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setLastSync: (state, action: PayloadAction<string>) => {
      state.lastSync = action.payload;
    },
  },
});

export const {
  setLoading,
  setProducts,
  addProduct,
  updateProduct,
  removeProduct,
  setError,
  clearError,
  setFilters,
  setLastSync,
} = inventorySlice.actions;

export default inventorySlice.reducer;
