import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store/store';
import RootNavigator from './src/navigation/RootNavigator';
import NotificationService from './src/services/NotificationService';

export default function App() {
  useEffect(() => {
    // Initialize notifications when app starts (will be skipped in Expo Go)
    NotificationService.initialize().catch(console.warn);
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
