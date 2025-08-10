import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadProducts } from '../../store/thunks/inventoryThunks';
import { COLORS } from '../../constants';
import { LocalProduct } from '../../types';
import DatabaseService from '../../services/DatabaseService';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = StackNavigationProp<any, 'Profile'>;

interface DashboardStats {
  totalProducts: number;
  expiredProducts: number;
  expiringSoonProducts: number;
  warningProducts: number;
  freshProducts: number;
  categoriesUsed: number;
  recentlyAdded: LocalProduct[];
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface UserData {
  name: string;
  email: string;
  isAuthenticated: boolean;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const { products: storeProducts, isLoading: storeLoading } = useAppSelector(state => state.inventory);

  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Chart colors for categories
  const chartColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#FFB347', '#87CEEB', '#F0E68C', '#FFA07A',
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (storeProducts.length >= 0) {
      calculateDashboardStats();
    }
  }, [storeProducts]);

  const loadDashboardData = async () => {
    try {
      await dispatch(loadProducts()).unwrap();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled automatically by RootNavigator
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const calculateDashboardStats = async () => {
    if (!storeProducts.length) {
      setDashboardStats({
        totalProducts: 0,
        expiredProducts: 0,
        expiringSoonProducts: 0,
        warningProducts: 0,
        freshProducts: 0,
        categoriesUsed: 0,
        recentlyAdded: [],
      });
      setCategoryBreakdown([]);
      return;
    }

    try {
      // Get stats from database service (now includes custom settings)
      const dbStats = await DatabaseService.getDashboardStats();
      
      // Get recently added products (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentlyAdded = storeProducts
        .filter((product: LocalProduct) => new Date(product.createdAt) > weekAgo)
        .sort((a: LocalProduct, b: LocalProduct) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      const stats: DashboardStats = {
        totalProducts: dbStats.total,
        expiredProducts: dbStats.expired,
        expiringSoonProducts: dbStats.expiring,
        warningProducts: dbStats.warning || 0,
        freshProducts: dbStats.fresh,
        categoriesUsed: Object.keys(dbStats.categories).length,
        recentlyAdded,
      };

      setDashboardStats(stats);

      // Calculate category breakdown
      const breakdown: CategoryBreakdown[] = Object.entries(dbStats.categories)
        .map(([category, count], index) => ({
          category,
          count: count as number,
          percentage: Math.round(((count as number) / dbStats.total) * 100),
          color: chartColors[index % chartColors.length],
        }))
        .sort((a, b) => b.count - a.count);

      setCategoryBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to calculate dashboard stats:', error);
    }
  };

  const renderStatsCard = (title: string, value: string | number, color: string) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <Text style={styles.statsValue}>{String(value)}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
    </View>
  );

  const renderCategoryChart = () => {
    if (categoryBreakdown.length === 0) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.chartContent}>
          {categoryBreakdown.map((item: CategoryBreakdown, index: number) => (
            <View key={item.category} style={styles.chartItem}>
              <View style={styles.chartRow}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text style={styles.categoryLabel}>{item.category}</Text>
                <Text style={styles.categoryCount}>{String(item.count)}</Text>
                <Text style={styles.categoryPercentage}>({String(item.percentage)}%)</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderRecentActivity = () => {
    if (!dashboardStats?.recentlyAdded.length) return null;

    return (
      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recently Added</Text>
        {dashboardStats.recentlyAdded.map((product: LocalProduct) => (
          <TouchableOpacity
            key={product.localId}
            style={styles.activityItem}
            onPress={() => navigation.navigate('InventoryTab', { 
              screen: 'ProductDetail', 
              params: { productId: product.localId } 
            })}
          >
            <View style={styles.activityInfo}>
              <Text style={styles.activityProduct}>{product.name}</Text>
              <Text style={styles.activityDate}>
                {new Date(product.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.activityCategory}>{product.category}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading && !dashboardStats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {dashboardStats && (
        <>
          {/* Main Stats Grid */}
          <View style={styles.statsGrid}>
            {renderStatsCard('Total Products', dashboardStats.totalProducts, COLORS.PRIMARY)}
            {renderStatsCard('Expired', dashboardStats.expiredProducts, COLORS.ERROR)}
            {renderStatsCard('Expiring Soon', dashboardStats.expiringSoonProducts, '#FF8800')}
            {renderStatsCard('Warning', dashboardStats.warningProducts, COLORS.WARNING)}
            {renderStatsCard('Fresh Items', dashboardStats.freshProducts, COLORS.SUCCESS)}
          </View>

          {/* Categories Used */}
          <View style={styles.secondaryStats}>
            {renderStatsCard('Categories Used', dashboardStats.categoriesUsed, COLORS.SECONDARY)}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('InventoryTab', { screen: 'AddProduct' })}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionText}>Add Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Scanner')}
              >
                <Text style={styles.actionIcon}>📷</Text>
                <Text style={styles.actionText}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('Medicine')}
              >
                <Text style={styles.actionIcon}>💊</Text>
                <Text style={styles.actionText}>Medicine</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Chart */}
          {renderCategoryChart()}

          {/* Recent Activity */}
          {renderRecentActivity()}
        </>
      )}

      {!dashboardStats && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No products yet!</Text>
          <Text style={styles.emptyStateSubtext}>Add your first product to get started</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('InventoryTab', { screen: 'AddProduct' })}
          >
            <Text style={styles.addButtonText}>Add Product</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  settingsButtonText: {
    fontSize: 20,
  },
  signOutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#ffebee',
  },
  signOutButtonText: {
    fontSize: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  secondaryStats: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: (width - 48) / 2,
    minHeight: 80,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  quickActionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartContent: {
    marginTop: 8,
  },
  chartItem: {
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  categoryPercentage: {
    fontSize: 14,
    color: '#666',
    minWidth: 50,
    textAlign: 'right',
  },
  activityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityInfo: {
    flex: 1,
  },
  activityProduct: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  activityDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  activityCategory: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
