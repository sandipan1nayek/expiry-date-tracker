import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LocalMedicine, LocalMedicineSchedule } from '../../types';
import MedicineService from '../../services/MedicineService';
import { MedicineStackParamList } from '../../navigation/MainTabNavigator';

type NavigationProp = StackNavigationProp<MedicineStackParamList, 'MedicineDetail'>;

const COLORS = {
  PRIMARY: '#2196F3',
  SECONDARY: '#FF9800',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: '#666666',
  LIGHT_GRAY: '#F5F5F5',
  EXPIRED: '#F44336',
  EXPIRING_SOON: '#FF9800',
  FRESH: '#4CAF50',
};

const MedicineDetailScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { medicineId } = route.params as { medicineId: string };
  
  const [medicine, setMedicine] = useState<LocalMedicine | null>(null);
  const [schedules, setSchedules] = useState<LocalMedicineSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    brand: '',
    dosage: '',
    remainingQuantity: 0,
    totalQuantity: 0,
  });

  useFocusEffect(
    React.useCallback(() => {
      loadMedicineDetails();
    }, [])
  );

  const loadMedicineDetails = async () => {
    setIsLoading(true);
    try {
      const medicineData = await MedicineService.getMedicineById(medicineId);
      if (medicineData) {
        setMedicine(medicineData);
        setEditForm({
          name: medicineData.name,
          brand: medicineData.brand || '',
          dosage: medicineData.dosage,
          remainingQuantity: medicineData.remainingQuantity,
          totalQuantity: medicineData.totalQuantity,
        });
        
        const medicineSchedules = await MedicineService.getSchedulesByMedicineId(medicineId);
        setSchedules(medicineSchedules);
      } else {
        Alert.alert('Error', 'Medicine not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load medicine details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete "${medicine?.name}"? This will also delete all schedules and intake records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MedicineService.deleteMedicine(medicineId);
              Alert.alert('Success', 'Medicine deleted successfully');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medicine');
            }
          },
        },
      ]
    );
  };

  const handleEdit = async () => {
    try {
      if (!editForm.name.trim()) {
        Alert.alert('Error', 'Medicine name is required');
        return;
      }

      await MedicineService.updateMedicine(medicineId, {
        name: editForm.name.trim(),
        brand: editForm.brand.trim() || undefined,
        dosage: editForm.dosage.trim(),
        remainingQuantity: editForm.remainingQuantity,
        totalQuantity: editForm.totalQuantity,
      });

      Alert.alert('Success', 'Medicine updated successfully');
      setShowEditModal(false);
      loadMedicineDetails();
    } catch (error) {
      Alert.alert('Error', 'Failed to update medicine');
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (daysUntilExpiry <= 0) {
      return { status: 'Expired', color: COLORS.EXPIRED, days: Math.abs(daysUntilExpiry) };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'Expiring Soon', color: COLORS.EXPIRING_SOON, days: daysUntilExpiry };
    } else {
      return { status: 'Fresh', color: COLORS.FRESH, days: daysUntilExpiry };
    }
  };

  const getStockStatus = (remaining: number, total: number) => {
    const percentage = total > 0 ? (remaining / total) * 100 : 0;
    if (percentage <= 10) {
      return { status: 'Critical', color: COLORS.ERROR };
    } else if (percentage <= 25) {
      return { status: 'Low', color: COLORS.WARNING };
    } else {
      return { status: 'Good', color: COLORS.SUCCESS };
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!medicine) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Medicine not found</Text>
      </View>
    );
  }

  const expiryInfo = getExpiryStatus(medicine.expiryDate);
  const stockInfo = getStockStatus(medicine.remainingQuantity, medicine.totalQuantity);

  return (
    <ScrollView style={styles.container}>
      {/* Medicine Header */}
      <View style={styles.header}>
        <View style={styles.medicineInfo}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          {medicine.brand && <Text style={styles.medicineBrand}>{medicine.brand}</Text>}
          <Text style={styles.medicineDosage}>{medicine.dosage} • {medicine.form}</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: expiryInfo.color }]}>
            <Text style={styles.statusText}>{expiryInfo.status}</Text>
          </View>
          {medicine.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stock Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stock Information</Text>
        <View style={styles.stockContainer}>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Remaining</Text>
            <Text style={[styles.stockValue, { color: stockInfo.color }]}>
              {medicine.remainingQuantity}
            </Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Total</Text>
            <Text style={styles.stockValue}>{medicine.totalQuantity}</Text>
          </View>
          <View style={styles.stockItem}>
            <Text style={styles.stockLabel}>Status</Text>
            <Text style={[styles.stockValue, { color: stockInfo.color }]}>
              {stockInfo.status}
            </Text>
          </View>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(0, Math.min(100, (medicine.remainingQuantity / medicine.totalQuantity) * 100))}%`,
                backgroundColor: stockInfo.color,
              },
            ]}
          />
        </View>
      </View>

      {/* Expiry Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expiry Information</Text>
        <View style={styles.expiryContainer}>
          <Text style={styles.expiryDate}>
            Expires: {new Date(medicine.expiryDate).toLocaleDateString()}
          </Text>
          <Text style={[styles.expiryStatus, { color: expiryInfo.color }]}>
            {expiryInfo.status}
            {expiryInfo.days > 0 ? ` (${expiryInfo.days} days)` : ` (${expiryInfo.days} days ago)`}
          </Text>
        </View>
      </View>

      {/* Schedules */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Schedules ({schedules.length})</Text>
          <TouchableOpacity
            style={styles.addScheduleButton}
            onPress={() => navigation.navigate('AddSchedule', { medicineId })}
          >
            <Text style={styles.addScheduleText}>+ Add Schedule</Text>
          </TouchableOpacity>
        </View>
        {schedules.length > 0 ? (
          schedules.map((schedule) => (
            <View key={schedule.localId} style={styles.scheduleItem}>
              <Text style={styles.scheduleTitle}>
                {schedule.frequency.replace('_', ' ').toUpperCase()} Schedule
              </Text>
              <Text style={styles.scheduleDetails}>
                Times: {schedule.times.join(', ')}
              </Text>
              <Text style={styles.scheduleDetails}>
                Active: {schedule.isActive ? 'Yes' : 'No'}
              </Text>
              {schedule.reminderEnabled && (
                <Text style={styles.reminderText}>
                  🔔 Reminder {schedule.reminderMinutesBefore} min before
                </Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.noSchedulesText}>No schedules added yet</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.editButtonText}>✏️ Edit Medicine</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>🗑️ Delete Medicine</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Medicine</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Medicine Name"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Brand (Optional)"
              value={editForm.brand}
              onChangeText={(text) => setEditForm({ ...editForm, brand: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Dosage"
              value={editForm.dosage}
              onChangeText={(text) => setEditForm({ ...editForm, dosage: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Remaining Quantity"
              value={editForm.remainingQuantity.toString()}
              onChangeText={(text) => setEditForm({ ...editForm, remainingQuantity: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Total Quantity"
              value={editForm.totalQuantity.toString()}
              onChangeText={(text) => setEditForm({ ...editForm, totalQuantity: parseInt(text) || 0 })}
              keyboardType="numeric"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
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
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.GRAY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.WHITE,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.ERROR,
  },
  header: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  medicineBrand: {
    fontSize: 16,
    color: COLORS.GRAY,
    marginBottom: 2,
  },
  medicineDosage: {
    fontSize: 16,
    color: COLORS.GRAY,
  },
  statusContainer: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 12,
  },
  stockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stockItem: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.LIGHT_GRAY,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.SUCCESS,
  },
  expiryContainer: {
    alignItems: 'center',
  },
  expiryDate: {
    fontSize: 16,
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  expiryStatus: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  addScheduleButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addScheduleText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scheduleItem: {
    backgroundColor: COLORS.LIGHT_GRAY,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  scheduleDetails: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 2,
  },
  reminderText: {
    fontSize: 12,
    color: COLORS.PRIMARY,
    marginTop: 4,
  },
  noSchedulesText: {
    fontSize: 14,
    color: COLORS.GRAY,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actionButtons: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    gap: 12,
  },
  editButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButtonText: {
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
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.GRAY,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.SUCCESS,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MedicineDetailScreen;
