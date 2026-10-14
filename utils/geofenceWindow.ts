import type { Task } from '@/services/tasksService';

/** Extra time after a point-in-time task (e.g. a deadline) during which arrival still counts. */
export const POINT_IN_TIME_GRACE_MS = 30 * 60 * 1000;

/**
 * Enter events reported this soon after geofences were (re)registered are ignored.
 * Re-registering makes the OS report Enter for any region the user is already inside,
 * which is "you were already here", not an arrival.
 */
export const REGISTRATION_SETTLE_MS = 60 * 1000;

type WindowTask = Pick<Task, 'startDate' | 'endDate' | 'isDeadline'>;

/** A task with no duration (or a deadline) is a single moment rather than a block of time. */
export function isPointInTime(task: WindowTask): boolean {
  return !!task.isDeadline || task.endDate.toMillis() <= task.startDate.toMillis();
}

/**
 * The time range in which arriving at a task's location completes it.
 * - Normal tasks: exactly [startDate, endDate]. Arriving early does not count.
 * - Point-in-time tasks: [startDate, startDate + 30 min], so there's a realistic window to arrive.
 */
export function getCompletionWindow(task: WindowTask): { start: number; end: number } {
  const start = task.startDate.toMillis();
  if (isPointInTime(task)) {
    return { start, end: start + POINT_IN_TIME_GRACE_MS };
  }
  return { start, end: task.endDate.toMillis() };
}

/**
 * Whether an Enter event at `now` should complete the task.
 *
 * Completion needs a real arrival inside the window. Arriving early and staying does NOT
 * complete the task when the window opens, because no new Enter event happens. The user can
 * still tick it off manually.
 */
export function shouldAutoComplete(
  task: WindowTask & Pick<Task, 'completed'>,
  now: number,
  lastRegisteredAt: number | null,
): boolean {
  if (task.completed) return false;
  if (lastRegisteredAt != null && now - lastRegisteredAt < REGISTRATION_SETTLE_MS) return false;
  const { start, end } = getCompletionWindow(task);
  return now >= start && now <= end;
}
