import * as Notifications from 'expo-notifications';
import type { TaskItem } from '@/components/WeeklyGrid';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function getTaskDate(weekStart: Date, task: TaskItem): Date {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + task.dayIndex);
  date.setHours(task.startHour, 0, 0, 0);
  return date;
}

export async function scheduleReminder(weekStart: Date, task: TaskItem) {
  if (!task.reminderMinutesBefore) return null;

  const taskDate = getTaskDate(weekStart, task);
  const triggerDate = new Date(
    taskDate.getTime() - task.reminderMinutesBefore * 60 * 1000
  );

  if (triggerDate.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: task.title,
      body: `Starting in ${task.reminderMinutesBefore} minutes`,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
}

export async function cancelReminder(notificationId: string) {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
