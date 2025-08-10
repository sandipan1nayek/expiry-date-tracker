import React, { useEffect, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch } from '../store/hooks';
import { initializeDatabase, loadProducts } from '../store/thunks/inventoryThunks';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../constants';

// Import navigation stacks
import MainTabNavigator from './MainTabNavigator';
import AuthStackNavigator from './AuthStackNavigator';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      await dispatch(initializeDatabase()).unwrap();
      await dispatch(loadProducts()).unwrap();
      console.log('Initial data loaded successfully');
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      {isAuthenticated ? (
        <RootStack.Screen 
          name="Main" 
          component={MainTabNavigator}
        />
      ) : (
        <RootStack.Screen 
          name="Auth" 
          component={AuthStackNavigator}
        />
      )}
    </RootStack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
});

export default RootNavigator;
