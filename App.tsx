import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationService from './src/services/NotificationService';
import DatabaseService from './src/services/DatabaseService';
import { initializeSampleData } from './src/utils/sampleData';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing app...');
        
        // Initialize database first
        await DatabaseService.initDatabase();
        console.log('Database initialized');
        
        // Initialize sample data
        await initializeSampleData();
        console.log('Sample data ready');
        
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
