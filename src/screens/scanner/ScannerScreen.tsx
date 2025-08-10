import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addProductThunk } from '../../store/thunks/inventoryThunks';
import { COLORS, ROUTES, PRODUCT_CATEGORIES } from '../../constants';

const { width, height } = Dimensions.get('window');

type ScannerScreenNavigationProp = StackNavigationProp<any, 'Scanner'>;

interface ScannedProduct {
  barcode: string;
  productName?: string;
  brand?: string;
  category?: string;
}

const ScannerScreen: React.FC = () => {
  const navigation = useNavigation<ScannerScreenNavigationProp>();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector(state => state.inventory);

  // Permission and camera states
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Scanner states
  const [scannerActive, setScannerActive] = useState(true);
  const [flashMode, setFlashMode] = useState(false);
  const [cameraType, setCameraType] = useState<CameraType>('back');

  // Product creation modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [lookingUpProduct, setLookingUpProduct] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  
  // Product form data
  const [productData, setProductData] = useState({
    name: '',
    brand: '',
    category: 'Other',
    quantity: '1',
    unit: 'pcs',
    expiryDate: '',
    price: '',
    location: '',
    notes: '',
  });

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    return () => {
      setScannerActive(false);
    };
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (!scannerActive || scanned) return;

    setScanned(true);
    setScannerActive(false);
    setCurrentBarcode(data);

    console.log(`Barcode scanned: ${data} (Type: ${type})`);

    // Look up product information
    await lookupProductInfo(data);
    
    // Show product creation modal
    setShowProductModal(true);
  };

  const lookupProductInfo = async (barcode: string) => {
    setLookingUpProduct(true);
    
    try {
      // Try multiple APIs for product lookup
      const productInfo = await tryProductLookup(barcode);
      
      if (productInfo) {
        setProductData(prev => ({
          ...prev,
          name: productInfo.productName || prev.name,
          brand: productInfo.brand || prev.brand,
          category: productInfo.category || prev.category,
        }));
      }
    } catch (error) {
      console.log('Product lookup failed, user will enter manually');
    } finally {
      setLookingUpProduct(false);
    }
  };

  const tryProductLookup = async (barcode: string): Promise<ScannedProduct | null> => {
    // Note: In a real app, you would call actual barcode lookup APIs
    // For this demo, we'll simulate some product lookups
    
    const mockProducts: { [key: string]: ScannedProduct } = {
      '123456789012': {
        barcode,
        productName: 'Coca Cola 500ml',
        brand: 'Coca Cola',
        category: 'Beverages',
      },
      '987654321098': {
        barcode,
        productName: 'Organic Milk 1L',
        brand: 'Organic Valley',
        category: 'Dairy',
      },
      '456789123456': {
        barcode,
        productName: 'Whole Wheat Bread',
        brand: 'Wonder Bread',
        category: 'Bakery',
      },
    };

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockProducts[barcode] || null;
  };

  const handleAddProduct = async () => {
    if (!productData.name.trim()) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    if (!productData.expiryDate.trim()) {
      Alert.alert('Error', 'Please enter an expiry date');
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(productData.expiryDate)) {
      Alert.alert('Error', 'Please enter expiry date in YYYY-MM-DD format');
      return;
    }

    try {
      const newProduct = {
        name: productData.name.trim(),
        brand: productData.brand.trim(),
        category: productData.category,
        expiryDate: productData.expiryDate,
        quantity: parseInt(productData.quantity) || 1,
        unit: productData.unit,
        price: parseFloat(productData.price) || 0,
        location: productData.location.trim(),
        notes: `Scanned barcode: ${currentBarcode}${productData.notes ? `\n${productData.notes}` : ''}`,
        userId: 'demo-user-123',
        purchaseDate: new Date().toISOString().split('T')[0],
        barcode: currentBarcode,
        isFinished: false,
      };

      await dispatch(addProductThunk(newProduct)).unwrap();
      
      Alert.alert(
        'Success!',
        'Product added successfully',
        [
          { text: 'Scan Another', onPress: handleScanAnother },
          { text: 'View Inventory', onPress: () => navigation.navigate('InventoryTab') },
        ]
      );
      
      setShowProductModal(false);
      resetProductForm();
      
    } catch (error) {
      console.error('Failed to add product:', error);
      Alert.alert('Error', 'Failed to add product. Please try again.');
    }
  };

  const handleScanAnother = () => {
    setScanned(false);
    setScannerActive(true);
    setCurrentBarcode('');
    resetProductForm();
  };

  const resetProductForm = () => {
    setProductData({
      name: '',
      brand: '',
      category: 'Other',
      quantity: '1',
      unit: 'pcs',
      expiryDate: '',
      price: '',
      location: '',
      notes: '',
    });
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setScanned(false);
    setScannerActive(true);
    setCurrentBarcode('');
    resetProductForm();
  };

  const toggleFlash = () => {
    setFlashMode(!flashMode);
  };

  const switchCamera = () => {
    setCameraType(cameraType === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorTitle}>No Camera Access</Text>
        <Text style={styles.errorText}>
          Camera permission is required to scan barcodes.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestPermission}>
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.navigate('InventoryTab')}
        >
          <Text style={styles.manualButtonText}>Add Product Manually</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView
        style={styles.camera}
        facing={cameraType}
        enableTorch={flashMode}
        onBarcodeScanned={scannerActive ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
      />
      
      {/* Overlay positioned absolutely over camera */}
      <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <Text style={styles.headerButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Barcode</Text>
            <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
              <Text style={styles.headerButtonText}>{flashMode ? '🔦' : '💡'}</Text>
            </TouchableOpacity>
          </View>

          {/* Scanning Frame */}
          <View style={styles.scanningContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Scanning line animation could be added here */}
              <Text style={styles.scanInstructions}>
                Point camera at barcode
              </Text>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
              <Text style={styles.controlButtonText}>🔄</Text>
              <Text style={styles.controlButtonLabel}>Flip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => navigation.navigate('InventoryTab')}
            >
              <Text style={styles.controlButtonText}>⌨️</Text>
              <Text style={styles.controlButtonLabel}>Manual</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => navigation.navigate('InventoryTab')}
            >
              <Text style={styles.controlButtonText}>📋</Text>
              <Text style={styles.controlButtonLabel}>Inventory</Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Product Creation Modal */}
      <Modal visible={showProductModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Scanned Product</Text>
            <TouchableOpacity onPress={handleCloseModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {lookingUpProduct && (
            <View style={styles.lookupContainer}>
              <ActivityIndicator color={COLORS.PRIMARY} />
              <Text style={styles.lookupText}>Looking up product info...</Text>
            </View>
          )}

          <View style={styles.barcodeContainer}>
            <Text style={styles.barcodeLabel}>Barcode:</Text>
            <Text style={styles.barcodeText}>{currentBarcode}</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="Product Name *"
              value={productData.name}
              onChangeText={(text) => setProductData({ ...productData, name: text })}
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />

            <TextInput
              style={styles.input}
              placeholder="Brand"
              value={productData.brand}
              onChangeText={(text) => setProductData({ ...productData, brand: text })}
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />

            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Text style={styles.categoryButtonText}>{productData.category}</Text>
              <Text style={styles.categoryButtonArrow}>▼</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Quantity"
                value={productData.quantity}
                onChangeText={(text) => setProductData({ ...productData, quantity: text })}
                keyboardType="numeric"
                placeholderTextColor={COLORS.GRAY_MEDIUM}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Unit"
                value={productData.unit}
                onChangeText={(text) => setProductData({ ...productData, unit: text })}
                placeholderTextColor={COLORS.GRAY_MEDIUM}
              />
            </View>

            <TextInput
              style={styles.input}
              placeholder="Expiry Date (YYYY-MM-DD) *"
              value={productData.expiryDate}
              onChangeText={(text) => setProductData({ ...productData, expiryDate: text })}
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Price"
                value={productData.price}
                onChangeText={(text) => setProductData({ ...productData, price: text })}
                keyboardType="numeric"
                placeholderTextColor={COLORS.GRAY_MEDIUM}
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Location"
                value={productData.location}
                onChangeText={(text) => setProductData({ ...productData, location: text })}
                placeholderTextColor={COLORS.GRAY_MEDIUM}
              />
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes"
              value={productData.notes}
              onChangeText={(text) => setProductData({ ...productData, notes: text })}
              multiline
              numberOfLines={3}
              placeholderTextColor={COLORS.GRAY_MEDIUM}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleCloseModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.addButton]}
              onPress={handleAddProduct}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.WHITE} size="small" />
              ) : (
                <Text style={styles.addButtonText}>Add Product</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} transparent animationType="slide">
        <View style={styles.categoryModalContainer}>
          <View style={styles.categoryModalContent}>
            <Text style={styles.categoryModalTitle}>Select Category</Text>
            {PRODUCT_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryOption,
                  productData.category === category && styles.selectedCategory
                ]}
                onPress={() => {
                  setProductData({ ...productData, category });
                  setShowCategoryModal(false);
                }}
              >
                <Text style={[
                  styles.categoryOptionText,
                  productData.category === category && styles.selectedCategoryText
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BLACK,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.WHITE,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.PRIMARY,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scanInstructions: {
    color: COLORS.WHITE,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 80,
  },
  controlButtonText: {
    color: COLORS.WHITE,
    fontSize: 24,
    marginBottom: 4,
  },
  controlButtonLabel: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.GRAY_DARK,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.ERROR,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.GRAY_DARK,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  manualButtonText: {
    color: COLORS.GRAY_DARK,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  closeButton: {
    fontSize: 24,
    color: COLORS.GRAY_DARK,
  },
  lookupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  lookupText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.GRAY_DARK,
  },
  barcodeContainer: {
    backgroundColor: COLORS.GRAY_LIGHT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  barcodeLabel: {
    fontSize: 14,
    color: COLORS.GRAY_DARK,
    marginRight: 8,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  formContainer: {
    flex: 1,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: COLORS.WHITE,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_MEDIUM,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  categoryButtonText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  categoryButtonArrow: {
    fontSize: 12,
    color: COLORS.GRAY_MEDIUM,
  },
  modalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.GRAY_LIGHT,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.GRAY_LIGHT,
  },
  cancelButtonText: {
    color: COLORS.GRAY_DARK,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
  categoryModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: COLORS.WHITE,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  categoryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
    color: COLORS.BLACK,
  },
  categoryOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.GRAY_LIGHT,
  },
  selectedCategory: {
    backgroundColor: COLORS.PRIMARY,
  },
  categoryOptionText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  selectedCategoryText: {
    color: COLORS.WHITE,
    fontWeight: '600',
  },
});

export default ScannerScreen;
