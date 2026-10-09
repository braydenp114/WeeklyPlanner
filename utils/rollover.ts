import type { Task } from '@/services/tasksService';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Monday 00:00 of the week containing `date` (the grid starts weeks on Monday). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "2026-10-05": used to remember that the user already answered for this week. */
export function weekKey(date: Date): string {
  const d = startOfWeek(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Tasks from last week that were never finished, so the user can carry them over.
 * Skips: finished tasks, tasks logged on the flip-card, deadlines, and recurring
 * occurrences (they come back next week anyway).
 */
export function findUnfinishedFromLastWeek(tasks: Task[], now: Date = new Date()): Task[] {
  const thisWeek = startOfWeek(now).getTime();
  const lastWeek = thisWeek - 7 * DAY_MS;
  return tasks
    .filter((t) => {
      const start = t.startDate.toDate().getTime();
      return (
        start >= lastWeek &&
        start < thisWeek &&
        !t.completed &&
        !t.actualStatus &&
        !t.isDeadline &&
        !t.seriesId
      );
    })
    .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());
}

/** Same weekday and time, one week later. */
export function shiftOneWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + 7);
  return d;
}

/**
 * Where a carried-over task lands: same weekday and time this week, or today
 * (same time of day) if that weekday has already passed.
 */
export function rolloverTarget(start: Date, now: Date = new Date()): Date {
  const shifted = shiftOneWeek(start);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  if (shifted >= todayStart) return shifted;
  const target = new Date(now);
  target.setHours(start.getHours(), start.getMinutes(), 0, 0);
  return target;
}
