import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import MedicineService from '../../services/MedicineService';
import { ScheduleFrequency } from '../../types';

// Time Picker Modal Component
interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void;
  initialTime?: string;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  onClose,
  onSelectTime,
  initialTime = '08:00',
}) => {
  const [selectedHour, setSelectedHour] = useState(parseInt(initialTime.split(':')[0]));
  const [selectedMinute, setSelectedMinute] = useState(parseInt(initialTime.split(':')[1]));

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const quickPresets = [
    { label: 'Morning', time: '08:00' },
    { label: 'Afternoon', time: '12:00' },
    { label: 'Evening', time: '18:00' },
    { label: 'Night', time: '22:00' },
  ];

  const handleConfirm = () => {
    const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onSelectTime(formattedTime);
    onClose();
  };

  const handlePresetSelect = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    onSelectTime(time);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.timePickerContainer}>
          <View style={styles.timePickerHeader}>
            <Text style={styles.timePickerTitle}>Select Time</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsTitle}>Quick Select:</Text>
            <View style={styles.presetsRow}>
              {quickPresets.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetButton}
                  onPress={() => handlePresetSelect(preset.time)}
                >
                  <Text style={styles.presetButtonText}>{preset.label}</Text>
                  <Text style={styles.presetTimeText}>{preset.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Time Selector */}
          <View style={styles.timeSelector}>
            <View style={styles.timeSelectorColumn}>
              <Text style={styles.timeSelectorLabel}>Hour</Text>
              <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                {hours.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={[
                      styles.timeOption,
                      selectedHour === hour && styles.selectedTimeOption,
                    ]}
                    onPress={() => setSelectedHour(hour)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedHour === hour && styles.selectedTimeOptionText,
                      ]}
                    >
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.timeSeparator}>:</Text>

            <View style={styles.timeSelectorColumn}>
              <Text style={styles.timeSelectorLabel}>Minute</Text>
              <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={false}>
                {minutes.map((minute) => (
                  <TouchableOpacity
                    key={minute}
                    style={[
                      styles.timeOption,
                      selectedMinute === minute && styles.selectedTimeOption,
                    ]}
                    onPress={() => setSelectedMinute(minute)}
                  >
                    <Text
                      style={[
                        styles.timeOptionText,
                        selectedMinute === minute && styles.selectedTimeOptionText,
                      ]}
                    >
                      {minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Current Selection Display */}
          <View style={styles.currentTimeDisplay}>
            <Text style={styles.currentTimeText}>
              Selected Time: {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.timePickerActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Main AddScheduleScreen Component
const AddScheduleScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { medicineId } = route.params as { medicineId: string };

  const [medicineName, setMedicineName] = useState('');
  const [schedules, setSchedules] = useState<string[]>(['08:00']);
  const [frequency, setFrequency] = useState('Daily');
  const [duration, setDuration] = useState('7');
  const [notes, setNotes] = useState('');
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const frequencyOptions = ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As needed'];

  useEffect(() => {
    loadMedicineData();
  }, [medicineId]);

  const loadMedicineData = async () => {
    try {
      // Load medicine details if editing existing schedule
      // For now, we'll use a placeholder
      setMedicineName('Medicine Name');
    } catch (error) {
      console.error('Error loading medicine data:', error);
    }
  };

  const handleAddTime = () => {
    setEditingTimeIndex(null);
    setIsTimePickerVisible(true);
  };

  const handleEditTime = (index: number) => {
    setEditingTimeIndex(index);
    setIsTimePickerVisible(true);
  };

  const handleTimeSelect = (time: string) => {
    if (editingTimeIndex !== null) {
      // Edit existing time
      const updatedSchedules = [...schedules];
      updatedSchedules[editingTimeIndex] = time;
      setSchedules(updatedSchedules);
    } else {
      // Add new time
      setSchedules([...schedules, time]);
    }
  };

  const handleRemoveTime = (index: number) => {
    if (schedules.length > 1) {
      const updatedSchedules = schedules.filter((_, i) => i !== index);
      setSchedules(updatedSchedules);
    } else {
      Alert.alert('Error', 'At least one schedule time is required.');
    }
  };

  const handleSaveSchedule = async () => {
    if (!medicineName.trim()) {
      Alert.alert('Error', 'Medicine name is required.');
      return;
    }

    if (schedules.length === 0) {
      Alert.alert('Error', 'At least one schedule time is required.');
      return;
    }

    if (!duration.trim() || isNaN(Number(duration))) {
      Alert.alert('Error', 'Please enter a valid duration in days.');
      return;
    }

    setLoading(true);

    try {
      // Convert frequency to the expected enum format
      const getScheduleFrequency = (freq: string): ScheduleFrequency => {
        switch (freq.toLowerCase()) {
          case 'daily': return 'daily';
          case 'weekly': return 'weekly';
          case 'as needed': return 'once';
          default: return 'custom';
        }
      };

      // Calculate end date based on duration
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(duration));

      const scheduleData = {
        medicineId,
        frequency: getScheduleFrequency(frequency),
        times: schedules.sort(), // Array of time strings
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isActive: true,
        reminderEnabled: true,
        reminderMinutesBefore: 15, // Default 15 minutes before
      };

      await MedicineService.addSchedule(scheduleData);
      
      Alert.alert(
        'Success',
        'Medicine schedule saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Medicine Schedule</Text>
          <Text style={styles.subtitle}>Set up your medication reminders</Text>
        </View>

        {/* Medicine Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicine Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput
              style={styles.textInput}
              value={medicineName}
              onChangeText={setMedicineName}
              placeholder="Enter medicine name"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Schedule Times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule Times</Text>
          <Text style={styles.sectionDescription}>
            Set the times when you need to take this medicine
          </Text>
          
          {schedules.map((time, index) => (
            <View key={index} style={styles.timeSlot}>
              <TouchableOpacity
                style={styles.timeDisplay}
                onPress={() => handleEditTime(index)}
              >
                <Text style={styles.timeText}>{time}</Text>
                <Text style={styles.editText}>Tap to edit</Text>
              </TouchableOpacity>
              
              {schedules.length > 1 && (
                <TouchableOpacity
                  style={styles.removeTimeButton}
                  onPress={() => handleRemoveTime(index)}
                >
                  <Text style={styles.removeTimeText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          <TouchableOpacity style={styles.addTimeButton} onPress={handleAddTime}>
            <Text style={styles.addTimeText}>+ Add Another Time</Text>
          </TouchableOpacity>
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <View style={styles.frequencyContainer}>
            {frequencyOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.frequencyOption,
                  frequency === option && styles.selectedFrequencyOption,
                ]}
                onPress={() => setFrequency(option)}
              >
                <Text
                  style={[
                    styles.frequencyOptionText,
                    frequency === option && styles.selectedFrequencyOptionText,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Number of days *</Text>
            <TextInput
              style={styles.textInput}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 7"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g., Take with food, before meals..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSaveSchedule}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save Schedule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Time Picker Modal */}
      <TimePickerModal
        visible={isTimePickerVisible}
        onClose={() => setIsTimePickerVisible(false)}
        onSelectTime={handleTimeSelect}
        initialTime={editingTimeIndex !== null ? schedules[editingTimeIndex] : '08:00'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    lineHeight: 22,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34495e',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeDisplay: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  editText: {
    fontSize: 12,
    color: '#3498db',
  },
  removeTimeButton: {
    marginLeft: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTimeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addTimeButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addTimeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  frequencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequencyOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  selectedFrequencyOption: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  frequencyOptionText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  selectedFrequencyOptionText: {
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginVertical: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Time Picker Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    paddingBottom: 20,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  presetsContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  presetButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2c3e50',
  },
  presetTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3498db',
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  timeSelectorColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  timeScrollView: {
    height: 120,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedTimeOption: {
    backgroundColor: '#3498db',
  },
  timeOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  selectedTimeOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 20,
  },
  currentTimeDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    margin: 20,
    alignItems: 'center',
  },
  currentTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  timePickerActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f2f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default AddScheduleScreen;
