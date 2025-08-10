import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addProductThunk as addProduct } from '../../store/thunks/inventoryThunks';
import { COLORS, PRODUCT_CATEGORIES } from '../../constants';

type AddProductScreenNavigationProp = StackNavigationProp<any, 'AddProduct'>;

const AddProductScreen: React.FC = () => {
  const navigation = useNavigation<AddProductScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.inventory);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: '',
    expiryDate: '',
    purchaseDate: '',
    quantity: '1',
    unit: 'pcs',
    price: '',
    location: '',
    notes: '',
    barcode: '',
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Generate date for 30 days from now as default expiry
  const getDefaultExpiryDate = () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    return futureDate.toISOString().split('T')[0];
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Product name is required');
      return false;
    }

    if (!formData.category.trim()) {
      Alert.alert('Error', 'Please select a category');
      return false;
    }

    if (!formData.expiryDate.trim()) {
      Alert.alert('Error', 'Expiry date is required');
      return false;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(formData.expiryDate)) {
      Alert.alert('Error', 'Please enter expiry date in YYYY-MM-DD format');
      return false;
    }

    if (formData.purchaseDate && !dateRegex.test(formData.purchaseDate)) {
      Alert.alert('Error', 'Please enter purchase date in YYYY-MM-DD format');
      return false;
    }

    // Validate quantity
    const quantity = parseInt(formData.quantity);
    if (isNaN(quantity) || quantity < 1) {
      Alert.alert('Error', 'Quantity must be at least 1');
      return false;
    }

    // Validate price if provided
    if (formData.price && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0)) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const productData = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        category: formData.category,
        expiryDate: formData.expiryDate,
        purchaseDate: formData.purchaseDate || undefined,
        quantity: parseInt(formData.quantity),
        unit: formData.unit || 'pcs',
        price: formData.price ? parseFloat(formData.price) : undefined,
        location: formData.location.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        isFinished: false,
        userId: 'offline-user',
      };

      await dispatch(addProduct(productData)).unwrap();
      
      Alert.alert(
        'Success',
        'Product added successfully!',
        [
          {
            text: 'Add Another',
            onPress: () => {
              // Reset form but keep category
              const currentCategory = formData.category;
              setFormData({
                name: '',
                brand: '',
                category: currentCategory,
                expiryDate: getDefaultExpiryDate(),
                purchaseDate: getTodayDate(),
                quantity: '1',
                unit: 'pcs',
                price: '',
                location: '',
                notes: '',
                barcode: '',
              });
            }
          },
          {
            text: 'Go Back',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to add product: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const selectCategory = (category: string) => {
    setFormData({ ...formData, category });
    setShowCategoryModal(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      category: '',
      expiryDate: getDefaultExpiryDate(),
      purchaseDate: getTodayDate(),
      quantity: '1',
      unit: 'pcs',
      price: '',
      location: '',
      notes: '',
      barcode: '',
    });
  };

  // Initialize dates when component mounts
  React.useEffect(() => {
    if (!formData.expiryDate) {
      setFormData(prev => ({
        ...prev,
        expiryDate: getDefaultExpiryDate(),
        purchaseDate: getTodayDate(),
      }));
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Product</Text>
        <Text style={styles.subtitle}>Enter product details to track expiry dates</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Product Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter product name"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Brand</Text>
          <TextInput
            style={styles.input}
            value={formData.brand}
            onChangeText={(text) => setFormData({ ...formData, brand: text })}
            placeholder="Enter brand name"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Category *</Text>
          <TouchableOpacity
            style={[styles.input, styles.categorySelector]}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={[styles.categoryText, !formData.category && styles.placeholderText]}>
              {formData.category || 'Select category'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowContainer}>
          <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.fieldLabel}>Quantity</Text>
            <TextInput
              style={styles.input}
              value={formData.quantity}
              onChangeText={(text) => setFormData({ ...formData, quantity: text })}
              placeholder="1"
              keyboardType="numeric"
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />
          </View>

          <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              style={styles.input}
              value={formData.unit}
              onChangeText={(text) => setFormData({ ...formData, unit: text })}
              placeholder="pcs"
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Expiry Date * (YYYY-MM-DD)</Text>
          <View style={styles.inputWithButton}>
            <TextInput
              style={[styles.input, styles.inputWithButtonField]}
              value={formData.expiryDate}
              onChangeText={(text) => setFormData({ ...formData, expiryDate: text })}
              placeholder="2025-12-31"
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => navigation.navigate('ExpiryDateScanner', {
                onDateScanned: (date: string) => {
                  setFormData({ ...formData, expiryDate: date });
                }
              })}
            >
              <MaterialIcons name="camera-alt" size={20} color={COLORS.PRIMARY} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Purchase Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={formData.purchaseDate}
            onChangeText={(text) => setFormData({ ...formData, purchaseDate: text })}
            placeholder="2025-08-10"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Price</Text>
          <TextInput
            style={styles.input}
            value={formData.price}
            onChangeText={(text) => setFormData({ ...formData, price: text })}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            style={styles.input}
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            placeholder="Fridge, Pantry, etc."
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Barcode</Text>
          <TextInput
            style={styles.input}
            value={formData.barcode}
            onChangeText={(text) => setFormData({ ...formData, barcode: text })}
            placeholder="Scan or enter barcode"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            placeholder="Additional notes about the product..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={COLORS.GRAY_MEDIUM}
          />
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetForm}
        >
          <Text style={styles.resetButtonText}>Reset Form</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={saving || isLoading}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.WHITE} />
          ) : (
            <Text style={styles.submitButtonText}>Add Product</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            
            <FlatList
              data={PRODUCT_CATEGORIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryItem,
                    formData.category === item && styles.selectedCategoryItem
                  ]}
                  onPress={() => selectCategory(item)}
                >
                  <Text style={[
                    styles.categoryItemText,
                    formData.category === item && styles.selectedCategoryText
                  ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
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
    backgroundColor: COLORS.WHITE,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.GRAY_DARK,
  },
  form: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY_DARK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
    color: COLORS.BLACK,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  categorySelector: {
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  placeholderText: {
    color: COLORS.GRAY_MEDIUM,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
  },
  resetButtonText: {
    color: COLORS.GRAY_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  submitButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
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
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.BLACK,
  },
  categoryItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  selectedCategoryItem: {
    backgroundColor: COLORS.PRIMARY,
  },
  categoryItemText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  selectedCategoryText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithButtonField: {
    flex: 1,
    marginRight: 10,
  },
  scanButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY,
  },
});

export default AddProductScreen;
