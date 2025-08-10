import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LocalMedicine } from '../../types';
import MedicineService from '../../services/MedicineService';
import { MedicineStackParamList } from '../../navigation/MainTabNavigator';

type NavigationProp = StackNavigationProp<MedicineStackParamList, 'MedicineList'>;

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
  LOW_STOCK: '#FF5722',
};

const MedicineListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [medicines, setMedicines] = useState<LocalMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [stats, setStats] = useState({
    activeMedicines: 0,
    lowStockMedicines: 0,
    expiringSoon: 0,
    todayIntakes: 0,
    takenToday: 0,
    missedToday: 0,
    activeSchedules: 0
  });

  useFocusEffect(
    React.useCallback(() => {
      loadMedicines();
      loadStats();
    }, [])
  );

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const medicineList = await MedicineService.getMedicines();
      setMedicines(medicineList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load medicines');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const medicineStats = await MedicineService.getMedicineStats();
      setStats(medicineStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMedicines(), loadStats()]);
    setRefreshing(false);
  };

  const handleDeleteMedicine = (medicine: LocalMedicine) => {
    Alert.alert(
      'Delete Medicine',
      `Are you sure you want to delete "${medicine.name}"? This will also delete all schedules and intake records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await MedicineService.deleteMedicine(medicine.localId);
              loadMedicines();
              loadStats();
              Alert.alert('Success', 'Medicine deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete medicine');
            }
          },
        },
      ]
    );
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
    const percentage = (remaining / total) * 100;
    if (percentage <= 10) {
      return { status: 'Critical', color: COLORS.ERROR };
    } else if (percentage <= 25) {
      return { status: 'Low', color: COLORS.WARNING };
    } else {
      return { status: 'Good', color: COLORS.SUCCESS };
    }
  };

  const renderMedicineItem = ({ item }: { item: LocalMedicine }) => {
    const expiryInfo = getExpiryStatus(item.expiryDate);
    const stockInfo = getStockStatus(item.remainingQuantity, item.totalQuantity);

    return (
      <TouchableOpacity
        style={styles.medicineCard}
        onPress={() => navigation.navigate('MedicineDetail', { medicineId: item.localId })}
      >
        <View style={styles.medicineHeader}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{item.name}</Text>
            {item.brand && <Text style={styles.medicineBrand}>{item.brand}</Text>}
            <Text style={styles.medicineDosage}>{item.dosage} • {item.form}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: expiryInfo.color }]}>
              <Text style={styles.statusText}>{expiryInfo.status}</Text>
            </View>
            {item.isActive && (
              <View style={[styles.activeBadge]}>
                <Text style={styles.activeText}>Active</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.medicineDetails}>
          <View style={styles.stockInfo}>
            <Text style={styles.stockText}>
              Stock: {item.remainingQuantity}/{item.totalQuantity}
            </Text>
            <View style={[styles.stockIndicator, { backgroundColor: stockInfo.color }]} />
          </View>
          <Text style={styles.expiryDate}>
            Expires: {new Date(item.expiryDate).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.medicineFooter}>
          <TouchableOpacity
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('AddSchedule', { medicineId: item.localId })}
          >
            <Text style={styles.scheduleButtonText}>⏰ Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteMedicine(item)}
          >
            <Text style={styles.deleteButtonText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStatsModal = () => (
    <Modal visible={showStatsModal} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Medicine Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.activeMedicines}</Text>
              <Text style={styles.statLabel}>Active Medicines</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.WARNING }]}>{stats.lowStockMedicines}</Text>
              <Text style={styles.statLabel}>Low Stock</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.ERROR }]}>{stats.expiringSoon}</Text>
              <Text style={styles.statLabel}>Expiring Soon</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.todayIntakes}</Text>
              <Text style={styles.statLabel}>Today's Doses</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.SUCCESS }]}>{stats.takenToday}</Text>
              <Text style={styles.statLabel}>Taken Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.ERROR }]}>{stats.missedToday}</Text>
              <Text style={styles.statLabel}>Missed Today</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowStatsModal(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Medicine Tracker</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.statsButton}
            onPress={() => setShowStatsModal(true)}
          >
            <Text style={styles.statsButtonText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={() => navigation.navigate('TodaysIntakes')}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStatItem}>
          <Text style={styles.quickStatNumber}>{stats.activeMedicines}</Text>
          <Text style={styles.quickStatLabel}>Active</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatNumber, { color: COLORS.WARNING }]}>{stats.lowStockMedicines}</Text>
          <Text style={styles.quickStatLabel}>Low Stock</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatNumber, { color: COLORS.SUCCESS }]}>{stats.takenToday}</Text>
          <Text style={styles.quickStatLabel}>Taken Today</Text>
        </View>
        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatNumber, { color: COLORS.ERROR }]}>{stats.missedToday}</Text>
          <Text style={styles.quickStatLabel}>Missed</Text>
        </View>
      </View>

      <FlatList
        data={medicines}
        renderItem={renderMedicineItem}
        keyExtractor={(item) => item.localId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No medicines added yet</Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={() => navigation.navigate('AddMedicine')}
            >
              <Text style={styles.emptyAddButtonText}>Add Your First Medicine</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedicine')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {renderStatsModal()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.LIGHT_GRAY,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statsButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statsButtonText: {
    fontSize: 16,
  },
  todayButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  todayButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 14,
  },
  addButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    elevation: 2,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 14,
  },
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.LIGHT_GRAY,
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  quickStatLabel: {
    fontSize: 12,
    color: COLORS.GRAY,
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 160,
  },
  medicineCard: {
    backgroundColor: COLORS.WHITE,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  medicineBrand: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 2,
  },
  medicineDosage: {
    fontSize: 14,
    color: COLORS.GRAY,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  medicineDetails: {
    marginBottom: 12,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stockText: {
    fontSize: 14,
    color: COLORS.BLACK,
  },
  stockIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  expiryDate: {
    fontSize: 14,
    color: COLORS.GRAY,
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.GRAY,
    marginBottom: 20,
  },
  emptyAddButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyAddButtonText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
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
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.GRAY,
    textAlign: 'center',
    marginTop: 4,
  },
  modalCloseButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.BLACK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabText: {
    color: COLORS.WHITE,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default MedicineListScreen;
