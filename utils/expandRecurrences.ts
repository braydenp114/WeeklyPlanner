import { Timestamp } from 'firebase/firestore';
import { Task, CustomRecurrenceRule } from '@/services/tasksService';

/**
 * An expanded task occurrence, representing one instance of a (possibly recurring) task
 * within a visible date range.
 */
export interface ExpandedTask extends Task {
  /** Whether this is a generated recurrence instance (true) or the original task (false). */
  isRecurrenceInstance: boolean;
  /** The original Firestore document ID, for edit/delete operations. */
  originalTaskId: string;
  /** A unique composite ID for this specific occurrence (originalTaskId-YYYY-MM-DD). */
  occurrenceId: string;
}

/** Maximum number of occurrences to generate per task to prevent runaway loops. */
const MAX_OCCURRENCES_PER_TASK = 366;

/**
 * Expands a single task into all of its occurrences that fall within [rangeStart, rangeEnd].
 *
 * For non-recurring tasks, returns the task as-is if it overlaps the range.
 * For recurring tasks, generates virtual ExpandedTask entries for each occurrence.
 *
 * endOccurrences counting: each individual emitted day counts as one occurrence,
 * NOT each interval cycle. E.g. "every 2 weeks on Mon/Wed" with endOccurrences=6
 * emits 6 individual day occurrences (3 cycles × 2 days/cycle).
 */
export function expandTaskOccurrences(
  task: Task,
  rangeStart: Date,
  rangeEnd: Date
): ExpandedTask[] {
  const taskId = task.id || '';
  const taskStart = task.startDate.toDate();
  const taskEnd = task.endDate.toDate();
  const durationMs = taskEnd.getTime() - taskStart.getTime();

  // Helper to create an ExpandedTask for a given occurrence start date
  const makeOccurrence = (occStart: Date, isInstance: boolean): ExpandedTask => {
    const occEnd = new Date(occStart.getTime() + durationMs);
    const dateKey = formatDateKey(occStart);
    return {
      ...task,
      startDate: Timestamp.fromDate(occStart),
      endDate: Timestamp.fromDate(occEnd),
      isRecurrenceInstance: isInstance,
      originalTaskId: taskId,
      occurrenceId: isInstance ? `${taskId}-${dateKey}` : taskId,
    };
  };

  // Non-recurring: return as-is if it overlaps the visible range
  if (task.recurrence === 'none') {
    if (taskEnd >= rangeStart && taskStart <= rangeEnd) {
      return [makeOccurrence(taskStart, false)];
    }
    return [];
  }

  // Determine the recurrence end boundary
  const recurrenceEndBound = getRecurrenceEndBound(task, rangeEnd);
  const maxOccurrences = task.customRecurrenceRule?.endOccurrences ?? undefined;

  const results: ExpandedTask[] = [];
  let totalEmitted = 0;

  // Generate occurrence dates
  const occurrenceDates = generateOccurrenceDates(
    task.recurrence,
    task.customRecurrenceRule,
    taskStart,
    recurrenceEndBound
  );

  for (const occDate of occurrenceDates) {
    // Safety cap
    if (totalEmitted >= MAX_OCCURRENCES_PER_TASK) break;

    // Check endOccurrences limit (counts each emitted day individually)
    if (maxOccurrences !== undefined && totalEmitted >= maxOccurrences) break;

    // Skip occurrences that end before the visible range starts
    const occEnd = new Date(occDate.getTime() + durationMs);
    if (occEnd < rangeStart) {
      // Still count toward endOccurrences even if before visible range
      totalEmitted++;
      continue;
    }

    // Stop if occurrence starts after the visible range ends
    if (occDate > rangeEnd) break;

    const isFirst = occDate.getTime() === taskStart.getTime();
    results.push(makeOccurrence(occDate, !isFirst));
    totalEmitted++;
  }

  return results;
}

/**
 * Expands multiple tasks into all their occurrences within the visible range.
 * Deduplicates by task ID (recurring tasks fetched by both range query and recurring query).
 */
export function expandAllTasks(
  tasks: Task[],
  rangeStart: Date,
  rangeEnd: Date
): ExpandedTask[] {
  // Deduplicate by task ID
  const seen = new Set<string>();
  const uniqueTasks: Task[] = [];
  for (const task of tasks) {
    const id = task.id || '';
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    uniqueTasks.push(task);
  }

  return uniqueTasks.flatMap((task) => expandTaskOccurrences(task, rangeStart, rangeEnd));
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getRecurrenceEndBound(task: Task, rangeEnd: Date): Date {
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
function* generateOccurrenceDates(
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
