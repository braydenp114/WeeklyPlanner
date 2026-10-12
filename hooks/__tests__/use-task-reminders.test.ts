import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import type { Timestamp } from 'firebase/firestore';

const mockNotifications = {
  scheduled: [] as { identifier: string }[],
  cancelled: [] as string[],
  created: [] as any[],
};

jest.mock('expo-notifications', () => ({
  setNotificationHandler: () => {},
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: async () => mockNotifications.scheduled,
  cancelScheduledNotificationAsync: async (id: string) => {
    mockNotifications.cancelled.push(id);
  },
  scheduleNotificationAsync: async (req: any) => {
    mockNotifications.created.push(req);
    return req.identifier;
  },
}));
jest.mock('../../config/notifications', () => ({ requestNotificationPermission: async () => true }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null, loading: true }) }));
jest.mock('../../services/tasksService', () => ({ getTasksForRange: async () => [] }));

import { syncTaskReminders } from '../use-task-reminders';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as Timestamp;
const soon = (minutes: number) => new Date(Date.now() + minutes * 60000);

beforeEach(() => {
  mockNotifications.scheduled = [];
  mockNotifications.cancelled = [];
  mockNotifications.created = [];
});

describe('syncTaskReminders (runs on iOS/Android)', () => {
  test('replaces old task reminders but leaves other notifications alone', async () => {
    mockNotifications.scheduled = [{ identifier: 'reminder-old' }, { identifier: 'focus-timer' }];
    await syncTaskReminders([]);
    expect(mockNotifications.cancelled).toEqual(['reminder-old']);
  });

  test('schedules a reminder for each upcoming task with a notification', async () => {
    const tasks: any[] = [
      { id: 'a', title: 'Gym', startDate: ts(soon(120)), notification: { type: 'n', minutesBefore: 15 } },
      { id: 'b', title: 'No reminder', startDate: ts(soon(120)), notification: null },
    ];
    const count = await syncTaskReminders(tasks);
    expect(count).toBe(1);
    expect(mockNotifications.created[0].identifier).toBe('reminder-a');
    expect(mockNotifications.created[0].content.body).toBe('Starting in 15 minutes');
  });
});
