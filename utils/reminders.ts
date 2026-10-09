import type { Task } from '@/services/tasksService';

/** iOS only keeps 64 scheduled notifications per app, so stay safely under that. */
export const MAX_SCHEDULED_REMINDERS = 60;

export interface PlannedReminder {
  /** Notification identifier, so the app can find and replace its own reminders. */
  identifier: string;
  title: string;
  body: string;
  fireAt: Date;
}

export const REMINDER_ID_PREFIX = 'reminder-';

/**
 * Picks the reminders that should be scheduled on this phone right now:
 * every task with a notification whose reminder time is still in the future,
 * soonest first. Works for one-off and recurring tasks (each occurrence is its own task).
 */
export function planReminders(tasks: Task[], now: Date = new Date(), limit = MAX_SCHEDULED_REMINDERS): PlannedReminder[] {
  return tasks
    .filter((t) => t.id && t.notification && !t.completed)
    .map((t) => {
      const minutes = t.notification!.minutesBefore;
      return {
        identifier: `${REMINDER_ID_PREFIX}${t.id}`,
        title: t.title,
        body: minutes > 0 ? `Starting in ${minutes} minutes` : 'Starting now',
        fireAt: new Date(t.startDate.toDate().getTime() - minutes * 60 * 1000),
      };
    })
    .filter((r) => r.fireAt.getTime() > now.getTime())
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, limit);
}
