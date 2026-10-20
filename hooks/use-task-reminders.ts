import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermission } from '@/config/notifications';
import { useAuth } from '@/context/AuthContext';
import { getTasksForRange, Task } from '@/services/tasksService';
import { planReminders, REMINDER_ID_PREFIX } from '@/utils/reminders';

// Show reminders as a banner and in the notification list even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** How far ahead reminders are scheduled. Re-synced every time tasks change or the app opens. */
const REMINDER_WINDOW_DAYS = 14;

/**
 * Makes the phone's scheduled reminders match the tasks: cancels this app's old
 * reminders and schedules one for every upcoming task that has a notification.
 * Because it always rebuilds from the saved tasks, it also covers recurring tasks,
 * edited times, completed tasks and deleted tasks.
 * Local notifications aren't available in the browser, so this does nothing on web.
 */
export async function syncTaskReminders(tasks: Task[]): Promise<number> {
  if (Platform.OS === 'web') return 0;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const plan = planReminders(tasks);
  if (plan.length === 0) return 0;

  const granted = await requestNotificationPermission();
  if (!granted) return 0;

  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: { title: reminder.title, body: reminder.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt },
    });
  }
  return plan.length;
}

/** Re-syncs reminders whenever the signed-in user's tasks change (pass NavContext's taskRefreshKey). */
export function useReminderSync(refreshKey: number) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || loading || !user) return;
    let cancelled = false;
    const now = new Date();
    const until = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    getTasksForRange(now, until)
      .then((tasks) => (cancelled ? 0 : syncTaskReminders(tasks)))
      .catch((e) => console.warn('[reminders] Failed to sync reminders:', e));

    return () => {
      cancelled = true;
    };
  }, [user, loading, refreshKey]);
}

export async function cancelReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
