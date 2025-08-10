import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ExpirySettings {
  warningDays: number;    // Days before expiry to show warning (yellow) - items with this many days or less
  expiringDays: number;   // Days before expiry to show as expiring soon (red) - items with this many days or less
}

export interface AppSettings {
  expiryThresholds: ExpirySettings;
  notifications: {
    enabled: boolean;
    reminderDays: number[];
  };
  theme: 'light' | 'dark' | 'auto';
  language: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  expiryThresholds: {
    warningDays: 7,      // Show warning if 7 days or LESS until expiry  
    expiringDays: 3,     // Show as expiring if 3 days or LESS until expiry
  },
  notifications: {
    enabled: true,
    reminderDays: [7, 3, 1], // Remind 7, 3, and 1 days before expiry
  },
  theme: 'auto',
  language: 'en',
};

class SettingsService {
  private static readonly SETTINGS_KEY = 'app_settings';

  async getSettings(): Promise<AppSettings> {
    try {
      const settingsJson = await AsyncStorage.getItem(SettingsService.SETTINGS_KEY);
      if (settingsJson) {
        const settings = JSON.parse(settingsJson);
        
        // Migration: Remove deprecated freshDays property
        if (settings.expiryThresholds && 'freshDays' in settings.expiryThresholds) {
          delete settings.expiryThresholds.freshDays;
          console.log('🔧 Migrated settings: Removed deprecated freshDays property');
        }
        
        // Merge with defaults to ensure all properties exist
        return {
          ...DEFAULT_SETTINGS,
          ...settings,
          expiryThresholds: {
            ...DEFAULT_SETTINGS.expiryThresholds,
            ...settings.expiryThresholds,
          },
          notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...settings.notifications,
          },
        };
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(newSettings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        ...newSettings,
      };
      
      await AsyncStorage.setItem(
        SettingsService.SETTINGS_KEY,
        JSON.stringify(updatedSettings)
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  async updateExpiryThresholds(thresholds: Partial<ExpirySettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = {
        ...currentSettings,
        expiryThresholds: {
          ...currentSettings.expiryThresholds,
          ...thresholds,
        },
      };
      
      await this.updateSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update expiry thresholds:', error);
      throw error;
    }
  }

  async resetToDefaults(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        SettingsService.SETTINGS_KEY,
        JSON.stringify(DEFAULT_SETTINGS)
      );
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }

  async getExpiryThresholds(): Promise<ExpirySettings> {
    const settings = await this.getSettings();
    console.log('=== EXPIRY THRESHOLDS DEBUG ===');
    console.log('Current settings:', JSON.stringify(settings.expiryThresholds, null, 2));
    
    // Ensure clean structure - remove any unexpected properties
    const cleanThresholds: ExpirySettings = {
      warningDays: settings.expiryThresholds.warningDays,
      expiringDays: settings.expiryThresholds.expiringDays,
    };
    
    return cleanThresholds;
  }

  // Debug method to check what's actually stored
  async debugSettings(): Promise<void> {
    try {
      const rawSettings = await AsyncStorage.getItem(SettingsService.SETTINGS_KEY);
      console.log('=== SETTINGS DEBUG ===');
      console.log('Raw stored settings:', rawSettings);
      console.log('Default settings:', JSON.stringify(DEFAULT_SETTINGS, null, 2));
      
      const currentSettings = await this.getSettings();
      console.log('Parsed current settings:', JSON.stringify(currentSettings, null, 2));
    } catch (error) {
      console.error('Debug settings error:', error);
    }
  }

  // Helper method to categorize a product based on its expiry date
  async categorizeProduct(expiryDate: string): Promise<'expired' | 'expiring' | 'warning' | 'fresh'> {
    try {
      const thresholds = await this.getExpiryThresholds();
      const today = new Date();
      const expiry = new Date(expiryDate);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Debug logging with explicit values
      console.log('=== CATEGORIZE PRODUCT DEBUG ===');
      console.log('Product expiry date:', expiryDate);
      console.log('Today:', today.toISOString().split('T')[0]);
      console.log('Expiry:', expiry.toISOString().split('T')[0]);
      console.log('Days until expiry:', daysUntilExpiry);
      console.log('Loaded thresholds:', JSON.stringify(thresholds, null, 2));
      console.log('Type of daysUntilExpiry:', typeof daysUntilExpiry);
      console.log('Type of warningDays:', typeof thresholds.warningDays);
      console.log('Type of expiringDays:', typeof thresholds.expiringDays);
      console.log('Condition checks:');
      console.log(`  daysUntilExpiry <= 0: ${daysUntilExpiry} <= 0 = ${daysUntilExpiry <= 0}`);
      console.log(`  daysUntilExpiry <= expiringDays: ${daysUntilExpiry} <= ${thresholds.expiringDays} = ${daysUntilExpiry <= thresholds.expiringDays}`);
      console.log(`  daysUntilExpiry <= warningDays: ${daysUntilExpiry} <= ${thresholds.warningDays} = ${daysUntilExpiry <= thresholds.warningDays}`);

      // CORRECTED LOGIC - Simplified real-life categorization:
      // 1. Expired: Already past expiry date (≤ 0 days)
      // 2. Expiring: Within expiring threshold - urgent action needed (1 to expiringDays)
      // 3. Warning: Within warning threshold but not expiring - attention needed (expiringDays+1 to warningDays)  
      // 4. Fresh: Beyond warning threshold - all good (> warningDays)
      
      // Force convert to numbers to avoid type issues
      const days = Number(daysUntilExpiry);
      const warningThreshold = Number(thresholds.warningDays);
      const expiringThreshold = Number(thresholds.expiringDays);
      
      console.log('After number conversion:');
      console.log(`  days: ${days} (type: ${typeof days})`);
      console.log(`  warningThreshold: ${warningThreshold} (type: ${typeof warningThreshold})`);
      console.log(`  expiringThreshold: ${expiringThreshold} (type: ${typeof expiringThreshold})`);
      
      if (days <= 0) {
        console.log('→ Category: EXPIRED (≤ 0 days)');
        return 'expired';
      } else if (days <= expiringThreshold) {
        console.log(`→ Category: EXPIRING (${days} ≤ ${expiringThreshold} expiring days)`);
        return 'expiring';
      } else if (days <= warningThreshold) {
        console.log(`→ Category: WARNING (${days} ≤ ${warningThreshold} warning days)`);
        return 'warning';
      } else {
        console.log(`→ Category: FRESH (${days} > ${warningThreshold} warning days)`);
        return 'fresh';
      }
    } catch (error) {
      console.error('Failed to categorize product:', error);
      console.log('→ Category: FRESH (error fallback)');
      return 'fresh'; // Default to fresh if categorization fails
    }
  }

  // Helper method to get color for product status
  getStatusColor(status: 'expired' | 'expiring' | 'warning' | 'fresh'): string {
    switch (status) {
      case 'expired':
        return '#FF4444'; // Red
      case 'expiring':
        return '#FF8800'; // Orange
      case 'warning':
        return '#FFAA00'; // Yellow-Orange
      case 'fresh':
        return '#44AA44'; // Green
      default:
        return '#666666'; // Gray
    }
  }

  // Helper method to get status text
  getStatusText(status: 'expired' | 'expiring' | 'warning' | 'fresh'): string {
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring':
        return 'Expiring Soon';
      case 'warning':
        return 'Warning';
      case 'fresh':
        return 'Fresh';
      default:
        return 'Unknown';
    }
  }

  // Migration method to clean up old settings structure
  async migrateSettings(): Promise<void> {
    try {
      console.log('🔧 Starting settings migration...');
      const settings = await this.getSettings();
      // Force save with clean structure to remove any deprecated properties
      await this.updateSettings(settings);
      console.log('✅ Settings migration completed - old freshDays property removed');
    } catch (error) {
      console.error('❌ Failed to migrate settings:', error);
    }
  }

  // Test method to verify categorization with specific values
  async testCategorization(): Promise<void> {
    console.log('\n🧪 === CATEGORIZATION TEST ===');
    
    const testCases = [
      { days: 8, expectedWithWarning9: 'warning' },
      { days: 9, expectedWithWarning9: 'warning' },
      { days: 10, expectedWithWarning9: 'fresh' },
      { days: 3, expectedWithWarning9: 'expiring' },
      { days: 4, expectedWithWarning9: 'warning' },
    ];

    const settings = await this.getExpiryThresholds();
    console.log('Current settings:', settings);

    for (const testCase of testCases) {
      // Create a date that's exactly testCase.days in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + testCase.days);
      const futureDateString = futureDate.toISOString().split('T')[0];
      
      console.log(`\n--- Testing ${testCase.days} days ---`);
      const result = await this.categorizeProduct(futureDateString);
      const passed = result === testCase.expectedWithWarning9;
      
      console.log(`Expected: ${testCase.expectedWithWarning9}, Got: ${result}, Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    }
    
    console.log('\n=== TEST COMPLETE ===\n');
  }
}

export default new SettingsService();
