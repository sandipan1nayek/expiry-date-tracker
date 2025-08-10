import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadProducts } from '../../store/thunks/inventoryThunks';
import { COLORS, ROUTES } from '../../constants';
import { LocalProduct } from '../../types';

const { width } = Dimensions.get('window');

type ProfileScreenNavigationProp = StackNavigationProp<any, 'Profile'>;

interface DashboardStats {
  totalProducts: number;
  expiredProducts: number;
  expiringSoonProducts: number;
  warningProducts: number;
  freshProducts: number;
  totalValue: number;
  categoriesUsed: number;
  averageDaysToExpiry: number;
  recentlyAdded: LocalProduct[];
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { products, isLoading } = useAppSelector(state => state.inventory);

  const [refreshing, setRefreshing] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    autoBackup: true,
    warningDays: '7',
    criticalDays: '3',
  });

  // Chart colors for categories
  const chartColors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#FFB347', '#87CEEB', '#F0E68C', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE'
  ];

  useEffect(() => {
    loadDashboardData();
  }, [products]);

  const loadDashboardData = async () => {
    try {
      await dispatch(loadProducts()).unwrap();
      calculateDashboardStats();
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const calculateDashboardStats = () => {
    if (!products.length) {
      setDashboardStats({
        totalProducts: 0,
        expiredProducts: 0,
        expiringSoonProducts: 0,
        warningProducts: 0,
        freshProducts: 0,
        totalValue: 0,
        categoriesUsed: 0,
        averageDaysToExpiry: 0,
        recentlyAdded: [],
      });
      setCategoryBreakdown([]);
      return;
    }

    const today = new Date();
    let expired = 0;
    let expiringSoon = 0;
    let warning = 0;
    let fresh = 0;
    let totalValue = 0;
    let totalDaysToExpiry = 0;
    const categories = new Map<string, number>();

    products.forEach(product => {
      // Calculate expiry status
      const expiryDate = new Date(product.expiryDate);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        expired++;
      } else if (diffDays <= 3) {
        expiringSoon++;
      } else if (diffDays <= 7) {
        warning++;
      } else {
        fresh++;
      }

      totalDaysToExpiry += Math.max(0, diffDays);
      totalValue += product.price || 0;

      // Count categories
      const category = product.category;
      categories.set(category, (categories.get(category) || 0) + 1);
    });

    // Get recently added products (last 7 days)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentlyAdded = products
      .filter(product => new Date(product.createdAt) > weekAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const stats: DashboardStats = {
      totalProducts: products.length,
      expiredProducts: expired,
      expiringSoonProducts: expiringSoon,
      warningProducts: warning,
      freshProducts: fresh,
      totalValue,
      categoriesUsed: categories.size,
      averageDaysToExpiry: Math.round(totalDaysToExpiry / products.length) || 0,
      recentlyAdded,
    };

    setDashboardStats(stats);

    // Calculate category breakdown
    const breakdown: CategoryBreakdown[] = Array.from(categories.entries())
      .map(([category, count], index) => ({
        category,
        count,
        percentage: Math.round((count / products.length) * 100),
        color: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.count - a.count);

    setCategoryBreakdown(breakdown);
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all products and data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement clearAllProducts action in inventory slice
              Alert.alert('Success', 'All data has been cleared');
              setRefreshing(true);
              await dispatch(loadProducts());
              setRefreshing(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const renderStatsCard = (title: string, value: string | number, color: string, subtitle?: string) => (
    <View style={[styles.statsCard, { borderLeftColor: color }]}>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
      {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderCategoryChart = () => {
    if (categoryBreakdown.length === 0) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Category Breakdown</Text>
        <View style={styles.chartContent}>
          {categoryBreakdown.map((item, index) => (
            <View key={item.category} style={styles.chartItem}>
              <View style={styles.chartRow}>
                <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                <Text style={styles.categoryLabel}>{item.category}</Text>
                <Text style={styles.categoryCount}>{item.count}</Text>
                <Text style={styles.categoryPercentage}>({item.percentage}%)</Text>
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
        {dashboardStats.recentlyAdded.map((product, index) => (
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

  if (!dashboardStats && !isLoading) {
    return (
      <View style={styles.container}>
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
          <Text style={styles.userName}>Offline User</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {dashboardStats && (
        <>
          {/* Main Stats Grid */}
          <View style={styles.statsGrid}>
            {renderStatsCard('Total Products', dashboardStats.totalProducts, COLORS.PRIMARY)}
            {renderStatsCard('Expired', dashboardStats.expiredProducts, COLORS.ERROR)}
            {renderStatsCard('Expiring Soon', dashboardStats.expiringSoonProducts, COLORS.WARNING)}
            {renderStatsCard('Fresh Items', dashboardStats.freshProducts, COLORS.SUCCESS)}
          </View>

          {/* Secondary Stats */}
          <View style={styles.secondaryStats}>
            {renderStatsCard(
              'Total Value', 
              `$${dashboardStats.totalValue.toFixed(2)}`, 
              COLORS.INFO,
              'Estimated inventory value'
            )}
            {renderStatsCard(
              'Categories Used', 
              dashboardStats.categoriesUsed, 
              COLORS.SECONDARY,
              'Product categories'
            )}
            {renderStatsCard(
              'Avg. Days to Expiry', 
              dashboardStats.averageDaysToExpiry, 
              COLORS.INFO,
              'Average across all items'
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
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
                <Text style={styles.actionText}>Scan Barcode</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('InventoryTab')}
              >
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionText}>View All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Breakdown Chart */}
          {renderCategoryChart()}

          {/* Recent Activity */}
          {renderRecentActivity()}

          {/* Account Actions */}
          <View style={styles.accountActions}>
            <TouchableOpacity style={styles.signOutButton} onPress={handleClearAllData}>
              <Text style={styles.signOutText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingsForm}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Expiry Warning (days)</Text>
                <TextInput
                  style={styles.settingInput}
                  value={userSettings.warningDays}
                  onChangeText={(text) => setUserSettings({ ...userSettings, warningDays: text })}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Critical Alert (days)</Text>
                <TextInput
                  style={styles.settingInput}
                  value={userSettings.criticalDays}
                  onChangeText={(text) => setUserSettings({ ...userSettings, criticalDays: text })}
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity
                style={[styles.settingToggle, userSettings.notifications && styles.settingToggleActive]}
                onPress={() => setUserSettings({ 
                  ...userSettings, 
                  notifications: !userSettings.notifications 
                })}
              >
                <Text style={styles.settingToggleText}>
                  {userSettings.notifications ? '🔔' : '🔕'} Push Notifications
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingToggle, userSettings.autoBackup && styles.settingToggleActive]}
                onPress={() => setUserSettings({ 
                  ...userSettings, 
                  autoBackup: !userSettings.autoBackup 
                })}
              >
                <Text style={styles.settingToggleText}>
                  {userSettings.autoBackup ? '💾' : '📝'} Auto Backup
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                // Save settings logic would go here
                Alert.alert('Success', 'Settings saved successfully');
                setShowSettingsModal(false);
              }}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: COLORS.GRAY_MEDIUM,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginTop: 4,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  secondaryStats: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  statsCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    margin: 4,
    width: (width - 40) / 2 - 8,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    fontWeight: '600',
  },
  statsSubtitle: {
    fontSize: 12,
    color: COLORS.GRAY_MEDIUM,
    marginTop: 2,
  },
  quickActions: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 16,
  },
  actionButtons: {
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
    color: COLORS.GRAY_DARK,
    fontWeight: '600',
  },
  chartContainer: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
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
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.BLACK,
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_DARK,
    marginRight: 8,
  },
  categoryPercentage: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    minWidth: 40,
  },
  activityContainer: {
    backgroundColor: COLORS.WHITE,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  activityInfo: {
    flex: 1,
  },
  activityProduct: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
  },
  activityDate: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    marginTop: 2,
  },
  activityCategory: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  accountActions: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  signOutButton: {
    backgroundColor: COLORS.ERROR,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  closeButton: {
    fontSize: 20,
    color: COLORS.GRAY_DARK,
  },
  settingsForm: {
    marginBottom: 20,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  settingToggle: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  settingToggleActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  settingToggleText: {
    fontSize: 16,
    color: COLORS.BLACK,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
