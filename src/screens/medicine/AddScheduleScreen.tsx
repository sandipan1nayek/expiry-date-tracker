import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ScheduleFrequency } from '../../types';
import MedicineService from '../../services/MedicineService';
import { MedicineStackParamList } from '../../navigation/MainTabNavigator';

type NavigationProp = StackNavigationProp<MedicineStackParamList, 'AddSchedule'>;

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
};

interface TimeSlot {
  id: string;
  time: string;
}

const AddScheduleScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { medicineId } = route.params as { medicineId: string };

  const [form, setForm] = useState({
    frequency: 'daily' as ScheduleFrequency,
    quantity: 1,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    instructions: '',
    reminderEnabled: true,
    reminderMinutesBefore: 15,
  });

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', time: '08:00' }
  ]);

  const [isLoading, setIsLoading] = useState(false);

  const addTimeSlot = () => {
    const newId = (timeSlots.length + 1).toString();
    setTimeSlots([...timeSlots, { id: newId, time: '12:00' }]);
  };

  const removeTimeSlot = (id: string) => {
    if (timeSlots.length > 1) {
      setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    }
  };

  const updateTimeSlot = (id: string, time: string) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, time } : slot
    ));
  };

  const validateForm = () => {
    if (form.quantity <= 0) {
      Alert.alert('Error', 'Quantity must be greater than 0');
      return false;
    }

    if (timeSlots.some(slot => !slot.time)) {
      Alert.alert('Error', 'All time slots must have a valid time');
      return false;
    }

    if (form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      Alert.alert('Error', 'End date must be after start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const scheduleData = {
        medicineId,
        frequency: form.frequency,
        times: timeSlots.map(slot => slot.time),
        quantity: form.quantity,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        instructions: form.instructions.trim() || undefined,
        reminderEnabled: form.reminderEnabled,
        reminderMinutesBefore: form.reminderMinutesBefore,
        isActive: true,
      };

      await MedicineService.addSchedule(scheduleData);
      Alert.alert('Success', 'Schedule created successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTimeSlot = (slot: TimeSlot, index: number) => (
    <View key={slot.id} style={styles.timeSlotContainer}>
      <Text style={styles.timeSlotLabel}>Time {index + 1}:</Text>
      <View style={styles.timeSlotRow}>
        <TextInput
          style={styles.timeInput}
          value={slot.time}
          onChangeText={(time) => updateTimeSlot(slot.id, time)}
          placeholder="HH:MM (24-hour format)"
        />
        {timeSlots.length > 1 && (
          <TouchableOpacity
            style={styles.removeTimeButton}
            onPress={() => removeTimeSlot(slot.id)}
          >
            <Text style={styles.removeTimeText}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Create Medicine Schedule</Text>

        {/* Frequency */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Frequency</Text>
          <View style={styles.frequencyContainer}>
            {(['daily', 'twice_daily', 'three_times_daily', 'weekly', 'custom'] as ScheduleFrequency[]).map((freq) => (
              <TouchableOpacity
                key={freq}
                style={[
                  styles.frequencyButton,
                  form.frequency === freq && styles.frequencyButtonActive
                ]}
                onPress={() => setForm({ ...form, frequency: freq })}
              >
                <Text style={[
                  styles.frequencyText,
                  form.frequency === freq && styles.frequencyTextActive
                ]}>
                  {freq.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Time Slots */}
        <View style={styles.inputGroup}>
          <View style={styles.timeSlotsHeader}>
            <Text style={styles.label}>Times</Text>
            <TouchableOpacity style={styles.addTimeButton} onPress={addTimeSlot}>
              <Text style={styles.addTimeText}>+ Add Time</Text>
            </TouchableOpacity>
          </View>
          {timeSlots.map((slot, index) => renderTimeSlot(slot, index))}
        </View>

        {/* Quantity */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Quantity per dose</Text>
          <TextInput
            style={styles.input}
            value={form.quantity.toString()}
            onChangeText={(text) => setForm({ ...form, quantity: parseInt(text) || 1 })}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        {/* Date Range */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Start Date *</Text>
          <TextInput
            style={styles.input}
            value={form.startDate}
            onChangeText={(text) => setForm({ ...form, startDate: text })}
            placeholder="YYYY-MM-DD"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>End Date (Optional)</Text>
          <TextInput
            style={styles.input}
            value={form.endDate}
            onChangeText={(text) => setForm({ ...form, endDate: text })}
            placeholder="YYYY-MM-DD (leave empty for indefinite)"
          />
        </View>

        {/* Instructions */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Instructions (Optional)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={form.instructions}
            onChangeText={(text) => setForm({ ...form, instructions: text })}
            placeholder="e.g., Take with food, Avoid alcohol"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Reminder Settings */}
        <View style={styles.inputGroup}>
          <View style={styles.reminderHeader}>
            <Text style={styles.label}>Enable Reminders</Text>
            <Switch
              value={form.reminderEnabled}
              onValueChange={(value) => setForm({ ...form, reminderEnabled: value })}
              trackColor={{ false: COLORS.LIGHT_GRAY, true: COLORS.PRIMARY }}
              thumbColor={form.reminderEnabled ? COLORS.WHITE : COLORS.GRAY}
            />
          </View>
          
          {form.reminderEnabled && (
            <View style={styles.reminderSettings}>
              <Text style={styles.reminderLabel}>Remind me (minutes before):</Text>
              <View style={styles.reminderOptions}>
                {[5, 10, 15, 30, 60].map((minutes) => (
                  <TouchableOpacity
                    key={minutes}
                    style={[
                      styles.reminderOption,
                      form.reminderMinutesBefore === minutes && styles.reminderOptionActive
                    ]}
                    onPress={() => setForm({ ...form, reminderMinutesBefore: minutes })}
                  >
                    <Text style={[
                      styles.reminderOptionText,
                      form.reminderMinutesBefore === minutes && styles.reminderOptionTextActive
                    ]}>
                      {minutes}m
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? 'Creating Schedule...' : 'Create Schedule'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.LIGHT_GRAY,
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.BLACK,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    borderWidth: 1,
    borderColor: COLORS.GRAY,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.WHITE,
  },
  frequencyButtonActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  frequencyText: {
    fontSize: 14,
    color: COLORS.BLACK,
  },
  frequencyTextActive: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  timeSlotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addTimeButton: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addTimeText: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeSlotContainer: {
    marginBottom: 12,
  },
  timeSlotLabel: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 4,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
  },
  removeTimeButton: {
    backgroundColor: COLORS.ERROR,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeTimeText: {
    color: COLORS.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reminderSettings: {
    backgroundColor: COLORS.WHITE,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  reminderLabel: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 8,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderOption: {
    borderWidth: 1,
    borderColor: COLORS.GRAY,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.WHITE,
  },
  reminderOptionActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  reminderOptionText: {
    fontSize: 12,
    color: COLORS.BLACK,
  },
  reminderOptionTextActive: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: COLORS.SUCCESS,
    padding: 16,
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
});

export default AddScheduleScreen;
