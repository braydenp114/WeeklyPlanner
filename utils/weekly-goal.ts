import type { TaskItem } from '@/components/WeeklyGrid';

export interface WeeklyGoal {
  id: string;
  tag: string;
  targetHours: number;
  weekStart: Date;
}

export function loggedHours(goal: WeeklyGoal, tasks: TaskItem[]): number {
  return tasks
    .filter((t) => t.tag === goal.tag)
    .reduce((sum, t) => sum + t.durationHours, 0);
}

export function remainingHours(goal: WeeklyGoal, tasks: TaskItem[]): number {
  return Math.max(goal.targetHours - loggedHours(goal, tasks), 0);
}