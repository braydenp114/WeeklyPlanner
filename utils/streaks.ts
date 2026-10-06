import { Task } from '@/services/tasksService';

export interface StreakResult {
  /** How many scheduled occurrences in a row (ending with the most recent one) were completed. */
  current: number;
  /** The longest run of completed occurrences in the series so far. */
  longest: number;
}

/**
 * A recurring task is streak-eligible automatically: every occurrence created from a
 * recurring rule shares a seriesId. Tasks created before this feature have no
 * streakEligible field, so they are treated as eligible as long as they belong to a series.
 */
export function isStreakEligible(task: Task): boolean {
  return !!task.seriesId && task.streakEligible !== false;
}

/**
 * An occurrence counts towards the streak if it was ticked off, or logged on the
 * flip-card as done exactly as planned.
 */
export function isOccurrenceDone(task: Task): boolean {
  return task.completed === true || task.actualStatus === 'as_planned';
}

/**
 * Calculates the streak for one recurring series.
 *
 * Rules:
 * - Only occurrences that have already started are looked at (future ones are ignored).
 * - If the latest occurrence has not finished yet and is not done, it is skipped,
 *   so the streak does not reset in the middle of today's time block.
 * - Counting goes backwards from the most recent occurrence and stops at the first
 *   occurrence that was missed.
 */
export function calculateStreak(occurrences: Task[], now: Date = new Date()): StreakResult {
  const nowMs = now.getTime();

  // Oldest first, only occurrences that have started
  const started = occurrences
    .filter((t) => t.startDate.toDate().getTime() <= nowMs)
    .sort((a, b) => a.startDate.toDate().getTime() - b.startDate.toDate().getTime());

  // Longest streak: walk forwards through the series
  let longest = 0;
  let run = 0;
  for (const occ of started) {
    if (isOccurrenceDone(occ)) {
      run++;
      if (run > longest) longest = run;
    } else if (occ.endDate.toDate().getTime() < nowMs) {
      run = 0; // missed and already over, so the run breaks
    }
  }

  // Current streak: walk backwards from the most recent occurrence
  let current = 0;
  for (let i = started.length - 1; i >= 0; i--) {
    const occ = started[i];
    const isStillRunning = occ.endDate.toDate().getTime() >= nowMs;

    if (isOccurrenceDone(occ)) {
      current++;
    } else if (isStillRunning && i === started.length - 1) {
      continue; // today's block is not over yet, give the user a chance to finish it
    } else {
      break;
    }
  }

  return { current, longest };
}
