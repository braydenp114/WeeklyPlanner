import { describe, expect, test } from '@jest/globals';
import type { Timestamp } from 'firebase/firestore';
import type { Task } from '@/services/tasksService';
import { comparePriority } from '../priority';
import { planReminders, REMINDER_ID_PREFIX } from '../reminders';
import { findUnfinishedFromLastWeek, shiftOneWeek, startOfWeek, weekKey } from '../rollover';
import { focusedMinutes, formatElapsed, formatMinutes } from '../focus';
import { averageMood } from '../reflection';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as Timestamp;
function task(id: string, start: Date, extra: Partial<Task> = {}): Task {
  return { id, title: id, startDate: ts(start), endDate: ts(new Date(start.getTime() + 3600e3)), ...extra } as Task;
}
const NOW = new Date(2026, 9, 9, 12, 0); // Fri 9 Oct 2026, noon

describe('priority', () => {
  test('P1 sorts before P2, P3 and no priority', () => {
    const list = [null, 3, 1, undefined, 2] as (1 | 2 | 3 | null | undefined)[];
    expect(list.sort(comparePriority)).toEqual([1, 2, 3, null, undefined]);
  });
});

describe('planReminders', () => {
  test('schedules future reminders soonest first, using minutesBefore', () => {
    const tasks = [
      task('b', new Date(2026, 9, 10, 9), { notification: { type: 'notification', minutesBefore: 10 } }),
      task('a', new Date(2026, 9, 9, 15), { notification: { type: 'notification', minutesBefore: 30 } }),
    ];
    const plan = planReminders(tasks, NOW);
    expect(plan.map((p) => p.identifier)).toEqual([`${REMINDER_ID_PREFIX}a`, `${REMINDER_ID_PREFIX}b`]);
    expect(plan[0].fireAt).toEqual(new Date(2026, 9, 9, 14, 30));
  });

  test('skips tasks without a notification, finished tasks and reminders already in the past', () => {
    const tasks = [
      task('none', new Date(2026, 9, 9, 15)),
      task('done', new Date(2026, 9, 9, 15), { completed: true, notification: { type: 'n', minutesBefore: 5 } }),
      task('past', new Date(2026, 9, 9, 12, 5), { notification: { type: 'n', minutesBefore: 10 } }),
    ];
    expect(planReminders(tasks, NOW)).toHaveLength(0);
  });

  test('never schedules more than the limit', () => {
    const tasks = Array.from({ length: 80 }, (_, i) =>
      task(`t${i}`, new Date(2026, 9, 10, 0, i), { notification: { type: 'n', minutesBefore: 0 } }),
    );
    expect(planReminders(tasks, NOW, 60)).toHaveLength(60);
  });
});

describe('rollover', () => {
  test('weeks start on Monday', () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 9, 5));
    expect(weekKey(NOW)).toBe('2026-10-05');
  });

  test('finds only unfinished one-off tasks from last week', () => {
    const tasks = [
      task('keep', new Date(2026, 8, 30, 10)),
      task('done', new Date(2026, 8, 30, 10), { completed: true }),
      task('logged', new Date(2026, 9, 1, 10), { actualStatus: 'different' }),
      task('deadline', new Date(2026, 9, 1, 10), { isDeadline: true }),
      task('recurring', new Date(2026, 9, 2, 10), { seriesId: 's1' }),
      task('thisWeek', new Date(2026, 9, 6, 10)),
      task('twoWeeksAgo', new Date(2026, 8, 25, 10)),
    ];
    expect(findUnfinishedFromLastWeek(tasks, NOW).map((t) => t.id)).toEqual(['keep']);
  });

  test('moving a task keeps the weekday and time', () => {
    expect(shiftOneWeek(new Date(2026, 8, 30, 10, 30))).toEqual(new Date(2026, 9, 7, 10, 30));
  });
});

describe('focus timer', () => {
  test('rounds a session to whole minutes', () => {
    expect(focusedMinutes(0, 25 * 60000 + 20000)).toBe(25);
    expect(focusedMinutes(0, 20000)).toBe(0);
  });

  test('formats the running clock', () => {
    expect(formatElapsed(5 * 60000 + 7000)).toBe('05:07');
    expect(formatElapsed(3600000 + 2 * 60000 + 9000)).toBe('1:02:09');
  });

  test('formats logged minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(90)).toBe('1h 30m');
    expect(formatMinutes(120)).toBe('2h');
  });
});

describe('reflection', () => {
  test('average mood of the week', () => {
    expect(averageMood([{ day: 'a', mood: 4, note: '' }, { day: 'b', mood: 5, note: '' }])).toBe(4.5);
    expect(averageMood([])).toBeNull();
  });
});
