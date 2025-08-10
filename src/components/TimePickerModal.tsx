import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface TimePickerModalProps {
  visible: boolean;
  initialTime?: string;
  onTimeSelect: (time: string) => void;
  onCancel: () => void;
}

const COLORS = {
  PRIMARY: '#2196F3',
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY: '#666666',
  LIGHT_GRAY: '#F5F5F5',
  BORDER: '#E0E0E0',
};

const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  initialTime = '08:00',
  onTimeSelect,
  onCancel,
}) => {
  const [selectedHour, setSelectedHour] = useState(
    parseInt(initialTime.split(':')[0]) || 8
  );
  const [selectedMinute, setSelectedMinute] = useState(
    parseInt(initialTime.split(':')[1]) || 0
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const handleConfirm = () => {
    const timeString = formatTime(selectedHour, selectedMinute);
    onTimeSelect(timeString);
  };

  const renderScrollPicker = (
    items: number[],
    selectedValue: number,
    onValueChange: (value: number) => void,
    suffix: string = ''
  ) => (
    <View style={styles.pickerContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerScrollContent}
        snapToInterval={50}
        decelerationRate="fast"
      >
        {items.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.pickerItem,
              selectedValue === item && styles.pickerItemSelected,
            ]}
            onPress={() => onValueChange(item)}
          >
            <Text
              style={[
                styles.pickerItemText,
                selectedValue === item && styles.pickerItemTextSelected,
              ]}
            >
              {item.toString().padStart(2, '0')}{suffix}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeDisplayText}>
              {formatTime(selectedHour, selectedMinute)}
            </Text>
            <Text style={styles.timeDisplaySubtext}>24-hour format</Text>
          </View>

          {/* Time Pickers */}
          <View style={styles.pickersContainer}>
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Hour</Text>
              {renderScrollPicker(hours, selectedHour, setSelectedHour)}
            </View>
            
            <View style={styles.separator}>
              <Text style={styles.separatorText}>:</Text>
            </View>
            
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Minute</Text>
              {renderScrollPicker(minutes, selectedMinute, setSelectedMinute)}
            </View>
          </View>

          {/* Quick Time Presets */}
          <View style={styles.presetsContainer}>
            <Text style={styles.presetsTitle}>Quick Select</Text>
            <View style={styles.presetButtons}>
              {[
                { label: 'Morning', time: '08:00' },
                { label: 'Afternoon', time: '12:00' },
                { label: 'Evening', time: '18:00' },
                { label: 'Night', time: '22:00' },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={styles.presetButton}
                  onPress={() => {
                    const [hour, minute] = preset.time.split(':').map(Number);
                    setSelectedHour(hour);
                    setSelectedMinute(minute);
                  }}
                >
                  <Text style={styles.presetButtonText}>{preset.label}</Text>
                  <Text style={styles.presetButtonTime}>{preset.time}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.BLACK,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: COLORS.GRAY,
  },
  timeDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: COLORS.LIGHT_GRAY,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
  },
  timeDisplayText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
    fontFamily: 'monospace',
  },
  timeDisplaySubtext: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginTop: 4,
  },
  pickersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  pickerSection: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 12,
  },
  pickerContainer: {
    height: 150,
    width: '100%',
  },
  pickerScrollContent: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.PRIMARY,
  },
  pickerItemText: {
    fontSize: 18,
    color: COLORS.GRAY,
    fontFamily: 'monospace',
  },
  pickerItemTextSelected: {
    color: COLORS.WHITE,
    fontWeight: 'bold',
  },
  separator: {
    paddingHorizontal: 10,
    paddingTop: 40,
  },
  separatorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.PRIMARY,
  },
  presetsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  presetsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.BLACK,
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: (width * 0.9 - 56) / 4,
  },
  presetButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.BLACK,
  },
  presetButtonTime: {
    fontSize: 10,
    color: COLORS.GRAY,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.GRAY,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.GRAY,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.WHITE,
  },
});

export default TimePickerModal;
