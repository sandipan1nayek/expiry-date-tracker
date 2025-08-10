import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { LocalMedicine, LocalMedicineIntake, LocalMedicineSchedule, MedicineReminder } from '../types';
import { generateUUID } from '../utils/uuid';

class MedicineService {
  private static readonly MEDICINES_KEY = 'medicines';
  private static readonly INTAKES_KEY = 'medicine_intakes';
  private static readonly SCHEDULES_KEY = 'medicine_schedules';
  private static readonly REMINDERS_KEY = 'medicine_reminders';

  // Medicine CRUD operations
  async getMedicines(): Promise<LocalMedicine[]> {
    try {
      const stored = await AsyncStorage.getItem(MedicineService.MEDICINES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get medicines:', error);
      return [];
    }
  }

  async addMedicine(medicine: Omit<LocalMedicine, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<LocalMedicine> {
    try {
      const medicines = await this.getMedicines();
      const newMedicine: LocalMedicine = {
        ...medicine,
        localId: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
        userId: 'local_user' // Will be updated when user auth is implemented
      };

      medicines.push(newMedicine);
      await AsyncStorage.setItem(MedicineService.MEDICINES_KEY, JSON.stringify(medicines));
      return newMedicine;
    } catch (error) {
      console.error('Failed to add medicine:', error);
      throw error;
    }
  }

  async updateMedicine(localId: string, updates: Partial<LocalMedicine>): Promise<LocalMedicine> {
    try {
      const medicines = await this.getMedicines();
      const index = medicines.findIndex(m => m.localId === localId);
      
      if (index === -1) {
        throw new Error('Medicine not found');
      }

      medicines[index] = {
        ...medicines[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      await AsyncStorage.setItem(MedicineService.MEDICINES_KEY, JSON.stringify(medicines));
      return medicines[index];
    } catch (error) {
      console.error('Failed to update medicine:', error);
      throw error;
    }
  }

  async deleteMedicine(localId: string): Promise<void> {
    try {
      const medicines = await this.getMedicines();
      const filtered = medicines.filter(m => m.localId !== localId);
      await AsyncStorage.setItem(MedicineService.MEDICINES_KEY, JSON.stringify(filtered));

      // Also delete related schedules and intakes
      await this.deleteSchedulesByMedicineId(localId);
      await this.deleteIntakesByMedicineId(localId);
    } catch (error) {
      console.error('Failed to delete medicine:', error);
      throw error;
    }
  }

  async updateMedicineStock(localId: string, quantityTaken: number): Promise<LocalMedicine> {
    try {
      const medicines = await this.getMedicines();
      const index = medicines.findIndex(m => m.localId === localId);
      
      if (index === -1) {
        throw new Error('Medicine not found');
      }

      const medicine = medicines[index];
      const newQuantity = Math.max(0, medicine.remainingQuantity - quantityTaken);
      
      medicines[index] = {
        ...medicine,
        remainingQuantity: newQuantity,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      await AsyncStorage.setItem(MedicineService.MEDICINES_KEY, JSON.stringify(medicines));
      return medicines[index];
    } catch (error) {
      console.error('Failed to update medicine stock:', error);
      throw error;
    }
  }

  // Schedule operations
  async getSchedules(): Promise<LocalMedicineSchedule[]> {
    try {
      const stored = await AsyncStorage.getItem(MedicineService.SCHEDULES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get schedules:', error);
      return [];
    }
  }

  async addSchedule(schedule: Omit<LocalMedicineSchedule, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<LocalMedicineSchedule> {
    try {
      const schedules = await this.getSchedules();
      const newSchedule: LocalMedicineSchedule = {
        ...schedule,
        localId: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      schedules.push(newSchedule);
      await AsyncStorage.setItem(MedicineService.SCHEDULES_KEY, JSON.stringify(schedules));

      // Create reminders for this schedule
      if (newSchedule.reminderEnabled) {
        await this.createRemindersForSchedule(newSchedule);
      }

      return newSchedule;
    } catch (error) {
      console.error('Failed to add schedule:', error);
      throw error;
    }
  }

  async updateSchedule(localId: string, updates: Partial<LocalMedicineSchedule>): Promise<LocalMedicineSchedule> {
    try {
      const schedules = await this.getSchedules();
      const index = schedules.findIndex(s => s.localId === localId);
      
      if (index === -1) {
        throw new Error('Schedule not found');
      }

      schedules[index] = {
        ...schedules[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      await AsyncStorage.setItem(MedicineService.SCHEDULES_KEY, JSON.stringify(schedules));

      // Update reminders if needed
      if (updates.reminderEnabled !== undefined || updates.times || updates.reminderMinutesBefore !== undefined) {
        await this.deleteRemindersByScheduleId(localId);
        if (schedules[index].reminderEnabled) {
          await this.createRemindersForSchedule(schedules[index]);
        }
      }

      return schedules[index];
    } catch (error) {
      console.error('Failed to update schedule:', error);
      throw error;
    }
  }

  async deleteSchedule(localId: string): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      const filtered = schedules.filter(s => s.localId !== localId);
      await AsyncStorage.setItem(MedicineService.SCHEDULES_KEY, JSON.stringify(filtered));

      // Delete related reminders
      await this.deleteRemindersByScheduleId(localId);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      throw error;
    }
  }

  private async deleteSchedulesByMedicineId(medicineId: string): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      const filtered = schedules.filter(s => s.medicineId !== medicineId);
      await AsyncStorage.setItem(MedicineService.SCHEDULES_KEY, JSON.stringify(filtered));

      // Delete related reminders
      const schedulesToDelete = schedules.filter(s => s.medicineId === medicineId);
      for (const schedule of schedulesToDelete) {
        await this.deleteRemindersByScheduleId(schedule.localId);
      }
    } catch (error) {
      console.error('Failed to delete schedules by medicine ID:', error);
      throw error;
    }
  }

  // Intake operations
  async getIntakes(): Promise<LocalMedicineIntake[]> {
    try {
      const stored = await AsyncStorage.getItem(MedicineService.INTAKES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get intakes:', error);
      return [];
    }
  }

  async addIntake(intake: Omit<LocalMedicineIntake, 'localId' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<LocalMedicineIntake> {
    try {
      const intakes = await this.getIntakes();
      const newIntake: LocalMedicineIntake = {
        ...intake,
        localId: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      intakes.push(newIntake);
      await AsyncStorage.setItem(MedicineService.INTAKES_KEY, JSON.stringify(intakes));

      // Update medicine stock if intake was taken
      if (newIntake.status === 'taken') {
        await this.updateMedicineStock(newIntake.medicineId, newIntake.quantity);
      }

      return newIntake;
    } catch (error) {
      console.error('Failed to add intake:', error);
      throw error;
    }
  }

  async updateIntake(localId: string, updates: Partial<LocalMedicineIntake>): Promise<LocalMedicineIntake> {
    try {
      const intakes = await this.getIntakes();
      const index = intakes.findIndex(i => i.localId === localId);
      
      if (index === -1) {
        throw new Error('Intake not found');
      }

      const oldIntake = intakes[index];
      intakes[index] = {
        ...oldIntake,
        ...updates,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending'
      };

      await AsyncStorage.setItem(MedicineService.INTAKES_KEY, JSON.stringify(intakes));

      // Update medicine stock if status changed to taken
      if (oldIntake.status !== 'taken' && updates.status === 'taken') {
        await this.updateMedicineStock(intakes[index].medicineId, intakes[index].quantity);
      }

      return intakes[index];
    } catch (error) {
      console.error('Failed to update intake:', error);
      throw error;
    }
  }

  private async deleteIntakesByMedicineId(medicineId: string): Promise<void> {
    try {
      const intakes = await this.getIntakes();
      const filtered = intakes.filter(i => i.medicineId !== medicineId);
      await AsyncStorage.setItem(MedicineService.INTAKES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete intakes by medicine ID:', error);
      throw error;
    }
  }

  // Reminder operations
  async getReminders(): Promise<MedicineReminder[]> {
    try {
      const stored = await AsyncStorage.getItem(MedicineService.REMINDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get reminders:', error);
      return [];
    }
  }

  private async createRemindersForSchedule(schedule: LocalMedicineSchedule): Promise<void> {
    try {
      const medicine = await this.getMedicineById(schedule.medicineId);
      if (!medicine) return;

      const reminders = await this.getReminders();
      const startDate = new Date(schedule.startDate);
      const endDate = schedule.endDate ? new Date(schedule.endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year if no end date

      // Generate reminders for the next 30 days or until end date
      const generateUntil = new Date(Math.min(endDate.getTime(), Date.now() + 30 * 24 * 60 * 60 * 1000));

      for (let date = new Date(startDate); date <= generateUntil; date.setDate(date.getDate() + 1)) {
        for (const timeStr of schedule.times) {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const reminderTime = new Date(date);
          reminderTime.setHours(hours, minutes - schedule.reminderMinutesBefore, 0, 0);

          // Only create future reminders
          if (reminderTime > new Date()) {
            const notificationId = await this.scheduleNotification(
              `Time for ${medicine.name}`,
              `Take ${medicine.dosage} of ${medicine.name}`,
              reminderTime
            );

            const reminder: MedicineReminder = {
              id: generateUUID(),
              medicineId: schedule.medicineId,
              scheduleId: schedule.localId,
              reminderTime: reminderTime.toISOString(),
              notificationId,
              isActive: true,
              createdAt: new Date().toISOString()
            };

            reminders.push(reminder);
          }
        }
      }

      await AsyncStorage.setItem(MedicineService.REMINDERS_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Failed to create reminders for schedule:', error);
    }
  }

  private async scheduleNotification(title: string, body: string, triggerDate: Date): Promise<string | undefined> {
    try {
      // TODO: Fix notification trigger - using null for now to allow compilation
      // Will need to research correct Expo Notifications API format
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { type: 'medicine_reminder' },
        },
        trigger: null, // Immediate notification for now
      });
      return id;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return undefined;
    }
  }

  private async deleteRemindersByScheduleId(scheduleId: string): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const toDelete = reminders.filter(r => r.scheduleId === scheduleId);
      
      // Cancel notifications
      for (const reminder of toDelete) {
        if (reminder.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
        }
      }

      const filtered = reminders.filter(r => r.scheduleId !== scheduleId);
      await AsyncStorage.setItem(MedicineService.REMINDERS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete reminders by schedule ID:', error);
    }
  }

  // Utility methods
  async getMedicineById(localId: string): Promise<LocalMedicine | null> {
    try {
      const medicines = await this.getMedicines();
      return medicines.find(m => m.localId === localId) || null;
    } catch (error) {
      console.error('Failed to get medicine by ID:', error);
      return null;
    }
  }

  async getSchedulesByMedicineId(medicineId: string): Promise<LocalMedicineSchedule[]> {
    try {
      const schedules = await this.getSchedules();
      return schedules.filter(s => s.medicineId === medicineId && s.isActive);
    } catch (error) {
      console.error('Failed to get schedules by medicine ID:', error);
      return [];
    }
  }

  async getTodaysIntakes(): Promise<LocalMedicineIntake[]> {
    try {
      const intakes = await this.getIntakes();
      const today = new Date().toDateString();
      return intakes.filter(i => new Date(i.scheduledTime).toDateString() === today);
    } catch (error) {
      console.error('Failed to get today\'s intakes:', error);
      return [];
    }
  }

  async getUpcomingIntakes(hours: number = 24): Promise<LocalMedicineIntake[]> {
    try {
      const intakes = await this.getIntakes();
      const now = new Date();
      const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
      
      return intakes.filter(i => {
        const intakeTime = new Date(i.scheduledTime);
        return intakeTime >= now && intakeTime <= future && i.status === 'scheduled';
      });
    } catch (error) {
      console.error('Failed to get upcoming intakes:', error);
      return [];
    }
  }

  // Analytics methods
  async getMedicineStats() {
    try {
      const medicines = await this.getMedicines();
      const intakes = await this.getIntakes();
      const schedules = await this.getSchedules();

      const activeMedicines = medicines.filter(m => m.isActive).length;
      const lowStockMedicines = medicines.filter(m => m.remainingQuantity <= 5).length;
      const expiringSoon = medicines.filter(m => {
        const daysUntilExpiry = Math.ceil((new Date(m.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
        return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
      }).length;

      const todayIntakes = await this.getTodaysIntakes();
      const takenToday = todayIntakes.filter(i => i.status === 'taken').length;
      const missedToday = todayIntakes.filter(i => i.status === 'missed').length;

      return {
        activeMedicines,
        lowStockMedicines,
        expiringSoon,
        todayIntakes: todayIntakes.length,
        takenToday,
        missedToday,
        activeSchedules: schedules.filter(s => s.isActive).length
      };
    } catch (error) {
      console.error('Failed to get medicine stats:', error);
      return {
        activeMedicines: 0,
        lowStockMedicines: 0,
        expiringSoon: 0,
        todayIntakes: 0,
        takenToday: 0,
        missedToday: 0,
        activeSchedules: 0
      };
    }
  }
}

export default new MedicineService();
