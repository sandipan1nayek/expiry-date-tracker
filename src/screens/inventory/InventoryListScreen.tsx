import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  initializeDatabase,
  loadProducts,
  deleteProductThunk as deleteProduct,
  addProductThunk as addProduct,
  searchProductsThunk as searchProducts,
} from '../../store/thunks/inventoryThunks';
import { setSearchQuery, clearAllProducts } from '../../store/slices/inventorySlice';
import { COLORS, ROUTES } from '../../constants';
import { LocalProduct } from '../../types';

type InventoryListScreenNavigationProp = StackNavigationProp<any, 'InventoryList'>;

const InventoryListScreen: React.FC = () => {
  const navigation = useNavigation<InventoryListScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { products, isLoading, error, searchQuery } = useAppSelector(state => state.inventory);

  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    expiryDate: '',
    category: '',
    quantity: '1',
  });

  useEffect(() => {
    handleLoadProducts();
  }, []);

  const handleLoadProducts = async () => {
    try {
      // Initialize database first if not already done
      await dispatch(initializeDatabase()).unwrap();
      // Then load products
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

  const handleSearch = (text: string) => {
    setSearchText(text);
    dispatch(setSearchQuery(text));
    if (text.trim()) {
      dispatch(searchProducts(text));
    } else {
      dispatch(setSearchQuery(''));
    }
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
          onPress: () => dispatch(deleteProduct(product.localId)),
        },
      ]
    );
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.expiryDate.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(newProduct.expiryDate)) {
      Alert.alert('Error', 'Please enter expiry date in YYYY-MM-DD format');
      return;
    }

    try {
      const productData = {
        name: newProduct.name.trim(),
        brand: '',
        category: newProduct.category.trim() || 'Other',
        expiryDate: newProduct.expiryDate,
        quantity: parseInt(newProduct.quantity) || 1,
        unit: 'pcs',
        isFinished: false,
        notes: '',
        userId: 'demo-user-123', // TODO: Get from auth state
        purchaseDate: new Date().toISOString().split('T')[0],
        location: '',
        price: 0,
      };

      console.log('Adding product:', productData);
      await dispatch(addProduct(productData)).unwrap();

      setNewProduct({ name: '', expiryDate: '', category: '', quantity: '1' });
      setShowAddModal(false);
      Alert.alert('Success', 'Product added successfully!');
    } catch (error) {
      console.error('Failed to add product:', error);
      Alert.alert('Error', `Failed to add product: ${error}`);
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'Expired', color: COLORS.EXPIRED };
    if (diffDays <= 3) return { status: 'Expiring Soon', color: COLORS.EXPIRING_SOON };
    if (diffDays <= 7) return { status: 'Warning', color: COLORS.WARNING };
    return { status: 'Fresh', color: COLORS.FRESH };
  };

  const renderProduct = ({ item }: { item: LocalProduct }) => {
    const expiryInfo = getExpiryStatus(item.expiryDate);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, { borderLeftColor: expiryInfo.color }]}
        onPress={() => navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId: item.localId })}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          <View style={styles.syncStatus}>
            <View
              style={[
                styles.syncIndicator,
                { backgroundColor: item.syncStatus === 'synced' ? COLORS.SUCCESS : COLORS.WARNING }
              ]}
            />
          </View>
        </View>

        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productExpiry}>
          Expires: {new Date(item.expiryDate).toLocaleDateString()}
        </Text>
        <Text style={styles.productQuantity}>Quantity: {item.quantity} {item.unit}</Text>

        <View style={styles.productFooter}>
          <Text style={[styles.productStatus, { color: expiryInfo.color }]}>
            {expiryInfo.status}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteProduct(item)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.localId}
        style={styles.productList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
            <Text style={styles.emptySubtext}>Add your first product to get started</Text>
          </View>
        }
      />

      {/* Add Product Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Product</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Product Name"
              value={newProduct.name}
              onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Category"
              value={newProduct.category}
              onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Expiry Date (YYYY-MM-DD)"
              value={newProduct.expiryDate}
              onChangeText={(text) => setNewProduct({ ...newProduct, expiryDate: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Quantity"
              value={newProduct.quantity}
              onChangeText={(text) => setNewProduct({ ...newProduct, quantity: text })}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddProduct}
              >
                <Text style={styles.saveButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
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
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: COLORS.ERROR,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.WHITE,
    textAlign: 'center',
  },
  productList: {
    flex: 1,
  },
  productCard: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.GRAY_LIGHT,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.BLACK,
    flex: 1,
  },
  syncStatus: {
    alignItems: 'center',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  productCategory: {
    fontSize: 14,
    color: COLORS.GRAY_MEDIUM,
    marginBottom: 4,
  },
  productExpiry: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
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
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    color: COLORS.BLACK,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  cancelButtonText: {
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default InventoryListScreen;
