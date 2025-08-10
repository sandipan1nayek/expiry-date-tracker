import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import main navigation
import MainTabNavigator from './MainTabNavigator';

// Navigation types
export type RootStackParamList = {
  Main: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
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
