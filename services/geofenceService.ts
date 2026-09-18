import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { getUpcomingLocationTasks, updateTask, getTaskById } from './tasksService';
import { Timestamp } from 'firebase/firestore';

const GEOFENCE_TASK_NAME = 'GEOFENCE_TASK_COMPLETION';

// Define the background task
if (Platform.OS !== 'web') {
  TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
      console.error('Geofence task error:', error);
      return;
    }

    if (data.eventType === Location.GeofencingEventType.Enter) {
      const region = data.region;
      const taskId = region.identifier;

      try {
        const task = await getTaskById(taskId);
        if (!task || task.completed) return;

        const now = Date.now();
        const start = task.startDate.toMillis();
        const end = task.endDate.toMillis();

        // 30 minutes grace period
        const graceMs = 30 * 60 * 1000;

        if (now >= (start - graceMs) && now <= (end + graceMs)) {
          console.log(`Geofence entered for task ${taskId} within time window. Completing task.`);
          await updateTask(taskId, {
            completed: true,
            completedBy: 'geofence',
            completedAt: Timestamp.now(),
          });

          // Re-sync geofences to remove this one and add the next upcoming ones
          await syncAllGeofences();
        } else {
          console.log(`Geofence entered for task ${taskId}, but outside scheduled time window.`);
        }
      } catch (err) {
        console.error('Error handling geofence enter event:', err);
      }
    }
  });
}

/**
 * Syncs the currently monitored geofences.
 * Ensures we stay under the iOS 20-region cap by only monitoring the 15 nearest upcoming tasks.
 */
export async function syncAllGeofences() {
  if (Platform.OS === 'web') return;

  try {
    const { granted: backgroundGranted } = await Location.getBackgroundPermissionsAsync();
    if (!backgroundGranted) return;

    // Get up to 15 nearest upcoming tasks
    const upcomingTasks = await getUpcomingLocationTasks();
    const tasksToMonitor = upcomingTasks.slice(0, 15);

    // Map tasks to Expo Location Regions
    const desiredRegions = tasksToMonitor.map(task => ({
      identifier: task.id!,
      latitude: task.latitude!,
      longitude: task.longitude!,
      radius: task.geofenceRadiusMeters || 150,
      notifyOnEnter: true,
      notifyOnExit: false,
    }));

    const isStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);

    // Cleanest approach to sync is to stop the current task and start it again with the new array
    if (isStarted) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }

    if (desiredRegions.length > 0) {
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, desiredRegions);
      console.log(`Synced ${desiredRegions.length} geofence regions.`);
    } else {
      console.log('No upcoming location tasks, geofencing stopped.');
    }

  } catch (err) {
    console.error('Error syncing geofences:', err);
  }
}
