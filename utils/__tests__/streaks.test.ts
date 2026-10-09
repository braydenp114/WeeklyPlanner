import { describe, expect, test } from '@jest/globals';
import type { Timestamp } from 'firebase/firestore';
import type { Task } from '@/services/tasksService';
import { calculateStreak, isOccurrenceDone, isStreakEligible } from '../streaks';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-06T12:00:00');

/** Minimal stand-in for a Firestore Timestamp: the streak logic only calls toDate(). */
function ts(date: Date): Timestamp {
  return { toDate: () => date } as unknown as Timestamp;
}

/** Builds one occurrence of a recurring series that started `daysAgo` days before NOW. */
function makeOccurrence(daysAgo: number, completed: boolean, extra: Partial<Task> = {}): Task {
  const start = new Date(NOW.getTime() - daysAgo * DAY_MS);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour block
  return {
    seriesId: 'series-1',
    startDate: ts(start),
    endDate: ts(end),
    completed,
    ...extra,
  } as Task;
}

describe('isStreakEligible', () => {
  test('a recurring task saved with streakEligible: true is eligible', () => {
    expect(isStreakEligible(makeOccurrence(1, false, { streakEligible: true }))).toBe(true);
  });

  test('older recurring tasks without the flag are still eligible', () => {
    expect(isStreakEligible(makeOccurrence(1, false))).toBe(true);
  });

  test('a one-off task (no seriesId) is not eligible', () => {
    expect(isStreakEligible(makeOccurrence(1, false, { seriesId: undefined }))).toBe(false);
  });
});

describe('isOccurrenceDone', () => {
  test('counts a ticked checkbox as done', () => {
    expect(isOccurrenceDone(makeOccurrence(1, true))).toBe(true);
  });

  test('counts "done as planned" on the flip-card as done', () => {
    expect(isOccurrenceDone(makeOccurrence(1, false, { actualStatus: 'as_planned' }))).toBe(true);
  });
});

describe('calculateStreak', () => {
  test('counts consecutive completed occurrences', () => {
    const series = [makeOccurrence(3, true), makeOccurrence(2, true), makeOccurrence(1, true)];
    expect(calculateStreak(series, NOW)).toEqual({ current: 3, longest: 3 });
  });

  test('increments when the next occurrence is completed on schedule', () => {
    const series = [makeOccurrence(3, true), makeOccurrence(2, true), makeOccurrence(1, true)];
    series.push(makeOccurrence(0.5, true));
    expect(calculateStreak(series, NOW).current).toBe(4);
  });

  test('a missed occurrence resets the current streak but keeps the best', () => {
    const series = [
      makeOccurrence(4, true),
      makeOccurrence(3, true),
      makeOccurrence(2, false),
      makeOccurrence(1, true),
    ];
    expect(calculateStreak(series, NOW)).toEqual({ current: 1, longest: 2 });
  });

  test('a block still in progress today does not reset the streak', () => {
    const inProgress = makeOccurrence(0.01, false, {
      endDate: ts(new Date(NOW.getTime() + 60 * 60 * 1000)),
    });
    const series = [makeOccurrence(2, true), makeOccurrence(1, true), inProgress];
    expect(calculateStreak(series, NOW).current).toBe(2);
  });

  test('future occurrences are ignored', () => {
    const series = [makeOccurrence(1, true), makeOccurrence(-1, false)];
    expect(calculateStreak(series, NOW)).toEqual({ current: 1, longest: 1 });
  });

  test('a series with nothing completed has a streak of 0', () => {
    const series = [makeOccurrence(2, false), makeOccurrence(1, false)];
    expect(calculateStreak(series, NOW)).toEqual({ current: 0, longest: 0 });
  });
});
