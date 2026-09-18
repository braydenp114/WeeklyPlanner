import * as Notifications from 'expo-notifications';
import type { Task } from '@/services/tasksService';
import { requestNotificationPermission } from '@/config/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type ReminderTaskInput = Pick<Task, 'title' | 'startDate' | 'notification'>;

export async function scheduleReminder(task: ReminderTaskInput): Promise<string | null> {
  if (!task.notification) return null;

  const granted = await requestNotificationPermission();
  if (!granted) return null;

  const taskDate = task.startDate.toDate();
  const triggerDate = new Date(
    taskDate.getTime() - task.notification.minutesBefore * 60 * 1000
  );

  if (triggerDate.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: `Starting in ${task.notification.minutesBefore} minutes`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function cancelReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
