import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LocalMedicineIntake } from '../../types';
import MedicineService from '../../services/MedicineService';

const COLORS = {
  PRIMARY: '#2196F3',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: '#666666',
  LIGHT_GRAY: '#F5F5F5',
};

const TodaysIntakesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [intakes, setIntakes] = useState<LocalMedicineIntake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTodaysIntakes();
  }, []);

  const loadTodaysIntakes = async () => {
    setIsLoading(true);
    try {
      const todaysIntakes = await MedicineService.getTodaysIntakes();
      setIntakes(todaysIntakes);
    } catch (error) {
      Alert.alert('Error', 'Failed to load today\'s intakes');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodaysIntakes();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'taken': return COLORS.SUCCESS;
      case 'missed': return COLORS.ERROR;
      case 'skipped': return COLORS.WARNING;
      default: return COLORS.GRAY;
    }
  };

  const renderIntakeItem = ({ item }: { item: LocalMedicineIntake }) => (
    <View style={styles.intakeCard}>
      <View style={styles.intakeHeader}>
        <Text style={styles.intakeTime}>
          {new Date(item.scheduledTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.medicineInfo}>Medicine ID: {item.medicineId}</Text>
      <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
      
      {item.actualTime && (
        <Text style={styles.actualTime}>
          Taken at: {new Date(item.actualTime).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </Text>
      )}
      
      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today's Medicine Schedule</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={intakes}
        renderItem={renderIntakeItem}
        keyExtractor={(item) => item.localId}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No scheduled intakes for today</Text>
            <Text style={styles.emptySubtext}>
              Add medicine schedules to see your daily reminders here
            </Text>
          </View>
        }
      />
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  backButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backButtonText: {
    color: COLORS.BLACK,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 16,
  },
  intakeCard: {
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
  intakeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  intakeTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.BLACK,
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
  medicineInfo: {
    fontSize: 16,
    color: COLORS.BLACK,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 4,
  },
  actualTime: {
    fontSize: 14,
    color: COLORS.SUCCESS,
    marginTop: 8,
  },
  notes: {
    fontSize: 14,
    color: COLORS.GRAY,
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.GRAY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.GRAY,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default TodaysIntakesScreen;
