import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsService, { AppSettings, ExpirySettings } from '../../services/SettingsService';

const COLORS = {
  PRIMARY: '#2196F3',
  SUCCESS: '#4CAF50',
  WARNING: '#FF9800',
  ERROR: '#F44336',
  WHITE: '#FFFFFF',
  LIGHT_GRAY: '#F5F5F5',
  GRAY: '#9E9E9E',
  DARK_GRAY: '#424242',
  TEXT: '#212121',
  BORDER: '#E0E0E0',
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for form inputs
  const [warningDays, setWarningDays] = useState('');
  const [expiringDays, setExpiringDays] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const currentSettings = await SettingsService.getSettings();
      setSettings(currentSettings);
      setWarningDays(currentSettings.expiryThresholds.warningDays.toString());
      setExpiringDays(currentSettings.expiryThresholds.expiringDays.toString());
      setNotificationsEnabled(currentSettings.notifications.enabled);
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateInputs = (): boolean => {
    const warning = parseInt(warningDays);
    const expiring = parseInt(expiringDays);

    if (isNaN(warning) || isNaN(expiring)) {
      Alert.alert('Error', 'Please enter valid numbers for all fields');
      return false;
    }

    if (warning < 1 || expiring < 1) {
      Alert.alert('Error', 'All values must be at least 1 day');
      return false;
    }

    if (expiring >= warning) {
      Alert.alert('Error', 'Expiring days must be less than warning days');
      return false;
    }

    return true;
  };

  const saveSettings = async () => {
    if (!validateInputs()) return;

    setSaving(true);
    try {
      const newThresholds: ExpirySettings = {
        warningDays: parseInt(warningDays),
        expiringDays: parseInt(expiringDays),
      };

      await SettingsService.updateExpiryThresholds(newThresholds);
      
      // Update notifications setting
      if (settings) {
        await SettingsService.updateSettings({
          notifications: {
            ...settings.notifications,
            enabled: notificationsEnabled,
          },
        });
      }

      Alert.alert('Success', 'Settings saved successfully');
      await loadSettings(); // Reload to confirm changes
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await SettingsService.resetToDefaults();
              await loadSettings();
              Alert.alert('Success', 'Settings reset to defaults');
            } catch (error) {
              console.error('Failed to reset settings:', error);
              Alert.alert('Error', 'Failed to reset settings');
            }
          },
        },
      ]
    );
  };

  const getStatusPreview = (days: number, type: 'expiring' | 'warning' | 'fresh') => {
    let color = COLORS.GRAY;
    let text = 'Unknown';

    if (type === 'expiring') {
      color = COLORS.ERROR;
      text = 'Expiring Soon';
    } else if (type === 'warning') {
      color = COLORS.WARNING;
      text = 'Warning';
    } else if (type === 'fresh') {
      color = COLORS.SUCCESS;
      text = 'Fresh';
    }

    return (
      <View style={[styles.statusPreview, { borderColor: color }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusText, { color }]}>{text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your expiry date preferences</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expiry Date Thresholds</Text>
          <Text style={styles.sectionDescription}>
            Configure when products should be categorized as fresh, warning, or expiring soon
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Warning Period (days)</Text>
            <Text style={styles.inputDescription}>
              Show warning when products have this many days or less until expiry
            </Text>
            <TextInput
              style={styles.input}
              value={warningDays}
              onChangeText={setWarningDays}
              placeholder="7"
              keyboardType="numeric"
              maxLength={2}
            />
            {parseInt(warningDays) > 0 && getStatusPreview(parseInt(warningDays), 'warning')}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Expiring Soon Period (days)</Text>
            <Text style={styles.inputDescription}>
              Show as expiring soon when products have this many days or less until expiry
            </Text>
            <TextInput
              style={styles.input}
              value={expiringDays}
              onChangeText={setExpiringDays}
              placeholder="3"
              keyboardType="numeric"
              maxLength={2}
            />
            {parseInt(expiringDays) > 0 && getStatusPreview(parseInt(expiringDays), 'expiring')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Text style={styles.switchLabel}>Enable Notifications</Text>
              <Text style={styles.switchDescription}>
                Receive reminders about products approaching expiry
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.LIGHT_GRAY, true: COLORS.PRIMARY }}
              thumbColor={notificationsEnabled ? COLORS.WHITE : COLORS.GRAY}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={saveSettings}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Settings'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={resetToDefaults}
            disabled={saving}
          >
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • <Text style={{ color: COLORS.SUCCESS }}>Fresh</Text>: Products with more than {warningDays || '10'} days until expiry
          </Text>
          <Text style={styles.infoText}>
            • <Text style={{ color: COLORS.WARNING }}>Warning</Text>: Products with {parseInt(expiringDays) + 1 || '4'}-{warningDays || '10'} days until expiry
          </Text>
          <Text style={styles.infoText}>
            • <Text style={{ color: COLORS.ERROR }}>Expiring Soon</Text>: Products with 1-{expiringDays || '3'} days until expiry
          </Text>
          <Text style={styles.infoText}>
            • <Text style={{ color: COLORS.ERROR }}>Expired</Text>: Products past their expiry date
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.GRAY,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.PRIMARY,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.WHITE,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.WHITE,
    opacity: 0.9,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.TEXT,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  inputDescription: {
    fontSize: 14,
    color: COLORS.GRAY,
    marginBottom: 8,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: COLORS.WHITE,
    marginBottom: 8,
  },
  statusPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: COLORS.WHITE,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: COLORS.GRAY,
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 20,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY,
  },
  saveButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: COLORS.LIGHT_GRAY,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  resetButtonText: {
    color: COLORS.TEXT,
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: COLORS.LIGHT_GRAY,
    margin: 20,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.DARK_GRAY,
    lineHeight: 20,
    marginBottom: 4,
  },
});
