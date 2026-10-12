import { describe, expect, test } from '@jest/globals';
import { calculateChallengeStreak, GRACE_DAYS_PER_MONTH, toDayKey } from '../streakChallenge';

const TODAY = new Date(2026, 9, 20); // Tue 20 Oct 2026
/** Day key for `n` days before TODAY. */
const ago = (n: number) => toDayKey(new Date(2026, 9, 20 - n));
const START = new Date(2026, 9, 1);

describe('calculateChallengeStreak', () => {
  test('consecutive check-ins build the streak', () => {
    const s = calculateChallengeStreak([ago(3), ago(2), ago(1), ago(0)], new Date(2026, 9, 17), TODAY);
    expect(s.current).toBe(4);
    expect(s.doneToday).toBe(true);
  });

  test('today not checked in yet does not break the streak', () => {
    const s = calculateChallengeStreak([ago(3), ago(2), ago(1)], new Date(2026, 9, 17), TODAY);
    expect(s.current).toBe(3);
    expect(s.days[ago(0)]).toBe('pending');
  });

  test('a single missed day is covered by a grace day', () => {
    const s = calculateChallengeStreak([ago(4), ago(3), ago(1), ago(0)], new Date(2026, 9, 16), TODAY);
    expect(s.days[ago(2)]).toBe('grace');
    expect(s.current).toBe(4); // grace keeps it alive but doesn't add a day
    expect(s.graceUsedThisMonth).toBe(1);
    expect(s.graceLeftThisMonth).toBe(GRACE_DAYS_PER_MONTH - 1);
  });

  test('missing two days in a row ends the streak even with grace left', () => {
    const s = calculateChallengeStreak([ago(5), ago(4), ago(1), ago(0)], new Date(2026, 9, 15), TODAY);
    expect(s.days[ago(3)]).toBe('missed');
    expect(s.days[ago(2)]).toBe('missed');
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  test('yesterday missed and today still open: yesterday is held by grace', () => {
    const s = calculateChallengeStreak([ago(3), ago(2)], new Date(2026, 9, 17), TODAY);
    expect(s.days[ago(1)]).toBe('grace');
    expect(s.current).toBe(2);
  });

  test('only five grace days per month; the sixth single miss breaks the streak', () => {
    // Every other day from 1 Oct: done, miss, done, miss ... -> misses on 2,4,6,8,10,12
    const checkIns: string[] = [];
    for (let d = 1; d <= 13; d += 2) checkIns.push(toDayKey(new Date(2026, 9, d)));
    const s = calculateChallengeStreak(checkIns, START, new Date(2026, 9, 13));
    const graceDays = Object.values(s.days).filter((v) => v === 'grace').length;
    expect(graceDays).toBe(5);
    expect(s.days['2026-10-12']).toBe('missed');
    expect(s.current).toBe(1); // only 13 Oct after the break
  });

  test('grace days reset at the start of a new month', () => {
    const checkIns = ['2026-10-30', '2026-11-01', '2026-11-02'];
    const s = calculateChallengeStreak(checkIns, new Date(2026, 9, 30), new Date(2026, 10, 2));
    expect(s.days['2026-10-31']).toBe('grace');
    expect(s.graceUsedThisMonth).toBe(0); // the grace day belonged to October
    expect(s.graceLeftThisMonth).toBe(GRACE_DAYS_PER_MONTH);
  });

  test('grace is not spent when there is no streak to protect', () => {
    const s = calculateChallengeStreak([ago(0)], new Date(2026, 9, 18), TODAY);
    expect(s.days[ago(2)]).toBe('missed');
    expect(s.days[ago(1)]).toBe('missed');
    expect(s.graceUsedThisMonth).toBe(0);
  });

  test('longest streak is remembered after a break', () => {
    const s = calculateChallengeStreak(
      ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-19', '2026-10-20'],
      START,
      TODAY,
    );
    expect(s.longest).toBe(4);
    expect(s.current).toBe(2);
  });
});
