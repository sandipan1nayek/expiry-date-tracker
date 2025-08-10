import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  initializeDatabase,
  loadProducts,
  deleteProductThunk as deleteProduct,
  getExpiredProductsThunk as getExpiredProducts,
  getExpiringProductsThunk as getExpiringProducts,
  searchProductsThunk as searchProducts,
} from '../../store/thunks/inventoryThunks';
import { setSearchQuery } from '../../store/slices/inventorySlice';
import { COLORS, ROUTES, SORT_OPTIONS } from '../../constants';
import SettingsService from '../../services/SettingsService';
import { LocalProduct, ExpirySettings } from '../../types';

type InventoryListScreenNavigationProp = StackNavigationProp<any, 'InventoryList'>;

const InventoryListScreen: React.FC = () => {
  const navigation = useNavigation<InventoryListScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { products, isLoading, error } = useAppSelector(state => state.inventory);

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<LocalProduct[]>([]);
  
  // Filter and sort states
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState('expiryDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [showSortModal, setShowSortModal] = useState(false);

  useEffect(() => {
    handleLoadProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await handleLoadProducts();
        // Reload thresholds in case they changed in settings
        try {
          const thresholds = await SettingsService.getExpiryThresholds();
          setExpiryThresholds(thresholds);
        } catch (error) {
          console.error('Failed to load expiry thresholds:', error);
        }
      };
      loadData();
    }, [])
  );

  useEffect(() => {
    applyFiltersAndSort();
  }, [products, searchText, filterCategory, filterStatus, sortBy, sortOrder]);

  const handleLoadProducts = async () => {
    try {
      await dispatch(initializeDatabase()).unwrap();
      await dispatch(loadProducts()).unwrap();
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await handleLoadProducts();
    setRefreshing(false);
  };

  // State for dynamic thresholds
  const [expiryThresholds, setExpiryThresholds] = useState<ExpirySettings>({ warningDays: 7, expiringDays: 3 });

  // Load settings on component mount
  useEffect(() => {
    const loadThresholds = async () => {
      try {
        const thresholds = await SettingsService.getExpiryThresholds();
        setExpiryThresholds(thresholds);
      } catch (error) {
        console.error('Failed to load expiry thresholds:', error);
      }
    };
    loadThresholds();
  }, []);

  // Get expiry status using dynamic thresholds
  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'Expired', color: COLORS.EXPIRED, days: Math.abs(diffDays) };
    if (diffDays <= expiryThresholds.expiringDays) return { status: 'Expiring Soon', color: COLORS.EXPIRING_SOON, days: diffDays };
    if (diffDays <= expiryThresholds.warningDays) return { status: 'Warning', color: COLORS.WARNING, days: diffDays };
    return { status: 'Fresh', color: COLORS.FRESH, days: diffDays };
  };

  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        product.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (filterCategory !== 'All') {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Apply status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(product => {
        const status = getExpiryStatus(product.expiryDate).status;
        return status === filterStatus;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'expiryDate':
          aValue = new Date(a.expiryDate).getTime();
          bValue = new Date(b.expiryDate).getTime();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        default:
          aValue = a.expiryDate;
          bValue = b.expiryDate;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredProducts(filtered);
  };

  const handleDeleteProduct = (product: LocalProduct) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProduct(product.localId)).unwrap();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleStatusFilter = (status: string) => {
    if (filterStatus === status) {
      // If already selected, clear the filter
      setFilterStatus('All');
    } else {
      // Set the new filter
      setFilterStatus(status);
    }
  };

  const getUniqueCategories = () => {
    const categories = products.map(p => p.category);
    return ['All', ...Array.from(new Set(categories))];
  };

  const getStatusCounts = () => {
    const counts = {
      All: products.length,
      Expired: 0,
      'Expiring Soon': 0,
      Warning: 0,
      Fresh: 0,
    };

    products.forEach(product => {
      const status = getExpiryStatus(product.expiryDate).status;
      counts[status as keyof typeof counts]++;
    });

    return counts;
  };

  const renderProductCard = ({ item }: { item: LocalProduct }) => {
    const expiryInfo = getExpiryStatus(item.expiryDate);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, { borderLeftColor: expiryInfo.color }]}
        onPress={() => navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId: item.localId })}
      >
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {item.brand && <Text style={styles.productBrand}>{item.brand}</Text>}
          </View>
          <View style={styles.syncStatus}>
            <View
              style={[
                styles.syncIndicator,
                { backgroundColor: item.syncStatus === 'synced' ? COLORS.SUCCESS : COLORS.WARNING }
              ]}
            />
          </View>
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productExpiry}>
            Expires: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
          <Text style={styles.productQuantity}>{item.quantity} {item.unit}</Text>
          {item.location && (
            <Text style={styles.productLocation}>📍 {item.location}</Text>
          )}
        </View>

        <View style={styles.productFooter}>
          <View style={[styles.statusBadge, { backgroundColor: expiryInfo.color }]}>
            <Text style={styles.statusText}>
              {expiryInfo.status}
              {expiryInfo.status === 'Expired' ? ` (${expiryInfo.days}d ago)` : 
               expiryInfo.status !== 'Fresh' ? ` (${expiryInfo.days}d)` : null}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSortModal = () => (
    <Modal visible={showSortModal} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Sort Products</Text>

          <Text style={styles.filterSectionTitle}>Sort By</Text>
          {SORT_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                sortBy === option.value && styles.selectedSortOption
              ]}
              onPress={() => setSortBy(option.value)}
            >
              <Text style={[
                styles.sortOptionText,
                sortBy === option.value && styles.selectedSortText
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.filterSectionTitle}>Order</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity
              style={[
                styles.filterOption,
                sortOrder === 'asc' && styles.selectedFilterOption
              ]}
              onPress={() => setSortOrder('asc')}
            >
              <Text style={[
                styles.filterOptionText,
                sortOrder === 'asc' && styles.selectedFilterText
              ]}>
                Ascending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterOption,
                sortOrder === 'desc' && styles.selectedFilterOption
              ]}
              onPress={() => setSortOrder('desc')}
            >
              <Text style={[
                styles.filterOptionText,
                sortOrder === 'desc' && styles.selectedFilterText
              ]}>
                Descending
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.modalButton, styles.applyButton, { marginTop: 20 }]}
            onPress={() => setShowSortModal(false)}
          >
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>My Inventory</Text>
          <Text style={styles.subtitle}>{filteredProducts.length} products</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowSortModal(true)}
          >
            <Text style={styles.controlButtonText}>Sort</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      {products.length > 0 && (
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[
              styles.statCard, 
              { backgroundColor: COLORS.EXPIRED },
              filterStatus === 'Expired' && styles.selectedStatCard
            ]}
            onPress={() => handleStatusFilter('Expired')}
          >
            <Text style={styles.statNumber}>{String(getStatusCounts().Expired)}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard, 
              { backgroundColor: COLORS.EXPIRING_SOON },
              filterStatus === 'Expiring Soon' && styles.selectedStatCard
            ]}
            onPress={() => handleStatusFilter('Expiring Soon')}
          >
            <Text style={styles.statNumber}>{String(getStatusCounts()['Expiring Soon'])}</Text>
            <Text style={styles.statLabel}>Expiring</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard, 
              { backgroundColor: COLORS.WARNING },
              filterStatus === 'Warning' && styles.selectedStatCard
            ]}
            onPress={() => handleStatusFilter('Warning')}
          >
            <Text style={styles.statNumber}>{String(getStatusCounts().Warning)}</Text>
            <Text style={styles.statLabel}>Warning</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.statCard, 
              { backgroundColor: COLORS.FRESH },
              filterStatus === 'Fresh' && styles.selectedStatCard
            ]}
            onPress={() => handleStatusFilter('Fresh')}
          >
            <Text style={styles.statNumber}>{String(getStatusCounts().Fresh)}</Text>
            <Text style={styles.statLabel}>Fresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filter Indicator */}
      {filterStatus !== 'All' && (
        <View style={styles.filterIndicator}>
          <Text style={styles.filterIndicatorText}>
            Showing {filterStatus} products only
          </Text>
          <TouchableOpacity onPress={() => setFilterStatus('All')}>
            <Text style={styles.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Product List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.localId}
          style={styles.productList}
          contentContainerStyle={styles.productListContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No products found</Text>
              <Text style={styles.emptySubtext}>
                {searchText || filterCategory !== 'All' || filterStatus !== 'All'
                  ? 'Try adjusting your filters or search terms'
                  : 'Add your first product to get started'
                }
              </Text>
              {(!searchText && filterCategory === 'All' && filterStatus === 'All') && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => navigation.navigate(ROUTES.ADD_PRODUCT)}
                >
                  <Text style={styles.emptyButtonText}>Add Product</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Modals */}
      {renderSortModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  controlsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    backgroundColor: COLORS.WHITE,
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  controlButtonText: {
    color: COLORS.GRAY_DARK,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedStatCard: {
    borderWidth: 3,
    borderColor: COLORS.WHITE,
    transform: [{ scale: 0.95 }],
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.WHITE,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.WHITE,
    marginTop: 2,
  },
  filterIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  filterIndicatorText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: '500',
  },
  clearFilterText: {
    fontSize: 14,
    color: COLORS.PRIMARY,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  errorContainer: {
    backgroundColor: COLORS.ERROR,
    padding: 12,
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.GRAY_DARK,
  },
  productList: {
    flex: 1,
  },
  productListContainer: {
    padding: 20,
  },
  productCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BLACK,
  },
  productBrand: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    marginTop: 2,
  },
  syncStatus: {
    alignItems: 'center',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productDetails: {
    marginBottom: 12,
  },
  productCategory: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    marginBottom: 4,
  },
  productExpiry: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginBottom: 2,
  },
  productQuantity: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginBottom: 2,
  },
  productLocation: {
    fontSize: 12,
    color: COLORS.GRAY_MEDIUM,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.GRAY_MEDIUM,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.BLACK,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_DARK,
    marginTop: 16,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    backgroundColor: COLORS.WHITE,
  },
  selectedFilterOption: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  filterOptionText: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
  },
  selectedFilterText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  sortOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  selectedSortOption: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  sortOptionText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  selectedSortText: {
    fontWeight: '600',
    color: COLORS.PRIMARY,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  clearButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  clearButtonText: {
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  applyButtonText: {
    color: COLORS.WHITE,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default InventoryListScreen;
