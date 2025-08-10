import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera, CameraView } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import OCRService from '../../services/OCRService';

type ExpiryDateScannerScreenRouteProp = RouteProp<{
  ExpiryDateScanner: {
    onDateScanned?: (date: string) => void;
  };
}, 'ExpiryDateScanner'>;

type ExpiryDateScannerScreenNavigationProp = StackNavigationProp<any, 'ExpiryDateScanner'>;

const ExpiryDateScannerScreen: React.FC = () => {
  const navigation = useNavigation<ExpiryDateScannerScreenNavigationProp>();
  const route = useRoute<ExpiryDateScannerScreenRouteProp>();
  const { onDateScanned } = route.params || {};

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedText, setScannedText] = useState<string>('');

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const simulateOCRScan = async () => {
    setIsScanning(true);
    
    try {
      // Simulate OCR scanning
      const result = await OCRService.scanExpiryDateFromCamera();
      
      if (result.success && result.expiryDate) {
        setScannedText(result.text || '');
        
        Alert.alert(
          'Expiry Date Found!',
          `Detected: ${result.expiryDate}\n\nText: "${result.text}"`,
          [
            {
              text: 'Try Again',
              style: 'cancel',
            },
            {
              text: 'Use This Date',
              onPress: () => {
                if (onDateScanned) {
                  onDateScanned(result.expiryDate!);
                }
                navigation.goBack();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'No Date Found',
          'Could not detect an expiry date. Please try again or enter manually.',
          [
            {
              text: 'Try Again',
              style: 'cancel',
            },
            {
              text: 'Enter Manually',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Scan Error',
        'Failed to scan expiry date. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestOCR = () => {
    // Test the OCR parsing with different formats
    OCRService.testExpiryDateParsing();
    Alert.alert(
      'OCR Test',
      'Check the console for test results of expiry date parsing.',
      [{ text: 'OK' }]
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Expiry Date</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={handleTestOCR}
        >
          <MaterialIcons name="science" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <CameraView style={styles.camera}>
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <Text style={styles.instructionText}>
              Position the expiry date within the frame
            </Text>
            <View style={styles.scanFrame} />
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
              onPress={simulateOCRScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <>
                  <MaterialIcons name="camera" size={32} color="#fff" />
                  <Text style={styles.scanButtonText}>Scan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>

      {scannedText ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Last Scanned Text:</Text>
          <Text style={styles.resultText}>{scannedText}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  testButton: {
    padding: 8,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 8,
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanButton: {
    backgroundColor: '#2196F3',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scanButtonDisabled: {
    backgroundColor: '#666',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  resultContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 8,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultText: {
    color: '#fff',
    fontSize: 12,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExpiryDateScannerScreen;
