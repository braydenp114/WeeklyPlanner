import { describe, expect, test } from '@jest/globals';
import { formatHourLabel, formatShortTime, formatTimeRange, getPastEventStyle } from '../calendar-shared';

const at = (h: number, m = 0) => new Date(2026, 9, 9, h, m);

describe('formatShortTime', () => {
  test('drops ":00" on the hour', () => {
    expect(formatShortTime(at(10))).toBe('10am');
    expect(formatShortTime(at(16))).toBe('4pm');
  });

  test('keeps minutes when they are not zero', () => {
    expect(formatShortTime(at(10, 30))).toBe('10:30am');
  });

  test('midnight and noon use 12', () => {
    expect(formatShortTime(at(0))).toBe('12am');
    expect(formatShortTime(at(12))).toBe('12pm');
  });
});

describe('formatTimeRange', () => {
  test('only shows am/pm once when both times share it', () => {
    expect(formatTimeRange(at(10), at(11, 30))).toBe('10 – 11:30am');
  });

  test('shows am/pm on both sides when the range crosses noon', () => {
    expect(formatTimeRange(at(11), at(13))).toBe('11am – 1pm');
  });
});

describe('formatHourLabel', () => {
  test('labels hour lines like Google Calendar', () => {
    expect(formatHourLabel(1)).toBe('1 AM');
    expect(formatHourLabel(12)).toBe('12 PM');
    expect(formatHourLabel(17)).toBe('5 PM');
  });

  test('midnight has no label (it is the top edge of the grid)', () => {
    expect(formatHourLabel(0)).toBe('');
  });
});

describe('getPastEventStyle', () => {
  test('past events keep their colour but fade out', () => {
    expect(getPastEventStyle(true, '#6366F1')).toEqual({ backgroundColor: '#6366F1', opacity: 0.55 });
  });

  test('upcoming events are fully opaque', () => {
    expect(getPastEventStyle(false, '#6366F1')).toEqual({ backgroundColor: '#6366F1', opacity: 1 });
  });
});
