import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isOnline: boolean;
  isLoading: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
  bottomTabVisible: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
}

const initialState: UIState = {
  isOnline: true,
  isLoading: false,
  notifications: [],
  theme: 'light',
  bottomTabVisible: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
      };
      state.notifications.unshift(notification);
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setBottomTabVisible: (state, action: PayloadAction<boolean>) => {
      state.bottomTabVisible = action.payload;
    },
  },
});

export const {
  setOnlineStatus,
  setGlobalLoading,
  addNotification,
  markNotificationAsRead,
  removeNotification,
  clearAllNotifications,
  setTheme,
  setBottomTabVisible,
} = uiSlice.actions;

export default uiSlice.reducer;
