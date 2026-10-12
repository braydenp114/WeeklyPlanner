import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Timestamp } from 'firebase/firestore';
import { auth } from '@/config/firebase';
import { getUpcomingLocationTasks, updateTask, getTaskById } from './tasksService';
import { shouldAutoComplete } from '@/utils/geofenceWindow';

const GEOFENCE_TASK_NAME = 'GEOFENCE_TASK_COMPLETION';
/** iOS allows 20 monitored regions per app; leave headroom for other features. */
const MAX_REGIONS = 15;
const DEFAULT_RADIUS_METERS = 150;

const REGIONS_KEY = 'geofence:regionsSignature';
const REGISTERED_AT_KEY = 'geofence:registeredAt';

/**
 * Waits for Firebase to restore the saved login. When the OS starts the app in the
 * background just to handle a geofence event, currentUser is null until this resolves.
 */
async function getSignedInUserId(): Promise<string | null> {
  await auth.authStateReady();
  return auth.currentUser?.uid ?? null;
}

async function getLastRegisteredAt(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(REGISTERED_AT_KEY);
  return raw ? Number(raw) : null;
}

// Define the background task (must run at module load, so this file is imported from app/_layout)
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.error('Geofence task error:', error);
      return;
    }
    if (data?.eventType !== Location.GeofencingEventType.Enter) return;

    // Each materialised occurrence of a recurring series is its own document, and the region
    // identifier is that document's id, so this only ever touches the one occurrence.
    const taskId: string = data.region.identifier;

    try {
      if (!(await getSignedInUserId())) return;

      const task = await getTaskById(taskId);
      if (!task) return;

      const now = Date.now();
      if (!shouldAutoComplete(task, now, await getLastRegisteredAt())) {
        // Outside the window, already completed, or a re-registration echo: no write.
        console.log(`Geofence entered for task ${taskId}; not completing (outside window or not a new arrival).`);
        return;
      }

      await updateTask(taskId, {
        completed: true,
        completedBy: 'geofence',
        completedAt: Timestamp.fromMillis(now),
      });

      // Drop this region and pick up the next upcoming ones
      await syncAllGeofences();
    } catch (err) {
      console.error('Error handling geofence enter event:', err);
    }
  });
}

/** Read-only check used by the UI. Never prompts the user. */
export async function isAutoCompleteAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [fg, bg] = await Promise.all([
      Location.getForegroundPermissionsAsync(),
      Location.getBackgroundPermissionsAsync(),
    ]);
    return fg.granted && bg.granted;
  } catch {
    return false;
  }
}

async function stopGeofencing() {
  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME)) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
  } catch {
    // Nothing registered, or permission already gone. Either way nothing is running.
  }
  await AsyncStorage.multiRemove([REGIONS_KEY, REGISTERED_AT_KEY]);
}

/**
 * Syncs the monitored geofences with the soonest upcoming location-tagged tasks.
 * Never throws: missing permission, signed-out users and tasks without coordinates are skipped.
 */
export async function syncAllGeofences() {
  if (Platform.OS === 'web') return;

  try {
    // Permission may have been revoked in OS settings since the regions were registered
    if (!(await isAutoCompleteAvailable())) {
      await stopGeofencing();
      return;
    }

    if (!(await getSignedInUserId())) {
      await stopGeofencing();
      return;
    }

    const upcomingTasks = await getUpcomingLocationTasks();
    const desiredRegions: Location.LocationRegion[] = upcomingTasks
      .slice(0, MAX_REGIONS)
      .map((task) => ({
        identifier: task.id!,
        latitude: task.latitude!,
        longitude: task.longitude!,
        radius: task.geofenceRadiusMeters || DEFAULT_RADIUS_METERS,
        notifyOnEnter: true,
        notifyOnExit: false,
      }));

    if (desiredRegions.length === 0) {
      await stopGeofencing();
      return;
    }

    // Only re-register when the set actually changed. Restarting makes the OS re-report Enter
    // for regions the user is already inside, which must not count as an arrival.
    const signature = JSON.stringify(
      desiredRegions
        .map((r) => [r.identifier, r.latitude, r.longitude, r.radius])
        .sort(),
    );
    const isStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (isStarted && (await AsyncStorage.getItem(REGIONS_KEY)) === signature) return;

    // Record the registration time first so any immediate "already inside" echoes are ignored
    await AsyncStorage.multiSet([
      [REGIONS_KEY, signature],
      [REGISTERED_AT_KEY, String(Date.now())],
    ]);
    if (isStarted) await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, desiredRegions);
    console.log(`Synced ${desiredRegions.length} geofence regions.`);
  } catch (err) {
    console.error('Error syncing geofences:', err);
  }
}
