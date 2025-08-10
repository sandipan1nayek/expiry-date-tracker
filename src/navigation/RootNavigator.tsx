import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppDispatch } from '../store/hooks';
import { initializeDatabase, loadProducts } from '../store/thunks/inventoryThunks';

// Import main navigation
import MainTabNavigator from './MainTabNavigator';

// Navigation types
export type RootStackParamList = {
  Main: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Load initial data when navigation mounts
    const loadInitialData = async () => {
      try {
        await dispatch(initializeDatabase()).unwrap();
        await dispatch(loadProducts()).unwrap();
        console.log('Initial data loaded successfully');
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, [dispatch]);

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <RootStack.Screen name="Main" component={MainTabNavigator} />
    </RootStack.Navigator>
  );
};

export default RootNavigator;
