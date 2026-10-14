import { describe, expect, test } from '@jest/globals';
import type { Timestamp } from 'firebase/firestore';
import {
  getCompletionWindow,
  shouldAutoComplete,
  POINT_IN_TIME_GRACE_MS,
  REGISTRATION_SETTLE_MS,
} from '../geofenceWindow';

const MIN = 60 * 1000;
const ts = (ms: number) => ({ toMillis: () => ms }) as unknown as Timestamp;

const START = new Date(2026, 9, 12, 10, 0).getTime(); // 10:00
const END = START + 60 * MIN; // 11:00
const block = (extra = {}) => ({ startDate: ts(START), endDate: ts(END), completed: false, ...extra });
const moment = (extra = {}) => ({ startDate: ts(START), endDate: ts(START), completed: false, ...extra });

describe('geofence completion window', () => {
  // Test 1: Enter during the scheduled window
  test('completes on an Enter at the start, middle and end of a block', () => {
    expect(shouldAutoComplete(block(), START, null)).toBe(true);
    expect(shouldAutoComplete(block(), START + 30 * MIN, null)).toBe(true);
    expect(shouldAutoComplete(block(), END, null)).toBe(true);
  });

  test('point-in-time tasks get a 30-minute grace after the start', () => {
    expect(getCompletionWindow(moment())).toEqual({ start: START, end: START + POINT_IN_TIME_GRACE_MS });
    expect(shouldAutoComplete(moment(), START + 29 * MIN, null)).toBe(true);
    expect(shouldAutoComplete(moment({ isDeadline: true, endDate: ts(END) }), START + 29 * MIN, null)).toBe(true);
  });

  // Test 2: Enter outside the window
  test('arriving early does not complete a block', () => {
    expect(shouldAutoComplete(block(), START - 1, null)).toBe(false);
    expect(shouldAutoComplete(block(), START - 30 * MIN, null)).toBe(false);
  });

  test('arriving after the end does not complete a block (no grace for blocks)', () => {
    expect(shouldAutoComplete(block(), END + 1, null)).toBe(false);
  });

  test('arriving just past the point-in-time grace does not complete', () => {
    expect(shouldAutoComplete(moment(), START + POINT_IN_TIME_GRACE_MS + 1, null)).toBe(false);
  });

  test('an Enter echoed by re-registering geofences is not an arrival', () => {
    const registeredAt = START + 20 * MIN;
    expect(shouldAutoComplete(block(), registeredAt + 5 * 1000, registeredAt)).toBe(false);
    expect(shouldAutoComplete(block(), registeredAt + REGISTRATION_SETTLE_MS, registeredAt)).toBe(true);
  });

  test('already-completed tasks are never re-completed', () => {
    expect(shouldAutoComplete(block({ completed: true }), START + 10 * MIN, null)).toBe(false);
  });
});
