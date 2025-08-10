import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MedicineForm, MedicineFormData } from '../../types';
import MedicineService from '../../services/MedicineService';
import { MedicineStackParamList } from '../../navigation/MainTabNavigator';

type NavigationProp = StackNavigationProp<MedicineStackParamList, 'AddMedicine'>;

const COLORS = {
  PRIMARY: '#2196F3',
  SUCCESS: '#4CAF50',
  ERROR: '#F44336',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: '#666666',
  LIGHT_GRAY: '#F5F5F5',
  BORDER: '#E0E0E0',
};

const MEDICINE_FORMS: { value: MedicineForm; label: string }[] = [
  { value: 'tablet', label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'injection', label: 'Injection' },
  { value: 'drops', label: 'Drops' },
  { value: 'cream', label: 'Cream' },
  { value: 'ointment', label: 'Ointment' },
  { value: 'inhaler', label: 'Inhaler' },
  { value: 'other', label: 'Other' },
];

const AddMedicineScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [formData, setFormData] = useState<MedicineFormData>({
    name: '',
    brand: '',
    dosage: '',
    form: 'tablet',
    totalQuantity: 0,
    expiryDate: new Date().toISOString().split('T')[0],
    batchNumber: '',
    notes: '',
  });
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Medicine name is required';
    }

    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }

    if (formData.totalQuantity <= 0) {
      newErrors.totalQuantity = 'Quantity must be greater than 0';
    }

    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else {
      const expiryDate = new Date(formData.expiryDate);
      if (expiryDate <= new Date()) {
        newErrors.expiryDate = 'Expiry date must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const newMedicine = {
        name: formData.name.trim(),
        brand: formData.brand?.trim() || undefined,
        dosage: formData.dosage.trim(),
        form: formData.form,
        totalQuantity: formData.totalQuantity,
        remainingQuantity: formData.totalQuantity, // Initially, remaining = total
        expiryDate: formData.expiryDate,
        batchNumber: formData.batchNumber?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        isActive: true, // New medicines are active by default
        userId: 'local_user', // Will be updated when auth is implemented
      };

      await MedicineService.addMedicine(newMedicine);
      Alert.alert('Success', 'Medicine added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to add medicine');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormPicker = () => (
    <Modal visible={showFormPicker} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Medicine Form</Text>
          <ScrollView style={styles.formList}>
            {MEDICINE_FORMS.map((form) => (
              <TouchableOpacity
                key={form.value}
                style={[
                  styles.formOption,
                  formData.form === form.value && styles.selectedFormOption
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, form: form.value }));
                  setShowFormPicker(false);
                }}
              >
                <Text style={[
                  styles.formOptionText,
                  formData.form === form.value && styles.selectedFormText
                ]}>
                  {form.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowFormPicker(false)}
          >
            <Text style={styles.modalCloseText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Medicine Information</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Medicine Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={formData.name}
            onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            placeholder="e.g., Paracetamol"
            autoCapitalize="words"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Brand (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.brand}
            onChangeText={(text) => setFormData(prev => ({ ...prev, brand: text }))}
            placeholder="e.g., Crocin"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Dosage *</Text>
            <TextInput
              style={[styles.input, errors.dosage && styles.inputError]}
              value={formData.dosage}
              onChangeText={(text) => setFormData(prev => ({ ...prev, dosage: text }))}
              placeholder="e.g., 500mg"
            />
            {errors.dosage && <Text style={styles.errorText}>{errors.dosage}</Text>}
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Form *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowFormPicker(true)}
            >
              <Text style={styles.pickerText}>
                {MEDICINE_FORMS.find(f => f.value === formData.form)?.label || 'Select'}
              </Text>
              <Text style={styles.pickerArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Total Quantity *</Text>
          <TextInput
            style={[styles.input, errors.totalQuantity && styles.inputError]}
            value={formData.totalQuantity.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || 0;
              setFormData(prev => ({ ...prev, totalQuantity: num }));
            }}
            placeholder="e.g., 30"
            keyboardType="numeric"
          />
          {errors.totalQuantity && <Text style={styles.errorText}>{errors.totalQuantity}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expiry Date *</Text>
          <TextInput
            style={[styles.input, errors.expiryDate && styles.inputError]}
            value={formData.expiryDate}
            onChangeText={(text) => setFormData(prev => ({ ...prev, expiryDate: text }))}
            placeholder="YYYY-MM-DD"
          />
          {errors.expiryDate && <Text style={styles.errorText}>{errors.expiryDate}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Batch Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.batchNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, batchNumber: text }))}
            placeholder="e.g., B123456"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            placeholder="Additional notes about this medicine..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Adding...' : 'Add Medicine'}
          </Text>
        </TouchableOpacity>
      </View>

      {renderFormPicker()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.BLACK,
    backgroundColor: COLORS.WHITE,
  },
  inputError: {
    borderColor: COLORS.ERROR,
  },
  textArea: {
    height: 80,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  picker: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  pickerArrow: {
    fontSize: 12,
    color: COLORS.GRAY,
  },
  errorText: {
    color: COLORS.ERROR,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.GRAY,
  },
  submitButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  formList: {
    maxHeight: 300,
  },
  formOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  selectedFormOption: {
    backgroundColor: COLORS.PRIMARY,
  },
  formOptionText: {
    fontSize: 16,
    color: COLORS.BLACK,
  },
  selectedFormText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: COLORS.GRAY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AddMedicineScreen;
