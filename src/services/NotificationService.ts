import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { LocalProduct } from '../types';

// Check if we're running in Expo Go (notifications not supported in Expo Go SDK 53+)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior only if not in Expo Go
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class NotificationService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      // Skip initialization in Expo Go as notifications are not supported
      if (isExpoGo) {
        console.log('Notifications not supported in Expo Go - use development build for full functionality');
        this.isInitialized = false;
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('expiry-reminders', {
          name: 'Expiry Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Permission for notifications was denied');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }

  async scheduleExpiryReminder(product: LocalProduct, daysBeforeExpiry: number = 3): Promise<string | null> {
    try {
      // Skip scheduling in Expo Go
      if (isExpoGo) {
        console.log(`Would schedule notification for ${product.name} (Expo Go - notifications disabled)`);
        return null;
      }

      if (!this.isInitialized) {
        const success = await this.initialize();
        if (!success) return null;
      }

      const expiryDate = new Date(product.expiryDate);
      const reminderDate = new Date(expiryDate.getTime() - (daysBeforeExpiry * 24 * 60 * 60 * 1000));
      
      // Don't schedule if reminder date is in the past
      if (reminderDate <= new Date()) {
        return null;
      }

      // Calculate seconds from now
      const secondsFromNow = Math.max(1, Math.floor((reminderDate.getTime() - Date.now()) / 1000));

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🕒 Expiry Reminder',
          body: `${product.name} expires in ${daysBeforeExpiry} days!`,
          data: {
            productId: product.localId,
            type: 'expiry-reminder',
          },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsFromNow 
        },
        identifier: `expiry-${product.localId}-${daysBeforeExpiry}`,
      });

      console.log(`Scheduled notification for ${product.name} in ${secondsFromNow} seconds`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  async cancelExpiryReminder(productId: string): Promise<void> {
    try {
      // Skip in Expo Go
      if (isExpoGo) {
        console.log(`Would cancel notifications for product ${productId} (Expo Go - notifications disabled)`);
        return;
      }

      // Cancel all reminders for this product (7, 3, 1 days)
      const identifiers = [
        `expiry-${productId}-7`,
        `expiry-${productId}-3`,
        `expiry-${productId}-1`,
      ];
      
      for (const identifier of identifiers) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      }
      
      console.log(`Cancelled notifications for product ${productId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  async scheduleMultipleReminders(product: LocalProduct): Promise<string[]> {
    const notificationIds: string[] = [];
    
    // Schedule reminders at 7 days, 3 days, and 1 day before expiry
    const reminderDays = [7, 3, 1];
    
    for (const days of reminderDays) {
      const id = await this.scheduleExpiryReminder(product, days);
      if (id) {
        notificationIds.push(id);
      }
    }

    return notificationIds;
  }

  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all scheduled notifications');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Test notification (for debugging)
  async sendTestNotification(): Promise<void> {
    try {
      // Skip in Expo Go
      if (isExpoGo) {
        console.log('Would send test notification (Expo Go - notifications disabled)');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Test Notification',
          body: 'Expiry Date Tracker notifications are working!',
          data: { type: 'test' },
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1 
        },
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }
}

export default new NotificationService();
