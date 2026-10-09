import { describe, expect, test } from '@jest/globals';
import type { Timestamp } from 'firebase/firestore';
import type { Task } from '@/services/tasksService';
import { buildTodayList } from '../todayList';

const ts = (d: Date) => ({ toDate: () => d }) as unknown as Timestamp;
function task(id: string, start: Date, extra: Partial<Task> = {}): Task {
  return { id, title: id, startDate: ts(start), endDate: ts(new Date(start.getTime() + 3600e3)), ...extra } as Task;
}
const NOW = new Date(2026, 9, 9, 12, 0); // Fri 9 Oct 2026, noon

describe('buildTodayList', () => {
  test('today: P1 first, then the rest by start time', () => {
    const tasks = [
      task('late', new Date(2026, 9, 9, 18)),
      task('early', new Date(2026, 9, 9, 8)),
      task('urgent', new Date(2026, 9, 9, 20), { priority: 1 }),
      task('tomorrow', new Date(2026, 9, 10, 9)),
    ];
    expect(buildTodayList(tasks, NOW).today.map((t) => t.id)).toEqual(['urgent', 'early', 'late']);
  });

  test('overdue: only unfinished one-off tasks from the last 7 days', () => {
    const tasks = [
      task('missed', new Date(2026, 9, 7, 10)),
      task('done', new Date(2026, 9, 7, 10), { completed: true }),
      task('logged', new Date(2026, 9, 7, 10), { actualStatus: 'different' }),
      task('deadline', new Date(2026, 9, 7, 10), { isDeadline: true }),
      task('habit', new Date(2026, 9, 7, 10), { seriesId: 's1' }),
      task('too-old', new Date(2026, 8, 30, 10)),
      task('today-earlier', new Date(2026, 9, 9, 8)),
    ];
    expect(buildTodayList(tasks, NOW).overdue.map((t) => t.id)).toEqual(['missed']);
  });
});
