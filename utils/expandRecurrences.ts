import { Timestamp } from 'firebase/firestore';
import { Task, CustomRecurrenceRule } from '@/services/tasksService';

export const MAX_OCCURRENCES_PER_TASK = 366;

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getRecurrenceEndBound(task: Task, rangeEnd: Date): Date {
  let bound = rangeEnd;

  if (task.recurrenceEndDate) {
    const recEnd = task.recurrenceEndDate.toDate();
    if (recEnd < bound) bound = recEnd;
  }

  return bound;
}

/**
 * Generator that yields occurrence start dates for a recurring task.
 * Yields dates from the task's original start date up to the end bound.
 */
export function* generateOccurrenceDates(
  recurrence: string,
  customRule: CustomRecurrenceRule | null,
  taskStart: Date,
  endBound: Date
): Generator<Date> {
  switch (recurrence) {
    case 'daily':
      yield* generateDaily(taskStart, endBound, 1);
      break;

    case 'weekly':
      yield* generateWeekly(taskStart, endBound);
      break;

    case 'monthly':
      yield* generateMonthly(taskStart, endBound);
      break;

    case 'yearly':
      yield* generateYearly(taskStart, endBound);
      break;

    case 'weekday':
      yield* generateWeekday(taskStart, endBound);
      break;

    case 'custom':
      if (customRule) {
        yield* generateCustom(taskStart, endBound, customRule);
      } else {
        // Fallback: treat as non-recurring
        yield taskStart;
      }
      break;

    default:
      yield taskStart;
      break;
  }
}

function* generateDaily(start: Date, endBound: Date, interval: number): Generator<Date> {
  const current = new Date(start);
  let count = 0;
  while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
    yield new Date(current);
    current.setDate(current.getDate() + interval);
    count++;
  }
}

function* generateWeekly(start: Date, endBound: Date): Generator<Date> {
  const current = new Date(start);
  let count = 0;
  while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
    yield new Date(current);
    current.setDate(current.getDate() + 7);
    count++;
  }
}

function* generateMonthly(start: Date, endBound: Date): Generator<Date> {
  const originalDay = start.getDate();
  const current = new Date(start);
  let count = 0;
  while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
    yield new Date(current);
    current.setMonth(current.getMonth() + 1);
    // Clamp day to month length (e.g. Jan 31 → Feb 28)
    const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
    current.setDate(Math.min(originalDay, maxDay));
    count++;
  }
}

function* generateYearly(start: Date, endBound: Date): Generator<Date> {
  const current = new Date(start);
  let count = 0;
  while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
    yield new Date(current);
    current.setFullYear(current.getFullYear() + 1);
    // Handle leap year: Feb 29 → Feb 28 in non-leap years
    const originalMonth = start.getMonth();
    const originalDay = start.getDate();
    const maxDay = new Date(current.getFullYear(), originalMonth + 1, 0).getDate();
    current.setMonth(originalMonth);
    current.setDate(Math.min(originalDay, maxDay));
    count++;
  }
}

function* generateWeekday(start: Date, endBound: Date): Generator<Date> {
  const current = new Date(start);
  let count = 0;
  while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
    const dayOfWeek = current.getDay();
    // Emit only Mon (1) through Fri (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      yield new Date(current);
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
}

function* generateCustom(
  start: Date,
  endBound: Date,
  rule: CustomRecurrenceRule
): Generator<Date> {
  const { interval, unit, daysOfWeek } = rule;
  let count = 0;

  switch (unit) {
    case 'day':
      yield* generateDaily(start, endBound, interval);
      break;

    case 'week': {
      if (daysOfWeek && daysOfWeek.length > 0) {
        // "Every N weeks on specific days"
        // Find the start of the week containing the task's start date
        const weekStart = getStartOfWeek(start);
        let currentWeekStart = new Date(weekStart);

        while (currentWeekStart <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
          // Emit occurrences for each specified day in this week
          for (const dayNum of daysOfWeek.sort((a, b) => a - b)) {
            if (count >= MAX_OCCURRENCES_PER_TASK) break;

            const occDate = new Date(currentWeekStart);
            // daysOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
            const currentDay = occDate.getDay();
            const diff = dayNum - currentDay;
            occDate.setDate(occDate.getDate() + (diff < 0 ? diff + 7 : diff));

            // Don't emit dates before the task's original start
            if (occDate < start) continue;
            if (occDate > endBound) break;

            yield new Date(occDate);
            count++;
          }

          // Advance by N weeks
          currentWeekStart.setDate(currentWeekStart.getDate() + 7 * interval);
        }
      } else {
        // "Every N weeks" on the same day of week
        const current = new Date(start);
        while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
          yield new Date(current);
          current.setDate(current.getDate() + 7 * interval);
          count++;
        }
      }
      break;
    }

    case 'month': {
      const originalDay = start.getDate();
      const current = new Date(start);
      while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
        yield new Date(current);
        current.setMonth(current.getMonth() + interval);
        const maxDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(originalDay, maxDay));
        count++;
      }
      break;
    }

    case 'year': {
      const current = new Date(start);
      while (current <= endBound && count < MAX_OCCURRENCES_PER_TASK) {
        yield new Date(current);
        current.setFullYear(current.getFullYear() + interval);
        const origMonth = start.getMonth();
        const origDay = start.getDate();
        const maxDay = new Date(current.getFullYear(), origMonth + 1, 0).getDate();
        current.setMonth(origMonth);
        current.setDate(Math.min(origDay, maxDay));
        count++;
      }
      break;
    }
  }
}

function getStartOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  // Week starts on Sunday (0) for daysOfWeek alignment
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}
