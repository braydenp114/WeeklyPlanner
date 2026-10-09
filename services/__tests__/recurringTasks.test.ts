import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// ── Fake Firestore: records what the service writes instead of talking to Firebase ──
const mockDb = {
  sets: [] as any[],
  commits: 0,
  deletedIds: [] as string[],
  existing: [] as any[], // documents returned by getDocs
};

jest.mock('../../config/firebase', () => ({ db: {}, auth: { currentUser: { uid: 'user-1' } } }));
jest.mock('../../hooks/use-task-reminders', () => ({ scheduleReminder: async () => null }));
jest.mock('firebase/firestore', () => {
  class MockTimestamp {
    date: Date;
    constructor(date: Date) { this.date = date; }
    toDate() { return this.date; }
    static fromDate(date: Date) { return new MockTimestamp(date); }
  }
  let nextId = 0;
  return {
    Timestamp: MockTimestamp,
    collection: () => ({}),
    doc: (_db: any, _col?: string, id?: string) => ({ id: id ?? `new-${nextId++}` }),
    addDoc: async (_col: any, data: any) => { mockDb.sets.push(data); return { id: 'added' }; },
    deleteDoc: async (ref: any) => { mockDb.deletedIds.push(ref.id); },
    updateDoc: async () => {},
    writeBatch: () => ({
      set: (_ref: any, data: any) => mockDb.sets.push(data),
      delete: (ref: any) => mockDb.deletedIds.push(ref.id),
      update: () => {},
      commit: async () => { mockDb.commits++; },
    }),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    query: () => ({}),
    where: () => ({}),
    getDocs: async () => ({
      docs: mockDb.existing.map((d) => ({ ref: { id: d.id }, data: () => d })),
      forEach: (cb: any) => mockDb.existing.forEach((d) => cb({ id: d.id, data: () => d })),
    }),
  };
});

import { Timestamp } from 'firebase/firestore';
import { createTask, replaceRecurrence, CreateTaskData, Task } from '../tasksService';

function makeTaskData(recurrence: CreateTaskData['recurrence'], start: Date): CreateTaskData {
  return {
    title: 'Gym', description: null, location: null, latitude: null, longitude: null,
    colorHex: '#E11D48', category: 'Workout', busyStatus: 'busy', visibility: 'default',
    startDate: Timestamp.fromDate(start), endDate: Timestamp.fromDate(new Date(start.getTime() + 3600e3)),
    allDay: false, recurrence, recurrenceEndDate: null, customRecurrenceRule: null, notification: null,
  };
}

beforeEach(() => {
  mockDb.sets = [];
  mockDb.commits = 0;
  mockDb.deletedIds = [];
  mockDb.existing = [];
});

describe('createTask with a repeat rule', () => {
  test('a daily task creates many occurrences that share one seriesId', async () => {
    await createTask(makeTaskData('daily', new Date(2026, 9, 5, 7, 0)));
    expect(mockDb.sets.length).toBeGreaterThan(300);
    const seriesIds = new Set(mockDb.sets.map((d) => d.seriesId));
    expect(seriesIds.size).toBe(1);
  });

  test('long series are committed in several smaller batches', async () => {
    await createTask(makeTaskData('daily', new Date(2026, 9, 5, 7, 0)));
    expect(mockDb.commits).toBeGreaterThan(1);
  });

  test('recurring occurrences are marked streak-eligible', async () => {
    await createTask(makeTaskData('weekly', new Date(2026, 9, 5, 7, 0)));
    expect(mockDb.sets.every((d) => d.streakEligible === true)).toBe(true);
  });
});

describe('replaceRecurrence (changing Repeat while editing)', () => {
  test('turning a one-off task into a weekly task deletes it and creates a series', async () => {
    const original = { ...makeTaskData('none', new Date(2026, 9, 7, 16, 0)), id: 'one-off' } as Task;
    await replaceRecurrence(original, makeTaskData('weekly', new Date(2026, 9, 7, 16, 0)));
    expect(mockDb.deletedIds).toEqual(['one-off']);
    expect(mockDb.sets.length).toBeGreaterThan(50);
  });

  test('changing a series keeps earlier occurrences and replaces this one onwards', async () => {
    const day = (d: number) => Timestamp.fromDate(new Date(2026, 9, d, 7, 0));
    mockDb.existing = [
      { id: 'past-1', seriesId: 's1', startDate: day(1) },
      { id: 'past-2', seriesId: 's1', startDate: day(2) },
      { id: 'edited', seriesId: 's1', startDate: day(3) },
      { id: 'future', seriesId: 's1', startDate: day(4) },
    ];
    const edited = { ...makeTaskData('daily', new Date(2026, 9, 3, 7, 0)), id: 'edited', seriesId: 's1' } as Task;
    await replaceRecurrence(edited, makeTaskData('none', new Date(2026, 9, 3, 7, 0)));
    expect(mockDb.deletedIds.sort()).toEqual(['edited', 'future']);
    expect(mockDb.sets).toHaveLength(1); // recreated as a single task
  });
});
