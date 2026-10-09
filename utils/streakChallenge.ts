/**
 * Streak challenges (Duolingo style): the user checks in on a challenge each day.
 *
 * Rules:
 * - Checking in on consecutive days builds the streak.
 * - A single missed day is covered automatically by a grace day, so the streak continues.
 *   Each challenge gets GRACE_DAYS_PER_MONTH grace days per calendar month, reset every month.
 * - Missing two days in a row ends the streak, even if grace days are left.
 * - Today is never a miss: the user still has until midnight to check in.
 */

export const GRACE_DAYS_PER_MONTH = 5;

/** Status of one calendar day for a challenge. */
export type StreakDayStatus = 'done' | 'grace' | 'missed' | 'pending';

export interface StreakSummary {
  /** Checked-in days in the current streak (grace days keep it alive but don't add to it). */
  current: number;
  /** Best streak ever for this challenge. */
  longest: number;
  /** Grace days already used in the current month. */
  graceUsedThisMonth: number;
  /** Grace days still available this month. */
  graceLeftThisMonth: number;
  /** Whether today has been checked in. */
  doneToday: boolean;
  /** Status for every day from the start date to today, keyed by YYYY-MM-DD. */
  days: Record<string, StreakDayStatus>;
}

/** Local date key (not UTC), e.g. "2026-10-09". */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

/**
 * Works out the streak for one challenge.
 * @param checkIns  day keys (YYYY-MM-DD) the user checked in on
 * @param startDate the day the challenge was created
 * @param today     injectable for tests
 */
export function calculateChallengeStreak(
  checkIns: string[],
  startDate: Date,
  today: Date = new Date(),
): StreakSummary {
  const done = new Set(checkIns);
  const days: Record<string, StreakDayStatus> = {};
  const graceUsed: Record<string, number> = {};

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  // A check-in before the start date (e.g. edited data) still counts from that day
  for (const key of checkIns) {
    const [y, m, d] = key.split('-').map(Number);
    const day = new Date(y, m - 1, d);
    if (day < start) start.setTime(day.getTime());
  }

  let current = 0;
  let longest = 0;
  const todayKey = toDayKey(end);

  for (let day = new Date(start); day <= end; day = addDays(day, 1)) {
    const key = toDayKey(day);

    if (done.has(key)) {
      days[key] = 'done';
      current++;
      longest = Math.max(longest, current);
      continue;
    }

    if (key === todayKey) {
      days[key] = 'pending'; // still time to check in today
      continue;
    }

    // A missed past day. Grace only helps a live streak, only for a single-day gap,
    // and only while this month's grace days last.
    const nextKey = toDayKey(addDays(day, 1));
    const nextIsDoneOrToday = done.has(nextKey) || nextKey === todayKey;
    const mk = monthKey(day);
    const graceLeft = GRACE_DAYS_PER_MONTH - (graceUsed[mk] ?? 0);

    if (current > 0 && nextIsDoneOrToday && graceLeft > 0) {
      days[key] = 'grace';
      graceUsed[mk] = (graceUsed[mk] ?? 0) + 1;
    } else {
      days[key] = 'missed';
      current = 0;
    }
  }

  const usedThisMonth = graceUsed[monthKey(end)] ?? 0;
  return {
    current,
    longest,
    graceUsedThisMonth: usedThisMonth,
    graceLeftThisMonth: GRACE_DAYS_PER_MONTH - usedThisMonth,
    doneToday: done.has(todayKey),
    days,
  };
}
