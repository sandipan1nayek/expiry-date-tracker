import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationService from './src/services/NotificationService';
import DatabaseService from './src/services/DatabaseService';
import { initializeSampleData } from './src/utils/sampleData';
import SettingsService from './src/services/SettingsService';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Initialize database first
        await DatabaseService.initDatabase();
        console.log('Database initialized');
        
        // Migrate settings to remove deprecated properties
        await SettingsService.migrateSettings();
        
        // Initialize sample data
        await initializeSampleData();
        console.log('Sample data ready');
        
        // Debug settings to see what's loaded
        await SettingsService.debugSettings();
        
        // Test categorization logic
        await SettingsService.testCategorization();
        
        // Initialize notifications (will be skipped in Expo Go)
        await NotificationService.initialize().catch(console.warn);
        console.log('Notifications initialized');
        
        console.log('App initialization complete!');
      } catch (error) {
        console.error('App initialization error:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="auto" />
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  );
}
