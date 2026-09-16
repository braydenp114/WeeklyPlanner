import type { TaskItem } from '@/context/TaskContext';

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

export interface FreeSlot {
  dayIndex: number;
  startHour: number;
  availableHours: number;
}

export interface SuggestedBlock {
  dayIndex: number;
  startHour: number;
  hours: number;
}

export function suggestBlocksForRemaining(
  remaining: number,
  freeSlots: FreeSlot[]
): SuggestedBlock[] {
  const sorted = [...freeSlots].sort(
    (a, b) => a.dayIndex - b.dayIndex || a.startHour - b.startHour
  );
  const blocks: SuggestedBlock[] = [];
  let left = remaining;

  for (const slot of sorted) {
    if (left <= 0) break;
    const take = Math.min(slot.availableHours, left);
    if (take > 0) {
      blocks.push({ dayIndex: slot.dayIndex, startHour: slot.startHour, hours: take });
      left -= take;
    }
  }

  return blocks;
}