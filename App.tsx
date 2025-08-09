import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store } from './src/store/store';
import AuthProvider from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import SQLiteService from './src/services/SQLiteService';
import SyncService from './src/services/SyncService';

const App: React.FC = () => {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize database
        await SQLiteService.initDatabase();
        console.log('Database initialized successfully');
        
        // Initialize sync service
        await SyncService.initialize();
        console.log('Sync service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;
