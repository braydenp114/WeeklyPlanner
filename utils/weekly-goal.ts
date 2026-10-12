import type { TaskItem } from '@/components/WeeklyGrid';

export interface WeeklyGoal {
  id: string;
  category: string;
  targetHours: number;
  weekStart: Date;
}

export function loggedHours(goal: WeeklyGoal, tasks: TaskItem[]): number {
  return tasks
    .filter((t) => t.category === goal.category)
    .reduce((sum, t) => sum + t.durationHours, 0);
}

export function remainingHours(goal: WeeklyGoal, tasks: TaskItem[]): number {
  return Math.max(goal.targetHours - loggedHours(goal, tasks), 0);
}

/**
 * Hours still needed to reach a weekly goal for one category.
 * Returns null when no goal is set, and never goes below 0,
 * so a goal that is met or exceeded has no gap.
 */
export function calculateGoalGap(goalHours: number, scheduledHours: number): number | null {
  if (isNaN(goalHours) || goalHours <= 0) return null;
  return Math.max(goalHours - scheduledHours, 0);
}
