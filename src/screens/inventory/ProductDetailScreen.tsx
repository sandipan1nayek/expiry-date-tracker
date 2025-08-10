import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadProducts,
  deleteProductThunk as deleteProduct,
  updateProductThunk as updateProduct,
} from '../../store/thunks/inventoryThunks';
import { COLORS, PRODUCT_CATEGORIES } from '../../constants';
import SettingsService from '../../services/SettingsService';
import { LocalProduct, ExpirySettings } from '../../types';

type ProductDetailRouteProp = RouteProp<{ ProductDetail: { productId: string } }, 'ProductDetail'>;
type ProductDetailNavigationProp = StackNavigationProp<any, 'ProductDetail'>;

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const dispatch = useAppDispatch();
  const { products, isLoading } = useAppSelector(state => state.inventory);

  const [product, setProduct] = useState<LocalProduct | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    brand: '',
    category: '',
    expiryDate: '',
    quantity: '',
    unit: '',
    price: '',
    location: '',
    notes: '',
  });

  const productId = route.params?.productId;

  useEffect(() => {
    if (products.length === 0) {
      dispatch(loadProducts());
    }
  }, [dispatch, products.length]);

  useEffect(() => {
    if (productId && products.length > 0) {
      const foundProduct = products.find(p => p.localId === productId);
      if (foundProduct) {
        setProduct(foundProduct);
        setEditData({
          name: foundProduct.name,
          brand: foundProduct.brand || '',
          category: foundProduct.category,
          expiryDate: foundProduct.expiryDate,
          quantity: foundProduct.quantity.toString(),
          unit: foundProduct.unit,
          price: foundProduct.price?.toString() || '',
          location: foundProduct.location || '',
          notes: foundProduct.notes || '',
        });
      }
    }
  }, [productId, products]);

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

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteProduct(product.localId)).unwrap();
              Alert.alert('Success', 'Product deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const handleEdit = async () => {
    if (!product) return;

    // Validate required fields
    if (!editData.name.trim() || !editData.expiryDate.trim() || !editData.category.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(editData.expiryDate)) {
      Alert.alert('Error', 'Please enter expiry date in YYYY-MM-DD format');
      return;
    }

    try {
      const updates: Partial<LocalProduct> = {
        name: editData.name.trim(),
        brand: editData.brand.trim() || undefined,
        category: editData.category,
        expiryDate: editData.expiryDate,
        quantity: parseInt(editData.quantity) || 1,
        unit: editData.unit || 'pcs',
        price: editData.price ? parseFloat(editData.price) : undefined,
        location: editData.location.trim() || undefined,
        notes: editData.notes.trim() || undefined,
      };

      await dispatch(updateProduct({ localId: product.localId, updates })).unwrap();
      setShowEditModal(false);
      Alert.alert('Success', 'Product updated successfully');
      
      // Refresh products to show updated data
      dispatch(loadProducts());
    } catch (error) {
      Alert.alert('Error', 'Failed to update product');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const expiryInfo = getExpiryStatus(product.expiryDate);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.brand && <Text style={styles.productBrand}>{product.brand}</Text>}
          <View style={[styles.statusBadge, { backgroundColor: expiryInfo.color }]}>
            <Text style={styles.statusText}>
              {expiryInfo.status}
              {expiryInfo.status === 'Expired' ? ` (${expiryInfo.days} days ago)` : 
               expiryInfo.status !== 'Fresh' ? ` (${expiryInfo.days} days)` : 
               ` (${expiryInfo.days} days)`}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>{product.category}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expiry Date</Text>
          <Text style={styles.detailValue}>{formatDate(product.expiryDate)}</Text>
        </View>

        {product.purchaseDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purchase Date</Text>
            <Text style={styles.detailValue}>{formatDate(product.purchaseDate)}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <Text style={styles.detailValue}>{product.quantity} {product.unit}</Text>
        </View>

        {product.price && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>${product.price.toFixed(2)}</Text>
          </View>
        )}

        {product.location && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{product.location}</Text>
          </View>
        )}

        {product.barcode && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Barcode</Text>
            <Text style={styles.detailValue}>{product.barcode}</Text>
          </View>
        )}

        {product.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={styles.detailValue}>{product.notes}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Added</Text>
          <Text style={styles.detailValue}>{formatDate(product.createdAt)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Last Updated</Text>
          <Text style={styles.detailValue}>{formatDate(product.updatedAt)}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Sync Status</Text>
          <View style={styles.syncStatus}>
            <View
              style={[
                styles.syncIndicator,
                { backgroundColor: product.syncStatus === 'synced' ? COLORS.SUCCESS : COLORS.WARNING }
              ]}
            />
            <Text style={styles.detailValue}>{product.syncStatus}</Text>
          </View>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Product</Text>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Enter product name"
              />

              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput
                style={styles.input}
                value={editData.brand}
                onChangeText={(text) => setEditData({ ...editData, brand: text })}
                placeholder="Enter brand name"
              />

              <Text style={styles.fieldLabel}>Category *</Text>
              <TextInput
                style={styles.input}
                value={editData.category}
                onChangeText={(text) => setEditData({ ...editData, category: text })}
                placeholder="Enter category"
              />

              <Text style={styles.fieldLabel}>Expiry Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={editData.expiryDate}
                onChangeText={(text) => setEditData({ ...editData, expiryDate: text })}
                placeholder="2025-12-31"
              />

              <Text style={styles.fieldLabel}>Quantity</Text>
              <TextInput
                style={styles.input}
                value={editData.quantity}
                onChangeText={(text) => setEditData({ ...editData, quantity: text })}
                placeholder="1"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput
                style={styles.input}
                value={editData.unit}
                onChangeText={(text) => setEditData({ ...editData, unit: text })}
                placeholder="pcs"
              />

              <Text style={styles.fieldLabel}>Price</Text>
              <TextInput
                style={styles.input}
                value={editData.price}
                onChangeText={(text) => setEditData({ ...editData, price: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Location</Text>
              <TextInput
                style={styles.input}
                value={editData.location}
                onChangeText={(text) => setEditData({ ...editData, location: text })}
                placeholder="Fridge, Pantry, etc."
              />

              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={editData.notes}
                onChangeText={(text) => setEditData({ ...editData, notes: text })}
                placeholder="Additional notes..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEdit}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.GRAY_DARK,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  errorText: {
    fontSize: 18,
    color: COLORS.ERROR,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_MEDIUM,
  },
  productInfo: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  editButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  deleteButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsContainer: {
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_DARK,
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.BLACK,
    flex: 2,
    textAlign: 'right',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  syncIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.BLACK,
  },
  formContainer: {
    maxHeight: 400,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
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

export default ProductDetailScreen;
