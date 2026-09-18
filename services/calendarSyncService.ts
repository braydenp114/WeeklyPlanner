import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task } from './tasksService';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/config/firebase';

const CALENDAR_NAME = 'WeeklyPlanner';
const SYNC_ENABLED_KEY = '@calendar_sync_enabled';
const CALENDAR_ID_KEY = '@device_calendar_id';
const EVENT_MAP_PREFIX = '@device_event_id_';

/**
 * Checks if calendar sync is currently enabled on this device.
 */
export async function isCalendarSyncEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const value = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets the calendar sync status.
 */
export async function setCalendarSyncEnabled(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Gets the device calendar ID, creating it if it doesn't exist.
 */
export async function getDeviceCalendarId(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    const storedId = await AsyncStorage.getItem(CALENDAR_ID_KEY);
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    
    // Check if stored calendar still exists
    if (storedId) {
      const exists = calendars.find(c => c.id === storedId);
      if (exists) return storedId;
    }

    // Try to find one by name just in case
    const existing = calendars.find(c => c.title === CALENDAR_NAME);
    if (existing) {
      await AsyncStorage.setItem(CALENDAR_ID_KEY, existing.id);
      return existing.id;
    }

    // Create new calendar
    const defaultCalendarSource = Platform.OS === 'ios'
      ? await getDefaultIosCalendarSource()
      : { isLocalAccount: true, name: CALENDAR_NAME };

    const newCalendarID = await Calendar.createCalendarAsync({
      title: CALENDAR_NAME,
      color: '#4285F4',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: (defaultCalendarSource as any)?.id,
      source: defaultCalendarSource as any,
      name: CALENDAR_NAME,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });

    await AsyncStorage.setItem(CALENDAR_ID_KEY, newCalendarID);
    return newCalendarID;
  } catch (err) {
    console.error('Error getting/creating device calendar:', err);
    return null;
  }
}

async function getDefaultIosCalendarSource() {
  const defaultCalendar = await Calendar.getDefaultCalendarAsync();
  return defaultCalendar.source;
}

/**
 * Syncs a single task to the device calendar.
 */
export async function syncTaskToDevice(task: Task & { id: string }): Promise<void> {
  if (Platform.OS === 'web') return;
  
  const enabled = await isCalendarSyncEnabled();
  if (!enabled) return;

  const calendarId = await getDeviceCalendarId();
  if (!calendarId) return;

  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return;

  try {
    const eventMapKey = `${EVENT_MAP_PREFIX}${task.id}`;
    let deviceEventId = await AsyncStorage.getItem(eventMapKey);

    const eventDetails: any = {
      title: task.title,
      startDate: task.startDate.toDate(),
      endDate: task.endDate.toDate(),
      allDay: task.allDay,
      location: task.location || undefined,
      notes: task.description || undefined,
    };

    if (deviceEventId) {
      try {
        await Calendar.updateEventAsync(deviceEventId, eventDetails);
      } catch (e: any) {
        // If updating fails (e.g. event was manually deleted from native calendar)
        // create a new one.
        console.warn('Failed to update event, recreating...', e.message);
        deviceEventId = await Calendar.createEventAsync(calendarId, eventDetails);
        await AsyncStorage.setItem(eventMapKey, deviceEventId);
      }
    } else {
      deviceEventId = await Calendar.createEventAsync(calendarId, eventDetails);
      await AsyncStorage.setItem(eventMapKey, deviceEventId);
    }
  } catch (err) {
    console.error('Error syncing task to device:', err);
  }
}

/**
 * Removes a task from the device calendar.
 */
export async function removeTaskFromDevice(taskId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const eventMapKey = `${EVENT_MAP_PREFIX}${taskId}`;
    const deviceEventId = await AsyncStorage.getItem(eventMapKey);
    
    if (deviceEventId) {
      try {
        await Calendar.deleteEventAsync(deviceEventId);
      } catch (e: any) {
        console.warn('Failed to delete event, it may already be deleted:', e.message);
      }
      await AsyncStorage.removeItem(eventMapKey);
    }
  } catch (err) {
    console.error('Error removing task from device:', err);
  }
}

/**
 * Performs a full resync of upcoming tasks.
 */
export async function fullResync(): Promise<void> {
  if (Platform.OS === 'web') return;
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const { status } = await Calendar.getCalendarPermissionsAsync();
  if (status !== 'granted') return;

  const calendarId = await getDeviceCalendarId();
  if (!calendarId) return;

  try {
    // Sync tasks from the last 30 days and all future tasks
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const fromTimestamp = Timestamp.fromDate(fromDate);

    const q = query(
      collection(db, 'tasks'),
      where('ownerId', '==', currentUser.uid),
      where('endDate', '>=', fromTimestamp)
    );

    const snapshot = await getDocs(q);
    
    const tasksToSync: (Task & { id: string })[] = [];
    snapshot.forEach(doc => {
      tasksToSync.push({ id: doc.id, ...doc.data() } as (Task & { id: string }));
    });

    for (const task of tasksToSync) {
      await syncTaskToDevice(task);
    }
    
    console.log(`Full resync complete for ${tasksToSync.length} tasks.`);
  } catch (err) {
    console.error('Error during full resync:', err);
  }
}

/**
 * Removes the calendar and un-syncs everything.
 */
export async function disableAndCleanUpSync(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await setCalendarSyncEnabled(false);
    const calendarId = await getDeviceCalendarId();
    if (calendarId) {
      await Calendar.deleteCalendarAsync(calendarId);
      await AsyncStorage.removeItem(CALENDAR_ID_KEY);
    }
    const allKeys = await AsyncStorage.getAllKeys();
    const eventKeys = allKeys.filter(k => k.startsWith(EVENT_MAP_PREFIX));
    for (const key of eventKeys) {
      await AsyncStorage.removeItem(key);
    }
  } catch (err) {
    console.error('Error cleaning up calendar sync:', err);
  }
}
