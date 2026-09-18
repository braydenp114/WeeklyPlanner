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
