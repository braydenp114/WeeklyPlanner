import type { Task } from '@/services/tasksService';
import { comparePriority } from './priority';

/** How far back the "Overdue" group looks. */
export const OVERDUE_LOOKBACK_DAYS = 7;

export interface TodayList {
  /** Everything scheduled today: P1 first, then by start time. */
  today: Task[];
  /** One-off tasks from the last week that ended without being finished. */
  overdue: Task[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const byPriorityThenTime = (a: Task, b: Task) =>
  comparePriority(a.priority, b.priority) || a.startDate.toDate().getTime() - b.startDate.toDate().getTime();

/**
 * Splits calendar tasks into "Today" and "Overdue" for the sidebar.
 * Overdue skips finished tasks, tasks already logged on the flip-card, deadlines
 * and recurring occurrences (a missed habit is not a to-do).
 */
export function buildTodayList(tasks: Task[], now: Date = new Date()): TodayList {
  const todayStart = startOfDay(now).getTime();
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
  const lookbackStart = todayStart - OVERDUE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const today = tasks
    .filter((t) => {
      const start = t.startDate.toDate().getTime();
      return start >= todayStart && start < tomorrowStart;
    })
    .sort(byPriorityThenTime);

  const overdue = tasks
    .filter((t) => {
      const start = t.startDate.toDate().getTime();
      return (
        start >= lookbackStart &&
        start < todayStart &&
        t.endDate.toDate().getTime() <= now.getTime() &&
        !t.completed &&
        !t.actualStatus &&
        !t.isDeadline &&
        !t.seriesId
      );
    })
    .sort(byPriorityThenTime);

  return { today, overdue };
}
