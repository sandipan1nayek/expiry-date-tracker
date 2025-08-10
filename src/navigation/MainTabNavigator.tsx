import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// Import main screens (placeholders for now)
import InventoryListScreen from '../screens/inventory/InventoryListScreen';
import AddProductScreen from '../screens/inventory/AddProductScreen';
import ProductDetailScreen from '../screens/inventory/ProductDetailScreen';
import ScannerScreen from '../screens/scanner/ScannerScreen';
import ExpiryDateScannerScreen from '../screens/scanner/ExpiryDateScannerScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

export type MainTabParamList = {
  InventoryTab: undefined;
  Scanner: undefined;
  Profile: undefined;
};

export type InventoryStackParamList = {
  InventoryList: undefined;
  AddProduct: undefined;
  ProductDetail: { productId: string };
  ExpiryDateScanner: { onDateScanned?: (date: string) => void };
};

const MainTab = createBottomTabNavigator<MainTabParamList>();
const InventoryStack = createStackNavigator<InventoryStackParamList>();

const InventoryStackNavigator: React.FC = () => {
  return (
    <InventoryStack.Navigator>
      <InventoryStack.Screen
        name="InventoryList"
        component={InventoryListScreen}
        options={{ title: 'My Inventory' }}
      />
      <InventoryStack.Screen
        name="AddProduct"
        component={AddProductScreen}
        options={{ title: 'Add Product' }}
      />
      <InventoryStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Product Details' }}
      />
      <InventoryStack.Screen
        name="ExpiryDateScanner"
        component={ExpiryDateScannerScreen}
        options={{ title: 'Scan Expiry Date', headerShown: false }}
      />
    </InventoryStack.Navigator>
  );
};

const MainTabNavigator: React.FC = () => {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#666',
      }}>
      <MainTab.Screen
        name="InventoryTab"
        component={InventoryStackNavigator}
        options={{
          title: 'Inventory',
          // TODO: Add tab bar icon
        }}
      />
      <MainTab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          title: 'Scanner',
          // TODO: Add tab bar icon
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          // TODO: Add tab bar icon
        }}
      />
    </MainTab.Navigator>
  );
};

export default MainTabNavigator;
