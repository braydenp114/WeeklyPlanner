import { describe, expect, test } from '@jest/globals';
import {
  generateOccurrenceDates,
  getNthWeekdayOfMonth,
  getWeekdayOrdinal,
} from '../expandRecurrences';

const WEDNESDAY = 3;

/** Collects every date the generator yields, as YYYY-MM-DD strings for easy comparison. */
function collect(recurrence: string, start: Date, end: Date): string[] {
  const out: string[] = [];
  for (const d of generateOccurrenceDates(recurrence, null, start, end)) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
}

describe('getWeekdayOrdinal', () => {
  test('7 Oct 2026 is the first Wednesday of the month', () => {
    expect(getWeekdayOrdinal(new Date(2026, 9, 7))).toBe(1);
  });

  test('28 Oct 2026 is the fourth Wednesday', () => {
    expect(getWeekdayOrdinal(new Date(2026, 9, 28))).toBe(4);
  });
});

describe('getNthWeekdayOfMonth', () => {
  test('first Wednesday of November 2026 is the 4th', () => {
    expect(getNthWeekdayOfMonth(2026, 10, WEDNESDAY, 1).getDate()).toBe(4);
  });

  test('n = 5 returns the last Wednesday of the month', () => {
    // February 2027 has only four Wednesdays; the last one is the 24th
    expect(getNthWeekdayOfMonth(2027, 1, WEDNESDAY, 5).getDate()).toBe(24);
  });

  test('handles month overflow into the next year', () => {
    const d = getNthWeekdayOfMonth(2026, 12, WEDNESDAY, 1); // month 12 = January 2027
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2027, 0, 6]);
  });
});

describe('monthly recurrence', () => {
  test('repeats on the first Wednesday, not on the same date', () => {
    const start = new Date(2026, 9, 7, 16, 0); // Wed 7 Oct 2026, 4pm
    const end = new Date(2027, 0, 31);
    expect(collect('monthly', start, end)).toEqual(['2026-10-07', '2026-11-04', '2026-12-02', '2027-01-06']);
  });

  test('keeps the start time on every occurrence', () => {
    const start = new Date(2026, 9, 7, 16, 30);
    const [, second] = [...generateOccurrenceDates('monthly', null, start, new Date(2026, 11, 1))];
    expect([second.getHours(), second.getMinutes()]).toEqual([16, 30]);
  });
});

describe('daily and weekly recurrence', () => {
  test('daily repeats every day including the start day', () => {
    const start = new Date(2026, 9, 5, 9, 0);
    expect(collect('daily', start, new Date(2026, 9, 8, 23, 59))).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
    ]);
  });

  test('weekly repeats on the same weekday', () => {
    const start = new Date(2026, 9, 7, 9, 0);
    expect(collect('weekly', start, new Date(2026, 9, 31))).toEqual([
      '2026-10-07', '2026-10-14', '2026-10-21', '2026-10-28',
    ]);
  });
});
